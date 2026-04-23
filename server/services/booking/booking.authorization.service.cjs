// ============================================================
// FILE: server/services/booking/booking.authorization.service.cjs
// Backend authorization service for pickup attempts
// Mirrors frontend rules exactly for consistency
// ============================================================

const { ORIGIN_TYPES, FLEXIBLE_ORIGIN_TYPES } = require('./booking.constants.cjs');

/**
 * Authorization status enum (mirrors frontend)
 */
const AUTHORIZATION_STATUS = {
  YES: 'YES',
  YES_PROTECTED: 'YES_PROTECTED',
  NO: 'NO',
};

/**
 * Authorization reason codes (mirrors frontend)
 */
const AUTHORIZATION_REASONS = {
  // Blocking reasons (NO)
  MISSING_GATE_PASS: 'MISSING_GATE_PASS',
  APPOINTMENT_REQUIRED: 'APPOINTMENT_REQUIRED',
  WEEKEND_NOT_CONFIRMED: 'WEEKEND_NOT_CONFIRMED',
  LOCATION_CLOSED: 'LOCATION_CLOSED',
  OUTSIDE_BUSINESS_HOURS: 'OUTSIDE_BUSINESS_HOURS',
  AUCTION_CLOSED_TODAY: 'AUCTION_CLOSED_TODAY',
  
  // Protection reasons (YES_PROTECTED)
  FIRST_ATTEMPT: 'FIRST_ATTEMPT',
  AUCTION_DELAY_EXPECTED: 'AUCTION_DELAY_EXPECTED',
  DEALERSHIP_DELAY_EXPECTED: 'DEALERSHIP_DELAY_EXPECTED',
  WEATHER_DELAY: 'WEATHER_DELAY',
  CUSTOMER_REQUESTED_TIME: 'CUSTOMER_REQUESTED_TIME',
  
  // Success reasons (YES)
  ALL_REQUIREMENTS_MET: 'ALL_REQUIREMENTS_MET',
  GATE_PASS_VERIFIED: 'GATE_PASS_VERIFIED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  PRIVATE_RESIDENCE: 'PRIVATE_RESIDENCE',
};

/**
 * Human-readable reason labels
 */
const REASON_LABELS = {
  [AUTHORIZATION_REASONS.MISSING_GATE_PASS]: 'Gate pass required but not uploaded',
  [AUTHORIZATION_REASONS.APPOINTMENT_REQUIRED]: 'Appointment required but not scheduled',
  [AUTHORIZATION_REASONS.WEEKEND_NOT_CONFIRMED]: 'Weekend pickup not confirmed with customer',
  [AUTHORIZATION_REASONS.LOCATION_CLOSED]: 'Pickup location may be closed',
  [AUTHORIZATION_REASONS.OUTSIDE_BUSINESS_HOURS]: 'Outside business hours',
  [AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY]: 'Auction may be closed today',
  [AUTHORIZATION_REASONS.FIRST_ATTEMPT]: 'First attempt - TONU protection applies',
  [AUTHORIZATION_REASONS.AUCTION_DELAY_EXPECTED]: 'Auction delays expected - detention protection',
  [AUTHORIZATION_REASONS.DEALERSHIP_DELAY_EXPECTED]: 'Dealership delays possible - detention protection',
  [AUTHORIZATION_REASONS.WEATHER_DELAY]: 'Weather delay protection applies',
  [AUTHORIZATION_REASONS.CUSTOMER_REQUESTED_TIME]: 'Customer-requested time window',
  [AUTHORIZATION_REASONS.ALL_REQUIREMENTS_MET]: 'All requirements verified',
  [AUTHORIZATION_REASONS.GATE_PASS_VERIFIED]: 'Gate pass verified',
  [AUTHORIZATION_REASONS.APPOINTMENT_CONFIRMED]: 'Appointment confirmed',
  [AUTHORIZATION_REASONS.PRIVATE_RESIDENCE]: 'Private residence - flexible scheduling',
};

/**
 * Origin types that require gate passes
 */
const GATE_PASS_REQUIRED_TYPES = ['auction', 'dealership'];

/**
 * Origin types that may require appointments
 */
const APPOINTMENT_REQUIRED_TYPES = ['auction', 'dealership'];

/**
 * US state timezone mappings (simplified)
 */
const STATE_TIMEZONES = {
  // Eastern
  CT: 'America/New_York', DC: 'America/New_York', DE: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', IN: 'America/Indiana/Indianapolis',
  KY: 'America/Kentucky/Louisville', MA: 'America/New_York', MD: 'America/New_York',
  ME: 'America/New_York', MI: 'America/Detroit', NC: 'America/New_York',
  NH: 'America/New_York', NJ: 'America/New_York', NY: 'America/New_York',
  OH: 'America/New_York', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', VA: 'America/New_York', VT: 'America/New_York',
  WV: 'America/New_York',
  // Central
  AL: 'America/Chicago', AR: 'America/Chicago', IA: 'America/Chicago',
  IL: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MO: 'America/Chicago', MS: 'America/Chicago',
  ND: 'America/Chicago', NE: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  WI: 'America/Chicago',
  // Mountain
  AZ: 'America/Phoenix', CO: 'America/Denver', ID: 'America/Boise',
  MT: 'America/Denver', NM: 'America/Denver', UT: 'America/Denver',
  WY: 'America/Denver',
  // Pacific
  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles', OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  // Other
  AK: 'America/Anchorage', HI: 'Pacific/Honolulu',
};

/**
 * Get timezone for a US state
 */
const getTimezoneForState = (state) => {
  if (!state) return 'America/New_York';
  return STATE_TIMEZONES[state.toUpperCase()] || 'America/New_York';
};

/**
 * Get current local hour for a state
 */
const getLocalHourForState = (state) => {
  const timezone = getTimezoneForState(state);
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return now.getUTCHours();
  }
};

/**
 * Get current day of week for a state (0 = Sunday)
 */
const getLocalDayForState = (state) => {
  const timezone = getTimezoneForState(state);
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    });
    const dayName = formatter.format(now);
    const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    return dayMap[dayName] ?? now.getDay();
  } catch {
    return now.getDay();
  }
};

/**
 * Check if current time is within business hours for a location
 */
const isWithinBusinessHours = (pickupState, locationType) => {
  const localHour = getLocalHourForState(pickupState);
  
  if (locationType === 'auction') {
    return localHour >= 8 && localHour < 17;
  } else if (locationType === 'dealership') {
    return localHour >= 9 && localHour < 19;
  }
  
  return localHour >= 7 && localHour < 21;
};

/**
 * Check if pickup date is a weekend
 */
const isWeekendPickup = (pickupDate) => {
  if (!pickupDate) return false;
  
  const date = new Date(pickupDate);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Check if today is a typical auction closed day
 */
const isAuctionClosedDay = (pickupState) => {
  const localDay = getLocalDayForState(pickupState);
  return localDay === 0; // Sunday
};

/**
 * Check if a booking has a gate pass
 */
const hasGatePassForBooking = (booking) => {
  return Boolean(
    booking.pickupGatePassId ||
    booking.pickupGatePass ||
    (booking.documents && booking.documents.some(d => 
      d.type === 'gate_pass' || d.type === 'pickup_gatepass'
    ))
  );
};

/**
 * Check if a booking has an appointment confirmed
 */
const hasAppointmentConfirmed = (booking) => {
  return Boolean(
    booking.appointmentConfirmed ||
    booking.pickup?.appointmentConfirmed ||
    (booking.pickupWindowStart && booking.pickupWindowEnd)
  );
};

/**
 * Main authorization check function
 * @param {Object} booking - The booking record
 * @param {Object} options - Additional options
 * @returns {Object} Authorization result
 */
const checkAttemptAuthorization = (booking, options = {}) => {
  const {
    forceOriginType = null,
    forceHasGatePass = null,
    forceHasAppointment = null,
  } = options;
  
  // Extract booking data
  const originType = (
    forceOriginType || 
    booking.pickupOriginType || 
    booking.pickup?.locationType || 
    booking.pickup?.originType || 
    'private'
  ).toLowerCase();
  
  const hasGatePass = forceHasGatePass ?? hasGatePassForBooking(booking);
  const hasAppointment = forceHasAppointment ?? hasAppointmentConfirmed(booking);
  const weekendConfirmed = Boolean(booking.weekendConfirmed || booking.pickup?.weekendConfirmed);
  const pickupDate = booking.pickupDate;
  const pickupState = booking.pickup?.state || null;
  const isFirstAttempt = !booking.pickupAttempts || booking.pickupAttempts === 0;
  
  const blockingReasons = [];
  const protectionReasons = [];
  const successReasons = [];
  
  // ============================================================
  // CHECK 1: Gate Pass Requirements
  // ============================================================
  if (GATE_PASS_REQUIRED_TYPES.includes(originType)) {
    if (hasGatePass) {
      successReasons.push(AUTHORIZATION_REASONS.GATE_PASS_VERIFIED);
    } else {
      blockingReasons.push(AUTHORIZATION_REASONS.MISSING_GATE_PASS);
    }
  }
  
  // ============================================================
  // CHECK 2: Appointment Requirements
  // ============================================================
  if (APPOINTMENT_REQUIRED_TYPES.includes(originType)) {
    if (originType === 'auction' && !hasAppointment) {
      protectionReasons.push(AUTHORIZATION_REASONS.AUCTION_DELAY_EXPECTED);
    } else if (originType === 'dealership' && !hasAppointment) {
      protectionReasons.push(AUTHORIZATION_REASONS.DEALERSHIP_DELAY_EXPECTED);
    } else if (hasAppointment) {
      successReasons.push(AUTHORIZATION_REASONS.APPOINTMENT_CONFIRMED);
    }
  }
  
  // ============================================================
  // CHECK 3: Weekend Pickup Confirmation
  // ============================================================
  if (isWeekendPickup(pickupDate)) {
    if (originType === 'auction') {
      blockingReasons.push(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY);
    } else if (originType === 'dealership' && !weekendConfirmed) {
      protectionReasons.push(AUTHORIZATION_REASONS.WEEKEND_NOT_CONFIRMED);
    } else if (originType === 'private' && !weekendConfirmed) {
      protectionReasons.push(AUTHORIZATION_REASONS.CUSTOMER_REQUESTED_TIME);
    }
  }
  
  // ============================================================
  // CHECK 4: Auction Closed Days
  // ============================================================
  if (originType === 'auction' && isAuctionClosedDay(pickupState)) {
    if (!blockingReasons.includes(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY)) {
      blockingReasons.push(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY);
    }
  }
  
  // ============================================================
  // CHECK 5: Business Hours Warning
  // ============================================================
  if (GATE_PASS_REQUIRED_TYPES.includes(originType)) {
    if (!isWithinBusinessHours(pickupState, originType)) {
      if (!blockingReasons.some(r => r.includes('CLOSED'))) {
        protectionReasons.push(AUTHORIZATION_REASONS.OUTSIDE_BUSINESS_HOURS);
      }
    }
  }
  
  // ============================================================
  // CHECK 6: Private Residence
  // ============================================================
  if (originType === 'private') {
    successReasons.push(AUTHORIZATION_REASONS.PRIVATE_RESIDENCE);
  }
  
  // ============================================================
  // CHECK 7: First Attempt Protection
  // ============================================================
  if (isFirstAttempt && blockingReasons.length === 0) {
    protectionReasons.push(AUTHORIZATION_REASONS.FIRST_ATTEMPT);
  }
  
  // ============================================================
  // DETERMINE FINAL STATUS
  // ============================================================
  let status;
  let primaryReason;
  
  if (blockingReasons.length > 0) {
    status = AUTHORIZATION_STATUS.NO;
    primaryReason = blockingReasons[0];
  } else if (protectionReasons.length > 0) {
    status = AUTHORIZATION_STATUS.YES_PROTECTED;
    primaryReason = protectionReasons[0];
  } else {
    status = AUTHORIZATION_STATUS.YES;
    primaryReason = successReasons[0] || AUTHORIZATION_REASONS.ALL_REQUIREMENTS_MET;
  }
  
  return {
    status,
    authorized: status !== AUTHORIZATION_STATUS.NO,
    protected: status === AUTHORIZATION_STATUS.YES_PROTECTED,
    primaryReason,
    primaryReasonLabel: REASON_LABELS[primaryReason] || primaryReason,
    blockingReasons,
    protectionReasons,
    successReasons,
    metadata: {
      originType,
      hasGatePass,
      hasAppointment,
      weekendConfirmed,
      isWeekend: isWeekendPickup(pickupDate),
      isFirstAttempt,
      pickupState,
      checkedAt: new Date().toISOString(),
    },
  };
};

/**
 * Quick check if carrier can attempt pickup
 */
const canAttemptPickup = (booking, options = {}) => {
  const result = checkAttemptAuthorization(booking, options);
  return result.authorized;
};

/**
 * Validate authorization before status transition
 * @param {Object} booking - The booking record
 * @param {string} targetStatus - The target status to transition to
 * @returns {Object} { allowed: boolean, error?: string, code?: string }
 */
const validateAuthorizationForTransition = (booking, targetStatus) => {
  // Only check for transitions related to pickup
  const pickupRelatedStatuses = ['on_the_way_to_pickup', 'arrived_at_pickup'];
  
  if (!pickupRelatedStatuses.includes(targetStatus)) {
    return { allowed: true };
  }
  
  const authResult = checkAttemptAuthorization(booking);
  
  if (!authResult.authorized) {
    return {
      allowed: false,
      error: authResult.primaryReasonLabel,
      code: 'NOT_AUTHORIZED',
      reasons: authResult.blockingReasons,
    };
  }
  
  return { 
    allowed: true,
    protected: authResult.protected,
    protectionReasons: authResult.protectionReasons,
  };
};

module.exports = {
  AUTHORIZATION_STATUS,
  AUTHORIZATION_REASONS,
  REASON_LABELS,
  GATE_PASS_REQUIRED_TYPES,
  APPOINTMENT_REQUIRED_TYPES,
  checkAttemptAuthorization,
  canAttemptPickup,
  validateAuthorizationForTransition,
  hasGatePassForBooking,
  hasAppointmentConfirmed,
  getTimezoneForState,
  isWithinBusinessHours,
  isWeekendPickup,
  isAuctionClosedDay,
};
