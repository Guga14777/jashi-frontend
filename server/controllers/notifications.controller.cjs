// ============================================================
// FILE: server/controllers/notifications.controller.cjs
// ✅ COMPLETE: Real notification system with full CRUD operations
// ============================================================

const prisma = require('../db.cjs');

/**
 * Get all notifications for user
 * GET /api/customer/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, status = 'all', recipientRole, category } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause. recipientRole filter lets a carrier-only view skip
    // customer-type notifications for users who hold both roles.
    const where = {
      userId,
      ...(status === 'unread' && { readAt: null }),
      ...(recipientRole && { recipientRole }),
      ...(category && { category }),
    };

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, readAt: null, ...(recipientRole && { recipientRole }) },
      }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Lightweight unread-count endpoint. Used by the header bell badge so every
 * nav tick doesn't pull the full list.
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const { recipientRole } = req.query;
    const count = await prisma.notification.count({
      where: {
        userId,
        readAt: null,
        ...(recipientRole && { recipientRole }),
      },
    });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread-count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * Get single notification by ID
 * GET /api/customer/notifications/:id
 */
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      notification,
    });

  } catch (error) {
    console.error('❌ Get notification by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

/**
 * Mark notification as read
 * PUT /api/customer/notifications/:id/read
 * PATCH /api/customer/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Only update if not already read
    if (!notification.readAt) {
      const updated = await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });

      console.log(`✅ [NOTIFICATIONS] Marked as read: ${id}`);

      return res.json({
        success: true,
        message: 'Notification marked as read',
        notification: updated,
      });
    }

    res.json({
      success: true,
      message: 'Notification already read',
      notification,
    });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/customer/notifications/read-all
 * PATCH /api/customer/notifications/mark-all-read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await prisma.notification.updateMany({
      where: { 
        userId, 
        readAt: null 
      },
      data: { readAt: new Date() },
    });

    console.log(`✅ [NOTIFICATIONS] Marked ${result.count} as read for user ${userId}`);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.count,
    });

  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Delete notification
 * DELETE /api/customer/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    console.log(`🗑️ [NOTIFICATIONS] Deleted: ${id}`);

    res.json({ success: true, message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * Delete all read notifications
 * DELETE /api/customer/notifications/clear-read
 */
const clearReadNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        readAt: { not: null },
      },
    });

    console.log(`🗑️ [NOTIFICATIONS] Cleared ${result.count} read notifications for user ${userId}`);

    res.json({
      success: true,
      message: 'Read notifications cleared',
      count: result.count,
    });

  } catch (error) {
    console.error('❌ Clear read notifications error:', error);
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
};

// ============================================================
// HELPER: Create notification (used by other controllers)
// ============================================================
// Dedup window — if an identical (userId, type, orderId, channel) notification
// was created within this many minutes, we skip the new write. Prevents double
// notifications when a status transition handler retries, when two code paths
// both dispatch the same event, etc. Short enough that legitimate repeats
// (e.g. a cancel → re-book → cancel cycle) still go through.
const DEDUP_WINDOW_MINUTES = 30;

const createNotification = async ({
  userId,
  orderId,
  type,
  title,
  message,
  category = 'dispatch',
  meta = {},
  channel = 'in_app',
  recipientRole = null,
}) => {
  if (!userId || !type || !title || !message) {
    console.warn('[notify] missing required field — refused', { userId: !!userId, type, title: !!title, message: !!message });
    return null;
  }

  try {
    // Dedup: suppress identical notifications fired in quick succession.
    const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        orderId: orderId || null,
        channel,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      console.log(`[notify] dedup skip ${type} → userId=${userId} order=${orderId || '—'} (recent match at ${existing.createdAt.toISOString()})`);
      return existing;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        orderId,
        type,
        title,
        message,
        category,
        meta,
        channel,
        recipientRole,
      },
    });

    console.log(`[notify] ${type} → userId=${userId} order=${orderId || '—'} channel=${channel} role=${recipientRole || '—'}`);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  createNotification,
};