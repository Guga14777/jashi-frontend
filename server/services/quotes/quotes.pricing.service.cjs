/**
 * Quotes Pricing Service
 * Handles platform fee calculations and pricing logic
 */

const { PLATFORM_FEE_RATE } = require('./quotes.constants.cjs');

/**
 * Calculate platform fee
 * @param {number} offer - The offer amount
 * @returns {number} - Platform fee amount
 */
function calculatePlatformFee(offer) {
  return offer * PLATFORM_FEE_RATE;
}

/**
 * Calculate total price (offer + platform fee)
 * @param {number} offer - The offer amount
 * @returns {number} - Total price
 */
function calculateTotalPrice(offer) {
  const platformFee = calculatePlatformFee(offer);
  return offer + platformFee;
}

/**
 * Build pricing breakdown object
 * @param {number} offer - The offer amount
 * @returns {object} - Pricing breakdown
 */
function buildPricingBreakdown(offer) {
  const platformFee = calculatePlatformFee(offer);
  const totalPrice = offer + platformFee;
  
  return {
    offer,
    customerOffer: offer,
    platformFee,
    totalPrice,
  };
}

/**
 * Get platform fee rate
 * @returns {number} - Fee rate as decimal (e.g., 0.03 for 3%)
 */
function getPlatformFeeRate() {
  return PLATFORM_FEE_RATE;
}

module.exports = {
  calculatePlatformFee,
  calculateTotalPrice,
  buildPricingBreakdown,
  getPlatformFeeRate,
};
