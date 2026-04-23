// ============================================================
// FILE: scripts/debug-notification.mjs
// Run: node scripts/debug-notification.mjs
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugNotifications() {
  console.log('🔍 Debugging carrier_assigned notifications...\n');

  // Get all carrier_assigned notifications
  const notifications = await prisma.notification.findMany({
    where: {
      type: 'carrier_assigned',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  if (notifications.length === 0) {
    console.log('❌ No carrier_assigned notifications found');
    return;
  }

  console.log(`Found ${notifications.length} carrier_assigned notifications:\n`);

  for (const notif of notifications) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`ID: ${notif.id}`);
    console.log(`Order ID: ${notif.orderId}`);
    console.log(`Title: ${notif.title}`);
    console.log(`Message: ${notif.message}`);
    console.log(`Created: ${notif.createdAt}`);
    console.log('\n📦 META:');
    console.log(JSON.stringify(notif.meta, null, 2));
    console.log('');
  }

  // Also check what carrier data looks like
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚚 Checking carrier users...\n');

  const carriers = await prisma.user.findMany({
    where: {
      role: 'carrier',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phone: true,
      mcNumber: true,
      dotNumber: true,
    },
    take: 3,
  });

  if (carriers.length === 0) {
    console.log('❌ No carrier users found');
  } else {
    console.log(`Found ${carriers.length} carrier users:`);
    for (const carrier of carriers) {
      console.log(JSON.stringify(carrier, null, 2));
    }
  }

  // Check a recent assigned booking
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 Checking assigned bookings...\n');

  const assignedBookings = await prisma.booking.findMany({
    where: {
      status: 'assigned',
      carrierId: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      ref: true,
      carrierId: true,
      status: true,
      fromCity: true,
      toCity: true,
      vehicle: true,
      price: true,
    },
    orderBy: {
      assignedAt: 'desc',
    },
    take: 3,
  });

  if (assignedBookings.length === 0) {
    console.log('❌ No assigned bookings found');
  } else {
    console.log(`Found ${assignedBookings.length} assigned bookings:`);
    for (const booking of assignedBookings) {
      console.log(JSON.stringify(booking, null, 2));
    }
  }

  await prisma.$disconnect();
}

debugNotifications().catch(console.error);
