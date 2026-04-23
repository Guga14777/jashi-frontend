/**
 * Quotes Services Index
 * Exports all quotes-related services
 */

const constants = require('./quotes.constants.cjs');
const helpers = require('./quotes.helpers.cjs');
const vehicleService = require('./quotes.vehicle.service.cjs');
const pricingService = require('./quotes.pricing.service.cjs');
const validationService = require('./quotes.validation.service.cjs');
const repositoryService = require('./quotes.repository.service.cjs');
const transformService = require('./quotes.transform.service.cjs');

module.exports = {
  // Constants
  ...constants,
  
  // Helpers
  ...helpers,
  
  // Vehicle service
  ...vehicleService,
  
  // Pricing service
  ...pricingService,
  
  // Validation service
  ...validationService,
  
  // Repository service
  ...repositoryService,
  
  // Transform service
  ...transformService,
};
