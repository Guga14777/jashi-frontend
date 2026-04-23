// server/services/admin/admin.alerts.service.cjs
//
// Compute per-order alert flags so the admin UI can badge rows without any
// client-side math. Every flag is intentionally conservative: we'd rather
// miss a borderline case than cry wolf and train admins to ignore the badges.

const { SHIPMENT_STATUS, normalizeStatus } = require('../booking/index.cjs');

// Default thresholds — overridable via the Setting model when we wire that
// in Group C. Keeping them here as named constants so they're easy to tune.
const DEFAULTS = {
  unassignedAfterMinutes: 60,     // >1h scheduled with no carrier
  stuckAssignedAfterHours: 24,    // >24h assigned but not on the way
  stuckEnRouteAfterHours: 8,      // >8h on-the-way-to-pickup
  delayedDeliveryAfterHours: 36,  // >36h picked up without delivery
  paymentOverdueAfterHours: 48,   // scheduled + unpaid for 48h+
  priceFloorPerMile: 0.35,        // cents-per-mile floor
  priceCeilingPerMile: 4.00,      // cents-per-mile ceiling
};

function hoursAgo(date) {
  if (!date) return Infinity;
  const d = date instanceof Date ? date : new Date(date);
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}
function minutesAgo(date) {
  return hoursAgo(date) * 60;
}

function computeAlertsForBooking(b, paymentStatus = null, thresholds = DEFAULTS) {
  const alerts = [];
  const status = normalizeStatus(b.status);
  const now = Date.now();

  // --- Unassigned too long ---
  if (status === SHIPMENT_STATUS.SCHEDULED && !b.carrierId) {
    const age = minutesAgo(b.createdAt);
    if (age > thresholds.unassignedAfterMinutes) {
      alerts.push({
        kind: 'unassigned',
        severity: age > thresholds.unassignedAfterMinutes * 12 ? 'danger' : 'warn',
        label: 'Unassigned',
        detail: `No carrier for ${formatAge(age * 60 * 1000)}`,
      });
    }
  }

  // --- Stuck assigned (has carrier but hasn't started trip) ---
  if (status === SHIPMENT_STATUS.ASSIGNED && b.assignedAt) {
    const h = hoursAgo(b.assignedAt);
    if (h > thresholds.stuckAssignedAfterHours) {
      alerts.push({
        kind: 'stuck_assigned',
        severity: h > thresholds.stuckAssignedAfterHours * 2 ? 'danger' : 'warn',
        label: 'Stuck — assigned',
        detail: `Carrier hasn't started trip in ${h.toFixed(0)}h`,
      });
    }
  }

  // --- Stuck en route to pickup ---
  if (status === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP) {
    const h = hoursAgo(b.onTheWayAt || b.tripStartedAt);
    if (h > thresholds.stuckEnRouteAfterHours) {
      alerts.push({
        kind: 'stuck_en_route',
        severity: 'warn',
        label: 'Slow en route',
        detail: `On the way for ${h.toFixed(0)}h`,
      });
    }
  }

  // --- Delayed delivery (picked up but stuck in transit) ---
  if (status === SHIPMENT_STATUS.PICKED_UP && b.pickedUpAt) {
    const h = hoursAgo(b.pickedUpAt);
    if (h > thresholds.delayedDeliveryAfterHours) {
      alerts.push({
        kind: 'delayed_delivery',
        severity: h > thresholds.delayedDeliveryAfterHours * 2 ? 'danger' : 'warn',
        label: 'Delayed delivery',
        detail: `Picked up ${h.toFixed(0)}h ago`,
      });
    }
  }

  // --- Detention pending admin review ---
  if (b.detentionRequestedAt && !b.detentionApprovedAt && status !== SHIPMENT_STATUS.CANCELLED) {
    alerts.push({
      kind: 'detention_pending',
      severity: 'warn',
      label: 'Detention pending',
      detail: 'Carrier requested detention fee — needs admin review',
    });
  }

  // --- Could-not-pickup claim awaiting resolution ---
  if (b.couldNotPickupAt) {
    alerts.push({
      kind: 'cnp_pending',
      severity: 'warn',
      label: 'CNP pending',
      detail: "Carrier reported 'could not pickup'",
    });
  }

  // --- Payment overdue (scheduled but unpaid) ---
  if (paymentStatus === 'unpaid' && status === SHIPMENT_STATUS.SCHEDULED) {
    const h = hoursAgo(b.createdAt);
    if (h > thresholds.paymentOverdueAfterHours) {
      alerts.push({
        kind: 'payment_overdue',
        severity: 'warn',
        label: 'Payment overdue',
        detail: `Unpaid for ${h.toFixed(0)}h`,
      });
    }
  }

  // --- Pricing outlier ---
  // Price-per-mile outside the accepted band usually means a mispriced quote
  // (either operator error or a freight market dislocation). We flag both
  // directions so admin can sanity-check before the order picks up.
  if (Number.isFinite(Number(b.price)) && Number(b.price) > 0 && Number.isFinite(Number(b.miles)) && Number(b.miles) > 0) {
    const ppm = Number(b.price) / Number(b.miles);
    if (ppm < thresholds.priceFloorPerMile) {
      alerts.push({
        kind: 'price_too_low',
        severity: ppm < thresholds.priceFloorPerMile / 2 ? 'danger' : 'warn',
        label: 'Price too low',
        detail: `$${ppm.toFixed(2)}/mi — below floor of $${thresholds.priceFloorPerMile}/mi`,
      });
    } else if (ppm > thresholds.priceCeilingPerMile) {
      alerts.push({
        kind: 'price_too_high',
        severity: ppm > thresholds.priceCeilingPerMile * 1.5 ? 'danger' : 'warn',
        label: 'Price too high',
        detail: `$${ppm.toFixed(2)}/mi — above ceiling of $${thresholds.priceCeilingPerMile}/mi`,
      });
    }
  }

  return alerts;
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

module.exports = {
  DEFAULTS,
  computeAlertsForBooking,
};
