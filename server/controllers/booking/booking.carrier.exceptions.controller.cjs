// ============================================================
// FILE: server/controllers/booking/booking.carrier.exceptions.controller.cjs
// Carrier exception handling (could not pickup, etc.)
// ============================================================

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  normalizeStatus,
  COULD_NOT_PICKUP_REASONS,
  COULD_NOT_PICKUP_LABELS,
} = require('../../services/booking/index.cjs');

// ============================================================
// POST /api/carrier/loads/:id/could-not-pickup
// ============================================================
const reportCouldNotPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { reason, notes, proofDocumentIds = [] } = req.body;
    
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: { user: { select: { id: true } } },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or access denied' });
    }

    const currentStatus = normalizeStatus(booking.status);
    
    // Can only report issue if at pickup
    if (currentStatus !== SHIPMENT_STATUS.ARRIVED_AT_PICKUP) {
      return res.status(400).json({
        error: 'Can only report pickup issues when at pickup location',
        currentStatus,
      });
    }

    const now = new Date();

    // Link proof documents
    if (proofDocumentIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: proofDocumentIds } },
        data: { bookingId: id, type: 'could_not_pickup_proof' },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        couldNotPickupAt: now,
        couldNotPickupReason: reason,
        couldNotPickupNotes: notes || null,
        couldNotPickupProof: proofDocumentIds.length > 0 ? proofDocumentIds : undefined,
        updatedAt: now,
      },
    });

    console.log(`⚠️ [COULD NOT PICKUP] Carrier ${carrierId} reported issue for booking ${id}: ${reason}`);

    try {
      const reasonLabel = COULD_NOT_PICKUP_LABELS?.[reason] || reason;
      const notify = require('../../services/notifications.service.cjs');
      await notify.pickupIssueReported(booking, reason, reasonLabel);
    } catch (e) {
      console.error('Notify (pickup issue) failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Pickup issue reported. Our team will review and contact you.',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('❌ [COULD NOT PICKUP] Error:', error);
    res.status(500).json({ error: 'Failed to report issue', details: error.message });
  }
};

module.exports = {
  reportCouldNotPickup,
};
