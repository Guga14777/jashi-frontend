// ============================================================
// FILE: server/controllers/booking/booking.carrier.status.controller.cjs
// Carrier status transition operations
// ✅ UPDATED: Origin-type-aware arrival validation
// ✅ UPDATED: Attempt authorization enforcement
// - Auction/Dealership: Flexible arrival (day-based, business hours)
// - Residential: Strict time window with optional early arrival
// - Gate pass & appointment validation before pickup attempts
// ============================================================

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  normalizeStatus,
  validateStatusTransition,
  getPickupAllowedStatuses,
  getDeliveryAllowedStatuses,
  linkPhotosToBooking,
  calculateTotalPayout,
} = require('../../services/booking/index.cjs');

// ✅ NEW: Import authorization service
const {
  checkAttemptAuthorization,
  validateAuthorizationForTransition,
  AUTHORIZATION_STATUS,
} = require('../../services/booking/booking.authorization.service.cjs');

let createCarrierPayoutInternal, determinePayoutMethod;
try {
  const payments = require('../payments.controller.cjs');
  createCarrierPayoutInternal = payments.createCarrierPayoutInternal;
  determinePayoutMethod = payments.determinePayoutMethod;
} catch (e) {
  console.warn('⚠️ payments.controller.cjs not found');
}

// ============================================================
// TIME WINDOW CONFIGURATION
// ============================================================
const ARRIVAL_BUFFER_BEFORE_HOURS = 2;  // Can arrive 2 hours before window starts (residential)
const ARRIVAL_BUFFER_AFTER_HOURS = 4;   // Can arrive up to 4 hours after window ends

// ✅ Business hours for auction/dealership (flexible scheduling)
const BUSINESS_HOURS_START = 8;  // 8 AM
const BUSINESS_HOURS_END = 18;   // 6 PM

// ============================================================
// State to IANA Timezone Mapping
// ============================================================
const STATE_TIMEZONE_MAP = {
  // Eastern Time
  CT: 'America/New_York', DC: 'America/New_York', DE: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', IN: 'America/Indiana/Indianapolis',
  KY: 'America/New_York', MA: 'America/New_York', MD: 'America/New_York',
  ME: 'America/New_York', MI: 'America/Detroit', NC: 'America/New_York',
  NH: 'America/New_York', NJ: 'America/New_York', NY: 'America/New_York',
  OH: 'America/New_York', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', VA: 'America/New_York', VT: 'America/New_York',
  WV: 'America/New_York',
  // Central Time
  AL: 'America/Chicago', AR: 'America/Chicago', IA: 'America/Chicago',
  IL: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MO: 'America/Chicago', MS: 'America/Chicago',
  NE: 'America/Chicago', ND: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  WI: 'America/Chicago',
  // Mountain Time
  AZ: 'America/Phoenix', CO: 'America/Denver', ID: 'America/Boise',
  MT: 'America/Denver', NM: 'America/Denver', UT: 'America/Denver',
  WY: 'America/Denver',
  // Pacific Time
  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles',
  OR: 'America/Los_Angeles', WA: 'America/Los_Angeles',
};

const getTimezoneForState = (stateCode) => {
  if (!stateCode) return null;
  return STATE_TIMEZONE_MAP[stateCode.toUpperCase().trim()] || null;
};

const getTimezoneAbbreviation = (timezone) => {
  if (!timezone) return '';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
};

// ============================================================
// HELPER: Parse time string (e.g., "10:00 AM", "14:00")
// ============================================================
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

// ============================================================
// Convert local date+time in a specific timezone to UTC
// ============================================================
const localDateTimeToUTC = (dateStr, timeStr, timezone) => {
  if (!dateStr) return null;
  
  let year, month, day;
  
  if (dateStr instanceof Date) {
    year = dateStr.getFullYear();
    month = dateStr.getMonth() + 1;
    day = dateStr.getDate();
  } else if (typeof dateStr === 'string') {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
  } else {
    return null;
  }
  
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
    console.warn('⚠️ [localDateTimeToUTC] No timezone provided, using UTC');
    return Date.UTC(year, month - 1, day, targetHours, targetMinutes, 0, 0);
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
    
    const targetTotal = Date.UTC(year, month - 1, day, targetHours, targetMinutes);
    const guessTotal = Date.UTC(guessYear, guessMonth - 1, guessDay, guessHour, guessMinute);
    const diffMs = targetTotal - guessTotal;
    const diffMinutes = Math.round(diffMs / (60 * 1000));
    
    if (Math.abs(diffMinutes) < 1) break;
    
    guessUTC += diffMinutes * 60 * 1000;
  }
  
  return guessUTC;
};

const formatInTimezone = (utcTimestamp, timezone) => {
  if (!utcTimestamp) return 'N/A';
  const date = new Date(utcTimestamp);
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return date.toISOString();
  }
};

// ============================================================
// HELPER: Extract pickup state from booking data
// ============================================================
const extractPickupState = (booking) => {
  if (!booking) return null;
  
  if (booking.pickupState) {
    const state = booking.pickupState.trim().toUpperCase();
    if (state.length === 2) return state;
  }
  
  if (booking.fromState) {
    const state = booking.fromState.trim().toUpperCase();
    if (state.length === 2) return state;
  }
  
  if (booking.pickup) {
    try {
      const pickup = typeof booking.pickup === 'string' ? JSON.parse(booking.pickup) : booking.pickup;
      if (pickup.state) {
        const state = pickup.state.trim().toUpperCase();
        if (state.length === 2) return state;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  if (booking.origin) {
    const match = booking.origin.match(/,\s*([A-Za-z]{2})$/);
    if (match) return match[1].toUpperCase();
  }
  
  return null;
};

// ============================================================
// ✅ HELPER: Determine if origin type is "flexible" (auction/dealership)
// ============================================================
const isFlexibleOriginType = (originType) => {
  if (!originType) return false;
  const normalized = originType.toLowerCase().trim();
  return normalized === 'auction' || normalized === 'dealership';
};

// ============================================================
// ✅ HELPER: Extract pickup origin type from booking
// ============================================================
const extractPickupOriginType = (booking) => {
  if (!booking) return null;
  
  // Direct field
  if (booking.pickupOriginType) {
    return booking.pickupOriginType.toLowerCase().trim();
  }
  
  // From pickup JSON
  if (booking.pickup) {
    try {
      const pickup = typeof booking.pickup === 'string' ? JSON.parse(booking.pickup) : booking.pickup;
      if (pickup.originType) {
        return pickup.originType.toLowerCase().trim();
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // From scheduling JSON
  if (booking.scheduling) {
    try {
      const scheduling = typeof booking.scheduling === 'string' ? JSON.parse(booking.scheduling) : booking.scheduling;
      if (scheduling.pickupOriginType) {
        return scheduling.pickupOriginType.toLowerCase().trim();
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return null;
};

// ============================================================
// ✅ HELPER: Extract early arrival setting
// ============================================================
const extractEarlyArrivalAllowed = (booking) => {
  if (!booking) return false;
  
  // Direct field
  if (typeof booking.pickupEarlyArrivalAllowed === 'boolean') {
    return booking.pickupEarlyArrivalAllowed;
  }
  
  // From scheduling JSON
  if (booking.scheduling) {
    try {
      const scheduling = typeof booking.scheduling === 'string' ? JSON.parse(booking.scheduling) : booking.scheduling;
      if (typeof scheduling.pickupEarlyArrivalAllowed === 'boolean') {
        return scheduling.pickupEarlyArrivalAllowed;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return false;
};

// ============================================================
// HELPER: Extract pickup time window from booking
// ============================================================
const extractPickupTimeWindow = (booking) => {
  let pickupWindowStart = null;
  let pickupWindowEnd = null;
  
  if (booking.pickupWindowStart) pickupWindowStart = booking.pickupWindowStart;
  if (booking.pickupWindowEnd) pickupWindowEnd = booking.pickupWindowEnd;
  
  if (booking.pickup) {
    try {
      const pickup = typeof booking.pickup === 'string' ? JSON.parse(booking.pickup) : booking.pickup;
      if (pickup.timeWindowStart) pickupWindowStart = pickup.timeWindowStart;
      if (pickup.timeWindowEnd) pickupWindowEnd = pickup.timeWindowEnd;
      if (pickup.windowStart) pickupWindowStart = pickup.windowStart;
      if (pickup.windowEnd) pickupWindowEnd = pickup.windowEnd;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  return { pickupWindowStart, pickupWindowEnd };
};

// ============================================================
// ✅ UPDATED: Check if current time is within allowed arrival window
// Now supports origin-type-based rules:
// - Auction/Dealership: Day-based check (business hours on pickup date)
// - Residential: Time window check with optional early arrival
// ============================================================
const isArrivalTimeValid = (booking) => {
  const scheduledPickup = booking.scheduledPickupDate || booking.pickupDate || booking.estimatedPickup;
  
  if (!scheduledPickup) {
    console.log('⚠️ [ARRIVAL CHECK] No scheduled pickup date found, allowing action');
    return { valid: true, message: null };
  }
  
  const pickupOriginType = extractPickupOriginType(booking);
  const earlyArrivalAllowed = extractEarlyArrivalAllowed(booking);
  const { pickupWindowStart, pickupWindowEnd } = extractPickupTimeWindow(booking);
  const pickupState = extractPickupState(booking);
  const pickupTZ = pickupState ? getTimezoneForState(pickupState) : null;
  const tzAbbr = pickupTZ ? getTimezoneAbbreviation(pickupTZ) : '';
  
  const nowUTC = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🕐 [ARRIVAL CHECK] Origin-type-aware validation');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📥 Input:');
  console.log('   scheduledPickup:', scheduledPickup);
  console.log('   pickupOriginType:', pickupOriginType || 'NOT SET (defaulting to residential)');
  console.log('   earlyArrivalAllowed:', earlyArrivalAllowed);
  console.log('   pickupWindowStart:', pickupWindowStart);
  console.log('   pickupWindowEnd:', pickupWindowEnd);
  console.log('   pickupState:', pickupState || '⚠️ NOT FOUND');
  console.log('   pickupTZ:', pickupTZ || '⚠️ NULL');
  console.log('   nowUTC:', new Date(nowUTC).toISOString());
  
  // Extract date string
  let dateStr;
  if (typeof scheduledPickup === 'string') {
    const match = scheduledPickup.match(/^(\d{4}-\d{2}-\d{2})/);
    dateStr = match ? match[1] : scheduledPickup;
  } else if (scheduledPickup instanceof Date) {
    const y = scheduledPickup.getFullYear();
    const m = String(scheduledPickup.getMonth() + 1).padStart(2, '0');
    const d = String(scheduledPickup.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  } else {
    dateStr = String(scheduledPickup);
  }
  
  try {
    // ✅ FLEXIBLE ORIGIN (Auction/Dealership): Day-based check with business hours
    if (isFlexibleOriginType(pickupOriginType)) {
      console.log('📍 Using FLEXIBLE scheduling rules (auction/dealership)');
      
      // Carrier can arrive anytime during business hours on pickup date
      // No strict time window validation
      const dayStartUTC = localDateTimeToUTC(dateStr, `${BUSINESS_HOURS_START}:00`, pickupTZ);
      const dayEndUTC = localDateTimeToUTC(dateStr, `${BUSINESS_HOURS_END}:00`, pickupTZ);
      
      if (!dayStartUTC) {
        console.log('⚠️ Could not parse date, allowing action');
        return { valid: true, message: null };
      }
      
      // For auction/dealership, allow arrival starting at midnight (00:00) on the pickup date
      // This gives carriers flexibility to queue up early at auctions
      const availableAtUTC = localDateTimeToUTC(dateStr, '00:00', pickupTZ);
      const allowedEndUTC = dayEndUTC + (ARRIVAL_BUFFER_AFTER_HOURS * 60 * 60 * 1000);
      
      console.log('📅 Flexible arrival window (UTC):');
      console.log('   availableAtUTC (midnight):', new Date(availableAtUTC).toISOString());
      console.log('   allowedEndUTC:', new Date(allowedEndUTC).toISOString());
      
      if (nowUTC < availableAtUTC) {
        const diffMs = availableAtUTC - nowUTC;
        const totalMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
        const diffHours = Math.floor(totalMinutes / 60);
        const diffMins = totalMinutes % 60;
        
        let timeUntil;
        if (diffHours >= 24) {
          const diffDays = Math.floor(diffHours / 24);
          const remainingHours = diffHours % 24;
          timeUntil = remainingHours > 0 
            ? `${diffDays}d ${remainingHours}h ${diffMins}m`
            : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          timeUntil = `${diffHours}h ${diffMins}m`;
        } else {
          timeUntil = `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
        }
        
        console.log('🚫 NOT ALLOWED: Before pickup date');
        console.log('═══════════════════════════════════════════════════════════════');
        
        return {
          valid: false,
          code: 'ARRIVAL_TOO_EARLY',
          message: `The pickup date is ${dateStr}. You can mark arrived in ${timeUntil}.`,
          scheduledDate: scheduledPickup,
          availableAt: new Date(availableAtUTC).toISOString(),
          originType: pickupOriginType,
        };
      }
      
      if (nowUTC > allowedEndUTC) {
        console.log('🚫 NOT ALLOWED: Pickup date passed');
        console.log('═══════════════════════════════════════════════════════════════');
        return {
          valid: false,
          code: 'ARRIVAL_TOO_LATE',
          message: 'Pickup date has passed. Please contact support.',
          scheduledDate: scheduledPickup,
          originType: pickupOriginType,
        };
      }
      
      console.log('✅ ALLOWED: Within flexible pickup date window');
      console.log('═══════════════════════════════════════════════════════════════');
      return { valid: true, message: null, originType: pickupOriginType };
    }
    
    // ✅ RESIDENTIAL: Strict time window with optional early arrival
    console.log('📍 Using RESIDENTIAL scheduling rules (strict time window)');
    console.log('   earlyArrivalAllowed:', earlyArrivalAllowed);
    
    // Calculate early arrival buffer
    const effectiveBufferHours = earlyArrivalAllowed ? ARRIVAL_BUFFER_BEFORE_HOURS : 0;
    console.log('   effectiveBufferHours:', effectiveBufferHours);
    
    // If we have specific time windows, use them
    if (pickupWindowStart || pickupWindowEnd) {
      const windowStartUTC = localDateTimeToUTC(dateStr, pickupWindowStart || '00:00', pickupTZ);
      const windowEndUTC = localDateTimeToUTC(dateStr, pickupWindowEnd || '23:59', pickupTZ);
      
      const effectiveStartUTC = windowStartUTC || windowEndUTC;
      const effectiveEndUTC = windowEndUTC || windowStartUTC;
      
      console.log('📅 Window times (UTC):');
      console.log('   windowStartUTC:', windowStartUTC ? new Date(windowStartUTC).toISOString() : 'null');
      console.log('   windowEndUTC:', windowEndUTC ? new Date(windowEndUTC).toISOString() : 'null');
      
      if (!effectiveStartUTC) {
        console.log('⚠️ Could not parse window times, allowing action');
        return { valid: true, message: null };
      }
      
      // ✅ Apply early arrival buffer only if enabled
      const availableAtUTC = effectiveStartUTC - (effectiveBufferHours * 60 * 60 * 1000);
      const allowedEndUTC = effectiveEndUTC + (ARRIVAL_BUFFER_AFTER_HOURS * 60 * 60 * 1000);
      
      console.log('✅ Available at:');
      console.log('   availableAtUTC:', new Date(availableAtUTC).toISOString());
      console.log('   availableAtInTZ:', pickupTZ ? formatInTimezone(availableAtUTC, pickupTZ) : 'N/A');
      console.log('   earlyArrivalApplied:', effectiveBufferHours > 0);
      
      if (nowUTC < availableAtUTC) {
        const diffMs = availableAtUTC - nowUTC;
        const totalMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
        const diffHours = Math.floor(totalMinutes / 60);
        const diffMins = totalMinutes % 60;
        
        let timeUntil;
        if (diffHours >= 24) {
          const diffDays = Math.floor(diffHours / 24);
          const remainingHours = diffHours % 24;
          timeUntil = remainingHours > 0 
            ? `${diffDays}d ${remainingHours}h ${diffMins}m`
            : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          timeUntil = `${diffHours}h ${diffMins}m`;
        } else {
          timeUntil = `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
        }
        
        const tzLabel = tzAbbr ? ` ${tzAbbr}` : '';
        const availableAtFormatted = pickupTZ ? formatInTimezone(availableAtUTC, pickupTZ) : '';
        
        let message;
        if (earlyArrivalAllowed) {
          message = `Too early. Window starts at ${pickupWindowStart}${tzLabel}. You can mark arrived at ${availableAtFormatted}${tzLabel} (2 hours early allowed).`;
        } else {
          message = `Too early. Window starts at ${pickupWindowStart}${tzLabel}. You can mark arrived in ${timeUntil}.`;
        }
        
        console.log('🚫 NOT ALLOWED: Too early');
        console.log('═══════════════════════════════════════════════════════════════');
        
        return {
          valid: false,
          code: 'ARRIVAL_TOO_EARLY',
          message,
          scheduledDate: scheduledPickup,
          availableAt: new Date(availableAtUTC).toISOString(),
          pickupWindowStart,
          pickupWindowEnd,
          timezone: tzAbbr,
          earlyArrivalAllowed,
        };
      }
      
      if (nowUTC > allowedEndUTC) {
        console.log('🚫 NOT ALLOWED: Window passed');
        console.log('═══════════════════════════════════════════════════════════════');
        return {
          valid: false,
          code: 'ARRIVAL_TOO_LATE',
          message: 'Pickup window has passed. Please contact support.',
          scheduledDate: scheduledPickup,
          pickupWindowStart,
          pickupWindowEnd,
        };
      }
      
      console.log('✅ ALLOWED: Within arrival window');
      console.log('═══════════════════════════════════════════════════════════════');
      return { valid: true, message: null, earlyArrivalAllowed };
    }
    
    // No specific time window - use day-based check with early arrival option
    console.log('⚠️ No time window specified - using day-based check');
    
    const dayStartUTC = localDateTimeToUTC(dateStr, '00:00', pickupTZ);
    const dayEndUTC = localDateTimeToUTC(dateStr, '23:59', pickupTZ);
    
    if (!dayStartUTC) {
      console.log('⚠️ Could not parse date, allowing action');
      return { valid: true, message: null };
    }
    
    // For residential without time window, allow from start of day (no early arrival)
    const availableAtUTCDay = dayStartUTC;
    const allowedEndUTCDay = dayEndUTC + (ARRIVAL_BUFFER_AFTER_HOURS * 60 * 60 * 1000);
    
    console.log('   availableAtUTC:', new Date(availableAtUTCDay).toISOString());
    console.log('   allowedEndUTC:', new Date(allowedEndUTCDay).toISOString());
    
    if (nowUTC < availableAtUTCDay) {
      const diffMs = availableAtUTCDay - nowUTC;
      const totalMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
      const diffHours = Math.floor(totalMinutes / 60);
      const diffMins = totalMinutes % 60;
      const diffDays = Math.floor(diffHours / 24);
      
      let timeUntil;
      if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        timeUntil = remainingHours > 0
          ? `${diffDays}d ${remainingHours}h ${diffMins}m`
          : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        timeUntil = `${diffHours}h ${diffMins}m`;
      } else {
        timeUntil = `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
      }
      
      console.log('🚫 NOT ALLOWED: Too early (day-based)');
      console.log('═══════════════════════════════════════════════════════════════');
      
      return {
        valid: false,
        code: 'ARRIVAL_TOO_EARLY',
        message: `Too early. You can mark arrived in ${timeUntil}.`,
        scheduledDate: scheduledPickup,
        availableAt: new Date(availableAtUTCDay).toISOString(),
      };
    }
    
    if (nowUTC > allowedEndUTCDay) {
      console.log('🚫 NOT ALLOWED: Day passed');
      console.log('═══════════════════════════════════════════════════════════════');
      return {
        valid: false,
        code: 'ARRIVAL_TOO_LATE',
        message: 'Pickup window has passed. Please contact support.',
        scheduledDate: scheduledPickup,
      };
    }
    
    console.log('✅ ALLOWED: Within day window');
    console.log('═══════════════════════════════════════════════════════════════');
    return { valid: true, message: null };
    
  } catch (e) {
    console.error('⚠️ [ARRIVAL CHECK] Error:', e.message);
    return { valid: true, message: null };
  }
};

// Test accounts allowed to bypass authorization + time-window gates on
// status transitions when { force: true } is sent in the POST body.
// Limited to a hard-coded test email so a stray force:true from a real
// carrier is rejected. Adding more accounts is a code change, not a
// runtime toggle, on purpose. Stored normalized (lowercased + trimmed)
// so the membership check below cannot miss because of casing or
// whitespace from the JWT or DB.
const FORCE_ALLOWED_EMAILS = new Set(
  ['gjashi10@gmail.com'].map((e) => e.trim().toLowerCase())
);
// Backwards-compat alias — keep the old name available.
const FORCE_START_ALLOWED_EMAILS = FORCE_ALLOWED_EMAILS;

/**
 * Central "is the caller allowed to force a transition?" check.
 *
 * Resolves the caller's email from every shape the auth middleware
 * may have populated (req.user.email is the canonical one, but older
 * code paths set req.userEmail) and falls back to a fresh User row
 * lookup so a test tier added by email mid-session still works.
 *
 * Returns true ONLY when:
 *   - the request body carries { force: true }, AND
 *   - the resolved email is on FORCE_ALLOWED_EMAILS.
 *
 * Logs the outcome so audit trail / "did the override actually fire?"
 * questions are answerable from the server log.
 */
async function isForceAllowed(req, transitionLabel) {
  const rawForce = req.body?.force;
  const force = rawForce === true || rawForce === 'true';

  // Resolve the caller email from every shape the auth middleware can
  // populate (JWT-claimed first to avoid the DB round-trip).
  let actorEmail = '';
  if (req.user?.email) {
    actorEmail = String(req.user.email).trim().toLowerCase();
  } else if (req.userEmail) {
    actorEmail = String(req.userEmail).trim().toLowerCase();
  }

  if (!actorEmail && req.userId) {
    try {
      const actor = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { email: true },
      });
      actorEmail = (actor?.email || '').trim().toLowerCase();
    } catch (e) {
      console.warn(`[FORCE] User lookup failed for ${req.userId}:`, e.message);
    }
  }

  const onAllowlist = !!actorEmail && FORCE_ALLOWED_EMAILS.has(actorEmail);
  const allowed = force && onAllowlist;

  // Verbose log so "did the override fire?" is answerable from a
  // single grep of the server log.
  console.log(
    `[FORCE-CHECK] ${transitionLabel} bookingId=${req.params?.id} ` +
    `body.force=${JSON.stringify(rawForce)} email=${actorEmail || '<unknown>'} ` +
    `onAllowlist=${onAllowlist} allowed=${allowed}`
  );

  if (allowed) {
    console.log(`[FORCED] ${transitionLabel} by ${actorEmail} on ${req.params?.id}`);
  } else if (force && !onAllowlist) {
    console.log(
      `🚫 [FORCE REJECTED] ${transitionLabel} requested by ${actorEmail || '<unknown>'} (not on allowlist)`
    );
  }
  return allowed;
}

// ============================================================
// POST /api/carrier/loads/:id/start-trip
// ✅ UPDATED: Now checks authorization before allowing start
// ✅ Test override: { force: true } bypasses the time/auth gate so the
//    test account can drive a load through the full status lifecycle
//    even when pickup is days away. Status transition, ownership, and
//    auth middleware checks still apply.
// ============================================================
const startTripToPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    console.log(
      `[START-TRIP] incoming bookingId=${id} carrierId=${carrierId} body=`,
      req.body
    );

    // ✅ Include gate pass and documents for authorization check
    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: {
        user: { select: { id: true } },
        pickupGatePass: true,
        documents: { where: { type: { in: ['gate_pass', 'pickup_gatepass'] } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const validation = validateStatusTransition(booking.status, SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        currentStatus: normalizeStatus(booking.status),
        expectedStatus: SHIPMENT_STATUS.ASSIGNED,
      });
    }

    const allowForce = await isForceAllowed(req, 'START_TRIP');

    // ✅ NEW: Check authorization before allowing start trip — unless
    // force was requested AND the caller is on the test allowlist.
    const authResult = allowForce
      ? { allowed: true, protected: false }
      : validateAuthorizationForTransition(booking, 'on_the_way_to_pickup');

    if (!authResult.allowed) {
      console.log(`🚫 [START TRIP] Authorization blocked for ${id}: ${authResult.error}`);
      return res.status(400).json({
        error: authResult.error,
        code: 'NOT_AUTHORIZED',
        reasons: authResult.reasons,
        hint: 'Please ensure all requirements are met before starting trip',
      });
    }

    const now = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
        tripStartedAt: now,
        onTheWayAt: now,
        updatedAt: now,
        // protectionApplied / protectionReasons are NOT persisted on
        // Booking — they are computed at request time from
        // validateAuthorizationForTransition (and re-computed on the
        // client too). The previous "track on the row" pattern referenced
        // columns that don't exist in the schema and would crash any
        // request where authResult.protected was true.
      },
    });

    console.log(`🚗 [START TRIP] Carrier ${carrierId} started trip for booking ${id}${authResult.protected ? ' (PROTECTED)' : ''}${allowForce ? ' [FORCED]' : ''}`);

    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.statusChanged(booking, SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP);
    } catch (e) {
      console.error('Notify (on the way) failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Trip to pickup started',
      protected: authResult.protected || false,
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP],
        statusStep: 2,
        tripStartedAt: now,
        onTheWayAt: now,
      },
    });
  } catch (error) {
    console.error('❌ [START TRIP] Error:', error);
    res.status(500).json({ error: 'Failed to start trip', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/arrived-at-pickup
// ✅ UPDATED: Now checks authorization before allowing arrival
// ============================================================
const markArrivedAtPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    console.log(
      `[ARRIVED] incoming bookingId=${id} carrierId=${carrierId} body=`,
      req.body
    );

    // ✅ Include gate pass and documents for authorization check
    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: {
        user: { select: { id: true } },
        pickupGatePass: true,
        documents: { where: { type: { in: ['gate_pass', 'pickup_gatepass'] } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const validation = validateStatusTransition(booking.status, SHIPMENT_STATUS.ARRIVED_AT_PICKUP);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        currentStatus: normalizeStatus(booking.status),
        hint: 'You must start trip first before marking as arrived',
      });
    }

    const allowForce = await isForceAllowed(req, 'ARRIVED');

    // ✅ NEW: Check authorization before allowing arrival — unless
    // force was requested AND the caller is on the test allowlist.
    const authResult = allowForce
      ? { allowed: true, protected: false }
      : validateAuthorizationForTransition(booking, 'arrived_at_pickup');

    if (!authResult.allowed) {
      console.log(`🚫 [ARRIVED] Authorization blocked for ${id}: ${authResult.error}`);
      return res.status(400).json({
        error: authResult.error,
        code: 'NOT_AUTHORIZED',
        reasons: authResult.reasons,
        hint: 'Please ensure all requirements are met before marking as arrived',
      });
    }

    // Check time window (existing logic) — also bypassed under force.
    if (!allowForce) {
      const arrivalCheck = isArrivalTimeValid(booking);
      if (!arrivalCheck.valid) {
        console.log(`⛔ [ARRIVED] Blocked - ${arrivalCheck.code}: ${arrivalCheck.message}`);
        return res.status(400).json({
          error: arrivalCheck.message,
          code: arrivalCheck.code,
          scheduledDate: arrivalCheck.scheduledDate,
          availableAt: arrivalCheck.availableAt,
          pickupWindowStart: arrivalCheck.pickupWindowStart,
          pickupWindowEnd: arrivalCheck.pickupWindowEnd,
          timezone: arrivalCheck.timezone,
          originType: arrivalCheck.originType,
          earlyArrivalAllowed: arrivalCheck.earlyArrivalAllowed,
          hint: 'You can only mark as arrived within the pickup time window',
        });
      }
    }

    const now = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
        arrivedAtPickupAt: now,
        updatedAt: now,
        // Pickup attempt counter — read by validateAuthorizationForTransition
        // (server) and load-details-modal (client) to gate "first attempt"
        // protection logic.
        pickupAttempts: { increment: 1 },
        // protectionApplied / protectionReasons are computed per-request
        // by validateAuthorizationForTransition; not stored on Booking.
      },
    });

    console.log(`📍 [ARRIVED] Carrier ${carrierId} arrived at pickup for booking ${id}${authResult.protected ? ' (PROTECTED)' : ''}${allowForce ? ' [FORCED]' : ''}`);

    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.statusChanged(booking, SHIPMENT_STATUS.ARRIVED_AT_PICKUP);
    } catch (e) {
      console.error('Notify (arrived) failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Marked as arrived at pickup. Waiting timer started.',
      protected: authResult.protected || false,
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.ARRIVED_AT_PICKUP],
        statusStep: 3,
        arrivedAtPickupAt: now,
        waitTimerStartAt: now,
      },
    });
  } catch (error) {
    console.error('❌ [ARRIVED AT PICKUP] Error:', error);
    res.status(500).json({ error: 'Failed to mark as arrived', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/pickup
// ============================================================
const markLoadAsPickedUp = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    console.log(
      `[PICKUP] incoming bookingId=${id} carrierId=${carrierId} body=`,
      req.body
    );

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: { user: { select: { id: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const allowForce = await isForceAllowed(req, 'PICKUP');
    const currentStatus = normalizeStatus(booking.status);
    const allowedStatuses = getPickupAllowedStatuses();
    // State-machine check still applies — but under force we accept
    // any pre-delivery state so the tester can compress the lifecycle.
    if (!allowForce && !allowedStatuses.includes(currentStatus)) {
      return res.status(400).json({
        error: `Cannot mark as picked up from status: ${currentStatus}`,
        allowedStatuses,
        hint: 'You must arrive at pickup first',
      });
    }

    const { documentIds = [] } = req.body;
    if (documentIds.length > 0) {
      await linkPhotosToBooking(documentIds, id, carrierId, 'pickup_photo');
    }

    const now = new Date();
    let statusChanged = false;
    let updatedBooking = booking;

    if (currentStatus !== SHIPMENT_STATUS.PICKED_UP) {
      updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: SHIPMENT_STATUS.PICKED_UP,
          pickedUpAt: now,
          pickupAt: now,
          updatedAt: now,
        },
      });
      statusChanged = true;

      console.log(`📦 [PICKUP] Carrier ${carrierId} picked up booking ${id}${allowForce ? ' [FORCED]' : ''}`);

      try {
        const notify = require('../../services/notifications.service.cjs');
        await notify.statusChanged(booking, SHIPMENT_STATUS.PICKED_UP);
      } catch (e) {
        console.error('Notify (picked up) failed:', e.message);
      }
    } else {
      await prisma.booking.update({ where: { id }, data: { updatedAt: now } });
    }

    res.json({
      success: true,
      message: statusChanged ? 'Load marked as picked up' : 'Pickup photos added successfully',
      statusChanged,
      photosAdded: documentIds.length,
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.PICKED_UP,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.PICKED_UP],
        statusStep: 4,
        pickedUpAt: now,
      },
    });
  } catch (error) {
    console.error('❌ [PICKUP] Error:', error);
    res.status(500).json({ error: 'Failed to process pickup', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/deliver
// ============================================================
const markLoadAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    console.log(
      `[DELIVERED] incoming bookingId=${id} carrierId=${carrierId} body=`,
      req.body
    );

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: { user: { select: { id: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const allowForce = await isForceAllowed(req, 'DELIVERED');
    const currentStatus = normalizeStatus(booking.status);
    const allowedStatuses = getDeliveryAllowedStatuses();
    if (!allowForce && !allowedStatuses.includes(currentStatus)) {
      return res.status(400).json({
        error: `Cannot mark as delivered from status: ${currentStatus}. Must be 'picked_up'.`,
        hint: 'You must mark as picked up first',
      });
    }

    const { deliveryDocumentIds = [], podDocumentId = null } = req.body;
    if (deliveryDocumentIds.length > 0) {
      await linkPhotosToBooking(deliveryDocumentIds, id, carrierId, 'delivery_photo');
    }
    if (podDocumentId) {
      await prisma.document.update({ where: { id: podDocumentId }, data: { bookingId: id, type: 'pod' } });
    }

    const now = new Date();
    let statusChanged = false;
    let updatedBooking = booking;

    // Under force, accept any pre-delivery state — the tester may have
    // skipped the explicit "Picked Up" step in their lifecycle.
    if (currentStatus === SHIPMENT_STATUS.PICKED_UP || allowForce) {
      updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: SHIPMENT_STATUS.DELIVERED,
          deliveredAt: now,
          ...(podDocumentId && { podDocumentId }),
          updatedAt: now,
        },
      });
      statusChanged = true;

      console.log(`✅ [DELIVERED] Carrier ${carrierId} delivered booking ${id}${allowForce ? ' [FORCED]' : ''}`);

      try {
        const payoutMethod = determinePayoutMethod ? determinePayoutMethod(booking) : 'ach';
        const payoutAmount = calculateTotalPayout(booking);

        if (booking.detentionApprovedAt && booking.detentionAmount > 0) {
          console.log(`💰 [PAYOUT] Adding $${booking.detentionAmount} detention fee`);
        }

        if (payoutAmount > 0 && createCarrierPayoutInternal) {
          await createCarrierPayoutInternal({
            carrierId,
            bookingId: booking.id,
            amount: payoutAmount,
            method: payoutMethod,
          });
        }
      } catch (payoutError) {
        console.error('⚠️ [PAYOUT] Error:', payoutError.message);
      }

      try {
        const notify = require('../../services/notifications.service.cjs');
        await notify.statusChanged(booking, SHIPMENT_STATUS.DELIVERED);
      } catch (e) {
        console.error('Notify (delivered) failed:', e.message);
      }
    } else {
      await prisma.booking.update({
        where: { id },
        data: { ...(podDocumentId && { podDocumentId }), updatedAt: now },
      });
    }

    res.json({
      success: true,
      message: statusChanged ? 'Load marked as delivered' : 'Delivery photos added successfully',
      statusChanged,
      photosAdded: deliveryDocumentIds.length,
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.DELIVERED,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.DELIVERED],
        statusStep: 5,
        deliveredAt: now,
      },
    });
  } catch (error) {
    console.error('❌ [DELIVER] Error:', error);
    res.status(500).json({ error: 'Failed to process delivery', details: error.message });
  }
};

// ============================================================
// GET /api/carrier/loads/:id/can-arrive
// ============================================================
const checkCanArrive = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: {
        pickupGatePass: true,
        documents: { where: { type: { in: ['gate_pass', 'pickup_gatepass'] } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const currentStatus = normalizeStatus(booking.status);
    const arrivalCheck = isArrivalTimeValid(booking);
    const { pickupWindowStart, pickupWindowEnd } = extractPickupTimeWindow(booking);
    const pickupState = extractPickupState(booking);
    const pickupTZ = pickupState ? getTimezoneForState(pickupState) : null;
    const tzAbbr = pickupTZ ? getTimezoneAbbreviation(pickupTZ) : '';
    const pickupOriginType = extractPickupOriginType(booking);
    const earlyArrivalAllowed = extractEarlyArrivalAllowed(booking);
    
    // ✅ Include authorization status
    const authResult = checkAttemptAuthorization(booking);
    
    res.json({
      success: true,
      canArrive: currentStatus === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP && arrivalCheck.valid && authResult.authorized,
      currentStatus,
      arrivalValidation: arrivalCheck,
      scheduledPickupDate: booking.scheduledPickupDate || booking.pickupDate || booking.estimatedPickup,
      pickupWindowStart,
      pickupWindowEnd,
      pickupState,
      pickupTimezone: pickupTZ,
      timezoneAbbr: tzAbbr,
      // ✅ Include origin type info
      pickupOriginType,
      isFlexibleOrigin: isFlexibleOriginType(pickupOriginType),
      earlyArrivalAllowed,
      // ✅ Include authorization info
      authorization: authResult,
    });
  } catch (error) {
    console.error('❌ [CAN ARRIVE CHECK] Error:', error);
    res.status(500).json({ error: 'Failed to check arrival eligibility', details: error.message });
  }
};

// ============================================================
// ✅ NEW: GET /api/carrier/loads/:id/authorization
// Returns current authorization status for a load
// ============================================================
const getAuthorizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: {
        pickupGatePass: true,
        documents: { where: { type: { in: ['gate_pass', 'pickup_gatepass'] } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const authResult = checkAttemptAuthorization(booking);
    
    console.log(`🔐 [AUTHORIZATION] Status for ${id}: ${authResult.status}`);

    res.json({
      success: true,
      authorization: authResult,
    });
  } catch (error) {
    console.error('❌ [GET AUTHORIZATION] Error:', error);
    res.status(500).json({ error: 'Failed to get authorization status', details: error.message });
  }
};

module.exports = {
  startTripToPickup,
  markArrivedAtPickup,
  markLoadAsPickedUp,
  markLoadAsDelivered,
  checkCanArrive,
  // ✅ NEW: Authorization endpoint
  getAuthorizationStatus,
};
