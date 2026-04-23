// ============================================================
// FILE: scripts/backfill-time-windows.mjs
// Run with: node scripts/backfill-time-windows.mjs
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillTimeWindows() {
  console.log('');
  console.log('========================================');
  console.log('🔄 Starting time window backfill...');
  console.log('========================================');
  console.log('');

  try {
    const allBookings = await prisma.booking.findMany({
      select: {
        id: true,
        ref: true,
        orderNumber: true,
        scheduling: true,
        pickupWindowStart: true,
        pickupWindowEnd: true,
        dropoffWindowStart: true,
        dropoffWindowEnd: true,
      },
    });

    console.log(`📦 Total bookings in database: ${allBookings.length}`);
    console.log('');

    if (allBookings.length === 0) {
      console.log('❌ No bookings found in database!');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let alreadyHasData = 0;

    for (const booking of allBookings) {
      const bookingRef = booking.orderNumber || booking.ref || booking.id;
      
      console.log(`----------------------------------------`);
      console.log(`📋 Booking #${bookingRef}`);
      
      // Check if already has data
      if (booking.pickupWindowStart || booking.pickupWindowEnd || 
          booking.dropoffWindowStart || booking.dropoffWindowEnd) {
        console.log(`   ✅ Already has time window data`);
        alreadyHasData++;
        continue;
      }

      const scheduling = booking.scheduling || {};
      
      // ⭐ FIXED: Check ALL possible field names including pickupTimeStart/pickupTimeEnd
      const pickupWindowStart = scheduling.pickupTimeStart ||    // Found in your data!
                                scheduling.pickupCustomFrom || 
                                scheduling.pickupWindowStart || 
                                null;
      const pickupWindowEnd = scheduling.pickupTimeEnd ||        // Found in your data!
                              scheduling.pickupCustomTo || 
                              scheduling.pickupWindowEnd || 
                              null;
      const dropoffWindowStart = scheduling.dropoffTimeStart ||  // Found in your data!
                                 scheduling.dropoffCustomFrom || 
                                 scheduling.dropoffWindowStart || 
                                 null;
      const dropoffWindowEnd = scheduling.dropoffTimeEnd ||      // Found in your data!
                               scheduling.dropoffCustomTo || 
                               scheduling.dropoffWindowEnd || 
                               null;

      console.log(`   Found in scheduling JSON:`);
      console.log(`     pickupTimeStart: ${scheduling.pickupTimeStart || '(empty)'}`);
      console.log(`     pickupTimeEnd: ${scheduling.pickupTimeEnd || '(empty)'}`);
      console.log(`     dropoffTimeStart: ${scheduling.dropoffTimeStart || '(empty)'}`);
      console.log(`     dropoffTimeEnd: ${scheduling.dropoffTimeEnd || '(empty)'}`);

      const hasSchedulingData = pickupWindowStart || 
                                pickupWindowEnd || 
                                dropoffWindowStart || 
                                dropoffWindowEnd;

      if (!hasSchedulingData) {
        console.log(`   ⚠️  No time window data found - skipping`);
        skipped++;
        continue;
      }

      // Update the booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          pickupWindowStart: pickupWindowStart,
          pickupWindowEnd: pickupWindowEnd,
          dropoffWindowStart: dropoffWindowStart,
          dropoffWindowEnd: dropoffWindowEnd,
        },
      });

      console.log(`   ✅ UPDATED:`);
      console.log(`     pickupWindowStart: ${pickupWindowStart}`);
      console.log(`     pickupWindowEnd: ${pickupWindowEnd}`);
      console.log(`     dropoffWindowStart: ${dropoffWindowStart}`);
      console.log(`     dropoffWindowEnd: ${dropoffWindowEnd}`);
      updated++;
    }

    console.log('');
    console.log('========================================');
    console.log('✅ Backfill complete!');
    console.log('========================================');
    console.log(`   Total bookings: ${allBookings.length}`);
    console.log(`   Already had data: ${alreadyHasData}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (no data): ${skipped}`);
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillTimeWindows()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
