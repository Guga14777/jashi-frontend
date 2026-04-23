/**
 * Quotes Helpers
 * Utility functions for quotes module
 */

/**
 * Clamp a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse integer with fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number}
 */
function parseIntSafe(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse float with fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number}
 */
function parseFloatSafe(value, fallback = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe date parsing
 * @param {any} dateValue - Date value to parse
 * @returns {Date|null}
 */
function parseDateSafe(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = {
  clamp,
  parseIntSafe,
  parseFloatSafe,
  parseDateSafe,
};
