/**
 * Cleanup Script: Delete All Seed Orders
 * Removes orders created by the seed script
 * Run with: node cleanup-seed-orders.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'gjashi10@gmail.com';

async function cleanupSeedOrders() {
  try {
    console.log('🧹 Starting cleanup...\n');
    console.log(`👤 Looking for user: ${USER_EMAIL}`);
    
    const user = await prisma.user.findUnique({ 
      where: { email: USER_EMAIL } 
    });
    
    if (!user) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}\n`);
    
    // Find all quotes created by seed script
    console.log('🔍 Finding seed orders...');
    const seedQuotes = await prisma.quote.findMany({
      where: {
        userId: user.id,
        source: 'seed'
      },
      select: {
        id: true,
        orderNumber: true,
        vehicle: true
      }
    });
    
    console.log(`📦 Found ${seedQuotes.length} seed quotes\n`);
    
    if (seedQuotes.length === 0) {
      console.log('✅ No seed orders to delete!');
      return;
    }
    
    // Show what will be deleted
    console.log('📋 Seed orders to delete:');
    seedQuotes.forEach((quote, i) => {
      console.log(`   ${i + 1}. Order #${quote.orderNumber} - ${quote.vehicle}`);
    });
    
    console.log('\n⚠️  Starting deletion...\n');
    
    // Delete bookings associated with seed quotes
    const quoteIds = seedQuotes.map(q => q.id);
    
    console.log('🗑️  Deleting bookings...');
    const deletedBookings = await prisma.booking.deleteMany({
      where: {
        quoteId: { in: quoteIds }
      }
    });
    console.log(`   ✅ Deleted ${deletedBookings.count} bookings`);
    
    // Delete notifications for seed orders
    console.log('🗑️  Deleting notifications...');
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        meta: {
          path: ['quoteId'],
          array_contains: quoteIds
        }
      }
    });
    console.log(`   ✅ Deleted ${deletedNotifications.count} notifications`);
    
    // Delete the seed quotes
    console.log('🗑️  Deleting quotes...');
    const deletedQuotes = await prisma.quote.deleteMany({
      where: {
        id: { in: quoteIds }
      }
    });
    console.log(`   ✅ Deleted ${deletedQuotes.count} quotes`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CLEANUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🗑️  Deleted ${deletedBookings.count} bookings`);
    console.log(`🗑️  Deleted ${deletedQuotes.count} quotes`);
    console.log(`🗑️  Deleted ${deletedNotifications.count} notifications`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSeedOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
