// ============================================================
// FILE: server/services/booking/delivery-window.service.cjs
// Server-side mirror of src/utils/delivery-window.js — used by the
// booking create/update controllers to enforce earliest-delivery
// rules even if a client bypasses the UI.
// Keep this in sync with the frontend file.
// ============================================================

// Minimum gap (minutes) between earliest possible delivery moment and the
// START of any window the customer may select. Keep in sync with
// src/utils/delivery-window.js and TimeWindowPicker.
const MIN_BUFFER_MINUTES = 60;

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

function timeToMinutes(input) {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;

  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    const m = Number(ampm[2]);
    if (ampm[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + m;
  }

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
}

function mileageTierExtraDays(miles) {
  if (!Number.isFinite(miles) || miles <= 0) return 0;
  if (miles <= 150) return 0;
  if (miles <= 700) return 1;
  if (miles <= 1200) return 2;
  if (miles <= 1800) return 3;
  return 5;
}

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
  if (!yyyyMmDd) return null;
  const s = String(yyyyMmDd);
  // Accept either "YYYY-MM-DD" or full ISO; we only care about Y/M/D portion.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function resolvePickupEndMinutes({ pickupCustomTo, pickupPreferredWindow, pickupWindowEnd } = {}) {
  const fromCustom = timeToMinutes(pickupCustomTo);
  if (fromCustom !== null) return fromCustom;
  if (pickupPreferredWindow && PRESET_END_MINUTES[pickupPreferredWindow] !== undefined) {
    return PRESET_END_MINUTES[pickupPreferredWindow];
  }
  const fromLegacy = timeToMinutes(pickupWindowEnd);
  if (fromLegacy !== null) return fromLegacy;
  return 12 * 60;
}

function resolveDeliveryStartMinutes({ dropoffCustomFrom, dropoffPreferredWindow, dropoffWindowStart } = {}) {
  const fromCustom = timeToMinutes(dropoffCustomFrom);
  if (fromCustom !== null) return fromCustom;
  if (dropoffPreferredWindow && PRESET_START_MINUTES[dropoffPreferredWindow] !== undefined) {
    return PRESET_START_MINUTES[dropoffPreferredWindow];
  }
  const fromLegacy = timeToMinutes(dropoffWindowStart);
  if (fromLegacy !== null) return fromLegacy;
  return null;
}

function resolveDeliveryEndMinutes({ dropoffCustomTo, dropoffPreferredWindow, dropoffWindowEnd } = {}) {
  const fromCustom = timeToMinutes(dropoffCustomTo);
  if (fromCustom !== null) return fromCustom;
  if (dropoffPreferredWindow && PRESET_END_MINUTES[dropoffPreferredWindow] !== undefined) {
    return PRESET_END_MINUTES[dropoffPreferredWindow];
  }
  const fromLegacy = timeToMinutes(dropoffWindowEnd);
  if (fromLegacy !== null) return fromLegacy;
  return null;
}

function computeEarliestDelivery({
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

  if (Number.isFinite(durationHours) && durationHours > 0) {
    const totalMinutes = startMinutes + (durationHours + bufferHours(durationHours)) * 60;
    earliestDateTime = new Date(baseDate.getTime() + totalMinutes * 60 * 1000);
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
      earliestDateTime.setHours(0, 0, 0, 0);
      earliestDateTime.setMinutes(startMinutes);
    } else {
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
  return { earliestDate, earliestDateTime, earliestStartMinutes, source };
}

function validateDeliveryDateTime({
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

  // Normalize incoming dropoffDate to YYYY-MM-DD for string comparison.
  const dropoffDateStr = String(dropoffDate).slice(0, 10);

  if (dropoffDateStr < est.earliestDate) {
    return {
      valid: false,
      error: `Delivery cannot be earlier than ${est.earliestDate} based on pickup time and route distance.`,
      earliestDate: est.earliestDate,
    };
  }

  // "flexible" preset is exempt — customer explicitly opted out of strict timing.
  if (dropoffDateStr === est.earliestDate && dropoffPreferredWindow !== 'flexible') {
    const effectiveMinStart = est.earliestStartMinutes + MIN_BUFFER_MINUTES;
    const startMin = resolveDeliveryStartMinutes({ dropoffCustomFrom, dropoffPreferredWindow, dropoffWindowStart });

    // Single rule for both presets and custom: window START must be >= floor+buffer.
    if (startMin !== null && startMin < effectiveMinStart) {
      return {
        valid: false,
        error: `On ${est.earliestDate} the delivery window must start at or after minute-of-day ${effectiveMinStart} (earliest delivery ${est.earliestStartMinutes} + ${MIN_BUFFER_MINUTES} min buffer).`,
        earliestStartMinutes: est.earliestStartMinutes,
        effectiveMinStartMinutes: effectiveMinStart,
      };
    }
  }

  return { valid: true };
}

module.exports = {
  computeEarliestDelivery,
  validateDeliveryDateTime,
  resolvePickupEndMinutes,
  resolveDeliveryStartMinutes,
  resolveDeliveryEndMinutes,
};
