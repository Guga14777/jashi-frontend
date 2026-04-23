// ============================================================
// FILE: scripts/debug-carrier-notification.mjs
// Run: node scripts/debug-carrier-notification.mjs
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
  console.log('\n🔍 DEBUGGING CARRIER ASSIGNED NOTIFICATIONS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Get latest carrier_assigned notification
  const notification = await prisma.notification.findFirst({
    where: { type: 'carrier_assigned' },
    orderBy: { createdAt: 'desc' },
  });

  if (!notification) {
    console.log('❌ No carrier_assigned notifications found!\n');
  } else {
    console.log('📬 LATEST CARRIER_ASSIGNED NOTIFICATION:');
    console.log('─────────────────────────────────────────');
    console.log('ID:', notification.id);
    console.log('Order ID:', notification.orderId);
    console.log('Created:', notification.createdAt);
    console.log('\n📦 META FIELD (raw):');
    console.log(JSON.stringify(notification.meta, null, 2));
    
    // Check if meta has carrier data
    const meta = notification.meta || {};
    console.log('\n🚚 CARRIER DATA IN META:');
    console.log('─────────────────────────────────────────');
    if (meta.carrier) {
      console.log('  companyName:', meta.carrier.companyName || '❌ MISSING');
      console.log('  firstName:', meta.carrier.firstName || '❌ MISSING');
      console.log('  lastName:', meta.carrier.lastName || '❌ MISSING');
      console.log('  phone:', meta.carrier.phone || '❌ MISSING');
      console.log('  email:', meta.carrier.email || '❌ MISSING');
      console.log('  mcNumber:', meta.carrier.mcNumber || '❌ MISSING');
      console.log('  dotNumber:', meta.carrier.dotNumber || '❌ MISSING');
    } else {
      console.log('  ❌ NO CARRIER OBJECT IN META!');
    }
  }

  // 2. Get latest assigned booking and its carrier
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📋 LATEST ASSIGNED BOOKING:\n');

  const booking = await prisma.booking.findFirst({
    where: { 
      status: 'assigned',
      carrierId: { not: null }
    },
    orderBy: { assignedAt: 'desc' },
  });

  if (!booking) {
    console.log('❌ No assigned bookings found!\n');
  } else {
    console.log('Booking ID:', booking.id);
    console.log('Order Number:', booking.orderNumber);
    console.log('Ref:', booking.ref);
    console.log('Carrier ID:', booking.carrierId);
    console.log('Status:', booking.status);
    console.log('Assigned At:', booking.assignedAt);

    // 3. Get the carrier user
    if (booking.carrierId) {
      console.log('\n\n═══════════════════════════════════════════════════════');
      console.log('🚚 CARRIER USER DATA:\n');

      const carrier = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          companyName: true,
          mcNumber: true,
          dotNumber: true,
          roles: true,
        }
      });

      if (!carrier) {
        console.log('❌ Carrier user not found!');
      } else {
        console.log('ID:', carrier.id);
        console.log('Email:', carrier.email);
        console.log('First Name:', carrier.firstName || '❌ MISSING');
        console.log('Last Name:', carrier.lastName || '❌ MISSING');
        console.log('Phone:', carrier.phone || '❌ MISSING');
        console.log('Company Name:', carrier.companyName || '❌ MISSING');
        console.log('MC Number:', carrier.mcNumber || '❌ MISSING');
        console.log('DOT Number:', carrier.dotNumber || '❌ MISSING');
        console.log('Roles:', carrier.roles);

        // Check what's missing
        console.log('\n⚠️ MISSING FIELDS CHECK:');
        const missing = [];
        if (!carrier.companyName) missing.push('companyName');
        if (!carrier.firstName) missing.push('firstName');
        if (!carrier.lastName) missing.push('lastName');
        if (!carrier.phone) missing.push('phone');
        if (!carrier.mcNumber) missing.push('mcNumber');
        if (!carrier.dotNumber) missing.push('dotNumber');

        if (missing.length > 0) {
          console.log('❌ Missing fields:', missing.join(', '));
          console.log('\n💡 The carrier needs to fill in their profile!');
        } else {
          console.log('✅ All carrier fields are populated');
        }
      }
    }
  }

  // 4. List all carrier users
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('👥 ALL CARRIER USERS:\n');

  const carriers = await prisma.user.findMany({
    where: {
      roles: { contains: 'CARRIER' }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      companyName: true,
      mcNumber: true,
      dotNumber: true,
    }
  });

  if (carriers.length === 0) {
    console.log('❌ No carrier users found!');
  } else {
    carriers.forEach((c, i) => {
      console.log(`\nCarrier ${i + 1}:`);
      console.log('  ID:', c.id);
      console.log('  Email:', c.email);
      console.log('  Name:', `${c.firstName || '?'} ${c.lastName || '?'}`);
      console.log('  Phone:', c.phone || '❌ MISSING');
      console.log('  Company:', c.companyName || '❌ MISSING');
      console.log('  MC#:', c.mcNumber || '❌ MISSING');
      console.log('  DOT#:', c.dotNumber || '❌ MISSING');
    });
  }

  await prisma.$disconnect();
  console.log('\n═══════════════════════════════════════════════════════\n');
}

debug().catch(console.error);
