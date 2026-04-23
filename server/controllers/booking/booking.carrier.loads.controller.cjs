// ============================================================
// FILE: server/controllers/booking/booking.carrier.loads.controller.cjs
// Carrier load management operations
// ✅ FIXED: Returns complete route/vehicle data (Issue 4)
// ✅ FIXED: Includes gate passes for carrier view (Issue 3)
// ✅ FIXED: Returns normalized data structure
// ✅ FIXED: Added alias exports for server.cjs compatibility
// ============================================================

const prisma = require('../../db.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  normalizeStatus,
  getStatusStep,
  safeParseJson,
  extractVehicleFields,
  formatLocationType,
  enrichBookingWithVehicles,
  fetchBookingDocuments,
  getGatePasses,
  isGatePassType,
} = require('../../services/booking/index.cjs');

// ============================================================
// HELPER: Normalize booking data for carrier view
// ============================================================
const normalizeBookingForCarrier = async (booking) => {
  const normalizedStatus = normalizeStatus(booking.status);
  const statusStep = getStatusStep(normalizedStatus);
  
  // Parse JSON fields
  const pickupData = safeParseJson(booking.pickup);
  const dropoffData = safeParseJson(booking.dropoff);
  const vehicleDetails = safeParseJson(booking.vehicleDetails);
  const quote = safeParseJson(booking.quote);
  const scheduling = safeParseJson(booking.scheduling);
  
  // Extract vehicle fields
  const vehicleFields = extractVehicleFields(booking.vehicleDetails);
  
  // ✅ FIXED: Get all documents including gate passes (Issue 3)
  const allDocuments = await fetchBookingDocuments(booking.id, booking.quoteId);
  const { pickupGatePass, dropoffGatePass, gatePassDocs } = getGatePasses(allDocuments, booking);
  
  // Get multi-vehicle data
  const enrichedVehicleData = await enrichBookingWithVehicles(booking);
  
  // ✅ FIXED: Build origin/destination strings (Issue 4)
  const origin = pickupData.city && pickupData.state 
    ? `${pickupData.city}, ${pickupData.state}`
    : booking.fromCity || pickupData.zip || '—';
    
  const destination = dropoffData.city && dropoffData.state 
    ? `${dropoffData.city}, ${dropoffData.state}`
    : booking.toCity || dropoffData.zip || '—';
  
  // ✅ FIXED: Ensure miles is included
  const miles = booking.miles || quote.miles || vehicleDetails.miles || 0;
  
  return {
    ...booking,
    // Status fields
    status: normalizedStatus,
    statusStep,
    statusLabel: STATUS_LABELS[normalizedStatus],
    
    // ✅ FIXED: Route data (Issue 4)
    origin,
    destination,
    from: origin,
    to: destination,
    miles,
    routeMiles: miles,
    
    // ✅ FIXED: Vehicle data (Issue 4)
    ...vehicleFields,
    vehicleYear: vehicleFields.vehicleYear || vehicleDetails.year || '',
    vehicleMake: vehicleFields.vehicleMake || vehicleDetails.make || '',
    vehicleModel: vehicleFields.vehicleModel || vehicleDetails.model || '',
    vehicleType: vehicleFields.vehicleType || booking.vehicleType || vehicleDetails.type || '',
    vehicleCondition: vehicleFields.vehicleCondition || '',
    vin: vehicleFields.vin || '',
    
    // Normalized vehicle object for frontend
    normalizedVehicle: {
      year: vehicleFields.vehicleYear || vehicleDetails.year || '',
      make: vehicleFields.vehicleMake || vehicleDetails.make || '',
      model: vehicleFields.vehicleModel || vehicleDetails.model || '',
      type: vehicleFields.vehicleType || booking.vehicleType || vehicleDetails.type || '',
      condition: vehicleFields.vehicleCondition || '',
      vin: vehicleFields.vin || '',
    },
    
    // Location types
    pickupOriginTypeLabel: formatLocationType(booking.pickupOriginType),
    dropoffDestinationTypeLabel: formatLocationType(booking.dropoffDestinationType),
    
    // ✅ FIXED: Documents including gate passes (Issue 3)
    documents: allDocuments,
    gatePassDocuments: gatePassDocs,
    pickupGatePass,
    dropoffGatePass,
    hasGatePass: gatePassDocs.length > 0 || !!pickupGatePass || !!dropoffGatePass,
    
    // Multi-vehicle data
    ...enrichedVehicleData,
    
    // Time window data
    pickupWindowStart: booking.pickupWindowStart || scheduling.pickupTimeStart || null,
    pickupWindowEnd: booking.pickupWindowEnd || scheduling.pickupTimeEnd || null,
    dropoffWindowStart: booking.dropoffWindowStart || scheduling.dropoffTimeStart || null,
    dropoffWindowEnd: booking.dropoffWindowEnd || scheduling.dropoffTimeEnd || null,
    
    // Scheduling data
    scheduledPickupDate: booking.pickupDate || scheduling.pickupDate || quote.pickupDate || null,
    scheduledDropoffDate: booking.dropoffDate || scheduling.dropoffDate || quote.dropoffDate || null,
    
    // Customer info for carrier
    customer: {
      name: [booking.customerFirstName, booking.customerLastName].filter(Boolean).join(' ') || '—',
      phone: booking.customerPhone || '',
      email: booking.userEmail || '',
    },
    
    // Timestamps
    assignedAt: booking.assignedAt || booking.carrierAcceptedAt,
    onTheWayAt: booking.onTheWayAt || booking.tripStartedAt,
    arrivedAtPickupAt: booking.arrivedAtPickupAt,
    pickedUpAt: booking.pickedUpAt || booking.pickupAt,
    deliveredAt: booking.deliveredAt,
    
    // Detention/waiting fee
    waitTimerStartAt: booking.arrivedAtPickupAt,
    waitFeeAmount: booking.detentionAmount || 50,
    waitFeeRequestedAt: booking.detentionRequestedAt,
    
    // Quote data for pricing
    likelihood: booking.quoteRelation?.likelihood || quote.likelihood || null,
    marketAvg: booking.quoteRelation?.marketAvg || quote.marketAvg || null,
    
    // Cancellation status
    isCancelled: normalizedStatus === SHIPMENT_STATUS.CANCELLED,
    cancelledAt: booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
  };
};

// ============================================================
// GET CARRIER LOADS (My Loads)
// GET /api/carrier/loads
// ============================================================
const getCarrierLoads = async (req, res) => {
  try {
    const carrierId = req.userId;
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { carrierId };
    if (status) {
      const statusMap = {
        'active': { NOT: { status: { in: ['delivered', 'cancelled'] } } },
        'completed': { status: 'delivered' },
        'cancelled': { status: 'cancelled' },
      };
      Object.assign(where, statusMap[status] || { status: normalizeStatus(status) });
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          pickupGatePass: true,
          dropoffGatePass: true,
          documents: { orderBy: { createdAt: 'desc' } },
          quoteRelation: { select: { likelihood: true, marketAvg: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    // Normalize all bookings
    const normalizedBookings = await Promise.all(
      bookings.map(booking => normalizeBookingForCarrier(booking))
    );

    res.json({
      success: true,
      loads: normalizedBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ [CARRIER LOADS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch loads', details: error.message });
  }
};

// ============================================================
// GET SINGLE LOAD BY ID
// GET /api/carrier/loads/:id
// ============================================================
const getLoadById = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;

    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        pickupGatePass: true,
        dropoffGatePass: true,
        podDocument: true,
        documents: { orderBy: { createdAt: 'desc' } },
        quoteRelation: { select: { likelihood: true, marketAvg: true } },
        bookingVehicles: {
          include: {
            pickupStop: true,
            dropoffStop: true,
            pickupGatePass: true,
            dropoffGatePass: true,
          },
        },
        stops: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or not assigned to you' });
    }

    const normalizedBooking = await normalizeBookingForCarrier(booking);

    res.json({
      success: true,
      load: normalizedBooking,
      booking: normalizedBooking, // Alias for compatibility
    });
  } catch (error) {
    console.error('❌ [GET LOAD] Error:', error);
    res.status(500).json({ error: 'Failed to fetch load', details: error.message });
  }
};

// ============================================================
// GET AVAILABLE LOADS (Load Board)
// GET /api/carrier/available-loads
// ============================================================
const getAvailableLoads = async (req, res) => {
  try {
    const carrierId = req.userId;
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = 1, limit = 20, fromZip, toZip, minPrice, maxPrice, radius } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for available loads
    const where = {
      status: 'scheduled',
      carrierId: null,
    };

    // Add filters
    if (minPrice) where.price = { ...(where.price || {}), gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...(where.price || {}), lte: parseFloat(maxPrice) };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          quoteRelation: { select: { likelihood: true, marketAvg: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    // Normalize for display (limited info for available loads)
    const loads = bookings.map(booking => {
      const pickupData = safeParseJson(booking.pickup);
      const dropoffData = safeParseJson(booking.dropoff);
      const vehicleFields = extractVehicleFields(booking.vehicleDetails);
      
      const origin = pickupData.city && pickupData.state 
        ? `${pickupData.city}, ${pickupData.state}`
        : booking.fromCity || pickupData.zip || '—';
        
      const destination = dropoffData.city && dropoffData.state 
        ? `${dropoffData.city}, ${dropoffData.state}`
        : booking.toCity || dropoffData.zip || '—';

      return {
        id: booking.id,
        ref: booking.ref,
        orderNumber: booking.orderNumber,
        origin,
        destination,
        from: origin,
        to: destination,
        miles: booking.miles || 0,
        price: booking.price,
        vehicle: booking.vehicle,
        vehicleType: booking.vehicleType,
        ...vehicleFields,
        transportType: booking.transportType,
        pickupDate: booking.pickupDate,
        status: 'scheduled',
        statusLabel: 'Available',
        likelihood: booking.quoteRelation?.likelihood,
        marketAvg: booking.quoteRelation?.marketAvg,
      };
    });

    res.json({
      success: true,
      loads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ [AVAILABLE LOADS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch available loads', details: error.message });
  }
};

// ============================================================
// ACCEPT LOAD
// POST /api/carrier/loads/:id/accept
// ============================================================
const acceptLoad = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;

    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, status: 'scheduled', carrierId: null },
    });

    if (!booking) {
      return res.status(404).json({ 
        error: 'Load not found or already assigned',
        hint: 'This load may have been accepted by another carrier',
      });
    }

    const now = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        carrierId,
        status: SHIPMENT_STATUS.ASSIGNED,
        assignedAt: now,
        carrierAcceptedAt: now,
        updatedAt: now,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        quoteRelation: { select: { likelihood: true, marketAvg: true } },
      },
    });

    // Notify both sides: customer ("a carrier accepted your order") and
    // carrier ("you accepted this shipment" — self-confirmation).
    try {
      const notify = require('../../services/notifications.service.cjs');
      await Promise.all([
        notify.carrierAssigned(booking),
        notify.carrierAcceptAck(booking),
      ]);
    } catch (e) {
      console.error('Notify (carrier accept) failed:', e.message);
    }

    const normalizedBooking = await normalizeBookingForCarrier(updatedBooking);

    res.json({
      success: true,
      message: 'Load accepted successfully',
      load: normalizedBooking,
      booking: normalizedBooking,
    });
  } catch (error) {
    console.error('❌ [ACCEPT LOAD] Error:', error);
    res.status(500).json({ error: 'Failed to accept load', details: error.message });
  }
};

// ============================================================
// GET LOAD COUNTS (Dashboard Stats)
// GET /api/carrier/loads/counts
// ============================================================
const getLoadCounts = async (req, res) => {
  try {
    const carrierId = req.userId;
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [scheduled, assigned, onTheWay, arrived, pickedUp, delivered, cancelled] = await Promise.all([
      prisma.booking.count({ where: { carrierId, status: 'scheduled' } }),
      prisma.booking.count({ where: { carrierId, status: 'assigned' } }),
      prisma.booking.count({ where: { carrierId, status: 'on_the_way_to_pickup' } }),
      prisma.booking.count({ where: { carrierId, status: 'arrived_at_pickup' } }),
      prisma.booking.count({ where: { carrierId, status: 'picked_up' } }),
      prisma.booking.count({ where: { carrierId, status: 'delivered' } }),
      prisma.booking.count({ where: { carrierId, status: 'cancelled' } }),
    ]);

    const active = assigned + onTheWay + arrived + pickedUp;
    const inTransit = onTheWay + arrived + pickedUp;

    res.json({
      success: true,
      counts: {
        all: scheduled + active + delivered,
        active,
        inTransit,
        scheduled,
        assigned,
        onTheWay,
        arrived,
        pickedUp,
        delivered,
        cancelled,
      },
    });
  } catch (error) {
    console.error('❌ [LOAD COUNTS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch counts', details: error.message });
  }
};

// ============================================================
// EXPORTS
// ✅ FIXED: Added alias exports for server.cjs compatibility
// ============================================================
module.exports = {
  // Primary exports
  getCarrierLoads,
  getLoadById,
  getAvailableLoads,
  acceptLoad,
  getLoadCounts,
  normalizeBookingForCarrier,
  
  // ✅ Alias exports for server.cjs compatibility
  getAvailableLoadsForCarrier: getAvailableLoads,
  acceptLoadAsCarrier: acceptLoad,
  getCarrierLoadById: getLoadById,
};
