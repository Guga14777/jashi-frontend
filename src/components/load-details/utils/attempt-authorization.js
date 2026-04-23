// ============================================================
// FILE: src/components/load-details/utils/attempt-authorization.js
// Attempt Authorization logic for carrier pickups
// Determines if a carrier is authorized to attempt pickup
// ============================================================

import { getTimezoneForState, getTimezoneAbbreviation } from '../../../utils/timezone-utils.js';

/**
 * Authorization status enum
 */
export const AUTHORIZATION_STATUS = {
  YES: 'YES',                     // Fully authorized, can proceed
  YES_PROTECTED: 'YES_PROTECTED', // Authorized with TONU/detention protection
  NO: 'NO',                       // Not authorized, cannot proceed
};

/**
 * Authorization reason codes
 */
export const AUTHORIZATION_REASONS = {
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
export const REASON_LABELS = {
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
export const GATE_PASS_REQUIRED_TYPES = ['auction', 'dealership'];

/**
 * Origin types that may require appointments
 */
export const APPOINTMENT_REQUIRED_TYPES = ['auction', 'dealership'];

/**
 * Check if current time is within business hours for a location
 */
const isWithinBusinessHours = (pickupState, locationType) => {
  const now = new Date();
  const timezone = pickupState ? getTimezoneForState(pickupState) : null;
  
  let localHour;
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      });
      localHour = parseInt(formatter.format(now), 10);
    } catch {
      localHour = now.getHours();
    }
  } else {
    localHour = now.getHours();
  }
  
  // Business hours vary by location type
  if (locationType === 'auction') {
    // Auctions: typically 8 AM - 5 PM
    return localHour >= 8 && localHour < 17;
  } else if (locationType === 'dealership') {
    // Dealerships: typically 9 AM - 7 PM
    return localHour >= 9 && localHour < 19;
  }
  
  // Private: more flexible, 7 AM - 9 PM
  return localHour >= 7 && localHour < 21;
};

/**
 * Check if pickup date is a weekend
 */
const isWeekendPickup = (pickupDate) => {
  if (!pickupDate) return false;
  
  const date = new Date(pickupDate);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
};

/**
 * Check if today is a typical auction closed day
 */
const isAuctionClosedDay = (pickupState) => {
  const now = new Date();
  const timezone = pickupState ? getTimezoneForState(pickupState) : null;
  
  let localDay;
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      });
      const dayName = formatter.format(now);
      const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      localDay = dayMap[dayName] ?? now.getDay();
    } catch {
      localDay = now.getDay();
    }
  } else {
    localDay = now.getDay();
  }
  
  // Most auctions closed Sunday
  return localDay === 0;
};

/**
 * Main authorization check function
 * 
 * @param {Object} params - Authorization parameters
 * @param {string} params.originType - 'auction', 'dealership', or 'private'
 * @param {boolean} params.hasGatePass - Whether gate pass is uploaded
 * @param {boolean} params.hasAppointment - Whether appointment is confirmed
 * @param {boolean} params.weekendConfirmed - Whether weekend pickup is confirmed
 * @param {string} params.pickupDate - Scheduled pickup date
 * @param {string} params.pickupState - Two-letter state code
 * @param {string} params.pickupWindowStart - Start of pickup window
 * @param {string} params.pickupWindowEnd - End of pickup window
 * @param {boolean} params.isFirstAttempt - Whether this is the first pickup attempt
 * @param {string} params.status - Current booking status
 * @returns {Object} Authorization result
 */
export const checkAttemptAuthorization = ({
  originType = 'private',
  hasGatePass = false,
  hasAppointment = false,
  weekendConfirmed = false,
  pickupDate = null,
  pickupState = null,
  pickupWindowStart = null,
  pickupWindowEnd = null,
  isFirstAttempt = true,
  status = 'assigned',
} = {}) => {
  const normalizedOriginType = (originType || 'private').toLowerCase();
  const blockingReasons = [];
  const protectionReasons = [];
  const successReasons = [];
  
  // ============================================================
  // CHECK 1: Gate Pass Requirements
  // ============================================================
  if (GATE_PASS_REQUIRED_TYPES.includes(normalizedOriginType)) {
    if (hasGatePass) {
      successReasons.push(AUTHORIZATION_REASONS.GATE_PASS_VERIFIED);
    } else {
      blockingReasons.push(AUTHORIZATION_REASONS.MISSING_GATE_PASS);
    }
  }
  
  // ============================================================
  // CHECK 2: Appointment Requirements (auction/dealership)
  // ============================================================
  if (APPOINTMENT_REQUIRED_TYPES.includes(normalizedOriginType)) {
    // For auctions, appointments are often required
    if (normalizedOriginType === 'auction' && !hasAppointment) {
      // Not blocking, but adds protection
      protectionReasons.push(AUTHORIZATION_REASONS.AUCTION_DELAY_EXPECTED);
    } else if (normalizedOriginType === 'dealership' && !hasAppointment) {
      protectionReasons.push(AUTHORIZATION_REASONS.DEALERSHIP_DELAY_EXPECTED);
    } else if (hasAppointment) {
      successReasons.push(AUTHORIZATION_REASONS.APPOINTMENT_CONFIRMED);
    }
  }
  
  // ============================================================
  // CHECK 3: Weekend Pickup Confirmation
  // ============================================================
  if (isWeekendPickup(pickupDate)) {
    if (normalizedOriginType === 'auction') {
      // Auctions typically closed on weekends
      blockingReasons.push(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY);
    } else if (normalizedOriginType === 'dealership' && !weekendConfirmed) {
      // Dealerships may be open but confirm
      protectionReasons.push(AUTHORIZATION_REASONS.WEEKEND_NOT_CONFIRMED);
    } else if (normalizedOriginType === 'private' && !weekendConfirmed) {
      // Private needs confirmation
      protectionReasons.push(AUTHORIZATION_REASONS.CUSTOMER_REQUESTED_TIME);
    }
  }
  
  // ============================================================
  // CHECK 4: Auction Closed Days
  // ============================================================
  if (normalizedOriginType === 'auction' && isAuctionClosedDay(pickupState)) {
    if (!blockingReasons.includes(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY)) {
      blockingReasons.push(AUTHORIZATION_REASONS.AUCTION_CLOSED_TODAY);
    }
  }
  
  // ============================================================
  // CHECK 5: Business Hours (warning only for auction/dealership)
  // ============================================================
  if (GATE_PASS_REQUIRED_TYPES.includes(normalizedOriginType)) {
    if (!isWithinBusinessHours(pickupState, normalizedOriginType)) {
      // Not blocking, but note it
      if (!blockingReasons.some(r => r.includes('CLOSED'))) {
        protectionReasons.push(AUTHORIZATION_REASONS.OUTSIDE_BUSINESS_HOURS);
      }
    }
  }
  
  // ============================================================
  // CHECK 6: Private Residence (always flexible)
  // ============================================================
  if (normalizedOriginType === 'private') {
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
  let authorizationStatus;
  let primaryReason;
  
  if (blockingReasons.length > 0) {
    authorizationStatus = AUTHORIZATION_STATUS.NO;
    primaryReason = blockingReasons[0];
  } else if (protectionReasons.length > 0) {
    authorizationStatus = AUTHORIZATION_STATUS.YES_PROTECTED;
    primaryReason = protectionReasons[0];
  } else {
    authorizationStatus = AUTHORIZATION_STATUS.YES;
    primaryReason = successReasons[0] || AUTHORIZATION_REASONS.ALL_REQUIREMENTS_MET;
  }
  
  return {
    status: authorizationStatus,
    authorized: authorizationStatus !== AUTHORIZATION_STATUS.NO,
    protected: authorizationStatus === AUTHORIZATION_STATUS.YES_PROTECTED,
    primaryReason,
    primaryReasonLabel: REASON_LABELS[primaryReason] || primaryReason,
    blockingReasons,
    protectionReasons,
    successReasons,
    allReasons: {
      blocking: blockingReasons.map(r => ({ code: r, label: REASON_LABELS[r] })),
      protection: protectionReasons.map(r => ({ code: r, label: REASON_LABELS[r] })),
      success: successReasons.map(r => ({ code: r, label: REASON_LABELS[r] })),
    },
    metadata: {
      originType: normalizedOriginType,
      hasGatePass,
      hasAppointment,
      weekendConfirmed,
      isWeekend: isWeekendPickup(pickupDate),
      isFirstAttempt,
      checkedAt: new Date().toISOString(),
    },
  };
};

/**
 * Quick check if carrier can proceed with pickup attempt
 */
export const canAttemptPickup = (params) => {
  const result = checkAttemptAuthorization(params);
  return result.authorized;
};

/**
 * Get authorization status badge info for UI
 */
export const getAuthorizationBadgeInfo = (authResult) => {
  if (!authResult) {
    return {
      status: 'unknown',
      label: 'Unknown',
      color: 'gray',
      icon: 'question',
    };
  }
  
  switch (authResult.status) {
    case AUTHORIZATION_STATUS.YES:
      return {
        status: 'yes',
        label: 'Authorized',
        color: 'green',
        icon: 'check',
        description: 'All requirements met. Proceed with pickup.',
      };
    
    case AUTHORIZATION_STATUS.YES_PROTECTED:
      return {
        status: 'protected',
        label: 'Protected',
        color: 'blue',
        icon: 'shield',
        description: 'Authorized with TONU/detention protection.',
      };
    
    case AUTHORIZATION_STATUS.NO:
      return {
        status: 'no',
        label: 'Not Authorized',
        color: 'red',
        icon: 'x',
        description: 'Requirements not met. Cannot proceed.',
      };
    
    default:
      return {
        status: 'unknown',
        label: 'Unknown',
        color: 'gray',
        icon: 'question',
        description: 'Authorization status unknown.',
      };
  }
};

export default {
  AUTHORIZATION_STATUS,
  AUTHORIZATION_REASONS,
  REASON_LABELS,
  checkAttemptAuthorization,
  canAttemptPickup,
  getAuthorizationBadgeInfo,
};