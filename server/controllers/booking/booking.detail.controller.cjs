// ============================================================
// FILE: server/controllers/booking/booking.detail.controller.cjs
// Booking detail operations: get by ID, update, simple cancel
// ============================================================

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  safeParseJson,
  extractVehicleFields,
  formatLocationType,
  fetchCarrierForCustomer,
  normalizeStatus,
  getStatusStep,
  validateAndClampVehicles,
  clampVehiclesCount,
  enrichBookingWithVehicles,
  fetchBookingDocuments,
  getGatePasses,
  isGatePassType,
} = require('../../services/booking/index.cjs');

// ============================================================
// GET BOOKING BY ID
// GET /api/bookings/:identifier
// ============================================================
const getBookingById = async (req, res) => {
  try {
    const userId = req.userId;
    const { identifier, ref } = req.params;
    const lookupValue = identifier || ref;
    if (!lookupValue) return res.status(400).json({ error: 'Booking ID or reference required' });

    const booking = await prisma.booking.findFirst({
      where: { OR: [{ id: lookupValue }, { ref: lookupValue }], userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        pickupGatePass: true, dropoffGatePass: true, podDocument: true,
        documents: { orderBy: { createdAt: 'desc' } },
        quoteRelation: { select: { likelihood: true, marketAvg: true } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Run the three independent secondary fetches in parallel. Each was
    // previously awaited sequentially, costing ~3 extra round trips on top
    // of the initial findFirst. None of them depends on another's result.
    const quoteId = booking.quoteId || booking.quoteRelation?.id;
    const [allDocuments, carrierInfo, enrichedVehicleData] = await Promise.all([
      fetchBookingDocuments(booking.id, quoteId),
      booking.carrierId ? fetchCarrierForCustomer(booking.carrierId) : Promise.resolve(null),
      enrichBookingWithVehicles(booking),
    ]);

    const { pickupGatePass, dropoffGatePass, gatePassDocs } = getGatePasses(allDocuments, booking);

    const pickupData = booking.pickup || {};
    const dropoffData = booking.dropoff || {};
    const vehicleFields = extractVehicleFields(booking.vehicleDetails);
    const normalizedStatus = normalizeStatus(booking.status);
    const statusStep = getStatusStep(normalizedStatus);

    const pickupStops = enrichedVehicleData.stops.filter(s => s.stage === 'pickup');
    const dropoffStops = enrichedVehicleData.stops.filter(s => s.stage === 'dropoff');

    const enrichedBooking = {
      ...booking,
      status: normalizedStatus,
      statusStep,
      statusLabel: STATUS_LABELS[normalizedStatus],
      carrier: carrierInfo,
      origin: [pickupData.city, pickupData.state].filter(Boolean).join(', ') || booking.fromCity,
      destination: [dropoffData.city, dropoffData.state].filter(Boolean).join(', ') || booking.toCity,
      documents: allDocuments,
      gatePassDocuments: gatePassDocs,
      pickupGatePass,
      dropoffGatePass,
      hasGatePass: gatePassDocs.length > 0,
      pickupOriginTypeLabel: formatLocationType(booking.pickupOriginType),
      dropoffDestinationTypeLabel: formatLocationType(booking.dropoffDestinationType),
      ...vehicleFields,
      likelihood: booking.quoteRelation?.likelihood || null,
      marketAvg: booking.quoteRelation?.marketAvg || null,
      ...enrichedVehicleData,
      pickupStops,
      dropoffStops,
      isCancelled: normalizedStatus === SHIPMENT_STATUS.CANCELLED,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
      cancelReason: booking.cancelReason,
      cancellationNotes: booking.cancellationNotes,
      assignedAt: booking.assignedAt,
      onTheWayAt: booking.onTheWayAt,
      pickedUpAt: booking.pickedUpAt || booking.pickupAt,
      deliveredAt: booking.deliveredAt,
    };

    res.json({ success: true, booking: enrichedBooking });
  } catch (error) {
    console.error('❌ [BOOKING] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch booking', details: error.message });
  }
};

// ============================================================
// UPDATE BOOKING
// PUT /api/bookings/:id
// ============================================================
const updateBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updates = req.body;

    const existing = await prisma.booking.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    
    if (normalizeStatus(existing.status) !== SHIPMENT_STATUS.SCHEDULED) {
      return res.status(400).json({ error: 'Cannot update booking after carrier assignment' });
    }

    const { quoteId, ...safeUpdates } = updates;
    
    // Handle vehicles array update
    if (updates.vehicles) {
      const validatedVehicles = validateAndClampVehicles(updates.vehicles);
      if (validatedVehicles && validatedVehicles.length > 0) {
        const existingVD = safeParseJson(existing.vehicleDetails);
        safeUpdates.vehicleDetails = {
          ...existingVD,
          vehicles: validatedVehicles,
          vehiclesCount: validatedVehicles.length,
          isMultiVehicle: validatedVehicles.length > 1,
        };
      }
    } else if (updates.vehiclesCount) {
      const existingVD = safeParseJson(existing.vehicleDetails);
      const clampedCount = clampVehiclesCount(updates.vehiclesCount);
      safeUpdates.vehicleDetails = {
        ...existingVD,
        vehiclesCount: clampedCount,
        isMultiVehicle: clampedCount > 1,
      };
    } else if (safeUpdates.vehicleDetails) {
      const existingVD = safeParseJson(existing.vehicleDetails);
      safeUpdates.vehicleDetails = { ...existingVD, ...safeUpdates.vehicleDetails };
    }

    const booking = await prisma.booking.update({ 
      where: { id }, 
      data: { ...safeUpdates, updatedAt: new Date() } 
    });
    
    const enrichedVehicleData = await enrichBookingWithVehicles(booking);
    
    res.json({ 
      success: true, 
      message: 'Booking updated successfully', 
      booking: { ...booking, ...enrichedVehicleData }
    });
  } catch (error) {
    console.error('❌ [BOOKING] Update error:', error);
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
};

// ============================================================
// CANCEL BOOKING (Simple - DELETE method)
// DELETE /api/bookings/:id
// ============================================================
const cancelBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.booking.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    if (normalizeStatus(existing.status) === SHIPMENT_STATUS.DELIVERED) {
      return res.status(400).json({ error: 'Cannot cancel a delivered booking' });
    }

    const booking = await prisma.booking.update({ 
      where: { id }, 
      data: { status: 'cancelled', updatedAt: new Date() } 
    });

    try { 
      await prisma.paymentTransaction.updateMany({ 
        where: { bookingId: id, status: 'pending' }, 
        data: { status: 'cancelled' } 
      }); 
    } catch (e) {}
    
    if (existing.quoteId) { 
      try { 
        await prisma.quote.update({ where: { id: existing.quoteId }, data: { status: 'cancelled' } }); 
      } catch (e) {} 
    }

    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.orderCancelledDirect({ ...existing, userId });
    } catch (e) {
      console.error('Notify (direct cancel) failed:', e.message);
    }

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('❌ [BOOKING] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
  }
};

// ============================================================
// GET BOL DATA (JSON)
// GET /api/bookings/:id/bol-data
// ============================================================
const getBolData = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id, OR: [{ userId }, { carrierId: userId }] },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let carrierInfo = null;
    if (booking.carrierId) {
      carrierInfo = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true, mcNumber: true, dotNumber: true },
      });
    }

    const vehicleFields = extractVehicleFields(booking.vehicleDetails);
    const normalizedStatus = normalizeStatus(booking.status);
    const enrichedVehicleData = await enrichBookingWithVehicles(booking);
    
    res.json({
      success: true,
      bolData: {
        orderNumber: booking.orderNumber, 
        paymentMode: booking.paymentMode, 
        paymentStatus: booking.paymentStatus, 
        paymentSource: booking.paymentSource,
        status: normalizedStatus,
        statusLabel: STATUS_LABELS[normalizedStatus],
        statusStep: getStatusStep(normalizedStatus),
        shipper: { 
          firstName: booking.customerFirstName, 
          lastName: booking.customerLastName, 
          phone: booking.customerPhone, 
          email: booking.user?.email 
        },
        carrier: carrierInfo,
        vehicle: { 
          year: vehicleFields.vehicleYear, 
          make: vehicleFields.vehicleMake, 
          model: vehicleFields.vehicleModel, 
          vin: vehicleFields.vin, 
          type: vehicleFields.vehicleType || booking.vehicleType,
          condition: vehicleFields.vehicleCondition,
        },
        vehicles: enrichedVehicleData.vehicles,
        vehiclesCount: enrichedVehicleData.vehiclesCount,
        isMultiVehicle: enrichedVehicleData.isMultiVehicle,
        transport: { type: booking.transportType, miles: booking.miles, price: booking.price },
        assignedAt: booking.assignedAt,
        onTheWayAt: booking.onTheWayAt,
        pickedUpAt: booking.pickedUpAt || booking.pickupAt,
        deliveredAt: booking.deliveredAt,
      },
    });
  } catch (error) {
    console.error('❌ [BOL] Get BOL data error:', error);
    res.status(500).json({ error: 'Failed to fetch BOL data', details: error.message });
  }
};

// ============================================================
// DEBUG: Check documents for a booking
// GET /api/bookings/:id/debug-documents
// ============================================================
const debugBookingDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await prisma.booking.findFirst({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        quoteId: true,
        pickupGatePassId: true,
        dropoffGatePassId: true,
        pickupOriginType: true,
        dropoffDestinationType: true,
        multiVehicleConfig: true,
        vehicleDetails: true,
      },
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingDocs = await prisma.document.findMany({
      where: { bookingId: id },
      select: { id: true, type: true, originalName: true, vehicleIndex: true, stage: true, createdAt: true },
    });
    
    let quoteDocs = [];
    if (booking.quoteId) {
      quoteDocs = await prisma.document.findMany({
        where: { quoteId: booking.quoteId },
        select: { id: true, type: true, originalName: true, bookingId: true, vehicleIndex: true, stage: true, createdAt: true },
      });
    }
    
    let pickupGatePass = null;
    let dropoffGatePass = null;
    
    if (booking.pickupGatePassId) {
      pickupGatePass = await prisma.document.findUnique({
        where: { id: booking.pickupGatePassId },
        select: { id: true, type: true, originalName: true },
      });
    }
    
    if (booking.dropoffGatePassId) {
      dropoffGatePass = await prisma.document.findUnique({
        where: { id: booking.dropoffGatePassId },
        select: { id: true, type: true, originalName: true },
      });
    }
    
    const vd = safeParseJson(booking.vehicleDetails);
    const enrichedVehicleData = await enrichBookingWithVehicles(booking);
    
    res.json({
      success: true,
      booking: {
        id: booking.id,
        orderNumber: booking.orderNumber,
        quoteId: booking.quoteId,
        pickupGatePassId: booking.pickupGatePassId,
        dropoffGatePassId: booking.dropoffGatePassId,
        pickupOriginType: booking.pickupOriginType,
        dropoffDestinationType: booking.dropoffDestinationType,
        multiVehicleConfig: booking.multiVehicleConfig,
        isMultiVehicle: vd.isMultiVehicle || false,
        vehiclesInDetails: vd.vehicles?.length || 0,
        vehiclesCount: vd.vehiclesCount || 1,
      },
      documents: {
        linkedToBooking: bookingDocs,
        linkedToQuote: quoteDocs,
        pickupGatePassRelation: pickupGatePass,
        dropoffGatePassRelation: dropoffGatePass,
      },
      multiVehicle: {
        vehicles: enrichedVehicleData.bookingVehicles,
        stops: enrichedVehicleData.stops,
      },
      enrichedVehicles: enrichedVehicleData,
      summary: {
        totalBookingDocs: bookingDocs.length,
        totalQuoteDocs: quoteDocs.length,
        hasPickupGatePass: !!pickupGatePass,
        hasDropoffGatePass: !!dropoffGatePass,
        vehicleCount: enrichedVehicleData.vehiclesCount,
        isMultiVehicle: enrichedVehicleData.isMultiVehicle,
        stopCount: enrichedVehicleData.stops.length,
        gatePassTypes: [...bookingDocs, ...quoteDocs]
          .filter(d => d.type?.toLowerCase().includes('gate'))
          .map(d => ({ id: d.id, type: d.type, name: d.originalName, vehicleIndex: d.vehicleIndex, stage: d.stage })),
      },
    });
  } catch (error) {
    console.error('❌ Debug documents error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getBookingById,
  updateBooking,
  cancelBooking,
  getBolData,
  debugBookingDocuments,
};
