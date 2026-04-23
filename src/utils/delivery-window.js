// ============================================================
// delivery-window.js — earliest possible delivery datetime calculator
//
// Combines pickup date + pickup time-window end + driving duration
// + an operational buffer (loading, fuel, traffic, DOT rest) to
// produce the earliest realistic delivery DATETIME a customer can pick.
//
// Falls back to mileage-only tiers when route duration is unavailable.
// Also exposes a validator that checks a customer's chosen delivery
// against the computed floor — for both UI disabling and submit guards.
// ============================================================

// Minimum gap (minutes) between earliest possible delivery moment and the
// START of any window the customer may select. Keep in sync with the same
// constant in TimeWindowPicker and the server-side mirror.
export const MIN_BUFFER_MINUTES = 60;

const PRESET_END_MINUTES = {
  '8-10': 600,
  '10-12': 720,
  '12-14': 840,
  '14-16': 960,
  '16-18': 1080,
  flexible: 1439,
};

const PRESET_START_MINUTES = {
  '8-10': 480,
  '10-12': 600,
  '12-14': 720,
  '14-16': 840,
  '16-18': 960,
  flexible: 0,
};

/**
 * Convert a "HH:MM" 24h string OR "h:mm AM/PM" to minutes since midnight.
 * Returns null on invalid input.
 */
function timeToMinutes(input) {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;

  // 12h format with AM/PM
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    const m = Number(ampm[2]);
    if (ampm[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + m;
  }

  // 24h HH:MM
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
}

/**
 * Mileage-only tier fallback. Used when Google duration is unavailable.
 * Returns the minimum number of *extra* days beyond the pickup date.
 */
function mileageTierExtraDays(miles) {
  if (!Number.isFinite(miles) || miles <= 0) return 0;
  if (miles <= 150) return 0;
  if (miles <= 700) return 1;
  if (miles <= 1200) return 2;
  if (miles <= 1800) return 3;
  return 5;
}

/**
 * Operational buffer in hours added on top of raw drive time.
 * Covers loading, fuel stops, traffic, and DOT-mandated rest.
 */
function bufferHours(driveHours) {
  if (driveHours <= 4) return 2;
  if (driveHours <= 10) return 6;
  if (driveHours <= 20) return 14;
  return Math.ceil(driveHours * 0.6);
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return null;
  const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

/**
 * Resolve the latest pickup time of day, in minutes since midnight.
 * Honors custom range first, then preset, then a noon default.
 */
export function resolvePickupEndMinutes({ pickupCustomTo, pickupPreferredWindow, pickupWindowEnd } = {}) {
  const fromCustom = timeToMinutes(pickupCustomTo);
  if (fromCustom !== null) return fromCustom;

  if (pickupPreferredWindow && PRESET_END_MINUTES[pickupPreferredWindow] !== undefined) {
    return PRESET_END_MINUTES[pickupPreferredWindow];
  }

  const fromLegacy = timeToMinutes(pickupWindowEnd);
  if (fromLegacy !== null) return fromLegacy;

  return 12 * 60; // noon default
}

/**
 * Resolve the earliest delivery start time of day chosen by the customer.
 */
export function resolveDeliveryStartMinutes({ dropoffCustomFrom, dropoffPreferredWindow, dropoffWindowStart } = {}) {
  const fromCustom = timeToMinutes(dropoffCustomFrom);
  if (fromCustom !== null) return fromCustom;

  if (dropoffPreferredWindow && PRESET_START_MINUTES[dropoffPreferredWindow] !== undefined) {
    return PRESET_START_MINUTES[dropoffPreferredWindow];
  }

  const fromLegacy = timeToMinutes(dropoffWindowStart);
  if (fromLegacy !== null) return fromLegacy;

  return null;
}

/**
 * Resolve the latest delivery time the customer's selected window covers,
 * in minutes since midnight. Used to mark a preset as unusable when its
 * end is before the earliest allowed delivery moment.
 */
export function resolveDeliveryEndMinutes({ dropoffCustomTo, dropoffPreferredWindow, dropoffWindowEnd } = {}) {
  const fromCustom = timeToMinutes(dropoffCustomTo);
  if (fromCustom !== null) return fromCustom;

  if (dropoffPreferredWindow && PRESET_END_MINUTES[dropoffPreferredWindow] !== undefined) {
    return PRESET_END_MINUTES[dropoffPreferredWindow];
  }

  const fromLegacy = timeToMinutes(dropoffWindowEnd);
  if (fromLegacy !== null) return fromLegacy;

  return null;
}

/**
 * Compute the earliest realistic delivery datetime.
 *
 * @param {Object} input
 * @param {string} input.pickupDate              "YYYY-MM-DD" — required for a meaningful answer
 * @param {string} [input.pickupCustomTo]        "HH:MM" 24h or "h:mm AM/PM"
 * @param {string} [input.pickupPreferredWindow] preset id ('8-10', '10-12', ...)
 * @param {string} [input.pickupWindowEnd]       legacy "HH:MM" string
 * @param {number} [input.miles]
 * @param {number} [input.durationHours]
 * @param {string} [input.todayIso]              override "today" for testing
 * @returns {{
 *   earliestDate: string,
 *   earliestDateTime: Date,
 *   earliestStartMinutes: number,
 *   extraDays: number,
 *   reason: string,
 *   source: 'duration'|'mileage'|'fallback'
 * }}
 */
export function computeEarliestDelivery({
  pickupDate,
  pickupCustomTo,
  pickupPreferredWindow,
  pickupWindowEnd,
  miles,
  durationHours,
  todayIso,
} = {}) {
  const today = todayIso || toIsoDate(new Date());
  const baseDateStr = pickupDate || today;
  const baseDate = parseLocalDate(baseDateStr) || parseLocalDate(today);

  const startMinutes = resolvePickupEndMinutes({ pickupCustomTo, pickupPreferredWindow, pickupWindowEnd });

  let earliestDateTime;
  let source;
  let reason;

  if (Number.isFinite(durationHours) && durationHours > 0) {
    const totalMinutes = startMinutes + (durationHours + bufferHours(durationHours)) * 60;
    earliestDateTime = new Date(baseDate.getTime() + totalMinutes * 60 * 1000);

    // If we land after 6 PM local on the arrival day, push to next morning 8 AM —
    // delivery windows close in the evening; we don't want an "earliest" that
    // implies an after-hours arrival.
    if (earliestDateTime.getHours() >= 18) {
      earliestDateTime.setDate(earliestDateTime.getDate() + 1);
      earliestDateTime.setHours(8, 0, 0, 0);
    }
    source = 'duration';
  } else if (Number.isFinite(miles) && miles > 0) {
    const extraDays = mileageTierExtraDays(miles);
    earliestDateTime = new Date(baseDate.getTime());
    earliestDateTime.setDate(earliestDateTime.getDate() + extraDays);
    if (extraDays === 0) {
      // Same-day allowed — earliest moment is right after pickup window ends
      earliestDateTime.setHours(0, 0, 0, 0);
      earliestDateTime.setMinutes(startMinutes);
    } else {
      // Multi-day — start of business day on arrival day
      earliestDateTime.setHours(8, 0, 0, 0);
    }
    source = 'mileage';
  } else {
    earliestDateTime = new Date(baseDate.getTime());
    earliestDateTime.setHours(0, 0, 0, 0);
    earliestDateTime.setMinutes(startMinutes);
    source = 'fallback';
  }

  const earliestDate = toIsoDate(earliestDateTime);
  const earliestStartMinutes = earliestDateTime.getHours() * 60 + earliestDateTime.getMinutes();
  const extraDays = Math.round((parseLocalDate(earliestDate).getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));

  if (source === 'duration') {
    reason = extraDays === 0
      ? `Same-day delivery is possible (~${Math.round(durationHours)}h drive).`
      : `Estimated ${Math.round(durationHours)}h drive plus operational buffer; earliest delivery is ${extraDays} day${extraDays === 1 ? '' : 's'} after pickup.`;
  } else if (source === 'mileage') {
    reason = extraDays === 0
      ? `Same-day delivery is possible for this short route.`
      : `Based on a ~${Math.round(miles)} mi route, earliest delivery is ${extraDays} day${extraDays === 1 ? '' : 's'} after pickup.`;
  } else {
    reason = 'Delivery cannot be earlier than the pickup date.';
  }

  return { earliestDate, earliestDateTime, earliestStartMinutes, extraDays, reason, source };
}

/**
 * Validate a chosen delivery selection against the computed floor.
 *
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDeliveryDateTime({
  pickupDate,
  pickupCustomTo,
  pickupPreferredWindow,
  pickupWindowEnd,
  miles,
  durationHours,
  dropoffDate,
  dropoffCustomFrom,
  dropoffCustomTo,
  dropoffPreferredWindow,
  dropoffWindowStart,
  dropoffWindowEnd,
} = {}) {
  if (!dropoffDate) return { valid: false, error: 'Delivery date is required.' };

  const est = computeEarliestDelivery({
    pickupDate, pickupCustomTo, pickupPreferredWindow, pickupWindowEnd,
    miles, durationHours,
  });

  if (dropoffDate < est.earliestDate) {
    return {
      valid: false,
      error: `Delivery cannot be earlier than ${est.earliestDate}. ${est.reason}`,
    };
  }

  // If picked the same calendar day as the floor, the time-of-day matters.
  // Rule: the window's START must be at or after (floor + MIN_BUFFER_MINUTES).
  // Exception: "flexible" — explicitly means the customer doesn't care about
  // exact timing, so we let it through.
  if (dropoffDate === est.earliestDate && dropoffPreferredWindow !== 'flexible') {
    const effectiveMinStart = est.earliestStartMinutes + MIN_BUFFER_MINUTES;
    const startMinutes = resolveDeliveryStartMinutes({ dropoffCustomFrom, dropoffPreferredWindow, dropoffWindowStart });

    if (startMinutes !== null && startMinutes < effectiveMinStart) {
      return {
        valid: false,
        error: `On ${est.earliestDate} the delivery window must start at or after ${minutesToLabel(effectiveMinStart)} (earliest delivery + ${MIN_BUFFER_MINUTES} min buffer).`,
        earliestStartMinutes: est.earliestStartMinutes,
        effectiveMinStartMinutes: effectiveMinStart,
      };
    }
  }

  return { valid: true };
}

function minutesToLabel(min) {
  if (min === null || min === undefined) return '';
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format a YYYY-MM-DD as "Apr 25, 2026".
 */
export function formatFriendlyDate(yyyyMmDd) {
  const d = parseLocalDate(yyyyMmDd);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Back-compat alias for the older name used by an earlier wiring.
export const computeEarliestDeliveryDate = computeEarliestDelivery;
