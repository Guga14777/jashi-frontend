// server/services/admin/admin.automation.service.cjs
//
// In-process scheduled job that scans open bookings for stuck/delayed/pricing
// conditions and persists admin-visible notifications when new flags appear.
//
// Opt-in via env: ADMIN_AUTOMATION_ENABLED=true.
//
// Swap setInterval for node-cron later if you need cron-expression scheduling.
// For fixed intervals the interval approach is just as correct with zero deps.

const prisma = require('../../db.cjs');
const { computeAlertsForBooking } = require('./admin.alerts.service.cjs');
const { resolvePaymentBucket } = require('./admin.payment.service.cjs');
const { SHIPMENT_STATUS, normalizeStatus } = require('../booking/index.cjs');

// Tick every 5 minutes by default. The first tick also runs ~30s after boot
// so admins see fresh signal right after a restart.
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const FIRST_TICK_DELAY_MS = 30 * 1000;

// We deduplicate notifications per (bookingId, alertKind) so an order that's
// been stuck for 3 days doesn't spam 36 "stuck_assigned" rows.
async function hasRecentNotification(bookingId, kind, sinceMinutes = 60) {
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
  // Narrow by indexed columns first (type + createdAt + orderId). The
  // Notification.orderId column happens to mirror the booking id on our
  // notifications, so we can use it as a cheap pre-filter. Then dedupe by
  // kind in memory — JSON-path equality checks for two keys at once aren't
  // portable across Prisma versions.
  const candidates = await prisma.notification.findMany({
    where: {
      type: 'admin_alert',
      createdAt: { gte: since },
      orderId: bookingId,
    },
    select: { id: true, meta: true },
    take: 10,
  });
  return candidates.some((c) => c.meta && c.meta.kind === kind);
}

async function runOnce(options = {}) {
  const verbose = options.verbose ?? false;
  const log = (...args) => verbose && console.log('[admin-automation]', ...args);

  // Only consider open bookings — delivered and cancelled can't become alerts.
  const openStatuses = [
    SHIPMENT_STATUS.SCHEDULED,
    SHIPMENT_STATUS.ASSIGNED,
    SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    SHIPMENT_STATUS.PICKED_UP,
  ];

  const bookings = await prisma.booking.findMany({
    where: { status: { in: openStatuses } },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        select: { status: true, amount: true },
      },
    },
  });

  log(`scanning ${bookings.length} open bookings`);

  let newlyFlagged = 0;
  const adminUserIds = await findAdminUserIds();

  for (const b of bookings) {
    const paymentBucket = resolvePaymentBucket(b, b.payments || []);
    const alerts = computeAlertsForBooking(b, paymentBucket.bucket);
    if (!alerts.length || !adminUserIds.length) continue;

    for (const a of alerts) {
      // Skip if we already pinged admin about this flag in the last hour.
      const isRecent = await hasRecentNotification(b.id, a.kind, 60);
      if (isRecent) continue;

      // Create one notification per admin. Notifications is the existing
      // delivery surface for admin UI; no extra model needed.
      await prisma.notification.createMany({
        data: adminUserIds.map((uid) => ({
          userId: uid,
          orderId: b.id,                 // indexed — powers dedup lookups
          type: 'admin_alert',
          category: 'admin_alert',       // separate from carrier/customer dispatch
          recipientRole: 'admin',
          title: `${a.label} — order #${b.orderNumber}`,
          message: a.detail,
          meta: {
            bookingId: b.id,
            orderNumber: b.orderNumber,
            kind: a.kind,
            severity: a.severity,
          },
        })),
      }).catch((err) => log('notification insert failed:', err.message));

      newlyFlagged += 1;
    }
  }

  log(`ticked, ${newlyFlagged} new alert notifications created`);
  return { scanned: bookings.length, newlyFlagged };
}

async function findAdminUserIds() {
  // ADMIN | ADMIN_SUPER | ADMIN_OPS (support is read-only, not an escalation target).
  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { roles: { contains: 'ADMIN_SUPER' } },
        { roles: { contains: 'ADMIN_OPS' } },
        { roles: { contains: 'ADMIN' } },
      ],
    },
    select: { id: true, roles: true },
  });
  // Filter out accidental substring matches (ADMIN_SUPPORT shouldn't be paged).
  return admins
    .filter((u) => {
      const r = String(u.roles || '').toUpperCase();
      return r.includes('ADMIN_SUPER') || r.includes('ADMIN_OPS') || (r.includes('ADMIN') && !r.includes('ADMIN_SUPPORT'));
    })
    .map((u) => u.id);
}

let timerHandle = null;

function start({ intervalMs = DEFAULT_INTERVAL_MS, verbose = true } = {}) {
  if (timerHandle) return false;
  console.log(`[admin-automation] starting — first tick in ${Math.round(FIRST_TICK_DELAY_MS / 1000)}s, then every ${Math.round(intervalMs / 1000)}s`);
  const kick = () => runOnce({ verbose }).catch((err) => console.error('[admin-automation] tick failed:', err.message));
  setTimeout(() => {
    kick();
    timerHandle = setInterval(kick, intervalMs);
  }, FIRST_TICK_DELAY_MS);
  return true;
}

function stop() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

module.exports = { start, stop, runOnce, findAdminUserIds };
