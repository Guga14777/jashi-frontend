// ============================================================
// FILE: server/controllers/booking/booking.cancel.controller.cjs
// Booking cancellation operations
// ✅ FIXED: Correct cancellation fee structure
//    - Scheduled: $0
//    - Assigned: $0
//    - On The Way: $50
//    - Arrived/Picked Up: NOT ALLOWED
// ============================================================

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  normalizeStatus,
} = require('../../services/booking/index.cjs');
const {
  CARRIER_DISPATCH_FEE,
  PLATFORM_FEE_PERCENT,
  stageForStatus,
  evaluateCustomerCancel,
  evaluateCarrierDrop,
} = require('../../services/booking/cancellation.policy.cjs');

// Back-compat shim for any external callers that imported getCancellationFee.
// New code should read the policy directly via evaluateCustomerCancel().
const getCancellationFee = (status) => evaluateCustomerCancel(status).carrierDispatchFee ?? 0;

const checkCancellationAllowed = (status, cancelledBy = 'CUSTOMER') => {
  const result = cancelledBy === 'CARRIER'
    ? evaluateCarrierDrop(status)
    : evaluateCustomerCancel(status);
  return {
    allowed: result.allowed,
    fee: result.carrierDispatchFee ?? 0,
    reason: result.reason,
    carrierPenalty: result.carrierPenalty,
    platformFeeRefundable: result.platformFeeRefundable,
    stage: result.stage,
    headline: result.headline,
    detail: result.detail,
  };
};

// ============================================================
// POST /api/bookings/:id/cancel (Customer cancellation)
// ============================================================
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { reason, notes } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, userId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if cancellation is allowed
    const cancellationCheck = checkCancellationAllowed(booking.status, 'CUSTOMER');
    
    if (!cancellationCheck.allowed) {
      return res.status(400).json({
        error: cancellationCheck.reason,
        currentStatus: normalizeStatus(booking.status),
        canCancel: false,
      });
    }

    const now = new Date();
    const cancellationFee = cancellationCheck.fee;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: SHIPMENT_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledBy: 'CUSTOMER',
        cancelReason: reason || 'Customer requested cancellation',
        cancellationNotes: notes || null,
        cancellationFee: cancellationFee,
        updatedAt: now,
      },
    });

    console.log(`🚫 [CANCEL] Customer ${userId} cancelled booking ${id}. Fee: $${cancellationFee}`);

    // Notify customer (ack) + carrier (if one was assigned). Service helper
    // decides who gets what — both recipients in one call.
    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.orderCancelledByCustomer(booking);
    } catch (e) {
      console.error('Notify (customer cancel) failed:', e.message);
    }

    const message = cancellationFee > 0
      ? `Booking cancelled. A $${cancellationFee} carrier dispatch fee applies.`
      : cancellationCheck.platformFeeRefundable === false
      ? 'Booking cancelled. The platform fee is non-refundable.'
      : 'Booking cancelled successfully.';

    res.json({
      success: true,
      message,
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.CANCELLED,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.CANCELLED],
      },
      cancellationFee,
      platformFeeRefundable: cancellationCheck.platformFeeRefundable,
      stage: cancellationCheck.stage,
      headline: cancellationCheck.headline,
      detail: cancellationCheck.detail,
    });
  } catch (error) {
    console.error('[CANCEL BOOKING] Error:', error);
    res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/cancel (Carrier drops load)
// ============================================================
const cancelLoadByCarrier = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { reason, notes } = req.body;

    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or not assigned to you' });
    }

    // Check if cancellation is allowed
    const cancellationCheck = checkCancellationAllowed(booking.status, 'CARRIER');

    if (!cancellationCheck.allowed) {
      return res.status(400).json({
        error: cancellationCheck.reason,
        currentStatus: normalizeStatus(booking.status),
        canCancel: false,
      });
    }

    const now = new Date();

    // When carrier drops, reset to scheduled (make available again)
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: SHIPMENT_STATUS.SCHEDULED,
        carrierId: null,
        assignedAt: null,
        carrierAcceptedAt: null,
        tripStartedAt: null,
        onTheWayAt: null,
        arrivedAtPickupAt: null,
        // Store cancellation info
        cancelledBy: 'CARRIER',
        cancelReason: reason || 'Carrier dropped load',
        cancellationNotes: notes || null,
        updatedAt: now,
      },
    });

    console.log(`🚫 [CARRIER DROP] Carrier ${carrierId} dropped booking ${id}`);

    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.orderDroppedByCarrier(booking);
    } catch (e) {
      console.error('Notify (carrier drop) failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Load dropped. The shipment will be reassigned to another carrier.',
      booking: {
        ...updatedBooking,
        status: SHIPMENT_STATUS.SCHEDULED,
        statusLabel: STATUS_LABELS[SHIPMENT_STATUS.SCHEDULED],
      },
    });
  } catch (error) {
    console.error('❌ [CARRIER DROP] Error:', error);
    res.status(500).json({ error: 'Failed to drop load', details: error.message });
  }
};

// ============================================================
// GET /api/bookings/:id/cancellation-info
// Returns cancellation eligibility and fee for a booking
// ============================================================
const getCancellationInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { as = 'customer' } = req.query; // 'customer' or 'carrier'

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const whereClause = as === 'carrier' 
      ? { id, carrierId: userId }
      : { id, userId };

    const booking = await prisma.booking.findFirst({
      where: whereClause,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const cancelledBy = as === 'carrier' ? 'CARRIER' : 'CUSTOMER';
    const cancellationCheck = checkCancellationAllowed(booking.status, cancelledBy);

    res.json({
      success: true,
      cancellation: {
        allowed: cancellationCheck.allowed,
        fee: cancellationCheck.fee,
        reason: cancellationCheck.reason || null,
        platformFeeRefundable: cancellationCheck.platformFeeRefundable,
        stage: cancellationCheck.stage,
        headline: cancellationCheck.headline,
        detail: cancellationCheck.detail,
        currentStatus: normalizeStatus(booking.status),
        statusLabel: STATUS_LABELS[normalizeStatus(booking.status)],
      },
    });
  } catch (error) {
    console.error('[CANCELLATION INFO] Error:', error);
    res.status(500).json({ error: 'Failed to get cancellation info', details: error.message });
  }
};

module.exports = {
  cancelBooking,
  cancelLoadByCarrier,
  getCancellationInfo,
  getCancellationFee,
  checkCancellationAllowed,
};
