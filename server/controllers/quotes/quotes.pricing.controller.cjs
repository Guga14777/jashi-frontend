/**
 * Quotes Pricing Controller
 * Handles pricing-related operations
 * 
 * Note: Currently pricing is calculated inline during quote creation/retrieval.
 * This controller is a placeholder for future pricing endpoints such as:
 * - Price estimation
 * - Competitor price comparison
 * - Dispatch likelihood calculation
 */

const {
  buildPricingBreakdown,
  getPlatformFeeRate,
} = require('../../services/quotes/index.cjs');

/**
 * Get pricing estimate for a quote
 * @param {object} quoteData - Quote data with offer amount
 * @returns {object} - Pricing breakdown
 */
function getPricingEstimate(quoteData) {
  const offer = parseFloat(quoteData.offer) || parseFloat(quoteData.customerOffer) || 0;
  return buildPricingBreakdown(offer);
}

/**
 * Get platform fee information
 * GET /api/quotes/pricing/fee-info
 */
async function getFeeInfo(req, res) {
  try {
    res.json({
      success: true,
      feeRate: getPlatformFeeRate(),
      feePercentage: getPlatformFeeRate() * 100,
      description: 'Platform fee applied to all quotes',
    });
  } catch (error) {
    console.error('❌ Get fee info error:', error);
    res.status(500).json({ error: 'Failed to get fee information' });
  }
}

/**
 * Calculate pricing for a given offer amount
 * POST /api/quotes/pricing/calculate
 */
async function calculatePricing(req, res) {
  try {
    const { offer, customerOffer } = req.body;
    const finalOffer = parseFloat(customerOffer) || parseFloat(offer) || 0;
    
    if (finalOffer <= 0) {
      return res.status(400).json({ error: 'Valid offer amount is required' });
    }
    
    const pricing = buildPricingBreakdown(finalOffer);
    
    res.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error('❌ Calculate pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
}

module.exports = {
  getPricingEstimate,
  getFeeInfo,
  calculatePricing,
};
