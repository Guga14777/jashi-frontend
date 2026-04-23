// ============================================================
// FILE: server/controllers/routes.controller.cjs
// ✅ FIXED: Changed status filter from 'waiting' to 'scheduled'
// ✅ UPDATED: Added pickup and deliver routes for carrier flow
// ============================================================

const prisma = require('../db.cjs');
const bookingController = require('./booking.controller.cjs');

// Google Maps API Key from environment
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

// Helper to extract time windows from scheduling
const extractTimeWindowsFromScheduling = (scheduling) => {
  if (!scheduling) return {
    pickupWindowStart: null,
    pickupWindowEnd: null,
    dropoffWindowStart: null,
    dropoffWindowEnd: null,
    pickupPreferredWindow: null,
    dropoffPreferredWindow: null,
  };

  return {
    pickupWindowStart: scheduling.pickupTimeStart || scheduling.pickupCustomFrom || scheduling.pickupWindowStart || null,
    pickupWindowEnd: scheduling.pickupTimeEnd || scheduling.pickupCustomTo || scheduling.pickupWindowEnd || null,
    dropoffWindowStart: scheduling.dropoffTimeStart || scheduling.dropoffCustomFrom || scheduling.dropoffWindowStart || null,
    dropoffWindowEnd: scheduling.dropoffTimeEnd || scheduling.dropoffCustomTo || scheduling.dropoffWindowEnd || null,
    pickupPreferredWindow: scheduling.pickupPreferredWindow || null,
    dropoffPreferredWindow: scheduling.dropoffPreferredWindow || null,
  };
};

// GET /api/distance
const getDistance = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['from', 'to'],
      });
    }

    console.log(`📍 [DISTANCE] Calculating distance from ${from} to ${to}`);

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ [DISTANCE] GOOGLE_MAPS_API_KEY not configured');
      return res.status(500).json({
        error: 'Distance service not configured',
        message: 'Google Maps API key is missing. Please add GOOGLE_MAPS_API_KEY to your .env file.',
      });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', from);
    url.searchParams.append('destinations', to);
    url.searchParams.append('units', 'imperial');
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    console.log(`🌐 [DISTANCE] Calling Google API...`);

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log(`📡 [DISTANCE] Google API response status: ${data.status}`);

    if (data.status !== 'OK') {
      console.error('❌ [DISTANCE] Google API error:', data.status, data.error_message);
      return res.status(400).json({
        error: 'Failed to calculate distance',
        message: data.error_message || `Google API returned: ${data.status}`,
        status: data.status,
      });
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      console.error('❌ [DISTANCE] No valid route found:', element?.status);
      return res.status(400).json({
        error: 'Could not calculate distance',
        message: 'No valid route found between these locations. Please check the ZIP codes.',
        status: element?.status || 'NO_RESULTS',
      });
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    const miles = Math.round(distanceMeters / 1609.34);
    const kilometers = Math.round(distanceMeters / 1000);
    const hours = Math.round(durationSeconds / 3600 * 10) / 10;

    console.log(`✅ [DISTANCE] Result: ${miles} miles, ${hours} hours`);

    res.json({
      success: true,
      from,
      to,
      distance: {
        miles,
        kilometers,
        text: element.distance.text,
      },
      duration: {
        hours,
        seconds: durationSeconds,
        text: element.duration.text,
      },
      origin: data.origin_addresses?.[0] || from,
      destination: data.destination_addresses?.[0] || to,
    });

  } catch (error) {
    console.error('❌ [DISTANCE] Error:', error);
    res.status(500).json({
      error: 'Failed to calculate distance',
      details: error.message,
    });
  }
};

// GET /api/carrier/available-loads
// ✅ FIXED: Changed status from 'waiting' to 'scheduled' to match booking.controller.cjs
const getAvailableLoads = async (req, res) => {
  try {
    const { page = 1, limit = 12, pickupState, dropoffState, originZip, destZip, q } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✅ FIX: Include BOTH 'waiting' (old orders) and 'scheduled' (new orders)
    const where = { 
      status: { in: ['waiting', 'scheduled'] }, 
      carrierId: null 
    };

    console.log('📤 Fetching available loads for carrier with filter:', where);

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
      }),
      prisma.booking.count({ where }),
    ]);

    console.log(`✅ Found ${bookings.length} available loads (total: ${total})`);

    const loads = bookings.map((booking) => {
      const pickupData = booking.pickup || {};
      const dropoffData = booking.dropoff || {};
      const quoteData = booking.quote || {};
      const schedulingData = booking.scheduling || {};
      const vehicleData = booking.vehicleDetails || {};
      const timeWindows = extractTimeWindowsFromScheduling(schedulingData);

      const pickupWindowStart = booking.pickupWindowStart || timeWindows.pickupWindowStart;
      const pickupWindowEnd = booking.pickupWindowEnd || timeWindows.pickupWindowEnd;
      const dropoffWindowStart = booking.dropoffWindowStart || timeWindows.dropoffWindowStart;
      const dropoffWindowEnd = booking.dropoffWindowEnd || timeWindows.dropoffWindowEnd;

      const origin = [pickupData.city, pickupData.state].filter(Boolean).join(', ') || booking.fromCity || pickupData.zip || '—';
      const destination = [dropoffData.city, dropoffData.state].filter(Boolean).join(', ') || booking.toCity || dropoffData.zip || '—';
      const vehicleType = booking.vehicleType || [vehicleData.year, vehicleData.make, vehicleData.model].filter(Boolean).join(' ') || booking.vehicle || 'Vehicle';
      const ratePerMile = booking.miles > 0 ? (booking.price / booking.miles) : null;

      return {
        id: booking.id,
        ref: booking.ref,
        orderNumber: booking.orderNumber,
        origin,
        destination,
        fromCity: booking.fromCity,
        toCity: booking.toCity,
        miles: booking.miles,
        vehicle: booking.vehicle,
        vehicleType,
        vehicleDetails: vehicleData,
        transportType: booking.transportType || 'open',
        price: booking.price,
        ratePerMile,
        pickupDate: booking.pickupDate,
        dropoffDate: booking.dropoffDate,
        pickupWindowStart,
        pickupWindowEnd,
        dropoffWindowStart,
        dropoffWindowEnd,
        pickupPreferredWindow: timeWindows.pickupPreferredWindow,
        dropoffPreferredWindow: timeWindows.dropoffPreferredWindow,
        scheduling: {
          pickupDate: schedulingData.pickupDate || booking.pickupDate,
          dropoffDate: schedulingData.dropoffDate || booking.dropoffDate,
          pickupTimeStart: pickupWindowStart,
          pickupTimeEnd: pickupWindowEnd,
          dropoffTimeStart: dropoffWindowStart,
          dropoffTimeEnd: dropoffWindowEnd,
          pickupWindowStart,
          pickupWindowEnd,
          dropoffWindowStart,
          dropoffWindowEnd,
          pickupPreferredWindow: timeWindows.pickupPreferredWindow,
          dropoffPreferredWindow: timeWindows.dropoffPreferredWindow,
        },
        pickup: pickupData,
        dropoff: dropoffData,
        pickupOriginType: booking.pickupOriginType,
        dropoffDestinationType: booking.dropoffDestinationType,
        customerFirstName: booking.customerFirstName || booking.user?.firstName || '',
        customerLastName: booking.customerLastName || booking.user?.lastName || '',
        customerPhone: booking.customerPhone || booking.user?.phone || '',
      customerEmail: booking.userEmail || booking.user?.email || '',
        dealerFirstName: booking.dealerFirstName,
        dealerLastName: booking.dealerLastName,
        dealerPhone: booking.dealerPhone,
        auctionName: booking.auctionName,
        auctionGatePass: booking.auctionGatePass,
        auctionBuyerNumber: booking.auctionBuyerNumber,
        privateFirstName: booking.privateFirstName,
        privateLastName: booking.privateLastName,
        privatePhone: booking.privatePhone,
        dropoffDealerFirstName: booking.dropoffDealerFirstName,
        dropoffDealerLastName: booking.dropoffDealerLastName,
        dropoffDealerPhone: booking.dropoffDealerPhone,
        dropoffAuctionName: booking.dropoffAuctionName,
        dropoffAuctionGatePass: booking.dropoffAuctionGatePass,
        dropoffAuctionBuyerNumber: booking.dropoffAuctionBuyerNumber,
        dropoffPrivateFirstName: booking.dropoffPrivateFirstName,
        dropoffPrivateLastName: booking.dropoffPrivateLastName,
        dropoffPrivatePhone: booking.dropoffPrivatePhone,
        notes: booking.notes || booking.customerInstructions || booking.instructions || '',
        customerInstructions: booking.customerInstructions,
        instructions: booking.instructions,
        status: booking.status,
        postedAt: booking.createdAt,
        createdAt: booking.createdAt,
        quote: quoteData,
        likelihood: quoteData.likelihood || 0,
        marketAvg: quoteData.marketAvg || 0,
        hasGatePass: !!(booking.auctionGatePass || booking.dropoffAuctionGatePass),
      };
    });

    let filteredLoads = loads;
    if (pickupState) {
      filteredLoads = filteredLoads.filter(load => (load.pickup?.state || '').toUpperCase() === pickupState.toUpperCase());
    }
    if (dropoffState) {
      filteredLoads = filteredLoads.filter(load => (load.dropoff?.state || '').toUpperCase() === dropoffState.toUpperCase());
    }
    if (originZip) {
      filteredLoads = filteredLoads.filter(load => (load.pickup?.zip || '').startsWith(originZip));
    }
    if (destZip) {
      filteredLoads = filteredLoads.filter(load => (load.dropoff?.zip || '').startsWith(destZip));
    }
    if (q) {
      const searchLower = q.toLowerCase();
      filteredLoads = filteredLoads.filter(load =>
        load.origin?.toLowerCase().includes(searchLower) ||
        load.destination?.toLowerCase().includes(searchLower) ||
        load.vehicleType?.toLowerCase().includes(searchLower) ||
        load.ref?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      loads: filteredLoads,
      pagination: { page: pageNum, limit: limitNum, total: filteredLoads.length, totalPages: Math.ceil(total / limitNum), hasMore: skip + filteredLoads.length < total },
    });
  } catch (error) {
    console.error('❌ Get available loads error:', error);
    res.status(500).json({ error: 'Failed to fetch available loads', details: error.message });
  }
};

// GET /api/carrier/my-loads
const getMyLoads = async (req, res) => {
  try {
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { carrierId, ...(status && { status }) };

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { assignedAt: 'desc' },
        include: { 
          user: { select: { email: true, firstName: true, lastName: true, phone: true } },
          documents: {
            where: {
              type: { in: ['pickup_photo', 'delivery_photo', 'pod'] }
            },
            orderBy: { createdAt: 'desc' },
          },
          podDocument: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const loads = bookings.map((booking) => {
      const schedulingData = booking.scheduling || {};
      const timeWindows = extractTimeWindowsFromScheduling(schedulingData);
      const pickupData = booking.pickup || {};
      const dropoffData = booking.dropoff || {};

      // Separate documents by type
      const pickupPhotos = booking.documents.filter(d => d.type === 'pickup_photo');
      const deliveryPhotos = booking.documents.filter(d => d.type === 'delivery_photo');
      const podDocs = booking.documents.filter(d => d.type === 'pod');

      return {
        ...booking,
        pickupWindowStart: booking.pickupWindowStart || timeWindows.pickupWindowStart,
        pickupWindowEnd: booking.pickupWindowEnd || timeWindows.pickupWindowEnd,
        dropoffWindowStart: booking.dropoffWindowStart || timeWindows.dropoffWindowStart,
        dropoffWindowEnd: booking.dropoffWindowEnd || timeWindows.dropoffWindowEnd,
        pickupPreferredWindow: timeWindows.pickupPreferredWindow,
        dropoffPreferredWindow: timeWindows.dropoffPreferredWindow,
        scheduling: {
          ...schedulingData,
          pickupTimeStart: booking.pickupWindowStart || timeWindows.pickupWindowStart,
          pickupTimeEnd: booking.pickupWindowEnd || timeWindows.pickupWindowEnd,
          dropoffTimeStart: booking.dropoffWindowStart || timeWindows.dropoffWindowStart,
          dropoffTimeEnd: booking.dropoffWindowEnd || timeWindows.dropoffWindowEnd,
        },
        origin: [pickupData.city, pickupData.state].filter(Boolean).join(', ') || booking.fromCity,
        destination: [dropoffData.city, dropoffData.state].filter(Boolean).join(', ') || booking.toCity,
        pickupPhotos,
        deliveryPhotos,
        podDocs,
      };
    });

    res.json({ success: true, loads, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('❌ Get carrier loads error:', error);
    res.status(500).json({ error: 'Failed to fetch carrier loads', details: error.message });
  }
};

// GET /api/carrier/loads/:id
const getLoadById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Load ID required' });

    const booking = await prisma.booking.findFirst({
      where: { OR: [{ id }, { ref: id }] },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        pickupAddress: true,
        dropoffAddress: true,
        documents: {
          where: {
            type: { in: ['pickup_photo', 'delivery_photo', 'pod', 'gate_pass'] }
          },
          orderBy: { createdAt: 'desc' },
        },
        podDocument: true,
      },
    });

    if (!booking) return res.status(404).json({ error: 'Load not found' });

    const pickupData = booking.pickup || {};
    const dropoffData = booking.dropoff || {};
    const quoteData = booking.quote || {};
    const schedulingData = booking.scheduling || {};
    const vehicleData = booking.vehicleDetails || {};
    const timeWindows = extractTimeWindowsFromScheduling(schedulingData);

    const pickupWindowStart = booking.pickupWindowStart || timeWindows.pickupWindowStart;
    const pickupWindowEnd = booking.pickupWindowEnd || timeWindows.pickupWindowEnd;
    const dropoffWindowStart = booking.dropoffWindowStart || timeWindows.dropoffWindowStart;
    const dropoffWindowEnd = booking.dropoffWindowEnd || timeWindows.dropoffWindowEnd;

    // Separate documents by type
    const pickupPhotos = booking.documents.filter(d => d.type === 'pickup_photo');
    const deliveryPhotos = booking.documents.filter(d => d.type === 'delivery_photo');
    const podDocs = booking.documents.filter(d => d.type === 'pod');

    const load = {
      id: booking.id,
      ref: booking.ref,
      orderNumber: booking.orderNumber,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      origin: [pickupData.city, pickupData.state].filter(Boolean).join(', ') || booking.fromCity,
      destination: [dropoffData.city, dropoffData.state].filter(Boolean).join(', ') || booking.toCity,
      miles: booking.miles,
      vehicle: booking.vehicle,
      vehicleType: booking.vehicleType || [vehicleData.year, vehicleData.make, vehicleData.model].filter(Boolean).join(' '),
      vehicleDetails: vehicleData,
      transportType: booking.transportType || 'open',
      price: booking.price,
      ratePerMile: booking.miles > 0 ? (booking.price / booking.miles) : null,
      likelihood: quoteData.likelihood || 0,
      marketAvg: quoteData.marketAvg || 0,
      pickupDate: booking.pickupDate,
      dropoffDate: booking.dropoffDate,
      pickupWindowStart,
      pickupWindowEnd,
      dropoffWindowStart,
      dropoffWindowEnd,
      pickupPreferredWindow: timeWindows.pickupPreferredWindow,
      dropoffPreferredWindow: timeWindows.dropoffPreferredWindow,
      scheduling: {
        pickupDate: schedulingData.pickupDate || booking.pickupDate,
        dropoffDate: schedulingData.dropoffDate || booking.dropoffDate,
        pickupTimeStart: pickupWindowStart,
        pickupTimeEnd: pickupWindowEnd,
        dropoffTimeStart: dropoffWindowStart,
        dropoffTimeEnd: dropoffWindowEnd,
        pickupWindowStart,
        pickupWindowEnd,
        dropoffWindowStart,
        dropoffWindowEnd,
        pickupPreferredWindow: timeWindows.pickupPreferredWindow,
        dropoffPreferredWindow: timeWindows.dropoffPreferredWindow,
      },
      pickup: pickupData,
      dropoff: dropoffData,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupOriginType: booking.pickupOriginType,
      dropoffDestinationType: booking.dropoffDestinationType,
      customerFirstName: booking.customerFirstName || booking.user?.firstName || '',
      customerLastName: booking.customerLastName || booking.user?.lastName || '',
      customerPhone: booking.customerPhone || booking.user?.phone || '',
      customerEmail: booking.userEmail || booking.user?.email || '',
      dealerFirstName: booking.dealerFirstName,
      dealerLastName: booking.dealerLastName,
      dealerPhone: booking.dealerPhone,
      auctionName: booking.auctionName,
      auctionGatePass: booking.auctionGatePass,
      auctionBuyerNumber: booking.auctionBuyerNumber,
      privateFirstName: booking.privateFirstName,
      privateLastName: booking.privateLastName,
      privatePhone: booking.privatePhone,
      dropoffDealerFirstName: booking.dropoffDealerFirstName,
      dropoffDealerLastName: booking.dropoffDealerLastName,
      dropoffDealerPhone: booking.dropoffDealerPhone,
      dropoffAuctionName: booking.dropoffAuctionName,
      dropoffAuctionGatePass: booking.dropoffAuctionGatePass,
      dropoffAuctionBuyerNumber: booking.dropoffAuctionBuyerNumber,
      dropoffPrivateFirstName: booking.dropoffPrivateFirstName,
      dropoffPrivateLastName: booking.dropoffPrivateLastName,
      dropoffPrivatePhone: booking.dropoffPrivatePhone,
      notes: booking.notes || booking.customerInstructions || booking.instructions || '',
      customerInstructions: booking.customerInstructions,
      instructions: booking.instructions,
      status: booking.status,
      carrierId: booking.carrierId,
      assignedAt: booking.assignedAt,
      pickupAt: booking.pickupAt,
      deliveredAt: booking.deliveredAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      quote: quoteData,
      // Document collections
      pickupPhotos,
      deliveryPhotos,
      podDocs,
      podDocument: booking.podDocument,
    };

    console.log('📡 Returning load with time windows:', { id: load.id, pickupWindowStart, pickupWindowEnd, dropoffWindowStart, dropoffWindowEnd });

    res.json({ success: true, booking: load, load });
  } catch (error) {
    console.error('❌ Get load by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch load', details: error.message });
  }
};

// POST /api/carrier/loads/:id/accept
const acceptLoad = async (req, res) => {
  // Delegate to booking controller
  return bookingController.acceptLoadAsCarrier(req, res);
};

// POST /api/carrier/loads/:id/decline
const declineLoad = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });
    console.log(`📋 Carrier ${carrierId} declined load ${id}`);
    res.json({ success: true, message: 'Load declined' });
  } catch (error) {
    console.error('❌ Decline load error:', error);
    res.status(500).json({ error: 'Failed to decline load', details: error.message });
  }
};

// PATCH /api/carrier/loads/:id/status
const updateLoadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { status } = req.body;

    if (!carrierId) return res.status(401).json({ error: 'Authentication required' });

    const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', validStatuses });
    }

    const booking = await prisma.booking.findFirst({ where: { id, carrierId } });
    if (!booking) return res.status(404).json({ error: 'Load not found or not assigned to you' });

    const updateData = { status };
    if (status === 'picked_up') updateData.pickupAt = new Date();
    if (status === 'delivered') updateData.deliveredAt = new Date();

    const updatedBooking = await prisma.booking.update({ where: { id }, data: updateData });

    const statusMessages = {
      picked_up: 'Your vehicle has been picked up',
      in_transit: 'Your vehicle is now in transit',
      delivered: 'Your vehicle has been delivered',
    };

    if (statusMessages[status]) {
      try {
        await prisma.notification.create({
          data: {
            user: { connect: { id: booking.userId } },
            type: 'shipment_status_update',
            title: 'Shipment Update',
            message: `${statusMessages[status]} - Shipment #${booking.ref}`,
            category: 'dispatch',
            meta: { bookingId: booking.id, ref: booking.ref, newStatus: status },
          },
        });
      } catch (notifError) {
        console.error('⚠️ Failed to create notification:', notifError.message);
      }
    }

    console.log(`✅ Load ${id} status updated to ${status}`);
    res.json({ success: true, message: 'Load status updated', booking: updatedBooking });
  } catch (error) {
    console.error('❌ Update load status error:', error);
    res.status(500).json({ error: 'Failed to update load status', details: error.message });
  }
};

// ============================================================
// ✅ NEW: Pickup and Deliver routes - delegate to booking controller
// ============================================================

// POST /api/carrier/loads/:id/pickup
const markLoadPickedUp = async (req, res) => {
  return bookingController.markLoadAsPickedUp(req, res);
};

// POST /api/carrier/loads/:id/deliver
const markLoadDelivered = async (req, res) => {
  return bookingController.markLoadAsDelivered(req, res);
};

// GET /api/carrier/loads/:id/documents
const getLoadDocuments = async (req, res) => {
  return bookingController.getLoadDocuments(req, res);
};

// ⭐ EXPORT ALL FUNCTIONS
module.exports = {
  getDistance,
  getAvailableLoads,
  getMyLoads,
  getLoadById,
  acceptLoad,
  declineLoad,
  updateLoadStatus,
  // ✅ NEW exports
  markLoadPickedUp,
  markLoadDelivered,
  getLoadDocuments,
};
