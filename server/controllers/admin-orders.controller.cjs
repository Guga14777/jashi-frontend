// ============================================================
// FILE: server/controllers/admin-orders.controller.cjs
// Full 6-step status flow + server-side search/filter.
// ============================================================

const prisma = global.prisma;

const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  normalizeStatus,
  getStatusStep,
} = require('../services/booking/index.cjs');

const {
  buildOrderSearchWhere,
  parsePagination,
} = require('../services/admin/admin.search.service.cjs');

const { computeAlertsForBooking } = require('../services/admin/admin.alerts.service.cjs');
const { resolvePaymentBucket } = require('../services/admin/admin.payment.service.cjs');

// ============================================================
// GET ALL ORDERS (Admin)
// ============================================================
exports.listAllOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = buildOrderSearchWhere(req.query);

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          quoteRelation: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              reference: true,
              amount: true,
              status: true,
              cardLast4: true,
              cardBrand: true,
              cardholderFirstName: true,
              cardholderLastName: true,
              paidAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const orders = await Promise.all(bookings.map(async (b) => {
      let carrierInfo = null;
      
      if (b.carrierId) {
        try {
          carrierInfo = await prisma.user.findUnique({
            where: { id: b.carrierId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              companyName: true,
              mcNumber: true,
              dotNumber: true,
              hasCargoInsurance: true, // ✅ Added
            },
          });
        } catch (e) {
          console.log('Could not fetch carrier:', e.message);
        }
      }

      // Extract pickup address from JSON field
      const pickup = b.pickup || {};
      const pickupAddress = {
        street: pickup.street || pickup.street1 || pickup.address || '',
        city: pickup.city || b.fromCity || '',
        state: pickup.state || '',
        zip: pickup.zip || pickup.zipCode || '',
        contactName: pickup.contactName || pickup.name || '',
        contactPhone: pickup.contactPhone || pickup.phone || '',
      };
      pickupAddress.full = [pickupAddress.street, pickupAddress.city, pickupAddress.state, pickupAddress.zip]
        .filter(Boolean).join(', ') || b.fromCity || '-';

      // Extract dropoff address from JSON field
      const dropoff = b.dropoff || {};
      const dropoffAddress = {
        street: dropoff.street || dropoff.street1 || dropoff.address || '',
        city: dropoff.city || b.toCity || '',
        state: dropoff.state || '',
        zip: dropoff.zip || dropoff.zipCode || '',
        contactName: dropoff.contactName || dropoff.name || '',
        contactPhone: dropoff.contactPhone || dropoff.phone || '',
      };
      dropoffAddress.full = [dropoffAddress.street, dropoffAddress.city, dropoffAddress.state, dropoffAddress.zip]
        .filter(Boolean).join(', ') || b.toCity || '-';

      // Extract vehicle details from JSON
      const vehicleDetails = b.vehicleDetails || {};
      const vd = Array.isArray(vehicleDetails) ? vehicleDetails[0] : vehicleDetails;
      
      const quoteJson = b.quote || {};
      const quoteVehicles = quoteJson.vehicles || [];
      const qv = Array.isArray(quoteVehicles) ? quoteVehicles[0] : {};

      const vehicleYear = vd?.year || qv?.year || '';
      const vehicleMake = vd?.make || qv?.make || '';
      const vehicleModel = vd?.model || qv?.model || '';
      const vehicleType = vd?.type || qv?.type || b.vehicleType || b.vehicle || '';
      const vehicleColor = vd?.color || qv?.color || '';
      const isOperable = vd?.operable !== 'no' && qv?.operable !== 'no';
      
      // ✅ Extract VIN from vehicle details, quote vehicles, or booking
      const vehicleVin = vd?.vin || qv?.vin || b.vin || '';

      const scheduling = b.scheduling || {};

      // Extract payment info — most-recent txn for the existing card-display
      // fields, plus the whole history for the payment-timeline UI.
      const allPayments = b.payments || [];
      const payment = allPayments[0] || null;
      const paymentInfo = payment ? {
        id: payment.id,
        reference: payment.reference,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardholderFirstName: payment.cardholderFirstName,
        cardholderLastName: payment.cardholderLastName,
        paidAt: payment.paidAt || payment.createdAt,
        amount: payment.amount,
        status: payment.status,
      } : null;

      // Collapse txn history into a product bucket for the admin UI pill.
      const paymentBucket = resolvePaymentBucket(b, allPayments);

      // Server-computed alerts — shown as warning badges on the row.
      const alerts = computeAlertsForBooking(b, paymentBucket.bucket);

      // ✅ Normalize status to 4-step flow
      const normalizedStatus = normalizeStatus(b.status);
      const statusStep = getStatusStep(normalizedStatus);

      return {
        id: b.id,
        orderNumber: b.orderNumber,
        ref: b.ref,
        
        // ✅ 4-step status
        status: normalizedStatus,
        statusLabel: STATUS_LABELS[normalizedStatus],
        statusStep,
        
        pickupAddress,
        fromCity: b.fromCity,
        dropoffAddress,
        toCity: b.toCity,
        
        miles: b.miles,
        
        // Vehicle details
        vehicle: b.vehicle,
        vehicleType,
        vehicleYear,
        vehicleMake,
        vehicleModel,
        vehicleColor,
        vehicleCondition: isOperable ? 'Running' : 'Non-Running',
        vin: vehicleVin, // ✅ Added VIN field
        
        transportType: b.transportType,
        
        // Pickup date and time window
        pickupDate: b.pickupDate,
        pickupWindowStart: b.pickupWindowStart || scheduling.pickupWindowStart || '',
        pickupWindowEnd: b.pickupWindowEnd || scheduling.pickupWindowEnd || '',
        pickupOriginType: b.pickupOriginType,
        
        // Dropoff date and time window  
        dropoffDate: b.dropoffDate,
        dropoffWindowStart: b.dropoffWindowStart || scheduling.dropoffWindowStart || '',
        dropoffWindowEnd: b.dropoffWindowEnd || scheduling.dropoffWindowEnd || '',
        dropoffDestinationType: b.dropoffDestinationType,
        
        // Pricing
        price: b.price,
        marketAvg: b.quoteRelation?.marketAvg || quoteJson.marketAvg,
        likelihood: b.quoteRelation?.likelihood || quoteJson.likelihood,
        
        // Payment info
        payment: paymentInfo,
        paymentBucket,
        paymentHistory: allPayments,

        // Alert flags (computed server-side)
        alerts,
        
        // Notes
        customerInstructions: b.customerInstructions,
        notes: b.notes,
        instructions: b.instructions,
        
        // Pickup contact
        pickupContact: {
          type: b.pickupOriginType,
          dealerName: [b.dealerFirstName, b.dealerLastName].filter(Boolean).join(' '),
          dealerPhone: b.dealerPhone,
          auctionName: b.auctionName,
          auctionBuyerNumber: b.auctionBuyerNumber,
          privateName: [b.privateFirstName, b.privateLastName].filter(Boolean).join(' '),
          privatePhone: b.privatePhone,
        },
        
        // Dropoff contact
        dropoffContact: {
          type: b.dropoffDestinationType,
          dealerName: [b.dropoffDealerFirstName, b.dropoffDealerLastName].filter(Boolean).join(' '),
          dealerPhone: b.dropoffDealerPhone,
          auctionName: b.dropoffAuctionName,
          auctionBuyerNumber: b.dropoffAuctionBuyerNumber,
          privateName: [b.dropoffPrivateFirstName, b.dropoffPrivateLastName].filter(Boolean).join(' '),
          privatePhone: b.dropoffPrivatePhone,
        },
        
        // Full 6-step timeline timestamps — frontend renders whichever are set.
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        assignedAt: b.assignedAt,
        onTheWayAt: b.onTheWayAt || b.tripStartedAt,
        arrivedAtPickupAt: b.arrivedAtPickupAt,
        pickedUpAt: b.pickedUpAt || b.pickupAt,
        deliveredAt: b.deliveredAt,
        cancelledAt: b.cancelledAt,
        cancelReason: b.cancelReason,

        carrierId: b.carrierId,
        customer: b.user,
        carrier: carrierInfo,
      };
    }));

    res.json({ orders, pagination: { page, limit, total } });

  } catch (error) {
    console.error('❌ Admin orders error:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
};

// ============================================================
// GET SINGLE ORDER DETAILS
// ============================================================
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        quoteRelation: true,
        documents: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let carrier = null;
    if (booking.carrierId) {
      carrier = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          mcNumber: true,
          dotNumber: true,
          hasCargoInsurance: true, // ✅ Added
        },
      });
    }

    // ✅ Normalize status
    const normalizedStatus = normalizeStatus(booking.status);

    // ✅ Extract VIN for single order details
    const vehicleDetails = booking.vehicleDetails || {};
    const vd = Array.isArray(vehicleDetails) ? vehicleDetails[0] : vehicleDetails;
    const quoteJson = booking.quote || {};
    const quoteVehicles = quoteJson.vehicles || [];
    const qv = Array.isArray(quoteVehicles) ? quoteVehicles[0] : {};
    const vin = vd?.vin || qv?.vin || booking.vin || '';

    const paymentBucket = resolvePaymentBucket(booking, booking.payments || []);
    const alerts = computeAlertsForBooking(booking, paymentBucket.bucket);

    res.json({
      order: {
        ...booking,
        carrier,
        status: normalizedStatus,
        statusLabel: STATUS_LABELS[normalizedStatus],
        statusStep: getStatusStep(normalizedStatus),
        // Full 6-step timeline — always expose every timestamp.
        onTheWayAt: booking.onTheWayAt || booking.tripStartedAt,
        arrivedAtPickupAt: booking.arrivedAtPickupAt,
        pickedUpAt: booking.pickedUpAt || booking.pickupAt,
        vin,
        paymentBucket,
        alerts,
      },
    });

  } catch (error) {
    console.error('❌ Admin get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

// ============================================================
// ✅ NEW: UPDATE ORDER STATUS (Admin)
// ============================================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status is one of the 4 allowed values
    const normalizedStatus = normalizeStatus(status);
    if (!STATUS_ORDER.includes(normalizedStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        allowedStatuses: STATUS_ORDER,
      });
    }

    const now = new Date();
    const updateData = {
      status: normalizedStatus,
      updatedAt: now,
    };

    // Set appropriate timestamp based on status
    if (normalizedStatus === SHIPMENT_STATUS.ASSIGNED && !updateData.assignedAt) {
      updateData.assignedAt = now;
    }
    if (normalizedStatus === SHIPMENT_STATUS.PICKED_UP) {
      updateData.pickedUpAt = now;
      updateData.pickupAt = now; // Legacy
    }
    if (normalizedStatus === SHIPMENT_STATUS.DELIVERED) {
      updateData.deliveredAt = now;
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: `Order status updated to ${STATUS_LABELS[normalizedStatus]}`,
      order: {
        ...booking,
        status: normalizedStatus,
        statusLabel: STATUS_LABELS[normalizedStatus],
        statusStep: getStatusStep(normalizedStatus),
      },
    });

  } catch (error) {
    console.error('❌ Admin update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ============================================================
// GET ALL QUOTES
// ============================================================
exports.listAllQuotes = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [quotes, total] = await prisma.$transaction([
      prisma.quote.findMany({
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          bookings: {
            select: { id: true, orderNumber: true, status: true },
          },
        },
      }),
      prisma.quote.count(),
    ]);

    // Add booking status info to quotes
    const enrichedQuotes = quotes.map(q => {
      const booking = q.bookings?.[0];
      return {
        ...q,
        hasBooking: !!booking,
        bookingOrderNumber: booking?.orderNumber || null,
        bookingStatus: booking ? normalizeStatus(booking.status) : null,
        bookingStatusLabel: booking ? STATUS_LABELS[normalizeStatus(booking.status)] : null,
      };
    });

    res.json({ quotes: enrichedQuotes, pagination: { page: pageNum, limit: limitNum, total } });

  } catch (error) {
    console.error('❌ Admin quotes error:', error);
    res.status(500).json({ error: 'Failed to list quotes' });
  }
};

// ============================================================
// GET ALL USERS (Customers or Carriers)
// ✅ FIXED: Added hasCargoInsurance to select
// ============================================================
exports.listAllUsers = async (req, res) => {
  try {
    const { role = 'CUSTOMER', page = 1, limit = 100 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      roles: { contains: role.toUpperCase() },
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          mcNumber: true,
          dotNumber: true,
          hasCargoInsurance: true, // ✅ FIXED: Added this field
          roles: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
              quotes: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { page: pageNum, limit: limitNum, total } });

  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

// ============================================================
// GET ADMIN STATS — 6-step bucket counts, revenue, rates, and time-windowed
// counts (today / 7d / 30d). All counts via SQL aggregates, nothing client-side.
// ============================================================
exports.getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBookings,
      scheduledBookings,
      assignedBookings,
      onTheWayBookings,
      arrivedBookings,
      pickedUpBookings,
      deliveredBookings,
      cancelledBookings,
      bookingsToday,
      bookings7d,
      bookings30d,
      totalQuotes,
      quotesToday,
      quotes7d,
      totalCustomers,
      totalCarriers,
      newCustomers7d,
      newCarriers7d,
      paidPaymentsAgg,
      cancelledPaymentsAgg,
      paymentsToday,
    ] = await prisma.$transaction([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.SCHEDULED } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.ASSIGNED } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.ARRIVED_AT_PICKUP } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.PICKED_UP } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.DELIVERED } }),
      prisma.booking.count({ where: { status: SHIPMENT_STATUS.CANCELLED } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.quote.count(),
      prisma.quote.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.quote.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { roles: { contains: 'CUSTOMER' } } }),
      prisma.user.count({ where: { roles: { contains: 'CARRIER' } } }),
      prisma.user.count({ where: { roles: { contains: 'CUSTOMER' }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { roles: { contains: 'CARRIER' }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.paymentTransaction.aggregate({
        where: { status: { in: ['succeeded', 'paid', 'captured'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.paymentTransaction.aggregate({
        where: { status: { in: ['refunded', 'cancelled', 'failed'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.paymentTransaction.aggregate({
        where: { status: { in: ['succeeded', 'paid', 'captured'] }, createdAt: { gte: startOfToday } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Rates: gate by 0-total so we don't divide-by-zero and return a rational-looking NaN.
    const cancellationRate = totalBookings > 0 ? cancelledBookings / totalBookings : 0;
    // Conversion rate = bookings created / quotes created (top-of-funnel conversion).
    const conversionRate = totalQuotes > 0 ? totalBookings / totalQuotes : 0;

    res.json({
      stats: {
        bookings: {
          total: totalBookings,
          scheduled: scheduledBookings,
          assigned: assignedBookings,
          onTheWay: onTheWayBookings,
          arrived: arrivedBookings,
          pickedUp: pickedUpBookings,
          delivered: deliveredBookings,
          cancelled: cancelledBookings,
          today: bookingsToday,
          last7Days: bookings7d,
          last30Days: bookings30d,
        },
        revenue: {
          total: Number(paidPaymentsAgg._sum.amount || 0),
          paidCount: paidPaymentsAgg._count,
          today: Number(paymentsToday._sum.amount || 0),
          todayCount: paymentsToday._count,
          refundedOrCancelled: Number(cancelledPaymentsAgg._sum.amount || 0),
        },
        rates: {
          cancellationRate,       // 0–1
          conversionRate,         // 0–1, quotes → bookings
        },
        quotes: {
          total: totalQuotes,
          today: quotesToday,
          last7Days: quotes7d,
        },
        users: {
          customers: totalCustomers,
          carriers: totalCarriers,
          newCustomersLast7Days: newCustomers7d,
          newCarriersLast7Days: newCarriers7d,
        },
      },
    });

  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ============================================================
// GET /api/admin/activity — recent AccountEvents (audit log viewer)
// Query: ?type=admin_*     (optional prefix filter)
//        ?userId=<id>      (events for a specific user)
//        ?page=1&limit=50  (paginated)
// ============================================================
exports.listActivity = async (req, res) => {
  try {
    const { type, userId, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (userId) where.userId = String(userId);
    if (type) {
      const t = String(type);
      // Support both exact match and 'admin_*' prefix wildcard.
      where.eventType = t.endsWith('*') ? { startsWith: t.slice(0, -1) } : t;
    }

    const [events, total] = await prisma.$transaction([
      prisma.accountEvent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, roles: true },
          },
        },
      }),
      prisma.accountEvent.count({ where }),
    ]);

    res.json({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        eventData: e.eventData,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        createdAt: e.createdAt,
        actor: e.user ? {
          id: e.user.id,
          email: e.user.email,
          name: [e.user.firstName, e.user.lastName].filter(Boolean).join(' ') || e.user.email,
          roles: e.user.roles,
        } : null,
      })),
      pagination: { page: pageNum, limit: limitNum, total },
    });
  } catch (err) {
    console.error('❌ Admin activity error:', err);
    res.status(500).json({ error: 'Failed to list activity' });
  }
};
