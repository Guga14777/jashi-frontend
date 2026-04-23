// server/controllers/admin/admin.actions.controller.cjs
//
// Admin-god-mode actions on bookings: manual status overrides, carrier
// reassignment, cancellations, detention approval, and could-not-pickup
// resolution. Every action writes an AccountEvent so we have a clean audit
// trail under /api/admin/activity (Step 5).
//
// The /api/admin prefix guard (requireAdmin) is enforced at the Express
// level, so these handlers trust req.userId as an admin identity.

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  normalizeStatus,
  getStatusStep,
} = require('../../services/booking/index.cjs');

// Map each normalized status to the booking timestamp column that records it.
const STATUS_TIMESTAMP = {
  [SHIPMENT_STATUS.SCHEDULED]: null,  // createdAt already captures this
  [SHIPMENT_STATUS.ASSIGNED]: 'assignedAt',
  [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'onTheWayAt',
  [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'arrivedAtPickupAt',
  [SHIPMENT_STATUS.PICKED_UP]: 'pickedUpAt',
  [SHIPMENT_STATUS.DELIVERED]: 'deliveredAt',
  [SHIPMENT_STATUS.CANCELLED]: 'cancelledAt',
};

// Safely write to AccountEvent. Never throw — we don't want an audit-log
// write failure to reverse a valid admin action.
async function logAdminAction(adminUserId, eventType, eventData = {}, req = null) {
  try {
    await prisma.accountEvent.create({
      data: {
        userId: adminUserId,
        eventType,
        eventData: { ...eventData, actedAt: new Date().toISOString() },
        ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error('[admin-audit] failed to log', eventType, err?.message);
  }
}

function toTargetBooking(b) {
  return {
    id: b.id,
    orderNumber: b.orderNumber,
    ref: b.ref,
    status: b.status,
    statusLabel: STATUS_LABELS[b.status] || b.status,
    statusStep: getStatusStep(b.status),
    carrierId: b.carrierId,
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
  };
}

// Narrow snapshot of a booking for audit diffs. Don't dump the whole row —
// bookings have dozens of fields and we only care about what admin writes touch.
function auditSnapshot(b) {
  if (!b) return null;
  return {
    status: b.status,
    carrierId: b.carrierId || null,
    assignedAt: b.assignedAt || null,
    onTheWayAt: b.onTheWayAt || null,
    arrivedAtPickupAt: b.arrivedAtPickupAt || null,
    pickedUpAt: b.pickedUpAt || null,
    deliveredAt: b.deliveredAt || null,
    cancelledAt: b.cancelledAt || null,
    cancelReason: b.cancelReason || null,
  };
}

// ============================================================
// PATCH /api/admin/orders/:id/status
// Body: { status: '<one of STATUS_ORDER or cancelled>', note?: string }
// ============================================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const allowed = [...STATUS_ORDER, SHIPMENT_STATUS.CANCELLED];
    // Require a canonical status — don't let alias fallback mask typos
    // (e.g. 'banana' would otherwise silently normalize to 'scheduled').
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ error: 'Invalid status', allowed });
    }
    const target = normalizeStatus(status);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true, status: true, orderNumber: true, ref: true, carrierId: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });

    const prior = normalizeStatus(booking.status);
    const now = new Date();
    const data = { status: target, updatedAt: now };

    // Backfill the matching status timestamp if it wasn't set before.
    const tsField = STATUS_TIMESTAMP[target];
    if (tsField) data[tsField] = now;
    // Legacy pickedAt mirror (the schema still has both pickupAt and pickedUpAt).
    if (target === SHIPMENT_STATUS.PICKED_UP) data.pickupAt = now;

    const updated = await prisma.booking.update({
      where: { id },
      data,
      select: {
        id: true, orderNumber: true, ref: true, status: true, carrierId: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });

    await logAdminAction(req.userId, 'admin_order_status_changed', {
      orderId: id,
      orderNumber: booking.orderNumber,
      from: prior,
      to: target,
      note: note || null,
      before: auditSnapshot(booking),
      after: auditSnapshot(updated),
    }, req);

    res.json({ success: true, order: toTargetBooking(updated) });
  } catch (err) {
    console.error('[admin-actions] updateOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ============================================================
// POST /api/admin/orders/:id/assign-carrier
// Body: { carrierId: string|null, note?: string }
// Passing carrierId: null unassigns (sends order back to scheduled).
// ============================================================
exports.assignCarrier = async (req, res) => {
  try {
    const { id } = req.params;
    const { carrierId, note } = req.body || {};

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true, status: true, carrierId: true, orderNumber: true, ref: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });

    let effectiveCarrierId = null;
    if (carrierId) {
      const carrier = await prisma.user.findUnique({
        where: { id: carrierId },
        select: { id: true, roles: true, isActive: true },
      });
      if (!carrier || !carrier.roles || !carrier.roles.includes('CARRIER')) {
        return res.status(400).json({ error: 'User is not a carrier' });
      }
      if (carrier.isActive === false) {
        return res.status(400).json({ error: 'Carrier is inactive' });
      }
      effectiveCarrierId = carrier.id;
    }

    const now = new Date();
    const data = { carrierId: effectiveCarrierId, updatedAt: now };

    // Re-balance status: assigning → 'assigned' if still scheduled;
    // unassigning from a pre-pickup state → back to 'scheduled'.
    const prior = normalizeStatus(booking.status);
    if (effectiveCarrierId) {
      if (prior === SHIPMENT_STATUS.SCHEDULED) {
        data.status = SHIPMENT_STATUS.ASSIGNED;
        data.assignedAt = now;
      }
    } else {
      // Unassign: safe only if pre-pickup. Post-pickup unassign makes no sense.
      if ([SHIPMENT_STATUS.ASSIGNED, SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, SHIPMENT_STATUS.ARRIVED_AT_PICKUP].includes(prior)) {
        data.status = SHIPMENT_STATUS.SCHEDULED;
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data,
      select: {
        id: true, orderNumber: true, ref: true, status: true, carrierId: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });

    await logAdminAction(req.userId, 'admin_order_carrier_reassigned', {
      orderId: id,
      orderNumber: booking.orderNumber,
      previousCarrierId: booking.carrierId || null,
      newCarrierId: effectiveCarrierId,
      note: note || null,
      before: auditSnapshot(booking),
      after: auditSnapshot(updated),
    }, req);

    res.json({ success: true, order: toTargetBooking(updated) });
  } catch (err) {
    console.error('[admin-actions] assignCarrier error:', err);
    res.status(500).json({ error: 'Failed to reassign carrier' });
  }
};

// ============================================================
// POST /api/admin/orders/:id/cancel
// Body: { reason: string, notes?: string }
// Admin cancel bypasses the customer/carrier fee policy — admins have god mode.
// ============================================================
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body || {};

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A cancellation reason is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true, status: true, orderNumber: true, ref: true, carrierId: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });

    const prior = normalizeStatus(booking.status);
    if (prior === SHIPMENT_STATUS.CANCELLED) {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }
    if (prior === SHIPMENT_STATUS.DELIVERED) {
      return res.status(400).json({ error: 'Cannot cancel a delivered order' });
    }

    const now = new Date();
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: SHIPMENT_STATUS.CANCELLED,
        cancelledAt: now,
        cancelReason: String(reason).trim(),
        updatedAt: now,
      },
      select: {
        id: true, orderNumber: true, ref: true, status: true, carrierId: true,
        assignedAt: true, onTheWayAt: true, arrivedAtPickupAt: true,
        pickedUpAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
      },
    });

    await logAdminAction(req.userId, 'admin_order_cancelled', {
      orderId: id,
      orderNumber: booking.orderNumber,
      from: prior,
      reason: String(reason).trim(),
      notes: notes || null,
      before: auditSnapshot(booking),
      after: auditSnapshot(updated),
    }, req);

    res.json({ success: true, order: toTargetBooking(updated) });
  } catch (err) {
    console.error('[admin-actions] cancelOrder error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

// ============================================================
// POST /api/admin/orders/:id/detention/approve
// POST /api/admin/orders/:id/detention/deny
// Body: { amount?: number, notes?: string }
// ============================================================
exports.approveDetention = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body || {};

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, detentionRequestedAt: true, detentionAmount: true },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });
    if (!booking.detentionRequestedAt) {
      return res.status(400).json({ error: 'No detention request on this order' });
    }

    const now = new Date();
    const feeAmount = Number.isFinite(Number(amount)) ? Number(amount) : (booking.detentionAmount || 50);

    await prisma.booking.update({
      where: { id },
      data: {
        detentionApprovedAt: now,
        detentionAmount: feeAmount,
        detentionNotes: notes ? String(notes) : undefined,
        updatedAt: now,
      },
    });

    await logAdminAction(req.userId, 'admin_detention_approved', {
      orderId: id,
      orderNumber: booking.orderNumber,
      amount: feeAmount,
      notes: notes || null,
    }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-actions] approveDetention error:', err);
    res.status(500).json({ error: 'Failed to approve detention' });
  }
};

exports.denyDetention = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, detentionRequestedAt: true },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });
    if (!booking.detentionRequestedAt) {
      return res.status(400).json({ error: 'No detention request on this order' });
    }

    const now = new Date();
    // "Deny" = clear the request without stamping approved. We prefix the
    // notes so the row's history is self-explanatory.
    const noteText = notes
      ? `DENIED by admin: ${String(notes)}`
      : `DENIED by admin at ${now.toISOString()}`;

    await prisma.booking.update({
      where: { id },
      data: {
        detentionRequestedAt: null,
        detentionApprovedAt: null,
        detentionAmount: null,
        detentionNotes: noteText,
        updatedAt: now,
      },
    });

    await logAdminAction(req.userId, 'admin_detention_denied', {
      orderId: id,
      orderNumber: booking.orderNumber,
      notes: notes || null,
    }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-actions] denyDetention error:', err);
    res.status(500).json({ error: 'Failed to deny detention' });
  }
};

// ============================================================
// POST /api/admin/orders/:id/cnp/resolve
// Body: { resolution: 'approve_tonu' | 'reject', notes?: string }
//   - approve_tonu: admin accepts the carrier's CNP claim → status cancelled,
//     TONU eligible (downstream payout system picks this up).
//   - reject: admin rejects the CNP claim → clears the flag, order resumes.
// ============================================================
exports.resolveCouldNotPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body || {};

    if (!['approve_tonu', 'reject'].includes(resolution)) {
      return res.status(400).json({ error: "resolution must be 'approve_tonu' or 'reject'" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, couldNotPickupAt: true, status: true },
    });
    if (!booking) return res.status(404).json({ error: 'Order not found' });
    if (!booking.couldNotPickupAt) {
      return res.status(400).json({ error: "No 'could not pickup' claim on this order" });
    }

    const now = new Date();
    const data = { updatedAt: now };

    if (resolution === 'approve_tonu') {
      data.status = SHIPMENT_STATUS.CANCELLED;
      data.cancelledAt = now;
      data.cancelReason = 'Carrier could not pickup — admin approved TONU';
    } else {
      // reject: clear the CNP claim, put the order back in play.
      data.couldNotPickupAt = null;
      data.couldNotPickupReason = null;
      data.couldNotPickupProof = null;
    }

    await prisma.booking.update({ where: { id }, data });

    await logAdminAction(req.userId, 'admin_cnp_resolved', {
      orderId: id,
      orderNumber: booking.orderNumber,
      resolution,
      notes: notes || null,
    }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-actions] resolveCouldNotPickup error:', err);
    res.status(500).json({ error: 'Failed to resolve CNP claim' });
  }
};
