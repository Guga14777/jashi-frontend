// src/components/load-details/utils/cancellation-policy.js
// Frontend mirror of server/services/booking/cancellation.policy.cjs.
// Keep in sync with the backend module — same stage boundaries, same fees.

import { SHIPMENT_STATUS, normalizeStatus } from './status-map';

export const STAGE = { A: 'A', B: 'B', C: 'C', D: 'D' };
export const CARRIER_DISPATCH_FEE = 50;
export const PLATFORM_FEE_PERCENT = 6;

export const stageForStatus = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case SHIPMENT_STATUS.SCHEDULED:            return STAGE.A;
    case SHIPMENT_STATUS.ASSIGNED:             return STAGE.B;
    case SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP: return STAGE.C;
    case SHIPMENT_STATUS.ARRIVED_AT_PICKUP:    return STAGE.C;
    case SHIPMENT_STATUS.PICKED_UP:
    case SHIPMENT_STATUS.DELIVERED:            return STAGE.D;
    default:                                   return STAGE.A;
  }
};

export const evaluateCustomerCancel = (status) => {
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
    detail: `The carrier is already ${
      normalized === SHIPMENT_STATUS.ARRIVED_AT_PICKUP ? 'on-site at pickup' : 'en route to pickup'
    }. A $${CARRIER_DISPATCH_FEE} dispatch fee applies and the 3% platform fee is non-refundable.`,
  };
};

export const evaluateCarrierDrop = (status) => {
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
    carrierPenalty: normalized !== SHIPMENT_STATUS.ASSIGNED,
    headline: 'Drop load',
    detail: 'The shipment will be returned to the marketplace and the customer notified.',
  };
};
