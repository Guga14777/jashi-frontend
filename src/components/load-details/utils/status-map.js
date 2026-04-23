// ============================================================
// FILE: src/components/load-details/utils/status-map.js
// Status constants and helpers for shipment tracking
// ✅ Matches backend SHIPMENT_STATUS (6-step flow)
// ============================================================

/**
 * Shipment status constants (6-step flow)
 */
export const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  ON_THE_WAY_TO_PICKUP: 'on_the_way_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

/**
 * Human-readable status labels
 */
export const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'On the Way',
  [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'Arrived at Pickup',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
  [SHIPMENT_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * Status order for progress tracking (0-5)
 */
export const STATUS_ORDER = [
  SHIPMENT_STATUS.SCHEDULED,       // Step 0
  SHIPMENT_STATUS.ASSIGNED,        // Step 1
  SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, // Step 2
  SHIPMENT_STATUS.ARRIVED_AT_PICKUP,    // Step 3
  SHIPMENT_STATUS.PICKED_UP,       // Step 4
  SHIPMENT_STATUS.DELIVERED,       // Step 5
];

/**
 * Normalize status string to standard format
 */
export const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  
  const s = String(status).toLowerCase().trim().replace(/[_\s-]+/g, '_');
  
  const statusMap = {
    'scheduled': SHIPMENT_STATUS.SCHEDULED,
    'pending': SHIPMENT_STATUS.SCHEDULED,
    'waiting': SHIPMENT_STATUS.SCHEDULED,
    'new': SHIPMENT_STATUS.SCHEDULED,
    'assigned': SHIPMENT_STATUS.ASSIGNED,
    'accepted': SHIPMENT_STATUS.ASSIGNED,
    'carrier_assigned': SHIPMENT_STATUS.ASSIGNED,
    'carrier_accepted': SHIPMENT_STATUS.ASSIGNED,
    'on_the_way': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'on_the_way_to_pickup': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'in_transit_to_pickup': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'enroute': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'en_route': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'dispatched': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'arrived': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'arrived_at_pickup': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'at_pickup': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'waiting_at_pickup': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'picked_up': SHIPMENT_STATUS.PICKED_UP,
    'pickedup': SHIPMENT_STATUS.PICKED_UP,
    'in_transit': SHIPMENT_STATUS.PICKED_UP,
    'loaded': SHIPMENT_STATUS.PICKED_UP,
    'delivered': SHIPMENT_STATUS.DELIVERED,
    'completed': SHIPMENT_STATUS.DELIVERED,
    'done': SHIPMENT_STATUS.DELIVERED,
    'cancelled': SHIPMENT_STATUS.CANCELLED,
    'canceled': SHIPMENT_STATUS.CANCELLED,
  };
  
  return statusMap[s] || SHIPMENT_STATUS.SCHEDULED;
};

/**
 * Get numeric step for status (0-5)
 */
export const getStatusStep = (status) => {
  const normalized = normalizeStatus(status);
  
  if (normalized === SHIPMENT_STATUS.CANCELLED) {
    return -1;
  }
  
  const index = STATUS_ORDER.indexOf(normalized);
  return index >= 0 ? index : 0;
};

/**
 * Check if status is active (not delivered or cancelled)
 */
export const isActiveStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized !== SHIPMENT_STATUS.DELIVERED && 
         normalized !== SHIPMENT_STATUS.CANCELLED;
};

/**
 * Check if status is before another status
 */
export const isStatusBefore = (status, targetStatus) => {
  return getStatusStep(status) < getStatusStep(targetStatus);
};

/**
 * Check if status is at or after another status
 */
export const isStatusAtOrAfter = (status, targetStatus) => {
  return getStatusStep(status) >= getStatusStep(targetStatus);
};

/**
 * Get display label for status
 */
export const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || 'Unknown';
};

/**
 * Get next status in flow
 */
export const getNextStatus = (currentStatus) => {
  const step = getStatusStep(currentStatus);
  if (step < 0 || step >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[step + 1];
};

/**
 * Check if transition from current to target status is valid
 */
export const isValidTransition = (currentStatus, targetStatus) => {
  const current = normalizeStatus(currentStatus);
  const target = normalizeStatus(targetStatus);
  
  const validTransitions = {
    [SHIPMENT_STATUS.SCHEDULED]: [SHIPMENT_STATUS.ASSIGNED, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ASSIGNED]: [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: [SHIPMENT_STATUS.ARRIVED_AT_PICKUP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: [SHIPMENT_STATUS.PICKED_UP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.PICKED_UP]: [SHIPMENT_STATUS.DELIVERED],
    [SHIPMENT_STATUS.DELIVERED]: [],
    [SHIPMENT_STATUS.CANCELLED]: [],
  };
  
  const allowed = validTransitions[current] || [];
  return allowed.includes(target);
};

/**
 * Get status display info (label, color, icon type)
 */
export const getStatusDisplay = (status) => {
  const normalized = normalizeStatus(status);
  
  const displayMap = {
    [SHIPMENT_STATUS.SCHEDULED]: {
      label: 'Scheduled',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      type: 'pending',
    },
    [SHIPMENT_STATUS.ASSIGNED]: {
      label: 'Assigned',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      type: 'info',
    },
    [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: {
      label: 'On the Way',
      color: '#D97706',
      bgColor: '#FEF3C7',
      type: 'progress',
    },
    [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: {
      label: 'At Pickup',
      color: '#D97706',
      bgColor: '#FEF3C7',
      type: 'progress',
    },
    [SHIPMENT_STATUS.PICKED_UP]: {
      label: 'Picked Up',
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      type: 'progress',
    },
    [SHIPMENT_STATUS.DELIVERED]: {
      label: 'Delivered',
      color: '#059669',
      bgColor: '#D1FAE5',
      type: 'success',
    },
    [SHIPMENT_STATUS.CANCELLED]: {
      label: 'Cancelled',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      type: 'error',
    },
  };
  
  return displayMap[normalized] || {
    label: 'Unknown',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    type: 'unknown',
  };
};

// ============================================================
// 5-bucket product display status
//
// Backend keeps the full 6-step precision (needed for detention timers,
// carrier dispatch, etc.). Customer-facing dashboards surface a simpler
// 5-bucket view. Use toDisplayStatus() anywhere you render a status badge
// to the end user — never apply the 6-step canonical values directly to
// dashboards, lists, or status filters.
// ============================================================

export const DISPLAY_STATUS = {
  WAITING:   'waiting',
  ASSIGNED:  'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const DISPLAY_STATUS_LABELS = {
  [DISPLAY_STATUS.WAITING]:   'Waiting',
  [DISPLAY_STATUS.ASSIGNED]:  'Assigned',
  [DISPLAY_STATUS.PICKED_UP]: 'Picked Up',
  [DISPLAY_STATUS.DELIVERED]: 'Delivered',
  [DISPLAY_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * Collapse the backend 6-step status to one of five product-facing buckets.
 * All carrier-in-transit states (assigned / on_the_way / arrived_at_pickup)
 * collapse to 'assigned' — the customer only cares that a carrier is on it.
 */
export const toDisplayStatus = (status) => {
  const canonical = normalizeStatus(status);
  switch (canonical) {
    case SHIPMENT_STATUS.SCHEDULED:
      return DISPLAY_STATUS.WAITING;
    case SHIPMENT_STATUS.ASSIGNED:
    case SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP:
    case SHIPMENT_STATUS.ARRIVED_AT_PICKUP:
      return DISPLAY_STATUS.ASSIGNED;
    case SHIPMENT_STATUS.PICKED_UP:
      return DISPLAY_STATUS.PICKED_UP;
    case SHIPMENT_STATUS.DELIVERED:
      return DISPLAY_STATUS.DELIVERED;
    case SHIPMENT_STATUS.CANCELLED:
      return DISPLAY_STATUS.CANCELLED;
    default:
      return DISPLAY_STATUS.WAITING;
  }
};

export const getDisplayStatusLabel = (status) => {
  return DISPLAY_STATUS_LABELS[toDisplayStatus(status)] || 'Unknown';
};

/**
 * Badge theme for the 5-bucket display. Returns { value, label, color, bgColor }
 * so call sites can render a consistent pill across customer/carrier/admin dashboards.
 */
export const getDisplayStatusBadge = (status) => {
  const value = toDisplayStatus(status);
  const themes = {
    [DISPLAY_STATUS.WAITING]:   { color: '#6B7280', bgColor: '#F3F4F6' },
    [DISPLAY_STATUS.ASSIGNED]:  { color: '#2563EB', bgColor: '#DBEAFE' },
    [DISPLAY_STATUS.PICKED_UP]: { color: '#7C3AED', bgColor: '#EDE9FE' },
    [DISPLAY_STATUS.DELIVERED]: { color: '#059669', bgColor: '#D1FAE5' },
    [DISPLAY_STATUS.CANCELLED]: { color: '#DC2626', bgColor: '#FEE2E2' },
  };
  return {
    value,
    label: DISPLAY_STATUS_LABELS[value],
    ...themes[value],
  };
};

export default {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  DISPLAY_STATUS,
  DISPLAY_STATUS_LABELS,
  normalizeStatus,
  getStatusStep,
  isActiveStatus,
  isStatusBefore,
  isStatusAtOrAfter,
  getStatusLabel,
  getStatusDisplay,
  getNextStatus,
  isValidTransition,
  toDisplayStatus,
  getDisplayStatusLabel,
  getDisplayStatusBadge,
};
