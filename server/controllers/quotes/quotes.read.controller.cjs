/**
 * Quotes Read Controller
 * Handles quote retrieval operations
 */

const prisma = require('../../db.cjs');
const {
  getListQuoteInclude,
  getDetailQuoteInclude,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
} = require('../../services/quotes/index.cjs');
const {
  transformQuoteForList,
  transformQuoteForDetail,
} = require('../../services/quotes/quotes.transform.service.cjs');

/**
 * Get all quotes with pagination
 */
async function getQuotes(req, res) {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📥 [QUOTES] GET QUOTES REQUEST');

    const userId = req.userId;
    const userEmail = typeof req.userEmail === 'string' ? req.userEmail.trim() : '';

    const {
      page = DEFAULT_PAGE,
      pageSize = DEFAULT_PAGE_SIZE,
      status,
      sortBy = DEFAULT_SORT_BY,
      sortOrder = DEFAULT_SORT_ORDER,
      search,
      statusFilter,
      likelihoodFilter,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(pageSize);
    const skip = (pageNum - 1) * limitNum;

    // Ownership: userId (FK) OR userEmail (denormalized). The email branch
    // rescues legacy rows whose userId no longer matches the logged-in user
    // (DB restore, re-registration, legacy import). User.email is unique,
    // so this cannot leak another user's records.
    const ownerFilter = userEmail
      ? { OR: [{ userId }, { userEmail: { equals: userEmail, mode: 'insensitive' } }] }
      : { userId };

    // AND array so search (which sets its own OR) cannot clobber ownership.
    const where = { AND: [ownerFilter, ...(status ? [{ status }] : [])] };

    // Quote "Waiting" vs "Accepted" is derived from whether a carrier has
    // picked up the booking tied to the quote. Filter via the booking relation
    // so the server mirrors the isCarrierAccepted() logic the UI already uses.
    if (typeof statusFilter === 'string' && statusFilter.trim()) {
      const bucket = statusFilter.trim().toLowerCase();
      if (bucket === 'accepted') {
        where.AND.push({ bookings: { some: { carrierId: { not: null } } } });
      } else if (bucket === 'waiting') {
        where.AND.push({ NOT: { bookings: { some: { carrierId: { not: null } } } } });
      }
    }

    if (typeof likelihoodFilter === 'string' && likelihoodFilter.trim()) {
      const band = likelihoodFilter.trim().toLowerCase();
      if (band === 'high') where.AND.push({ likelihood: { gte: 80 } });
      else if (band === 'medium') where.AND.push({ likelihood: { gte: 60, lt: 80 } });
      else if (band === 'low') where.AND.push({ likelihood: { lt: 60 } });
    }

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      const q = searchTerm;
      // Map display labels ("Accepted") onto the raw DB status values quotes use.
      const statusAliases = {
        accepted: ['booked'],
      };
      const aliasMatches = statusAliases[q.toLowerCase()] || [];

      const or = [
        { fromZip: { contains: q, mode: 'insensitive' } },
        { toZip: { contains: q, mode: 'insensitive' } },
        { vehicle: { contains: q, mode: 'insensitive' } },
        { transportType: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
        // Match a quote via the booking it was converted into: searching
        // "#1137" from Quote History must surface the linked quote.
        { bookings: { some: { ref: { contains: q, mode: 'insensitive' } } } },
        ...aliasMatches.map((s) => ({ status: s })),
      ];

      // Accept both "1137" and zero-padded "0122". Users type either —
      // strip leading zeros so the integer compare still matches.
      if (/^\d+$/.test(q)) {
        const asInt = parseInt(q, 10);
        if (!Number.isNaN(asInt)) {
          or.push({ orderNumber: { equals: asInt } });
          or.push({ bookings: { some: { orderNumber: { equals: asInt } } } });
        }
      }

      where.AND.push({ OR: or });
    }

    const [quotes, total] = await prisma.$transaction([
      prisma.quote.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: getListQuoteInclude(),
      }),
      prisma.quote.count({ where }),
    ]);

    console.log(`📋 [QUOTES] Found ${quotes.length}/${total} for userId=${userId} userEmail=${userEmail}`);
    
    const enhancedQuotes = quotes.map((quote) => transformQuoteForList(quote));
    
    console.log('═══════════════════════════════════════════════════════');
    
    res.json({
      success: true,
      quotes: enhancedQuotes,
      items: enhancedQuotes, // Keep for backward compatibility
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + quotes.length < total,
      },
    });

  } catch (error) {
    console.error('❌ Get quotes error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quotes',
      details: error.message 
    });
  }
}

/**
 * Get single quote by ID
 */
async function getQuoteById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📥 [QUOTES] GET QUOTE BY ID:', id);

    const quote = await prisma.quote.findFirst({
      where: { id, userId },
      include: getDetailQuoteInclude(),
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const transformedQuote = transformQuoteForDetail(quote);

    console.log('📦 [QUOTES] Returning quote:', {
      id: transformedQuote.id,
      orderNumber: transformedQuote.orderNumber,
      hasBooking: transformedQuote.hasBooking,
      carrierAccepted: transformedQuote.carrierAccepted,
      displayStatus: transformedQuote.displayStatus,
      customerFirstName: transformedQuote.customerFirstName,
      vehicleCondition: transformedQuote.vehicleCondition,
      vin: transformedQuote.vin,
      vehiclesCount: transformedQuote.vehiclesCount,
      vehiclesLength: transformedQuote.vehicles?.length,
    });
    console.log('═══════════════════════════════════════════════════════');

    res.json({ success: true, quote: transformedQuote });

  } catch (error) {
    console.error('❌ Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}

/**
 * Get quote statistics
 */
async function getQuoteStats(req, res) {
  try {
    const userId = req.userId;

    const [total, waiting, accepted, expired] = await prisma.$transaction([
      prisma.quote.count({ where: { userId } }),
      prisma.quote.count({ where: { userId, status: 'waiting' } }),
      prisma.quote.count({ where: { userId, status: 'booked' } }),
      prisma.quote.count({ where: { userId, status: 'expired' } }),
    ]);

    const avgOffer = await prisma.quote.aggregate({
      where: { userId },
      _avg: { offer: true },
    });

    res.json({
      success: true,
      stats: {
        total,
        waiting,
        accepted,
        expired,
        averageOffer: avgOffer._avg.offer || 0,
      },
    });

  } catch (error) {
    console.error('Get quote stats error:', error);
    res.status(500).json({ error: 'Failed to fetch quote statistics' });
  }
}

module.exports = {
  getQuotes,
  getQuoteById,
  getQuoteStats,
};
