// ============================================================
// FILE: src/services/server-time.api.js
// ✅ Fetches and caches server time to avoid device clock issues
// ✅ Silent fallback to device time (no user-facing warnings)
// ============================================================

let cachedServerTime = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 60000; // Re-fetch every 60 seconds

/**
 * Fetch current UTC time from server
 * Caches result for 60 seconds to reduce API calls
 * 
 * @returns {Promise<{ utc: string, timestamp: number, fallback?: boolean }>}
 */
export async function fetchServerTime() {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedServerTime && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    // Adjust cached time by elapsed duration since fetch
    const elapsed = now - cacheTimestamp;
    const adjustedTimestamp = cachedServerTime.timestamp + elapsed;
    
    return {
      utc: new Date(adjustedTimestamp).toISOString(),
      timestamp: adjustedTimestamp,
    };
  }
  
  try {
    const response = await fetch('/api/time/now');
    
    if (!response.ok) {
      throw new Error(`Server time fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    cachedServerTime = data;
    cacheTimestamp = Date.now();
    
    return data;
  } catch (error) {
    // Silent fallback to device time - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[time] server unreachable, using device time');
    }
    
    // Fallback to device time if server is unreachable
    const fallbackTime = new Date();
    return {
      utc: fallbackTime.toISOString(),
      timestamp: fallbackTime.getTime(),
      fallback: true,
    };
  }
}

/**
 * Get server time synchronously (uses cache or device time as fallback)
 * Call fetchServerTime() first to populate cache
 * 
 * @returns {{ utc: string, timestamp: number, fallback?: boolean }}
 */
export function getServerTimeSync() {
  if (cachedServerTime && cacheTimestamp) {
    const elapsed = Date.now() - cacheTimestamp;
    const adjustedTimestamp = cachedServerTime.timestamp + elapsed;
    
    return {
      utc: new Date(adjustedTimestamp).toISOString(),
      timestamp: adjustedTimestamp,
    };
  }
  
  // Fallback to device time
  const now = new Date();
  return {
    utc: now.toISOString(),
    timestamp: now.getTime(),
    fallback: true,
  };
}

/**
 * Convert server UTC timestamp to minutes since midnight in a specific timezone
 * 
 * @param {number} utcTimestamp - UTC timestamp in milliseconds
 * @param {string} timezone - IANA timezone string (e.g., 'America/Los_Angeles')
 * @returns {number} Minutes since midnight in the specified timezone
 */
export function utcToTimezoneMinutes(utcTimestamp, timezone) {
  const date = new Date(utcTimestamp);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  return hours * 60 + minutes;
}

/**
 * Get today's date in a specific timezone from server UTC time
 * 
 * @param {number} utcTimestamp - UTC timestamp in milliseconds
 * @param {string} timezone - IANA timezone string
 * @returns {string} Date in YYYY-MM-DD format
 */
export function utcToTimezoneDate(utcTimestamp, timezone) {
  const date = new Date(utcTimestamp);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Invalidate the cache (useful for testing or forced refresh)
 */
export function invalidateServerTimeCache() {
  cachedServerTime = null;
  cacheTimestamp = null;
}

export default {
  fetchServerTime,
  getServerTimeSync,
  utcToTimezoneMinutes,
  utcToTimezoneDate,
  invalidateServerTimeCache,
};