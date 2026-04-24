// ============================================================
// FILE: server/controllers/customer.stats.controller.cjs
// GET /api/customer/dashboard-stats
// Returns whole-account aggregates for the authenticated customer.
// Stats are computed via DB aggregation — they do NOT reflect the
// currently-paginated Orders table page, search, or filters.
// ============================================================

const prisma = require('../db.cjs');

// Status bucket aliases — mirrored from booking.core.controller.cjs so
// legacy rows with non-canonical status values are still counted
// correctly. Keep these in sync with the bucketMap in getBookings.
const SCHEDULED_ALIASES = ['scheduled', 'waiting', 'pending', 'booked', 'new'];
const ASSIGNED_ALIASES  = ['assigned', 'accepted', 'carrier_assigned', 'carrier_accepted'];
const EN_ROUTE_ALIASES  = ['on_the_way_to_pickup', 'on_the_way', 'en_route', 'enroute', 'driving', 'dispatched', 'in_transit_to_pickup'];
const AT_PICKUP_ALIASES = ['arrived_at_pickup', 'arrived', 'at_pickup', 'waiting_at_pickup'];
const PICKED_UP_ALIASES = ['picked_up', 'pickedup', 'in_transit', 'loaded', 'pickup_complete'];
const DELIVERED_ALIASES = ['delivered', 'completed', 'done'];
const CANCELLED_ALIASES = ['cancelled', 'canceled'];

const OPEN_ALIASES = [
  ...SCHEDULED_ALIASES,
  ...ASSIGNED_ALIASES,
  ...EN_ROUTE_ALIASES,
  ...AT_PICKUP_ALIASES,
  ...PICKED_UP_ALIASES,
];

const getCustomerDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = typeof req.userEmail === 'string' ? req.userEmail.trim() : '';
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ownership match: prefer the FK (userId) but fall back to the denormalized
    // userEmail so records whose userId drifted (DB restore, re-registration,
    // legacy import) still surface for the rightful owner. User.email is
    // unique, so the email branch cannot leak another user's records.
    const ownerFilter = userEmail
      ? { OR: [{ userId }, { userEmail: { equals: userEmail, mode: 'insensitive' } }] }
      : { userId };

    const [
      totalQuotes,
      totalOrders,
      totalOpenOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
      deliveredSpendAgg,
    ] = await Promise.all([
      prisma.quote.count({ where: ownerFilter }),
      prisma.booking.count({ where: ownerFilter }),
      prisma.booking.count({
        where: { ...ownerFilter, status: { in: OPEN_ALIASES } },
      }),
      prisma.booking.count({
        where: { ...ownerFilter, status: { in: DELIVERED_ALIASES } },
      }),
      prisma.booking.count({
        where: { ...ownerFilter, status: { in: CANCELLED_ALIASES } },
      }),
      prisma.booking.aggregate({
        where: { ...ownerFilter, status: { in: DELIVERED_ALIASES } },
        _sum: { price: true },
      }),
    ]);

    console.log('[CUSTOMER STATS]', {
      userId,
      userEmail,
      totalQuotes,
      totalOrders,
      totalOpenOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
    });

    const totalSpend = Number(deliveredSpendAgg?._sum?.price ?? 0) || 0;

    // Conversion = orders / quotes * 100. Guarded against divide-by-zero,
    // capped at 100% (bookings can outnumber quotes — e.g. direct-booked
    // orders with no associated quote row — which otherwise yields >100%),
    // and rounded to 1 decimal for a clean UI value.
    const rawConversion =
      totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0;
    const conversionRate = Math.round(Math.min(rawConversion, 100) * 10) / 10;

    return res.json({
      success: true,
      stats: {
        totalQuotes,
        totalOrders,
        totalOpenOrders,
        totalDeliveredOrders,
        totalCancelledOrders,
        totalSpend,
        conversionRate,
      },
    });
  } catch (error) {
    console.error('[CUSTOMER STATS] Failed to compute dashboard stats:', error);
    return res.status(500).json({
      error: 'Failed to compute dashboard stats',
      details: error.message,
    });
  }
};

module.exports = {
  getCustomerDashboardStats,
};
