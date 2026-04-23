/**
 * Quotes Constants
 * Centralized constants for quotes module
 */

// Platform fee configuration
const PLATFORM_FEE_RATE = 0.03; // 3%

// Vehicle limits
const MIN_VEHICLES = 1;
const MAX_VEHICLES = 3;

// Quote statuses
const QUOTE_STATUS = {
  WAITING: 'waiting',
  BOOKED: 'booked',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
};

// Booking statuses that indicate carrier acceptance
const CARRIER_ACCEPTED_STATUSES = ['assigned', 'in_transit', 'delivered', 'picked_up'];

// Default pagination
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY = 'createdAt';
const DEFAULT_SORT_ORDER = 'desc';

// Default source
const DEFAULT_SOURCE = 'quote-widget';

module.exports = {
  PLATFORM_FEE_RATE,
  MIN_VEHICLES,
  MAX_VEHICLES,
  QUOTE_STATUS,
  CARRIER_ACCEPTED_STATUSES,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  DEFAULT_SOURCE,
};
