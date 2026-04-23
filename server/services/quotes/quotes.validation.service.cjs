/**
 * Quotes Validation Service
 * Handles input validation for quotes
 */

/**
 * Validate create quote input
 * @param {object} body - Request body
 * @returns {object} - { valid: boolean, error?: string, required?: array }
 */
function validateCreateQuoteInput(body) {
  const {
    fromZip,
    toZip,
    vehicle,
    vehicles,
    transportType,
    offer,
    customerOffer,
  } = body;

  const finalOffer = parseFloat(customerOffer) || parseFloat(offer) || 0;

  // Check if we have at least one vehicle
  const hasVehicle = (Array.isArray(vehicles) && vehicles.length > 0) || 
                     (vehicles && typeof vehicles === 'object' && Object.keys(vehicles).length > 0) ||
                     vehicle;

  if (!fromZip || !toZip || !transportType || finalOffer === 0) {
    if (!hasVehicle) {
      return {
        valid: false,
        error: 'Missing required fields',
        required: ['fromZip', 'toZip', 'vehicle or vehicles[]', 'transportType', 'offer or customerOffer'],
      };
    }
  }

  if (!fromZip) {
    return { valid: false, error: 'fromZip is required' };
  }

  if (!toZip) {
    return { valid: false, error: 'toZip is required' };
  }

  if (!transportType) {
    return { valid: false, error: 'transportType is required' };
  }

  if (finalOffer === 0 && !hasVehicle) {
    return {
      valid: false,
      error: 'Missing required fields',
      required: ['fromZip', 'toZip', 'vehicle or vehicles[]', 'transportType', 'offer or customerOffer'],
    };
  }

  return { valid: true };
}

/**
 * Validate quote ID parameter
 * @param {string} id - Quote ID
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateQuoteId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Invalid quote ID' };
  }
  return { valid: true };
}

/**
 * Validate pagination parameters
 * @param {object} query - Query parameters
 * @returns {object} - Normalized pagination params
 */
function validatePaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const pageSize = parseInt(query.pageSize) || 10;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder || 'desc';

  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), 100), // Cap at 100
    sortBy,
    sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
  };
}

module.exports = {
  validateCreateQuoteInput,
  validateQuoteId,
  validatePaginationParams,
};
