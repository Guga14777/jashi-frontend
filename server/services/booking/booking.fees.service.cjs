// ============================================================
// FILE: server/services/booking/booking.fees.service.cjs
// Detention fee and other fee calculations
// ============================================================

const {
  SHIPMENT_STATUS,
  DETENTION_THRESHOLD_MINUTES,
  DETENTION_FEE_AMOUNT,
} = require('./booking.constants.cjs');
const { normalizeStatus } = require('./booking.status.service.cjs');
const { calculateWaitingMinutes, computeEffectiveWaitStart } = require('./booking.helpers.cjs');

// Toggle verbose waiting-fee logs with DEBUG_WAITING_FEE=1 in .env.
// Always-on in non-production so you don't have to remember to set the flag
// during local testing.
const WAITING_FEE_DEBUG =
  process.env.DEBUG_WAITING_FEE === '1' || process.env.NODE_ENV !== 'production';

const logWaitingFeeCalc = (booking, effectiveStart, minutesWaited) => {
  if (!WAITING_FEE_DEBUG) return;
  const arrived = booking.arrivedAtPickupAt
    ? new Date(booking.arrivedAtPickupAt)
    : null;
  const windowStart = booking.pickupWindowStart || null;
  const pickupDate = booking.pickupDate
    ? new Date(booking.pickupDate).toISOString().slice(0, 10)
    : null;
  const source =
    !effectiveStart
      ? 'none (no arrival yet)'
      : arrived && effectiveStart.getTime() === arrived.getTime()
      ? 'carrier arrival'
      : 'pickup window start';

  console.log('[waiting-fee] ───────────────────────────────');
  console.log(`[waiting-fee] booking.id            = ${booking.id || '(unknown)'}`);
  console.log(`[waiting-fee] status                = ${booking.status}`);
  console.log(`[waiting-fee] arrivedAtPickupAt     = ${arrived ? arrived.toISOString() : 'null'}`);
  console.log(`[waiting-fee] pickupDate            = ${pickupDate || 'null'}`);
  console.log(`[waiting-fee] pickupWindowStart     = ${windowStart || 'null'}`);
  console.log(`[waiting-fee] effectiveStart        = ${effectiveStart ? effectiveStart.toISOString() : 'null'}`);
  console.log(`[waiting-fee] effectiveStart source = ${source}`);
  console.log(`[waiting-fee] now                   = ${new Date().toISOString()}`);
  console.log(`[waiting-fee] minutesWaited         = ${minutesWaited}`);
  console.log(`[waiting-fee] threshold             = ${DETENTION_THRESHOLD_MINUTES} min`);
  console.log(`[waiting-fee] eligible              = ${minutesWaited >= DETENTION_THRESHOLD_MINUTES}`);
  console.log('[waiting-fee] ───────────────────────────────');
};

/**
 * Is the carrier eligible for a waiting fee right now?
 *
 * Eligibility requires all of:
 *   1. Booking is in ARRIVED_AT_PICKUP status (carrier is physically on-site).
 *   2. Fee has not already been requested.
 *   3. 60+ minutes have elapsed since the effective waiting start,
 *      where effective waiting start = max(arrival time, pickup window start).
 */
const checkDetentionEligibility = (booking) => {
  const { detentionRequestedAt, status } = booking;
  const normalizedStatus = normalizeStatus(status);
  const effectiveStart = computeEffectiveWaitStart(booking);

  if (normalizedStatus !== SHIPMENT_STATUS.ARRIVED_AT_PICKUP) {
    return {
      eligible: false,
      alreadyRequested: !!detentionRequestedAt,
      minutesWaited: 0,
      minutesUntilEligible: DETENTION_THRESHOLD_MINUTES,
      effectiveStart,
      message: 'Carrier must be at pickup location to request waiting fee',
    };
  }

  if (detentionRequestedAt) {
    return {
      eligible: false,
      alreadyRequested: true,
      minutesWaited: calculateWaitingMinutes(booking),
      minutesUntilEligible: 0,
      effectiveStart,
      message: 'Waiting fee already requested',
    };
  }

  const minutesWaited = calculateWaitingMinutes(booking);
  const minutesUntilEligible = Math.max(0, DETENTION_THRESHOLD_MINUTES - minutesWaited);
  const eligible = minutesWaited >= DETENTION_THRESHOLD_MINUTES;

  logWaitingFeeCalc(booking, effectiveStart, minutesWaited);

  return {
    eligible,
    alreadyRequested: false,
    minutesWaited,
    minutesUntilEligible,
    effectiveStart,
    message: eligible
      ? `Eligible for $${DETENTION_FEE_AMOUNT} waiting fee (${minutesWaited} minutes past the ${DETENTION_THRESHOLD_MINUTES}-minute grace period)`
      : `Eligible in ${minutesUntilEligible} minutes`,
  };
};

/**
 * Calculate total payout including detention fee
 */
const calculateTotalPayout = (booking) => {
  let payoutAmount = booking.carrierPayout || booking.price || 0;
  
  // Add detention fee if approved
  if (booking.detentionApprovedAt && booking.detentionAmount > 0) {
    payoutAmount += booking.detentionAmount;
  }
  
  return payoutAmount;
};

/**
 * Get detention fee constants
 */
const getDetentionConstants = () => ({
  thresholdMinutes: DETENTION_THRESHOLD_MINUTES,
  feeAmount: DETENTION_FEE_AMOUNT,
});

module.exports = {
  checkDetentionEligibility,
  calculateTotalPayout,
  getDetentionConstants,
  DETENTION_THRESHOLD_MINUTES,
  DETENTION_FEE_AMOUNT,
};
