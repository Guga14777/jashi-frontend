// ============================================================
// FILE: server/services/booking/booking.constants.cjs
// Shared constants for booking operations
// ✅ UPDATED: Added authorization-related constants
// ============================================================

const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  ON_THE_WAY_TO_PICKUP: 'on_the_way_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'On the Way',
  [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'Arrived',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
  [SHIPMENT_STATUS.CANCELLED]: 'Cancelled',
};

const STATUS_ORDER = [
  SHIPMENT_STATUS.SCHEDULED,
  SHIPMENT_STATUS.ASSIGNED,
  SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
  SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
  SHIPMENT_STATUS.PICKED_UP,
  SHIPMENT_STATUS.DELIVERED,
];

// ============================================================
// VEHICLE CONSTANTS
// ============================================================
const MIN_VEHICLES = 1;
const MAX_VEHICLES = 3;

// ============================================================
// ORIGIN/DESTINATION TYPES
// ============================================================
const ORIGIN_TYPES = {
  AUCTION: 'auction',
  DEALERSHIP: 'dealership',
  PRIVATE: 'private',  // Residential
};

// ✅ Flexible origin types (no strict time windows)
const FLEXIBLE_ORIGIN_TYPES = [
  ORIGIN_TYPES.AUCTION,
  ORIGIN_TYPES.DEALERSHIP,
];

// ============================================================
// TIME PREFERENCE OPTIONS (for flexible scheduling)
// ============================================================
const TIME_PREFERENCES = {
  MORNING: 'morning',      // 8 AM - 12 PM
  AFTERNOON: 'afternoon',  // 12 PM - 5 PM
  FLEXIBLE: 'flexible',    // Any time during business hours
};

// ============================================================
// DETENTION FEE CONSTANTS
// ============================================================
const DETENTION_THRESHOLD_MINUTES = 60;
const DETENTION_FEE_AMOUNT = 50;

// Default detention settings by origin type
// Auction/Dealership: Disabled by default (inherent delays expected)
// Residential: Enabled by default
const DEFAULT_DETENTION_BY_ORIGIN = {
  [ORIGIN_TYPES.AUCTION]: false,
  [ORIGIN_TYPES.DEALERSHIP]: false,
  [ORIGIN_TYPES.PRIVATE]: true,
};

// ============================================================
// ARRIVAL BUFFER CONSTANTS
// ============================================================
const ARRIVAL_BUFFER_BEFORE_HOURS = 2;  // Can arrive 2 hours before window
const ARRIVAL_BUFFER_AFTER_HOURS = 4;   // Can arrive up to 4 hours after window

// Flexible arrival allows from midnight on pickup day
const FLEXIBLE_ARRIVAL_START_HOUR = 0;  // Midnight
const FLEXIBLE_ARRIVAL_END_HOUR = 22;   // 10 PM (business hours + buffer)

// ============================================================
// ✅ NEW: ATTEMPT AUTHORIZATION CONSTANTS
// ============================================================

/**
 * Authorization status enum
 */
const AUTHORIZATION_STATUS = {
  YES: 'YES',                     // Fully authorized, can proceed
  YES_PROTECTED: 'YES_PROTECTED', // Authorized with TONU/detention protection
  NO: 'NO',                       // Not authorized, cannot proceed
};

/**
 * Origin types that REQUIRE gate passes
 * Carriers cannot proceed without these
 */
const GATE_PASS_REQUIRED_TYPES = [
  ORIGIN_TYPES.AUCTION,
  ORIGIN_TYPES.DEALERSHIP,
];

/**
 * Origin types that benefit from appointments
 * Not strictly required, but provides protection
 */
const APPOINTMENT_RECOMMENDED_TYPES = [
  ORIGIN_TYPES.AUCTION,
  ORIGIN_TYPES.DEALERSHIP,
];

/**
 * TONU (Truck Order Not Used) fee amount
 * Applied when carrier arrives but cannot complete pickup due to shipper issues
 */
const TONU_FEE_AMOUNT = 75;

/**
 * Protection types that can be applied to a pickup attempt
 */
const PROTECTION_TYPES = {
  TONU: 'tonu',           // Truck Order Not Used
  DETENTION: 'detention', // Waiting time fee
  LAYOVER: 'layover',     // Overnight wait
  REDELIVERY: 're-delivery', // Return trip required
};

/**
 * Business hours by location type
 */
const BUSINESS_HOURS = {
  [ORIGIN_TYPES.AUCTION]: { start: 8, end: 17 },     // 8 AM - 5 PM
  [ORIGIN_TYPES.DEALERSHIP]: { start: 9, end: 19 }, // 9 AM - 7 PM
  [ORIGIN_TYPES.PRIVATE]: { start: 7, end: 21 },    // 7 AM - 9 PM
};

/**
 * Days when locations are typically closed
 */
const CLOSED_DAYS = {
  [ORIGIN_TYPES.AUCTION]: [0],      // Sunday
  [ORIGIN_TYPES.DEALERSHIP]: [],    // Varies, usually open 7 days
  [ORIGIN_TYPES.PRIVATE]: [],       // N/A
};

// ============================================================
// COULD NOT PICKUP REASONS
// ============================================================
const COULD_NOT_PICKUP_REASONS = {
  AUCTION_CLOSED: 'auction_closed',
  NO_GATE_PASS: 'no_gate_pass',
  WRONG_ADDRESS: 'wrong_address',
  CUSTOMER_NO_SHOW: 'customer_no_show',
  VEHICLE_NOT_READY: 'vehicle_not_ready',
  VEHICLE_NOT_AS_DESCRIBED: 'vehicle_not_as_described',
  ACCESS_DENIED: 'access_denied',
  OTHER: 'other',
};

const COULD_NOT_PICKUP_LABELS = {
  [COULD_NOT_PICKUP_REASONS.AUCTION_CLOSED]: 'Auction Closed',
  [COULD_NOT_PICKUP_REASONS.NO_GATE_PASS]: 'No Gate Pass Available',
  [COULD_NOT_PICKUP_REASONS.WRONG_ADDRESS]: 'Wrong Address',
  [COULD_NOT_PICKUP_REASONS.CUSTOMER_NO_SHOW]: 'Customer No-Show',
  [COULD_NOT_PICKUP_REASONS.VEHICLE_NOT_READY]: 'Vehicle Not Ready',
  [COULD_NOT_PICKUP_REASONS.VEHICLE_NOT_AS_DESCRIBED]: 'Vehicle Not As Described',
  [COULD_NOT_PICKUP_REASONS.ACCESS_DENIED]: 'Access Denied',
  [COULD_NOT_PICKUP_REASONS.OTHER]: 'Other',
};

// ============================================================
// GATE PASS TYPES
// ============================================================
const GATE_PASS_TYPES = {
  PICKUP: 'pickup_gatepass',
  DROPOFF: 'dropoff_gatepass',
  GENERIC: 'gate_pass',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if origin type uses flexible scheduling
 */
const isFlexibleOriginType = (originType) => {
  if (!originType) return false;
  return FLEXIBLE_ORIGIN_TYPES.includes(originType.toLowerCase());
};

/**
 * Get default detention enabled setting
 */
const getDefaultDetentionEnabled = (originType) => {
  if (!originType) return true;
  const type = originType.toLowerCase();
  return DEFAULT_DETENTION_BY_ORIGIN[type] ?? true;
};

/**
 * Check if gate pass is required for origin type
 */
const isGatePassRequired = (originType) => {
  if (!originType) return false;
  return GATE_PASS_REQUIRED_TYPES.includes(originType.toLowerCase());
};

/**
 * Get business hours for origin type
 */
const getBusinessHours = (originType) => {
  if (!originType) return BUSINESS_HOURS[ORIGIN_TYPES.PRIVATE];
  const type = originType.toLowerCase();
  return BUSINESS_HOURS[type] || BUSINESS_HOURS[ORIGIN_TYPES.PRIVATE];
};

/**
 * Check if a day is a closed day for origin type
 */
const isClosedDay = (originType, dayOfWeek) => {
  if (!originType) return false;
  const type = originType.toLowerCase();
  const closedDays = CLOSED_DAYS[type] || [];
  return closedDays.includes(dayOfWeek);
};

module.exports = {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  MIN_VEHICLES,
  MAX_VEHICLES,
  ORIGIN_TYPES,
  FLEXIBLE_ORIGIN_TYPES,
  TIME_PREFERENCES,
  DETENTION_THRESHOLD_MINUTES,
  DETENTION_FEE_AMOUNT,
  DEFAULT_DETENTION_BY_ORIGIN,
  ARRIVAL_BUFFER_BEFORE_HOURS,
  ARRIVAL_BUFFER_AFTER_HOURS,
  FLEXIBLE_ARRIVAL_START_HOUR,
  FLEXIBLE_ARRIVAL_END_HOUR,
  // ✅ NEW: Authorization exports
  AUTHORIZATION_STATUS,
  GATE_PASS_REQUIRED_TYPES,
  APPOINTMENT_RECOMMENDED_TYPES,
  TONU_FEE_AMOUNT,
  PROTECTION_TYPES,
  BUSINESS_HOURS,
  CLOSED_DAYS,
  // Existing
  COULD_NOT_PICKUP_REASONS,
  COULD_NOT_PICKUP_LABELS,
  GATE_PASS_TYPES,
  // Helpers
  isFlexibleOriginType,
  getDefaultDetentionEnabled,
  isGatePassRequired,
  getBusinessHours,
  isClosedDay,
};
