// ============================================================
// FILE: src/utils/timezone-utils.js
// Timezone utilities for pickup/dropoff time display
// 
// Features:
// - State-to-timezone mapping for US states
// - Appointment display formatting with local time labels
// - Cross-timezone clarity for shipper + carrier portals
//
// KNOWN LIMITATION: Some states span multiple timezones (TX, FL, IN, KY, TN).
// This uses the most populous timezone for each state as a simple default.
// For more accuracy, consider ZIP-code-based timezone lookup in the future.
// ============================================================

/**
 * Map of US state codes to IANA timezone identifiers
 * Uses the most populous timezone for states that span multiple zones
 */
export const STATE_TIMEZONE_MAP = {
  // Eastern Time (ET)
  CT: 'America/New_York',
  DC: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',      // Most of FL is Eastern (panhandle is Central)
  GA: 'America/New_York',
  IN: 'America/Indiana/Indianapolis', // Most of IN is Eastern
  KY: 'America/New_York',      // Eastern KY (western KY is Central)
  MA: 'America/New_York',
  MD: 'America/New_York',
  ME: 'America/New_York',
  MI: 'America/Detroit',
  NC: 'America/New_York',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NY: 'America/New_York',
  OH: 'America/New_York',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  VA: 'America/New_York',
  VT: 'America/New_York',
  WV: 'America/New_York',

  // Central Time (CT)
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  IA: 'America/Chicago',
  IL: 'America/Chicago',
  KS: 'America/Chicago',       // Most of KS is Central (western edge is Mountain)
  LA: 'America/Chicago',
  MN: 'America/Chicago',
  MO: 'America/Chicago',
  MS: 'America/Chicago',
  NE: 'America/Chicago',       // Most of NE is Central (western edge is Mountain)
  ND: 'America/Chicago',       // Most of ND is Central (western edge is Mountain)
  OK: 'America/Chicago',
  SD: 'America/Chicago',       // Most of SD is Central (western edge is Mountain)
  TN: 'America/Chicago',       // Most of TN is Central (eastern TN is Eastern)
  TX: 'America/Chicago',       // Most of TX is Central (El Paso area is Mountain)
  WI: 'America/Chicago',

  // Mountain Time (MT)
  AZ: 'America/Phoenix',       // Arizona does NOT observe DST
  CO: 'America/Denver',
  ID: 'America/Boise',         // Southern ID is Mountain, northern is Pacific
  MT: 'America/Denver',
  NM: 'America/Denver',
  UT: 'America/Denver',
  WY: 'America/Denver',

  // Pacific Time (PT)
  CA: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',

  // Alaska
  AK: 'America/Anchorage',

  // Hawaii
  HI: 'Pacific/Honolulu',

  // US Territories
  PR: 'America/Puerto_Rico',
  VI: 'America/Virgin',
  GU: 'Pacific/Guam',
  AS: 'Pacific/Pago_Pago',
  MP: 'Pacific/Guam',
};

/**
 * ZIP code prefix to timezone mapping for edge cases
 * This handles some multi-timezone states more accurately
 */
const ZIP_PREFIX_TIMEZONE_MAP = {
  // Texas - El Paso area (Mountain Time)
  '798': 'America/Denver',
  '799': 'America/Denver',
  '885': 'America/Denver',
  
  // Florida Panhandle (Central Time)
  '324': 'America/Chicago',
  '325': 'America/Chicago',
  
  // Kentucky Western (Central Time)
  '420': 'America/Chicago',
  '421': 'America/Chicago',
  '422': 'America/Chicago',
  
  // Tennessee Eastern (Eastern Time)
  '377': 'America/New_York',
  '378': 'America/New_York',
  '379': 'America/New_York',
  
  // Indiana - some areas are Central
  '466': 'America/Chicago',
  '467': 'America/Chicago',
  '468': 'America/Chicago',
  
  // North Dakota Western (Mountain Time)
  '587': 'America/Denver',
  '588': 'America/Denver',
  
  // Nebraska Western (Mountain Time)  
  '691': 'America/Denver',
  '692': 'America/Denver',
  '693': 'America/Denver',
  
  // South Dakota Western (Mountain Time)
  '577': 'America/Denver',
  
  // Kansas Western (Mountain Time)
  '678': 'America/Denver',
  '679': 'America/Denver',
  
  // Oregon Eastern (Mountain Time)
  '978': 'America/Boise',
  '979': 'America/Boise',
  
  // Idaho Northern (Pacific Time)
  '838': 'America/Los_Angeles',
};

/**
 * Get IANA timezone for a US state code
 * 
 * @param {string} stateCode - Two-letter US state code (e.g., 'CA', 'NY')
 * @returns {string|null} IANA timezone string or null if not found
 * 
 * @example
 * getTimezoneForState('CA') // Returns 'America/Los_Angeles'
 * getTimezoneForState('TX') // Returns 'America/Chicago'
 */
export function getTimezoneForState(stateCode) {
  if (!stateCode) return null;
  const upperCode = stateCode.toUpperCase().trim();
  return STATE_TIMEZONE_MAP[upperCode] || null;
}

/**
 * Get IANA timezone for a ZIP code (more accurate than state-only)
 * Falls back to state-based lookup if ZIP prefix not found
 * 
 * @param {string} zipCode - US ZIP code (5 digits)
 * @param {string} [stateCode] - Optional state code for fallback
 * @returns {string|null} IANA timezone string or null if not found
 * 
 * @example
 * getTimezoneForZip('79901', 'TX') // Returns 'America/Denver' (El Paso)
 * getTimezoneForZip('77001', 'TX') // Returns 'America/Chicago' (Houston)
 */
export function getTimezoneForZip(zipCode, stateCode = null) {
  if (zipCode && typeof zipCode === 'string') {
    const prefix = zipCode.trim().substring(0, 3);
    if (ZIP_PREFIX_TIMEZONE_MAP[prefix]) {
      return ZIP_PREFIX_TIMEZONE_MAP[prefix];
    }
  }
  
  // Fall back to state-based lookup
  return getTimezoneForState(stateCode);
}

/**
 * Get IANA timezone from location object
 * Tries ZIP first, then state, then falls back to user's browser timezone
 * 
 * @param {Object} location - Location object with zip and/or state
 * @param {string} [location.zip] - ZIP code
 * @param {string} [location.state] - State code
 * @returns {string} IANA timezone string (never null)
 * 
 * @example
 * getTimezoneFromLocation({ zip: '79901', state: 'TX' }) // 'America/Denver'
 * getTimezoneFromLocation({ state: 'CA' }) // 'America/Los_Angeles'
 * getTimezoneFromLocation({}) // User's browser timezone
 */
export function getTimezoneFromLocation(location) {
  if (!location) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  const tz = getTimezoneForZip(location.zip, location.state);
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get current time as minutes since midnight in a specific timezone
 * 
 * @param {string} timezone - IANA timezone string (e.g., 'America/Los_Angeles')
 * @returns {number} Minutes since midnight (0-1439)
 * 
 * @example
 * // If it's 2:30 PM in Los Angeles:
 * getCurrentTimeMinutesInTimezone('America/Los_Angeles') // Returns 870 (14*60 + 30)
 */
export function getCurrentTimeMinutesInTimezone(timezone) {
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    return hours * 60 + minutes;
  } catch (err) {
    // Fallback to local time
    return now.getHours() * 60 + now.getMinutes();
  }
}

/**
 * Get today's date in a specific timezone
 * 
 * @param {string} timezone - IANA timezone string
 * @returns {string} Date in YYYY-MM-DD format
 * 
 * @example
 * // If it's Jan 19 in Los Angeles but Jan 20 in UTC:
 * getTodayInTimezone('America/Los_Angeles') // Returns '2026-01-19'
 */
export function getTodayInTimezone(timezone) {
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    // Fallback to local date
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get full date/time components in a specific timezone
 * 
 * @param {Date|string} date - Date to format
 * @param {string} timezone - IANA timezone string
 * @returns {Object} Object with year, month, day, hour, minute, weekday, period
 */
export function getDatePartsInTimezone(date, timezone) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: true,
    });
    
    const parts = formatter.formatToParts(d);
    
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0', 10),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0', 10),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0', 10),
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10),
      weekday: parts.find(p => p.type === 'weekday')?.value || '',
      period: parts.find(p => p.type === 'dayPeriod')?.value || '',
    };
  } catch (err) {
    return null;
  }
}

/**
 * Format minutes since midnight to readable time string
 * 
 * @param {number} totalMinutes - Minutes since midnight (0-1439)
 * @returns {string} Formatted time (e.g., "2:30 PM")
 * 
 * @example
 * formatMinutesToLabel(870) // Returns "2:30 PM"
 * formatMinutesToLabel(0)   // Returns "12:00 AM"
 */
export function formatMinutesToLabel(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return '';
  
  // Handle overflow (e.g., 1500 minutes = 1:00 AM next day)
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  
  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const hourStr = String(hours12);
  const minuteStr = String(minutes).padStart(2, '0');
  
  return `${hourStr}:${minuteStr} ${period}`;
}

/**
 * Get timezone abbreviation (e.g., PST, EST, CST)
 * 
 * @param {string} timezone - IANA timezone string
 * @param {Date} [date] - Optional date (affects DST abbreviation)
 * @returns {string} Timezone abbreviation
 * 
 * @example
 * getTimezoneAbbreviation('America/Los_Angeles') // Returns "PST" or "PDT"
 * getTimezoneAbbreviation('America/New_York')    // Returns "EST" or "EDT"
 */
export function getTimezoneAbbreviation(timezone, date = new Date()) {
  if (!timezone) return '';
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Get full timezone name (e.g., "Pacific Standard Time")
 * 
 * @param {string} timezone - IANA timezone string
 * @param {Date} [date] - Optional date (affects DST naming)
 * @returns {string} Full timezone name
 */
export function getTimezoneName(timezone, date = new Date()) {
  if (!timezone) return '';
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });
    
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

// ============================================================
// APPOINTMENT DISPLAY FUNCTIONS
// For use in shipper and carrier portals
// ============================================================

/**
 * Format appointment time with day and local timezone
 * "Tuesday, 2:00 PM (Local Time)" or "Tuesday, 2:00 PM PST"
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} timeMinutes - Time as minutes since midnight
 * @param {Object} [options] - Formatting options
 * @param {string} [options.timezone] - IANA timezone (for abbreviation)
 * @param {boolean} [options.showYear] - Include year in output
 * @param {boolean} [options.useLocalLabel] - Use "Local Time" instead of abbreviation
 * @returns {string} Formatted appointment string
 * 
 * @example
 * formatAppointment('2026-01-20', 840, { timezone: 'America/Los_Angeles' })
 * // Returns "Tuesday, 2:00 PM PST"
 * 
 * formatAppointment('2026-01-20', 840, { useLocalLabel: true })
 * // Returns "Tuesday, 2:00 PM (Local Time)"
 */
export function formatAppointment(dateStr, timeMinutes, options = {}) {
  const { timezone, showYear = false, useLocalLabel = false } = options;
  
  if (!dateStr) return 'N/A';
  
  // Parse date
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'N/A';
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return 'N/A';
  
  // Get day of week
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Format time
  const timeStr = formatMinutesToLabel(timeMinutes);
  if (!timeStr) return `${weekday}, N/A`;
  
  // Build timezone label
  let tzLabel = '';
  if (useLocalLabel) {
    tzLabel = ' (Local Time)';
  } else if (timezone) {
    const abbrev = getTimezoneAbbreviation(timezone, date);
    tzLabel = abbrev ? ` ${abbrev}` : '';
  }
  
  // Format date portion
  let dateLabel = weekday;
  if (showYear) {
    const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
    dateLabel = `${weekday}, ${monthStr} ${day}, ${year}`;
  }
  
  return `${dateLabel}, ${timeStr}${tzLabel}`;
}

/**
 * Format appointment time range
 * "Tuesday, 9:00 AM - 5:00 PM PST"
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} startMinutes - Start time as minutes since midnight
 * @param {number} endMinutes - End time as minutes since midnight
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted appointment range string
 */
export function formatAppointmentRange(dateStr, startMinutes, endMinutes, options = {}) {
  const { timezone, showYear = false, useLocalLabel = false } = options;
  
  if (!dateStr) return 'N/A';
  
  // Parse date
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'N/A';
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return 'N/A';
  
  // Get day of week
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Format times
  const startStr = formatMinutesToLabel(startMinutes);
  const endStr = formatMinutesToLabel(endMinutes);
  
  // Build timezone label
  let tzLabel = '';
  if (useLocalLabel) {
    tzLabel = ' (Local Time)';
  } else if (timezone) {
    const abbrev = getTimezoneAbbreviation(timezone, date);
    tzLabel = abbrev ? ` ${abbrev}` : '';
  }
  
  // Format date portion
  let dateLabel = weekday;
  if (showYear) {
    const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
    dateLabel = `${weekday}, ${monthStr} ${day}, ${year}`;
  }
  
  if (!startStr && !endStr) return `${dateLabel}${tzLabel}`;
  if (!startStr) return `${dateLabel}, by ${endStr}${tzLabel}`;
  if (!endStr) return `${dateLabel}, from ${startStr}${tzLabel}`;
  
  return `${dateLabel}, ${startStr} - ${endStr}${tzLabel}`;
}

/**
 * Format appointment for compact display
 * "Tue 2:00 PM PST" or "Jan 20, 2:00 PM"
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} timeMinutes - Time as minutes since midnight
 * @param {Object} [options] - Formatting options
 * @returns {string} Compact appointment string
 */
export function formatAppointmentCompact(dateStr, timeMinutes, options = {}) {
  const { timezone, showMonth = false, useLocalLabel = false } = options;
  
  if (!dateStr) return 'N/A';
  
  // Parse date
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'N/A';
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return 'N/A';
  
  // Format time
  const timeStr = formatMinutesToLabel(timeMinutes);
  
  // Build date label
  let dateLabel;
  if (showMonth) {
    const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
    dateLabel = `${monthStr} ${day}`;
  } else {
    dateLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  // Build timezone label
  let tzLabel = '';
  if (useLocalLabel) {
    tzLabel = ' (Local)';
  } else if (timezone) {
    const abbrev = getTimezoneAbbreviation(timezone, date);
    tzLabel = abbrev ? ` ${abbrev}` : '';
  }
  
  if (!timeStr) return `${dateLabel}${tzLabel}`;
  
  return `${dateLabel} ${timeStr}${tzLabel}`;
}

/**
 * Format pickup/dropoff appointment for display
 * Designed to prevent confusion when carrier and location are in different timezones
 * 
 * @param {Object} params - Appointment parameters
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {number} params.timeStart - Start time as minutes since midnight
 * @param {number} [params.timeEnd] - End time as minutes since midnight
 * @param {Object} params.location - Location with state and optionally zip
 * @param {string} [params.location.state] - State code
 * @param {string} [params.location.zip] - ZIP code
 * @param {string} [params.location.city] - City name
 * @param {string} [viewerTimezone] - Viewer's timezone for comparison
 * @returns {Object} Formatted appointment with label and metadata
 * 
 * @example
 * formatLocationAppointment({
 *   date: '2026-01-20',
 *   timeStart: 540,
 *   timeEnd: 600,
 *   location: { state: 'CA', city: 'Los Angeles', zip: '90001' },
 * }, 'America/New_York')
 * // Returns:
 * // {
 * //   label: "Tuesday, 9:00 AM - 10:00 AM PST",
 * //   localLabel: "Tuesday, 9:00 AM - 10:00 AM (Local Time)",
 * //   timezone: "America/Los_Angeles",
 * //   abbreviation: "PST",
 * //   isDifferentTimezone: true,
 * //   viewerTime: "12:00 PM - 1:00 PM EST"
 * // }
 */
export function formatLocationAppointment(params, viewerTimezone = null) {
  const { date, timeStart, timeEnd, location } = params;
  
  if (!date || !location) {
    return {
      label: 'N/A',
      localLabel: 'N/A',
      timezone: null,
      abbreviation: '',
      isDifferentTimezone: false,
      viewerTime: null,
    };
  }
  
  // Get location's timezone
  const locationTz = getTimezoneFromLocation(location);
  const abbrev = getTimezoneAbbreviation(locationTz, new Date(date));
  
  // Determine if viewer is in different timezone
  const viewerTz = viewerTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isDifferentTimezone = locationTz !== viewerTz;
  
  // Format for location's timezone
  const label = timeEnd !== undefined && timeEnd !== null
    ? formatAppointmentRange(date, timeStart, timeEnd, { timezone: locationTz })
    : formatAppointment(date, timeStart, { timezone: locationTz });
  
  const localLabel = timeEnd !== undefined && timeEnd !== null
    ? formatAppointmentRange(date, timeStart, timeEnd, { useLocalLabel: true })
    : formatAppointment(date, timeStart, { useLocalLabel: true });
  
  // Calculate viewer's equivalent time if different timezone
  let viewerTime = null;
  if (isDifferentTimezone && timeStart !== undefined && timeStart !== null) {
    const viewerAbbrev = getTimezoneAbbreviation(viewerTz, new Date(date));
    
    // Calculate timezone offset difference
    const dateParts = date.split('-');
    const testDate = new Date(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10),
      Math.floor(timeStart / 60),
      timeStart % 60
    );
    
    // Get offset for both timezones
    const locationOffset = getTimezoneOffsetMinutes(locationTz, testDate);
    const viewerOffset = getTimezoneOffsetMinutes(viewerTz, testDate);
    const offsetDiff = viewerOffset - locationOffset;
    
    // Adjust times
    const viewerStartMinutes = timeStart + offsetDiff;
    const viewerEndMinutes = timeEnd !== undefined && timeEnd !== null
      ? timeEnd + offsetDiff
      : null;
    
    const viewerStartStr = formatMinutesToLabel(viewerStartMinutes);
    viewerTime = viewerEndMinutes !== null
      ? `${viewerStartStr} - ${formatMinutesToLabel(viewerEndMinutes)} ${viewerAbbrev}`
      : `${viewerStartStr} ${viewerAbbrev}`;
  }
  
  return {
    label,
    localLabel,
    timezone: locationTz,
    abbreviation: abbrev,
    isDifferentTimezone,
    viewerTime,
  };
}

/**
 * Get timezone offset in minutes for a specific date
 * Accounts for DST changes
 * 
 * @param {string} timezone - IANA timezone string
 * @param {Date} date - Date to check offset for
 * @returns {number} Offset in minutes from UTC (positive = behind UTC)
 */
export function getTimezoneOffsetMinutes(timezone, date = new Date()) {
  try {
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const utcParts = utcFormatter.formatToParts(date);
    const tzParts = tzFormatter.formatToParts(date);
    
    const utcMinutes = 
      parseInt(utcParts.find(p => p.type === 'day')?.value || '0', 10) * 1440 +
      parseInt(utcParts.find(p => p.type === 'hour')?.value || '0', 10) * 60 +
      parseInt(utcParts.find(p => p.type === 'minute')?.value || '0', 10);
    
    const tzMinutes = 
      parseInt(tzParts.find(p => p.type === 'day')?.value || '0', 10) * 1440 +
      parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10) * 60 +
      parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10);
    
    let diff = tzMinutes - utcMinutes;
    
    // Handle month boundary
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    
    return diff;
  } catch {
    return 0;
  }
}

/**
 * Check if a given time is currently past in a specific timezone
 * Useful for "pickup time has passed" logic
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} timeMinutes - Time as minutes since midnight
 * @param {string} timezone - IANA timezone string
 * @returns {boolean} True if the time has passed
 */
export function isTimePastInTimezone(dateStr, timeMinutes, timezone) {
  if (!dateStr || timeMinutes === undefined || timeMinutes === null || !timezone) {
    return false;
  }
  
  const today = getTodayInTimezone(timezone);
  const currentMinutes = getCurrentTimeMinutesInTimezone(timezone);
  
  // Compare dates first
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  
  // Same day - compare times
  return currentMinutes > timeMinutes;
}

/**
 * Get remaining time until appointment in a specific timezone
 * Returns formatted countdown string
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} timeMinutes - Time as minutes since midnight
 * @param {string} timezone - IANA timezone string
 * @returns {Object} Countdown info { isPast, hours, minutes, label }
 */
export function getTimeUntilAppointment(dateStr, timeMinutes, timezone) {
  if (!dateStr || timeMinutes === undefined || timeMinutes === null || !timezone) {
    return { isPast: false, hours: 0, minutes: 0, label: 'N/A' };
  }
  
  const today = getTodayInTimezone(timezone);
  const currentMinutes = getCurrentTimeMinutesInTimezone(timezone);
  
  // Parse target date
  const parts = dateStr.split('-');
  const targetDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  
  // Parse today's date
  const todayParts = today.split('-');
  const todayDate = new Date(
    parseInt(todayParts[0], 10),
    parseInt(todayParts[1], 10) - 1,
    parseInt(todayParts[2], 10)
  );
  
  // Calculate days difference
  const daysDiff = Math.floor((targetDate - todayDate) / (1000 * 60 * 60 * 24));
  
  // Calculate total minutes remaining
  let totalMinutes = daysDiff * 1440 + (timeMinutes - currentMinutes);
  
  if (totalMinutes < 0) {
    return {
      isPast: true,
      hours: 0,
      minutes: 0,
      label: 'Past due',
    };
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let label;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    label = remainingHours > 0
      ? `${days}d ${remainingHours}h remaining`
      : `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    label = minutes > 0
      ? `${hours}h ${minutes}m remaining`
      : `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    label = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }
  
  return { isPast: false, hours, minutes, label };
}

export default {
  STATE_TIMEZONE_MAP,
  getTimezoneForState,
  getTimezoneForZip,
  getTimezoneFromLocation,
  getCurrentTimeMinutesInTimezone,
  getTodayInTimezone,
  getDatePartsInTimezone,
  formatMinutesToLabel,
  getTimezoneAbbreviation,
  getTimezoneName,
  formatAppointment,
  formatAppointmentRange,
  formatAppointmentCompact,
  formatLocationAppointment,
  getTimezoneOffsetMinutes,
  isTimePastInTimezone,
  getTimeUntilAppointment,
};