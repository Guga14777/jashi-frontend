/**
 * Seed script for Carrier Payouts
 * Creates test payout data for development/testing
 * 
 * =============================================
 * HOW TO USE:
 * =============================================
 * 1. Make sure you've run the migration first:
 *    npx prisma migrate deploy
 * 
 * 2. Then run this script:
 *    node scripts/seed-carrier-payouts.mjs
 * 
 * This will create sample payout records so the
 * Carrier Portal Payouts page shows real data.
 * =============================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique reference number
 */
function generateReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${code}`;
}

/**
 * Generate random date within range
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Get method label from type
 */
function getMethodLabel(methodType) {
  const labels = {
    ach: 'ACH Transfer',
    wire: 'Wire Transfer',
    check: 'Paper Check'
  };
  return labels[methodType] || 'Bank Transfer';
}

async function seedCarrierPayouts() {
  console.log('🌱 Seeding carrier payouts...\n');

  try {
    // Find carriers (users with CARRIER role)
    const carriers = await prisma.user.findMany({
      where: {
        roles: { contains: 'CARRIER' }
      },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    if (carriers.length === 0) {
      console.log('⚠️ No carriers found. Please create a carrier user first.');
      console.log('   You can register a user and update their roles to include "CARRIER"');
      console.log('   Or run: UPDATE "User" SET roles = \'CARRIER\' WHERE email = \'your-email@example.com\';');
      return;
    }

    console.log(`Found ${carriers.length} carrier(s):\n`);
    carriers.forEach(c => console.log(`  - ${c.email} (${c.firstName} ${c.lastName})`));
    console.log('');

    // Find bookings that can be linked to payouts
    const deliveredBookings = await prisma.booking.findMany({
      where: { status: 'delivered' },
      select: { id: true, ref: true, orderNumber: true, carrierId: true, price: true }
    });

    console.log(`Found ${deliveredBookings.length} delivered booking(s)\n`);

    // Generate payouts for each carrier
    const payoutData = [];
    const statuses = ['pending', 'paid', 'paid', 'paid']; // Weighted towards paid
    const methods = ['ach', 'ach', 'ach', 'wire', 'check']; // Weighted towards ACH

    for (const carrier of carriers) {
      const payoutCount = Math.floor(Math.random() * 20) + 5; // 5-25 payouts per carrier
      console.log(`Creating ${payoutCount} payouts for carrier: ${carrier.email}`);

      // Get bookings for this carrier
      const carrierBookings = deliveredBookings.filter(b => b.carrierId === carrier.id);

      for (let i = 0; i < payoutCount; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const methodType = methods[Math.floor(Math.random() * methods.length)];
        const amount = Math.round((Math.random() * 4500 + 500) * 100) / 100; // $500 - $5000
        
        // Random date in last 90 days
        const createdAt = randomDate(
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          new Date()
        );
        
        // Link to a booking if available
        const booking = carrierBookings.length > 0 && Math.random() > 0.3
          ? carrierBookings[Math.floor(Math.random() * carrierBookings.length)]
          : null;

        payoutData.push({
          carrierId: carrier.id,
          bookingId: booking?.id || null,
          type: 'PAYOUT',
          amount: booking ? booking.price * 0.85 : amount, // 85% of load price or random
          currency: 'USD',
          status,
          methodType,
          methodLabel: getMethodLabel(methodType),
          reference: generateReference(),
          description: booking 
            ? `Payout for load ${booking.ref}`
            : `Weekly payout`,
          paidAt: status === 'paid' ? new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) : null,
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    // Clear existing payouts (optional - comment out if you want to keep existing)
    console.log('\n🗑️ Clearing existing payouts...');
    await prisma.carrierPayout.deleteMany({});

    // Insert payouts
    console.log(`\n💾 Inserting ${payoutData.length} payouts...`);
    
    for (const payout of payoutData) {
      await prisma.carrierPayout.create({ data: payout });
    }

    // Summary
    const totalPayouts = await prisma.carrierPayout.count();
    const paidPayouts = await prisma.carrierPayout.count({ where: { status: 'paid' } });
    const pendingPayouts = await prisma.carrierPayout.count({ where: { status: 'pending' } });

    console.log('\n✅ Seeding complete!\n');
    console.log('Summary:');
    console.log(`  Total payouts: ${totalPayouts}`);
    console.log(`  Paid: ${paidPayouts}`);
    console.log(`  Pending: ${pendingPayouts}`);
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedCarrierPayouts()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
