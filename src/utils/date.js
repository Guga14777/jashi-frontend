// ============================================================
// FILE: src/utils/date.js
// Global date utilities — consistent formatting
// ============================================================

// ------------------------------------------------------------
// Parse date safely (handles ISO strings, Date objects, etc.)
// ------------------------------------------------------------
export function parseDateSafely(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------
// Parse local date (for YYYY-MM-DD strings from date inputs)
// This is specifically for HTML date inputs that return "2025-11-18"
// ------------------------------------------------------------
export function parseLocalDate(input) {
  if (!input) return null;
  
  // Handle Date instances
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input;
  }
  
  // Handle strings
  if (typeof input === 'string') {
    const trimmed = input.trim();
    
    // Handle pure YYYY-MM-DD format (from HTML date inputs)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      
      // Create date using local timezone (month is 0-indexed)
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      
      // Verify the date components match
      if (date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day) {
        return null;
      }
      
      return date;
    }
    
    // For ISO timestamps, parse normally
    const ms = Date.parse(trimmed);
    if (!isNaN(ms)) {
      return new Date(ms);
    }
    
    return null;
  }
  
  return null;
}

// ------------------------------------------------------------
// Format a date into "Nov 18, 2025"
// ------------------------------------------------------------
export function formatDate(value) {
  if (!value) return 'N/A';

  const parsed = parseDateSafely(value);
  if (!parsed) return 'Invalid Date';

  try {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (err) {
    return 'Invalid Date';
  }
}

// ------------------------------------------------------------
// Format date with day of week: "Tuesday, Nov 18, 2025"
// ------------------------------------------------------------
export function formatDateWithDay(value) {
  if (!value) return 'N/A';

  const parsed = parseDateSafely(value);
  if (!parsed) return 'Invalid Date';

  try {
    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (err) {
    return 'Invalid Date';
  }
}

// ------------------------------------------------------------
// Format date short with day: "Tue, Nov 18"
// ------------------------------------------------------------
export function formatDateShortWithDay(value) {
  if (!value) return 'N/A';

  const parsed = parseDateSafely(value);
  if (!parsed) return 'Invalid Date';

  try {
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    return 'Invalid Date';
  }
}

// ------------------------------------------------------------
// Format time from minutes since midnight: 870 -> "2:30 PM"
// ------------------------------------------------------------
export function formatTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return 'N/A';
  
  // Ensure it's a number
  const mins = parseInt(totalMinutes, 10);
  if (isNaN(mins)) return 'N/A';
  
  // Normalize to 0-1439 range
  const normalizedMinutes = ((mins % 1440) + 1440) % 1440;
  
  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  
  const minuteStr = String(minutes).padStart(2, '0');
  
  return `${hours12}:${minuteStr} ${period}`;
}

// ------------------------------------------------------------
// Format time from Date object: Date -> "2:30 PM"
// ------------------------------------------------------------
export function formatTimeFromDate(value) {
  const parsed = parseDateSafely(value);
  if (!parsed) return 'N/A';
  
  try {
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (err) {
    return 'N/A';
  }
}

// ------------------------------------------------------------
// Format time range from minutes: "9:00 AM - 5:00 PM"
// ------------------------------------------------------------
export function formatTimeRange(startMinutes, endMinutes) {
  const startStr = formatTime(startMinutes);
  const endStr = formatTime(endMinutes);
  
  if (startStr === 'N/A' && endStr === 'N/A') return 'N/A';
  if (startStr === 'N/A') return `By ${endStr}`;
  if (endStr === 'N/A') return `From ${startStr}`;
  
  return `${startStr} - ${endStr}`;
}

// ------------------------------------------------------------
// Parse time string to minutes: "2:30 PM" -> 870
// ------------------------------------------------------------
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const trimmed = timeStr.trim().toUpperCase();
  
  // Handle HH:MM AM/PM format
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;
  
  // Handle 12-hour format
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    // 24-hour format
    if (hours < 0 || hours > 23) return null;
  }
  
  return hours * 60 + minutes;
}

// ------------------------------------------------------------
// Combine date (YYYY-MM-DD) + time (minutes) to ISO string
// Optionally specify a timezone for accurate conversion
// ------------------------------------------------------------
export function combineDateTimeToISO(dateStr, timeMinutes, timezone = null) {
  if (!dateStr) return null;
  
  // Parse the date
  const dateParsed = parseLocalDate(dateStr);
  if (!dateParsed) return null;
  
  // Default time to start of day
  const mins = typeof timeMinutes === 'number' ? timeMinutes : 0;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  
  if (timezone) {
    // Create ISO string for the specified timezone
    // Format: YYYY-MM-DDTHH:MM:SS in the target timezone
    const year = dateParsed.getFullYear();
    const month = String(dateParsed.getMonth() + 1).padStart(2, '0');
    const day = String(dateParsed.getDate()).padStart(2, '0');
    const hourStr = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    
    // Create a date string and convert via timezone
    const localDateStr = `${year}-${month}-${day}T${hourStr}:${minStr}:00`;
    
    try {
      // Use Intl to find the offset for this timezone at this date/time
      const testDate = new Date(localDateStr);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      // Get the offset by comparing UTC and local representations
      const utcDate = new Date(Date.UTC(year, dateParsed.getMonth(), dateParsed.getDate(), hours, minutes, 0));
      const tzParts = formatter.formatToParts(utcDate);
      
      const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10);
      const tzMin = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10);
      
      // Calculate offset in minutes
      const utcMinutes = hours * 60 + minutes;
      const tzMinutes = tzHour * 60 + tzMin;
      let offsetMinutes = tzMinutes - utcMinutes;
      
      // Adjust for day boundary crossings
      if (offsetMinutes > 720) offsetMinutes -= 1440;
      if (offsetMinutes < -720) offsetMinutes += 1440;
      
      // Create the final date adjusting for timezone
      const finalDate = new Date(Date.UTC(year, dateParsed.getMonth(), dateParsed.getDate(), hours, minutes, 0));
      finalDate.setUTCMinutes(finalDate.getUTCMinutes() - offsetMinutes);
      
      return finalDate.toISOString();
    } catch (err) {
      // Fallback to local timezone
      const result = new Date(dateParsed);
      result.setHours(hours, minutes, 0, 0);
      return result.toISOString();
    }
  }
  
  // No timezone specified - use local
  const result = new Date(dateParsed);
  result.setHours(hours, minutes, 0, 0);
  return result.toISOString();
}

// ------------------------------------------------------------
// Convert to ISO string safely
// ------------------------------------------------------------
export function toIso(value) {
  const d = parseDateSafely(value);
  return d ? d.toISOString() : null;
}

// ------------------------------------------------------------
// Convert Date to YYYY-MM-DD string (for HTML date inputs)
// ------------------------------------------------------------
export function toLocalDateString(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// ------------------------------------------------------------
// Now
// ------------------------------------------------------------
export function nowIso() {
  return new Date().toISOString();
}

// ------------------------------------------------------------
// Add days
// ------------------------------------------------------------
export function addDays(dateValue, days) {
  const d = parseDateSafely(dateValue);
  if (!d) return null;
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

// ------------------------------------------------------------
// Add hours
// ------------------------------------------------------------
export function addHours(dateValue, hours) {
  const d = parseDateSafely(dateValue);
  if (!d) return null;
  const result = new Date(d);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result.toISOString();
}

// ------------------------------------------------------------
// Compare dates
// ------------------------------------------------------------
export function isBefore(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return false;
  return a.getTime() < b.getTime();
}

export function isAfter(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return false;
  return a.getTime() > b.getTime();
}

export function isSameDay(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ------------------------------------------------------------
// Check if date is today
// ------------------------------------------------------------
export function isToday(dateValue) {
  return isSameDay(dateValue, new Date());
}

// ------------------------------------------------------------
// Check if date is tomorrow
// ------------------------------------------------------------
export function isTomorrow(dateValue) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(dateValue, tomorrow);
}

// ------------------------------------------------------------
// Format for scheduling UI (with time)
// ------------------------------------------------------------
export function formatDateTime(value) {
  const d = parseDateSafely(value);
  if (!d) return 'N/A';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ------------------------------------------------------------
// Format short date (same as formatDate for consistency)
// ------------------------------------------------------------
export function formatShort(date) {
  return formatDate(date);
}

// ------------------------------------------------------------
// Start of day (local)
// ------------------------------------------------------------
export function startOfDay(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ------------------------------------------------------------
// End of day (local) – 23:59:59.999
// ------------------------------------------------------------
export function endOfDay(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// ------------------------------------------------------------
// Get relative day label: "Today", "Tomorrow", or formatted date
// ------------------------------------------------------------
export function getRelativeDayLabel(dateValue) {
  const parsed = parseDateSafely(dateValue);
  if (!parsed) return 'N/A';
  
  if (isToday(parsed)) return 'Today';
  if (isTomorrow(parsed)) return 'Tomorrow';
  
  return formatDateShortWithDay(parsed);
}

// ------------------------------------------------------------
// Calculate days between two dates
// ------------------------------------------------------------
export function daysBetween(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return null;
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.floor(diffMs / msPerDay);
}

// ------------------------------------------------------------
// Calculate hours between two dates
// ------------------------------------------------------------
export function hoursBetween(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return null;
  
  const msPerHour = 60 * 60 * 1000;
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.floor(diffMs / msPerHour);
}

// ------------------------------------------------------------
// Calculate minutes between two dates
// ------------------------------------------------------------
export function minutesBetween(dateA, dateB) {
  const a = parseDateSafely(dateA);
  const b = parseDateSafely(dateB);
  if (!a || !b) return null;
  
  const msPerMinute = 60 * 1000;
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.floor(diffMs / msPerMinute);
}