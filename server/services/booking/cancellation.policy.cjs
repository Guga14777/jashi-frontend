// server/services/booking/cancellation.policy.cjs
// Canonical cancellation policy. One place to change fees, stage boundaries,
// and copy. Frontend mirror lives at src/components/load-details/utils/
// cancellation-policy.js and MUST stay in sync with these constants.
//
// Stages:
//   A — before carrier accepts (status = scheduled)
//        → free cancellation, platform fee fully refunded.
//   B — after acceptance, before carrier dispatches (status = assigned)
//        → cancellation allowed, platform fee non-refundable, no carrier fee.
//   C — after carrier is en route or on-site (status = on_the_way_to_pickup
//        or arrived_at_pickup)
//        → cancellation allowed, platform fee non-refundable, flat carrier
//          dispatch fee applies.
//   D — after vehicle pickup (status = picked_up or delivered)
//        → normal cancellation not allowed — requires support intervention.

const { SHIPMENT_STATUS } = require('./booking.constants.cjs');
const { normalizeStatus } = require('./booking.status.service.cjs');

const STAGE = { A: 'A', B: 'B', C: 'C', D: 'D' };

// Dispatch fee paid by the customer when the carrier is already en route /
// on-site. Kept simple (flat amount) for MVP. Revisit with mileage-based
// compensation once we have trip-start telemetry.
const CARRIER_DISPATCH_FEE = 50;

// Platform fee is expressed as a percentage of the offer amount — the same
// 6% already displayed to customers in the shipper portal footer/summary.
const PLATFORM_FEE_PERCENT = 6;

const stageForStatus = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case SHIPMENT_STATUS.SCHEDULED:           return STAGE.A;
    case SHIPMENT_STATUS.ASSIGNED:            return STAGE.B;
    case SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP: return STAGE.C;
    case SHIPMENT_STATUS.ARRIVED_AT_PICKUP:   return STAGE.C;
    case SHIPMENT_STATUS.PICKED_UP:
    case SHIPMENT_STATUS.DELIVERED:           return STAGE.D;
    default:                                  return STAGE.A;
  }
};

/**
 * Evaluate a customer cancellation against the policy.
 * Returns { allowed, stage, carrierDispatchFee, platformFeeRefundable,
 * reason, headline, detail } — the `reason` string is filled only when
 * `allowed` is false.
 */
const evaluateCustomerCancel = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === SHIPMENT_STATUS.CANCELLED) {
    return {
      allowed: false,
      stage: null,
      carrierDispatchFee: 0,
      platformFeeRefundable: false,
      reason: 'Booking is already cancelled',
    };
  }

  const stage = stageForStatus(status);

  if (stage === STAGE.D) {
    return {
      allowed: false,
      stage,
      carrierDispatchFee: 0,
      platformFeeRefundable: false,
      reason: 'Cannot cancel after pickup. Contact support if you need to change the shipment.',
    };
  }

  if (stage === STAGE.A) {
    return {
      allowed: true,
      stage,
      carrierDispatchFee: 0,
      platformFeeRefundable: true,
      headline: 'Free cancellation',
      detail: 'No carrier has accepted yet. Your platform fee will be fully refunded.',
    };
  }

  if (stage === STAGE.B) {
    return {
      allowed: true,
      stage,
      carrierDispatchFee: 0,
      platformFeeRefundable: false,
      headline: 'Platform fee is non-refundable',
      detail: 'A carrier has accepted but has not yet started driving. The 3% platform fee is non-refundable.',
    };
  }

  // Stage C
  return {
    allowed: true,
    stage,
    carrierDispatchFee: CARRIER_DISPATCH_FEE,
    platformFeeRefundable: false,
    headline: `Carrier dispatch fee applies ($${CARRIER_DISPATCH_FEE})`,
    detail: `The carrier is already ${normalized === SHIPMENT_STATUS.ARRIVED_AT_PICKUP ? 'on-site at pickup' : 'en route to pickup'}. A $${CARRIER_DISPATCH_FEE} dispatch fee applies and the 3% platform fee is non-refundable.`,
  };
};

/**
 * Evaluate a carrier drop against the policy. Carriers may drop from assigned
 * through arrived_at_pickup. After pickup, they must complete delivery.
 */
const evaluateCarrierDrop = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === SHIPMENT_STATUS.CANCELLED) {
    return { allowed: false, stage: null, reason: 'Booking is already cancelled' };
  }

  const dropAllowed = [
    SHIPMENT_STATUS.ASSIGNED,
    SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
  ].includes(normalized);

  if (!dropAllowed) {
    return {
      allowed: false,
      stage: null,
      reason: normalized === SHIPMENT_STATUS.PICKED_UP
        ? 'Cannot drop load after pickup. You must complete delivery.'
        : 'Cannot drop load at this status.',
    };
  }

  return {
    allowed: true,
    stage: stageForStatus(status),
    carrierPenalty: normalized !== SHIPMENT_STATUS.ASSIGNED, // Flag for reliability score.
    headline: 'Drop load',
    detail: 'The shipment will be returned to the marketplace and the customer notified.',
  };
};

module.exports = {
  STAGE,
  CARRIER_DISPATCH_FEE,
  PLATFORM_FEE_PERCENT,
  stageForStatus,
  evaluateCustomerCancel,
  evaluateCarrierDrop,
};
