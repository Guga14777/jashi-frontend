// ============================================================
// FILE: server/services/booking/booking.status.service.cjs
// Status validation and transition helpers
// ============================================================

const { SHIPMENT_STATUS, STATUS_ORDER } = require('./booking.constants.cjs');

/**
 * Normalize various status strings to standard format
 */
const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  const s = status.toLowerCase().trim();
  
  if (s === 'cancelled' || s === 'canceled') return SHIPMENT_STATUS.CANCELLED;
  if (['waiting', 'pending', 'booked', 'scheduled'].includes(s)) return SHIPMENT_STATUS.SCHEDULED;
  if (['assigned', 'accepted', 'carrier_assigned', 'carrier_accepted'].includes(s)) return SHIPMENT_STATUS.ASSIGNED;
  if (['on_the_way_to_pickup', 'on_the_way', 'en_route', 'enroute', 'driving', 'dispatched'].includes(s)) return SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP;
  if (['arrived_at_pickup', 'arrived', 'at_pickup'].includes(s)) return SHIPMENT_STATUS.ARRIVED_AT_PICKUP;
  if (['picked_up', 'in_transit', 'pickup_complete'].includes(s)) return SHIPMENT_STATUS.PICKED_UP;
  if (['delivered', 'completed', 'done'].includes(s)) return SHIPMENT_STATUS.DELIVERED;
  
  return SHIPMENT_STATUS.SCHEDULED;
};

/**
 * Get numeric step index for a status
 */
const getStatusStep = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === SHIPMENT_STATUS.CANCELLED) return -1;
  return STATUS_ORDER.indexOf(normalized);
};

/**
 * Validate if a status transition is allowed
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const currentNormalized = normalizeStatus(currentStatus);
  const newNormalized = normalizeStatus(newStatus);
  
  if (currentNormalized === newNormalized) return { valid: true };
  if (currentNormalized === SHIPMENT_STATUS.DELIVERED) {
    return { valid: false, error: 'Cannot change status after delivery' };
  }
  if (currentNormalized === SHIPMENT_STATUS.CANCELLED) {
    return { valid: false, error: 'Cannot change status of cancelled booking' };
  }
  if (newNormalized === SHIPMENT_STATUS.CANCELLED) return { valid: true };
  
  const currentStep = getStatusStep(currentNormalized);
  const newStep = getStatusStep(newNormalized);
  
  if (newStep < currentStep) {
    return { valid: false, error: `Cannot move backwards: ${currentNormalized} → ${newNormalized}` };
  }
  if (newStep > currentStep + 1) {
    const expectedNext = STATUS_ORDER[currentStep + 1];
    return { 
      valid: false, 
      error: `Cannot skip steps. Current: ${currentNormalized}. Expected next: ${expectedNext}. Got: ${newNormalized}` 
    };
  }
  
  return { valid: true };
};

/**
 * Get allowed statuses for marking as picked up
 */
const getPickupAllowedStatuses = () => [
  SHIPMENT_STATUS.ASSIGNED, 
  SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
  SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
  SHIPMENT_STATUS.PICKED_UP,
];

/**
 * Get allowed statuses for marking as delivered
 */
const getDeliveryAllowedStatuses = () => [
  SHIPMENT_STATUS.PICKED_UP, 
  SHIPMENT_STATUS.DELIVERED,
];

module.exports = {
  normalizeStatus,
  getStatusStep,
  validateStatusTransition,
  getPickupAllowedStatuses,
  getDeliveryAllowedStatuses,
};
