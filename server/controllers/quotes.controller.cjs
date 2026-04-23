/**
 * Quotes Controller - PostgreSQL Version
 * ✅ REFACTORED: Thin wrapper that re-exports from ./quotes/index.cjs
 * 
 * All existing routes continue to work unchanged.
 * Logic has been split into:
 * 
 * CONTROLLERS (server/controllers/quotes/):
 *   - quotes.create.controller.cjs  -> createQuote, acceptQuote
 *   - quotes.read.controller.cjs    -> getQuotes, getQuoteById, getQuoteStats
 *   - quotes.update.controller.cjs  -> updateQuote, deleteQuote
 *   - quotes.pricing.controller.cjs -> pricing utilities
 *   - quotes.debug.controller.cjs   -> debug helpers
 * 
 * SERVICES (server/services/quotes/):
 *   - quotes.constants.cjs          -> Platform fee rates, limits
 *   - quotes.helpers.cjs            -> Utility functions
 *   - quotes.vehicle.service.cjs    -> Multi-vehicle data handling
 *   - quotes.pricing.service.cjs    -> Fee calculations
 *   - quotes.validation.service.cjs -> Input validation
 *   - quotes.repository.service.cjs -> Prisma query configs
 */

const quotesController = require('./quotes/index.cjs');

// Re-export all controller functions
module.exports = {
  // Main CRUD operations (existing routes use these)
  createQuote: quotesController.createQuote,
  acceptQuote: quotesController.acceptQuote,
  getQuotes: quotesController.getQuotes,
  getQuoteById: quotesController.getQuoteById,
  updateQuote: quotesController.updateQuote,
  deleteQuote: quotesController.deleteQuote,
  getQuoteStats: quotesController.getQuoteStats,
  
  // Additional exports for extensibility
  getPricingEstimate: quotesController.getPricingEstimate,
  getFeeInfo: quotesController.getFeeInfo,
  calculatePricing: quotesController.calculatePricing,
  
  // Debug exports (development only)
  getQuoteRaw: quotesController.getQuoteRaw,
  validateVehiclesData: quotesController.validateVehiclesData,
  checkRelationships: quotesController.checkRelationships,
};
