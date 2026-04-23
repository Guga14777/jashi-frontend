// scripts/verify-notifications.mjs
// Exercises the notification service end-to-end and asserts every invariant
// the user requested:
//   • every notification has type + title + message + recipientRole + orderId
//   • no raw system text leaks into title/message
//   • dedup suppresses identical events fired twice
//   • customer + carrier both get the right notifications on cancel/accept
//   • click-to-navigate payload is unambiguous (orderId non-null)
//
// Run with: node scripts/verify-notifications.mjs

import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const prisma = require('../server/db.cjs');
const notify = require('../server/services/notifications.service.cjs');

let pass = 0;
let fail = 0;
const record = (name, ok, detail = '') => {
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

const line = (label) => console.log(`\n━━━ ${label} ${'━'.repeat(Math.max(0, 64 - label.length))}`);

const looksRaw = (s) => !s || /^[a-z_]+$/.test(s) || s.length < 4;

try {
  // Find two test users so we can exercise both sides.
  const users = await prisma.user.findMany({
    where: { bookings: { some: {} } },
    select: { id: true, email: true, roles: true },
    take: 2,
  });
  if (users.length < 1) {
    console.log('No users with bookings — aborting.');
    process.exit(0);
  }
  const customer = users[0];
  // Pretend second user is the carrier. If only one user exists, reuse — the
  // dedup test will still work because recipientRole differs.
  const carrier = users[1] || users[0];

  console.log(`Customer: ${customer.email}`);
  console.log(`Carrier:  ${carrier.email}`);

  // Clean up any stray test rows from previous runs.
  await prisma.notification.deleteMany({ where: { orderId: 'TEST-9001' } });

  const testBooking = {
    id: 'test-booking-9001',
    orderNumber: 9001,
    userId: customer.id,
    carrierId: carrier.id,
    status: 'scheduled',
  };

  // ---------------- Event fan-out ----------------
  line('Fire every service event');
  await notify.orderCreated(testBooking);
  await notify.carrierAssigned(testBooking);
  await notify.carrierAcceptAck(testBooking);
  await notify.statusChanged(testBooking, 'on_the_way_to_pickup');
  await notify.statusChanged(testBooking, 'arrived_at_pickup');
  await notify.statusChanged(testBooking, 'picked_up');
  await notify.statusChanged(testBooking, 'delivered');
  await notify.orderCancelledByCustomer(testBooking);
  await notify.orderDroppedByCarrier(testBooking);
  await notify.orderEditedByCustomer(testBooking, ['pickupDate', 'customerPhone']);
  await notify.detentionFeeApplied(testBooking, 50, 72);
  await notify.pickupIssueReported(testBooking, 'no_gate_pass', 'No Gate Pass Available');
  await notify.orderCancelledDirect(testBooking);

  // Gather rows written.
  const rows = await prisma.notification.findMany({
    where: { orderId: 'TEST-9001' },
    orderBy: { createdAt: 'asc' },
  });
  // Some of the helpers map to orderId based on orderNumber rather than id;
  // pick up both.
  const allRows = await prisma.notification.findMany({
    where: {
      OR: [
        { orderId: '9001' },
        { orderId: 'TEST-9001' },
        { meta: { path: ['bookingId'], equals: 'test-booking-9001' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Notifications written: ${allRows.length}`);
  allRows.forEach((n) => {
    console.log(`  [${String(n.type).padEnd(22)}] role=${String(n.recipientRole).padEnd(8)} order=${n.orderId || '—'} title="${n.title}"`);
  });

  // ---------------- Required-fields invariants ----------------
  line('Required fields on every notification');
  for (const n of allRows) {
    record(`type present (${n.id})`, !!n.type);
    record(`title non-raw (${n.id})`, !!n.title && !looksRaw(n.title), `title="${n.title}"`);
    record(`message non-raw (${n.id})`, !!n.message && !looksRaw(n.message), `len=${(n.message || '').length}`);
    record(`recipientRole set (${n.id})`, !!n.recipientRole, `role=${n.recipientRole}`);
    record(`orderId set (${n.id})`, !!n.orderId, `orderId=${n.orderId}`);
  }

  // ---------------- Recipient splits ----------------
  line('Recipient fan-out correctness');
  const byRole = { customer: [], carrier: [], admin: [] };
  for (const n of allRows) {
    if (byRole[n.recipientRole]) byRole[n.recipientRole].push(n);
  }
  record('customer received orderCreated',  byRole.customer.some(n => n.type === 'order_created'));
  record('customer received carrierAssigned', byRole.customer.some(n => n.type === 'order_accepted'));
  record('carrier  received carrierAcceptAck', byRole.carrier.some(n => n.type === 'order_accept_ack'));
  record('customer received statusDelivered', byRole.customer.some(n => n.type === 'status_delivered'));
  record('customer received cancellation ack', byRole.customer.some(n => n.type === 'order_cancelled'));
  record('carrier  received customer-cancel notice', byRole.carrier.some(n => n.type === 'order_cust_cancel'));
  record('carrier  received customer-edit notice', byRole.carrier.some(n => n.type === 'order_customer_edit'));

  // ---------------- Dedup ----------------
  line('Dedup: identical event fired twice should not produce two rows');
  const before = await prisma.notification.count({ where: { userId: customer.id, type: 'order_created', orderId: '9001' } });
  await notify.orderCreated(testBooking); // same event again
  await notify.orderCreated(testBooking); // and again
  const after = await prisma.notification.count({ where: { userId: customer.id, type: 'order_created', orderId: '9001' } });
  record(
    'second+third identical call did not create new rows',
    before === after,
    `before=${before} after=${after}`
  );

  // ---------------- Navigation payload ----------------
  line('Click-to-navigate payload');
  const missingOrderId = allRows.filter((n) => !n.orderId);
  record(
    'every notification carries orderId (no undefined click target)',
    missingOrderId.length === 0,
    `${missingOrderId.length} rows without orderId`
  );

  // ---------------- Channel ----------------
  line('Channel column default');
  const channels = new Set(allRows.map((n) => n.channel));
  record('every notification has channel=in_app (future-proof column)', channels.size === 1 && channels.has('in_app'));

  // ---------------- Cleanup ----------------
  line('Cleanup test rows');
  const del = await prisma.notification.deleteMany({
    where: {
      OR: [
        { orderId: '9001' },
        { orderId: 'TEST-9001' },
        { meta: { path: ['bookingId'], equals: 'test-booking-9001' } },
      ],
    },
  });
  console.log(`  removed ${del.count} test notifications`);
} catch (err) {
  console.error('\n🔥 Verification crashed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  line('SUMMARY');
  console.log(`  ${pass} passed · ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}
