/**
 * Account Events Controller - PostgreSQL Version
 * Audit log for user account activities
 */

const prisma = require('../db.cjs');

/**
 * Get account events for user
 * GET /api/account-events?page=1&limit=50
 */
exports.listMyEvents = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, eventType } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...(eventType && { eventType }),
    };

    const [events, total] = await prisma.$transaction([
      prisma.accountEvent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountEvent.count({ where }),
    ]);

    res.json({
      success: true,
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Get account events error:', error);
    res.status(500).json({ error: 'Failed to fetch account events' });
  }
};

/**
 * Create account event (internal use)
 * POST /api/account-events
 */
exports.createEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventType, eventData, ipAddress, userAgent } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const event = await prisma.accountEvent.create({
      data: {
        userId,
        eventType,
        eventData: eventData || null,
        ipAddress: ipAddress || req.ip || req.connection.remoteAddress,
        userAgent: userAgent || req.headers['user-agent'],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event logged successfully',
      event,
    });

  } catch (error) {
    console.error('Create account event error:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
};

module.exports = exports;