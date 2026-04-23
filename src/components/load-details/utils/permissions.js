// ============================================================
// FILE: src/components/load-details/utils/permissions.js
// Permission checks for load actions
// ✅ UPDATED: Integrates with attempt authorization system
// ============================================================

import { SHIPMENT_STATUS, normalizeStatus } from './status-map';
import { getTimezoneForState, getTimezoneAbbreviation } from '../../../utils/timezone-utils.js';

/**
 * Get status flags (booleans for each status)
 */
export const getStatusFlags = (status) => {
  const normalized = normalizeStatus(status);
  
  return {
    isScheduled: normalized === SHIPMENT_STATUS.SCHEDULED,
    isAssigned: normalized === SHIPMENT_STATUS.ASSIGNED,
    isOnTheWay: normalized === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    isArrivedAtPickup: normalized === SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    isPickedUp: normalized === SHIPMENT_STATUS.PICKED_UP,
    isDelivered: normalized === SHIPMENT_STATUS.DELIVERED,
    isCancelled: normalized === SHIPMENT_STATUS.CANCELLED,
    isInTransit: normalized === SHIPMENT_STATUS.PICKED_UP,
  };
};

/**
 * Get carrier action permissions based on current status
 */
export const getCarrierActionPermissions = (status, isCarrier, isPreviewOnly, isCancelled) => {
  if (!isCarrier || isPreviewOnly || isCancelled) {
    return {
      canStartTrip: false,
      canMarkArrived: false,
      canMarkPickup: false,
      canMarkDelivery: false,
    };
  }

  const normalized = normalizeStatus(status);

  return {
    canStartTrip: normalized === SHIPMENT_STATUS.ASSIGNED,
    canMarkArrived: normalized === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    canMarkPickup: normalized === SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    canMarkDelivery: normalized === SHIPMENT_STATUS.PICKED_UP,
  };
};

// Cancellation rules now live in cancellation-policy.js — one shared source
// of truth between backend and frontend. These thin wrappers preserve the
// existing call sites.
import {
  evaluateCustomerCancel,
  evaluateCarrierDrop,
} from './cancellation-policy';

export const canCancelBooking = (status, cancelledBy = 'CUSTOMER') => {
  const result = cancelledBy === 'CARRIER'
    ? evaluateCarrierDrop(status)
    : evaluateCustomerCancel(status);
  return !!result.allowed;
};

export const getCancellationFee = (status) => {
  return evaluateCustomerCancel(status).carrierDispatchFee || 0;
};

export const getCancellationMessage = (status, cancelledBy = 'CUSTOMER') => {
  const result = cancelledBy === 'CARRIER'
    ? evaluateCarrierDrop(status)
    : evaluateCustomerCancel(status);

  if (!result.allowed) {
    return result.reason || 'This booking cannot be cancelled.';
  }
  if (result.detail) return result.detail;
  if (cancelledBy === 'CARRIER') {
    return result.carrierPenalty
      ? 'Dropping this load may affect your reliability score.'
      : 'You can drop this load before you start driving.';
  }
  return 'No cancellation fee will apply.';
};

// ============================================================
// TIMEZONE CONVERSION HELPERS
// ============================================================

/**
 * Dev-only testable NOW function
 */
const getTestableNow = () => {
  if (typeof window !== 'undefined' && window.__TZ_DEBUG_NOW__) {
    return window.__TZ_DEBUG_NOW__;
  }
  return Date.now();
};

/**
 * Parse time string to hours and minutes
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  
  const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return { hours, minutes };
  }
  
  const militaryMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    return {
      hours: parseInt(militaryMatch[1], 10),
      minutes: parseInt(militaryMatch[2], 10),
    };
  }
  
  return null;
};

/**
 * Convert a local date+time in a specific timezone to UTC timestamp
 */
const localDateTimeToUTC = (dateStr, timeStr, timezone) => {
  if (!dateStr) return null;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  
  let targetHours = 0;
  let targetMinutes = 0;
  
  if (timeStr) {
    const time = parseTimeString(timeStr);
    if (time) {
      targetHours = time.hours;
      targetMinutes = time.minutes;
    }
  }
  
  if (!timezone) {
    return new Date(year, month - 1, day, targetHours, targetMinutes, 0, 0).getTime();
  }
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  let guessUTC = Date.UTC(year, month - 1, day, targetHours, targetMinutes, 0, 0);
  
  for (let iteration = 0; iteration < 5; iteration++) {
    const parts = formatter.formatToParts(new Date(guessUTC));
    
    const guessYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
    const guessMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
    const guessDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
    const guessHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const guessMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    const targetTotal = new Date(year, month - 1, day, targetHours, targetMinutes).getTime();
    const guessTotal = new Date(guessYear, guessMonth - 1, guessDay, guessHour, guessMinute).getTime();
    const diffMs = targetTotal - guessTotal;
    const diffMinutes = Math.round(diffMs / (60 * 1000));
    
    if (Math.abs(diffMinutes) < 1) break;
    
    guessUTC += diffMinutes * 60 * 1000;
  }
  
  return guessUTC;
};

/**
 * Check if arrival is allowed based on time window
 * Uses pickup location timezone for accurate calculation
 * 
 * @param {string} scheduledDate - The scheduled pickup date (YYYY-MM-DD)
 * @param {string} windowStart - Pickup window start time (e.g., "10:00 AM")
 * @param {string} windowEnd - Pickup window end time (e.g., "2:00 PM")
 * @param {string} pickupState - Two-letter state code for pickup location
 * @param {number} bufferBeforeHours - Hours before window to allow arrival (default: 2)
 * @param {number} bufferAfterHours - Hours after window to allow arrival (default: 4)
 */
export const isArrivalAllowed = (
  scheduledDate,
  windowStart = null,
  windowEnd = null,
  pickupState = null,
  bufferBeforeHours = 2,
  bufferAfterHours = 4
) => {
  if (!scheduledDate) {
    return { allowed: true, reason: null };
  }
  
  // Get timezone from pickup state
  const pickupTZ = pickupState ? getTimezoneForState(pickupState) : null;
  const tzAbbr = pickupTZ ? getTimezoneAbbreviation(pickupTZ) : '';
  
  // Current time as UTC timestamp
  const nowUTC = getTestableNow();
  
  // If no time window, use date-only check
  if (!windowStart && !windowEnd) {
    const dayStartUTC = localDateTimeToUTC(scheduledDate, '00:00', pickupTZ);
    
    if (!dayStartUTC || isNaN(dayStartUTC)) {
      return { allowed: true, reason: null };
    }
    
    const allowedStartUTC = dayStartUTC - (bufferBeforeHours * 60 * 60 * 1000);
    const allowedEndUTC = dayStartUTC + (24 * 60 * 60 * 1000) + (bufferAfterHours * 60 * 60 * 1000);
    
    if (nowUTC < allowedStartUTC) {
      const diffMs = allowedStartUTC - nowUTC;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      const tzLabel = tzAbbr ? ` (${tzAbbr})` : '';
      
      let timeUntil;
      if (diffDays > 0) {
        timeUntil = `${diffDays}d ${diffHours % 24}h`;
      } else if (diffHours > 0) {
        timeUntil = `${diffHours}h ${diffMins}m`;
      } else {
        timeUntil = `${diffMins}m`;
      }
      
      return {
        allowed: false,
        reason: `Available in ${timeUntil}${tzLabel}`,
        availableAt: new Date(allowedStartUTC),
        timezone: tzAbbr,
      };
    }
    
    if (nowUTC > allowedEndUTC) {
      return { allowed: false, reason: 'Pickup window has passed' };
    }
    
    return { allowed: true, reason: null };
  }
  
  // Has time window - precise check
  const windowStartUTC = localDateTimeToUTC(scheduledDate, windowStart, pickupTZ);
  const windowEndUTC = localDateTimeToUTC(scheduledDate, windowEnd, pickupTZ);
  
  const effectiveStartUTC = windowStartUTC || windowEndUTC;
  const effectiveEndUTC = windowEndUTC || windowStartUTC;
  
  if (!effectiveStartUTC) {
    return { allowed: true, reason: null };
  }
  
  const allowedStartUTC = effectiveStartUTC - (bufferBeforeHours * 60 * 60 * 1000);
  const allowedEndUTC = effectiveEndUTC + (bufferAfterHours * 60 * 60 * 1000);
  
  if (nowUTC < allowedStartUTC) {
    const diffMs = allowedStartUTC - nowUTC;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let timeUntil;
    if (diffDays > 0) {
      timeUntil = `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      timeUntil = `${diffHours}h ${diffMins}m`;
    } else {
      timeUntil = `${diffMins}m`;
    }
    
    const tzLabel = tzAbbr ? ` (${tzAbbr})` : '';
    
    return {
      allowed: false,
      reason: `Available in ${timeUntil}${tzLabel}`,
      availableAt: new Date(allowedStartUTC),
      timezone: tzAbbr,
    };
  }
  
  if (nowUTC > allowedEndUTC) {
    return { allowed: false, reason: 'Pickup window has passed' };
  }
  
  return { allowed: true, reason: null };
};

export default {
  getStatusFlags,
  getCarrierActionPermissions,
  canCancelBooking,
  getCancellationFee,
  getCancellationMessage,
  isArrivalAllowed,
};