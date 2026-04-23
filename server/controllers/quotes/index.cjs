/**
 * Quotes Controllers Index
 * Exports all quote controller functions
 * 
 * Structure:
 * - quotes.create.controller.cjs  -> createQuote, acceptQuote
 * - quotes.read.controller.cjs    -> getQuotes, getQuoteById, getQuoteStats
 * - quotes.update.controller.cjs  -> updateQuote, deleteQuote
 * - quotes.pricing.controller.cjs -> pricing utilities
 * - quotes.debug.controller.cjs   -> debug helpers (dev only)
 */

const createController = require('./quotes.create.controller.cjs');
const readController = require('./quotes.read.controller.cjs');
const updateController = require('./quotes.update.controller.cjs');
const pricingController = require('./quotes.pricing.controller.cjs');
const debugController = require('./quotes.debug.controller.cjs');

module.exports = {
  // Create operations
  createQuote: createController.createQuote,
  acceptQuote: createController.acceptQuote,
  
  // Read operations
  getQuotes: readController.getQuotes,
  getQuoteById: readController.getQuoteById,
  getQuoteStats: readController.getQuoteStats,
  
  // Update operations
  updateQuote: updateController.updateQuote,
  deleteQuote: updateController.deleteQuote,
  
  // Pricing operations
  getPricingEstimate: pricingController.getPricingEstimate,
  getFeeInfo: pricingController.getFeeInfo,
  calculatePricing: pricingController.calculatePricing,
  
  // Debug operations (development only)
  getQuoteRaw: debugController.getQuoteRaw,
  validateVehiclesData: debugController.validateVehiclesData,
  checkRelationships: debugController.checkRelationships,
};
