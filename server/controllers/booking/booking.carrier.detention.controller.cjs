// ============================================================
// FILE: server/controllers/booking/booking.carrier.detention.controller.cjs
// Carrier detention fee operations
// ✅ UPDATED: Respects detentionEnabled flag based on origin type
// ============================================================

const prisma = require('../../db.cjs');
const {
  DETENTION_THRESHOLD_MINUTES,
  DETENTION_FEE_AMOUNT,
  checkDetentionEligibility,
  isFlexibleOriginType,
} = require('../../services/booking/index.cjs');

// ============================================================
// ✅ HELPER: Extract origin type to determine detention rules
// ============================================================
const extractPickupOriginType = (booking) => {
  if (!booking) return null;
  
  if (booking.pickupOriginType) {
    return booking.pickupOriginType.toLowerCase().trim();
  }
  
  if (booking.pickup) {
    try {
      const pickup = typeof booking.pickup === 'string' ? JSON.parse(booking.pickup) : booking.pickup;
      if (pickup.originType) {
        return pickup.originType.toLowerCase().trim();
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return null;
};

// ============================================================
// POST /api/carrier/loads/:id/request-detention
// ============================================================
const requestDetentionFee = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { notes, proofDocumentIds = [] } = req.body;
    
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const booking = await prisma.booking.findFirst({ 
      where: { id, carrierId },
      include: { user: { select: { id: true } } }
    });
    
    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });
    
    // ✅ Check if detention is enabled for this booking
    // detentionEnabled is set at booking creation based on origin type
    // auction/dealership = false (inherent delays), residential = true
    const detentionEnabled = booking.detentionEnabled !== false;
    const originType = extractPickupOriginType(booking);
    
    if (!detentionEnabled) {
      console.log(`⛔ [DETENTION] Blocked - detention disabled for origin type: ${originType}`);
      return res.status(400).json({
        error: 'Detention fees are not applicable for auction or dealership pickups',
        code: 'DETENTION_NOT_APPLICABLE',
        originType,
        hint: 'Auctions and dealerships have inherent processing delays that are expected. Detention fees only apply to residential pickups.',
      });
    }
    
    // Check standard eligibility (time waited, already requested, etc.)
    const eligibility = checkDetentionEligibility(booking);
    
    if (eligibility.alreadyRequested) {
      return res.status(400).json({ 
        error: 'Detention fee has already been requested for this load',
        requestedAt: booking.detentionRequestedAt,
      });
    }
    
    if (!eligibility.eligible) {
      return res.status(400).json({ 
        error: eligibility.message,
        minutesWaited: eligibility.minutesWaited,
        minutesUntilEligible: eligibility.minutesUntilEligible,
        thresholdMinutes: DETENTION_THRESHOLD_MINUTES,
      });
    }

    const now = new Date();
    
    // Auto-approve for MVP (admin can review later)
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        detentionAmount: DETENTION_FEE_AMOUNT,
        detentionRequestedAt: now,
        detentionApprovedAt: now,
        detentionNotes: notes || `Waited ${eligibility.minutesWaited} minutes at pickup`,
        detentionProof: proofDocumentIds.length > 0 ? proofDocumentIds : undefined,
        updatedAt: now,
      },
    });

    console.log(`💰 [DETENTION FEE] Carrier ${carrierId} requested $${DETENTION_FEE_AMOUNT} detention fee for booking ${id}. Waited ${eligibility.minutesWaited} minutes.`);

    // Link proof documents
    if (proofDocumentIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: proofDocumentIds } },
        data: { bookingId: id, type: 'detention_proof' },
      });
    }

    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.detentionFeeApplied(booking, DETENTION_FEE_AMOUNT, eligibility.minutesWaited);
    } catch (e) {
      console.error('Notify (detention fee) failed:', e.message);
    }

    res.json({
      success: true,
      message: `Detention fee of $${DETENTION_FEE_AMOUNT} requested and approved`,
      booking: {
        ...updatedBooking,
        detentionAmount: DETENTION_FEE_AMOUNT,
        detentionRequestedAt: now,
        detentionApprovedAt: now,
        minutesWaited: eligibility.minutesWaited,
      },
    });

  } catch (error) {
    console.error('❌ [DETENTION FEE] Error:', error);
    res.status(500).json({ error: 'Failed to request detention fee', details: error.message });
  }
};

// ============================================================
// GET /api/carrier/loads/:id/detention-status
// ============================================================
const getDetentionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const booking = await prisma.booking.findFirst({ 
      where: { id, carrierId },
    });
    
    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });
    
    const eligibility = checkDetentionEligibility(booking);
    const originType = extractPickupOriginType(booking);
    const detentionEnabled = booking.detentionEnabled !== false;
    
    res.json({
      success: true,
      detentionStatus: {
        // ✅ NEW: Include detention enabled info
        detentionEnabled,
        originType,
        isFlexibleOrigin: isFlexibleOriginType(originType),
        
        // Standard status
        arrivedAtPickupAt: booking.arrivedAtPickupAt,
        minutesWaited: eligibility.minutesWaited,
        thresholdMinutes: DETENTION_THRESHOLD_MINUTES,
        minutesUntilEligible: eligibility.minutesUntilEligible,
        eligible: detentionEnabled && eligibility.eligible,
        alreadyRequested: eligibility.alreadyRequested,
        detentionAmount: DETENTION_FEE_AMOUNT,
        detentionRequestedAt: booking.detentionRequestedAt,
        detentionApprovedAt: booking.detentionApprovedAt,
        message: !detentionEnabled 
          ? 'Detention fees are not applicable for auction/dealership pickups'
          : eligibility.message,
      },
    });

  } catch (error) {
    console.error('❌ [DETENTION STATUS] Error:', error);
    res.status(500).json({ error: 'Failed to get detention status', details: error.message });
  }
};

module.exports = {
  requestDetentionFee,
  getDetentionStatus,
};
