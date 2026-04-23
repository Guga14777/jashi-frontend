// server/controllers/admin/admin.bulk.controller.cjs
// Bulk operations across multiple orders. Each action walks the selection
// one row at a time (not a single UPDATE ... WHERE IN) so per-row validation,
// per-row audit writes, and partial failures all behave predictably.

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_ORDER,
  STATUS_LABELS,
  normalizeStatus,
} = require('../../services/booking/index.cjs');

const STATUS_TIMESTAMP = {
  [SHIPMENT_STATUS.ASSIGNED]: 'assignedAt',
  [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'onTheWayAt',
  [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'arrivedAtPickupAt',
  [SHIPMENT_STATUS.PICKED_UP]: 'pickedUpAt',
  [SHIPMENT_STATUS.DELIVERED]: 'deliveredAt',
  [SHIPMENT_STATUS.CANCELLED]: 'cancelledAt',
};

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
    console.error('[admin-bulk-audit] failed to log', eventType, err?.message);
  }
}

// ============================================================
// POST /api/admin/bulk/status
// Body: { ids: string[], status: <one of 7>, note?: string }
// Response: { success: true, results: [{ id, ok, before, after, error? }, ...] }
// ============================================================
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, note } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids[] is required' });
    }
    if (ids.length > 200) {
      return res.status(400).json({ error: 'Bulk operations capped at 200 rows' });
    }

    const allowed = [...STATUS_ORDER, SHIPMENT_STATUS.CANCELLED];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ error: 'Invalid status', allowed });
    }
    const target = normalizeStatus(status);

    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, orderNumber: true },
    });
    const foundIds = new Set(bookings.map((b) => b.id));

    const results = [];
    for (const id of ids) {
      if (!foundIds.has(id)) {
        results.push({ id, ok: false, error: 'not found' });
        continue;
      }
      const before = bookings.find((b) => b.id === id);
      try {
        const data = { status: target, updatedAt: now };
        const ts = STATUS_TIMESTAMP[target];
        if (ts) data[ts] = now;
        if (target === SHIPMENT_STATUS.PICKED_UP) data.pickupAt = now;
        if (target === SHIPMENT_STATUS.CANCELLED && !before.cancelReason) {
          data.cancelReason = note ? `Bulk admin cancel: ${String(note).slice(0, 200)}` : 'Bulk admin cancel';
        }

        await prisma.booking.update({ where: { id }, data });
        results.push({ id, ok: true, before: before.status, after: target, orderNumber: before.orderNumber });
      } catch (err) {
        results.push({ id, ok: false, error: err.message || 'update failed' });
      }
    }

    await logAdminAction(req.userId, 'admin_bulk_status_changed', {
      count: results.length,
      successCount: results.filter((r) => r.ok).length,
      failCount: results.filter((r) => !r.ok).length,
      targetStatus: target,
      note: note || null,
      orderIds: ids,
    }, req);

    res.json({ success: true, results });
  } catch (err) {
    console.error('[admin-bulk] bulkUpdateStatus error:', err);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};
