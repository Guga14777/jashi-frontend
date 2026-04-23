// ============================================================
// FILE: src/utils/quote-cache.js
// UTILITY: Helper functions to manage quote cache
// ============================================================

/**
 * Clear all shipper portal cache data
 * Use this when starting a new quote or when user logs out
 */
export function clearQuoteCache() {
  console.log('🧹 Clearing all quote cache data');
  sessionStorage.removeItem('shipperPortalDraftCache');
  sessionStorage.removeItem('lastQuoteId');
  sessionStorage.removeItem('pendingQuotePayload');
}

/**
 * Check if cached data matches current quote
 * @param {string} fromZip - Origin ZIP code
 * @param {string} toZip - Destination ZIP code
 * @returns {boolean} - True if cache matches current quote
 */
export function isCacheValid(fromZip, toZip) {
  if (!fromZip || !toZip) return false;
  
  const currentQuoteId = `${fromZip}-${toZip}`;
  const cachedQuoteId = sessionStorage.getItem('lastQuoteId');
  
  return currentQuoteId === cachedQuoteId;
}

/**
 * Set the current quote ID in cache
 * @param {string} fromZip - Origin ZIP code
 * @param {string} toZip - Destination ZIP code
 */
export function setQuoteId(fromZip, toZip) {
  if (!fromZip || !toZip) return;
  
  const quoteId = `${fromZip}-${toZip}`;
  sessionStorage.setItem('lastQuoteId', quoteId);
  console.log('📝 Quote ID set:', quoteId);
}

/**
 * Clear cache if quote has changed
 * @param {string} fromZip - Origin ZIP code
 * @param {string} toZip - Destination ZIP code
 */
export function clearCacheIfQuoteChanged(fromZip, toZip) {
  if (!isCacheValid(fromZip, toZip)) {
    console.log('🆕 Quote changed, clearing cache');
    clearQuoteCache();
    setQuoteId(fromZip, toZip);
    return true;
  }
  return false;
}

/**
 * Store pending quote payload for after authentication
 * @param {object} payload - Quote data to store
 */
export function setPendingQuotePayload(payload) {
  try {
    sessionStorage.setItem('pendingQuotePayload', JSON.stringify(payload));
    console.log('📝 Pending quote payload stored');
  } catch (err) {
    console.error('❌ Failed to store pending quote payload:', err);
  }
}

/**
 * Get and clear pending quote payload
 * @returns {object|null} - Quote payload or null
 */
export function getPendingQuotePayload() {
  try {
    const payload = sessionStorage.getItem('pendingQuotePayload');
    if (payload) {
      sessionStorage.removeItem('pendingQuotePayload');
      console.log('📦 Retrieved and cleared pending quote payload');
      return JSON.parse(payload);
    }
  } catch (err) {
    console.error('❌ Failed to get pending quote payload:', err);
  }
  return null;
}