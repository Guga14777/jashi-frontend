// ============================================================
// FILE: src/components/load-details/index.js
// Barrel export for load-details module
// ============================================================

// Main modal component
export { default } from './load-details-modal.jsx';
export { default as LoadDetailsModal } from './load-details-modal.jsx';

// Re-export constants for backwards compatibility
export {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  normalizeStatus,
  getStatusStep,
  getStatusDisplay,
} from './utils/status-map.js';

export {
  WAITING_FEE_THRESHOLD_MINUTES,
  WAITING_FEE_AMOUNT,
  calculateWaitTimerStart,
  calculateWaitingMinutes,
  isWaitingFeeEligible,
} from './hooks/use-detention-timer.js';

export {
  canCancelBooking,
  getCancellationFee,
  getCarrierActionPermissions,
} from './utils/permissions.js';
