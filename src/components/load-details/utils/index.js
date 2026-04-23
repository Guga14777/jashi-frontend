// ============================================================
// FILE: src/components/load-details/utils/index.js
// Consolidated exports for load-details utilities
// ============================================================

// Status utilities
export {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  normalizeStatus,
  getStatusStep,
  STATUS_ALIASES,
} from './status-map';

// Permission utilities
export {
  getStatusFlags,
  getCarrierActionPermissions,
  canCancelBooking,
  getCancellationFee,
  getCancellationMessage,
  isArrivalAllowed,
} from './permissions';

// Extractors
export {
  extractVehicleDetails,
  extractPickupInfo,
  extractDropoffInfo,
  extractSchedulingInfo,
  extractMultiVehicleData,
} from './extractors';

// Formatters
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatDistance,
  formatPhone,
  formatAddress,
} from './formatters';

// ✅ NEW: Authorization utilities
export {
  AUTHORIZATION_STATUS,
  AUTHORIZATION_REASONS,
  REASON_LABELS,
  GATE_PASS_REQUIRED_TYPES,
  APPOINTMENT_REQUIRED_TYPES,
  checkAttemptAuthorization,
  canAttemptPickup,
  getAuthorizationBadgeInfo,
} from './attempt-authorization';