// src/utils/formatters.js

// Reusable formatters (constructed once)
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Safely coerce to finite number */
const toNum = (v, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Format currency values with configurable decimal places
 * @param {number|string} value - The numeric value
 * @param {Object} options - Formatting options
 * @param {number} options.min - Minimum decimal places (default: 2)
 * @param {number} options.max - Maximum decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, { min = 2, max = 2 } = {}) => {
  const n = toNum(value, 0);
  if (min === 2 && max === 2) return USD.format(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
};

/**
 * Format price with 2 decimal places (matches Payments page)
 * @param {number|string} price - Price value
 * @returns {string} Formatted price like "$3,450.00"
 */
export const formatPrice = (price) => {
  return formatCurrency(price, { min: 2, max: 2 });
};

/**
 * Format miles with thousands separator
 * @param {number} miles - The number of miles
 * @returns {string} Formatted miles string
 */
export const formatMiles = (miles) => {
  const n = toNum(miles, 0);
  return `${n.toLocaleString('en-US')} mi`;
};

/**
 * Format rate per mile to 2 decimal places
 * @param {number} rate - The rate per mile
 * @returns {string} Formatted rate string
 */
export const formatRate = (rate) => {
  const n = toNum(rate, 0);
  return `$${n.toFixed(2)}/mi`;
};

/**
 * Calculate and format rate per mile from price and miles
 * @param {number} price - Total price
 * @param {number} miles - Total miles
 * @returns {string} Formatted rate string
 */
export const calculateRate = (price, miles) => {
  const p = toNum(price, 0);
  const m = toNum(miles, 0);
  if (m <= 0) return '$0.00/mi';
  return formatRate(p / m);
};

/**
 * Format a route string from origin and destination
 * @param {string} originCity - Origin city name
 * @param {string} originState - Origin state code
 * @param {string} destCity - Destination city name
 * @param {string} destState - Destination state code
 * @returns {string} Formatted route like "New York, NY → Miami, FL"
 */
export const formatRoute = (originCity, originState, destCity, destState) => {
  const origin = originCity && originState ? `${originCity}, ${originState}` : originCity || originState || '';
  const dest = destCity && destState ? `${destCity}, ${destState}` : destCity || destState || '';
  
  if (!origin && !dest) return '';
  if (!origin) return dest;
  if (!dest) return origin;
  return `${origin} → ${dest}`;
};

/**
 * Format date to "MMM d, yyyy" using Intl; uses browser's local time zone.
 * @param {string|Date} date - Date or ISO/YYYY-MM-DD
 * @param {string} locale - e.g. 'en-US'
 */
export const formatDate = (date, locale = 'en-US') => {
  if (!date) return '';
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    const s = date.trim();
    // Treat YYYY-MM-DD as local midnight
    d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  } else {
    return '';
  }
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
};

/**
 * Format phone number to (XXX) XXX-XXXX format for display and persistence
 * This is the canonical formatter for saved/displayed phone numbers.
 * Use validation.js formatPhoneNumber() for live input formatting.
 * 
 * @param {string} phone - The phone number (any format)
 * @returns {string} Formatted phone number or original if invalid
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Extract only digits
  let digits = phone.replace(/\D/g, '');
  
  // Handle US numbers with leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  
  // Must be exactly 10 digits for US format
  if (digits.length !== 10) return phone; // Return original if can't format
  
  // Validate area code and exchange (can't start with 0 or 1)
  const areaCode = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  
  if (areaCode[0] === '0' || areaCode[0] === '1' || 
      exchange[0] === '0' || exchange[0] === '1') {
    return phone; // Return original if invalid
  }
  
  return `(${areaCode}) ${exchange}-${digits.slice(6)}`;
};

/**
 * Normalize phone number for storage (strips to digits, handles country code)
 * @param {string} phone - The phone number in any format
 * @returns {string} Normalized phone number for consistent storage
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  
  let digits = phone.replace(/\D/g, '');
  
  // Handle US numbers with leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  
  return digits;
};

/**
 * Format phone for display in headers/readonly contexts
 * Always returns formatted version or empty string if invalid
 * @param {string} phone - The phone number
 * @returns {string} Formatted phone or empty string
 */
export const formatPhoneDisplay = (phone) => {
  const formatted = formatPhone(phone);
  // Only return if it's properly formatted, otherwise empty
  return formatted.includes('(') ? formatted : '';
};

/**
 * Convert a phone to E.164 (US) for tel: links
 * Returns empty string if invalid.
 */
export const toE164US = (phone) => {
  const digits = normalizePhone(phone);
  return digits.length === 10 ? `+1${digits}` : '';
};

/**
 * Format weight in pounds with k suffix
 * @param {number|string} weight - Weight in pounds
 * @returns {string} Formatted weight string
 */
export const formatWeight = (weight) => {
  const n = toNum(weight, 0);
  
  if (n >= 1000) {
    // Show one decimal place when helpful (e.g., 1,250 → "1.3k lbs")
    return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k lbs`;
  }
  
  return `${n.toLocaleString()} lbs`;
};

/**
 * Format percentage values
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return `0${decimals ? '.' + '0'.repeat(decimals) : ''}%`;
  }
  return `${n.toFixed(decimals)}%`;
};

/**
 * Format time duration
 * @param {number} hours - Duration in hours
 * @returns {string} Formatted duration string
 */
export const formatDuration = (hours) => {
  const h = toNum(hours, 0);
  // Round to nearest minute first to avoid 59.999 → 60 min weirdness
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  if (hh === 0) return `${mm} min`;
  if (mm === 0) return `${hh} hr${hh !== 1 ? 's' : ''}`;
  return `${hh} hr${hh !== 1 ? 's' : ''} ${mm} min`;
};

/**
 * Format equipment type with consistent casing
 * @param {string} equipment - Equipment type
 * @returns {string} Formatted equipment type
 */
export const formatEquipment = (equipment) => {
  if (!equipment) return '';
  
  const equipmentMap = {
    'dry van': 'Dry Van',
    'dryvan': 'Dry Van',
    'reefer': 'Reefer',
    'flatbed': 'Flatbed',
    'step deck': 'Step Deck',
    'stepdeck': 'Step Deck',
    'lowboy': 'Lowboy',
    'rgn': 'RGN',
    'tanker': 'Tanker'
  };
  
  const lower = equipment.toLowerCase();
  return equipmentMap[lower] || equipment;
};

/**
 * Format DOT number
 * @param {string} dotNumber - DOT number
 * @returns {string} Formatted DOT number
 */
export const formatDOT = (dotNumber) => {
  if (!dotNumber) return '';
  const digits = dotNumber.replace(/\D/g, '');
  return `DOT-${digits}`;
};

/**
 * Format MC number
 * @param {string} mcNumber - MC number
 * @returns {string} Formatted MC number
 */
export const formatMC = (mcNumber) => {
  if (!mcNumber) return '';
  const digits = mcNumber.replace(/\D/g, '');
  return `MC-${digits}`;
};

/**
 * Format currency with cents when needed
 * @param {number} value - The numeric value
 * @returns {string} Formatted currency string with cents
 */
export const formatCurrencyWithCents = (value) => {
  const n = toNum(value, 0);
  return USD.format(n);
};

/**
 * Format name for display (title case, handles edge cases)
 * @param {string} name - The name to format
 * @returns {string} Formatted name
 */
export const formatName = (name) => {
  if (!name) return '';
  
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format email for display (lowercase, trimmed)
 * @param {string} email - The email to format
 * @returns {string} Formatted email
 */
export const formatEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Format relative time like "5m ago", "3h ago", "2d ago".
 * @param {Date|string|number} date - Date object, ISO string, or ms epoch
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${Math.max(mins, 0)}m ago`;
};