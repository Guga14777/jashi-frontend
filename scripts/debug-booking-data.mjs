// ============================================================
// FILE: scripts/debug-booking-fields.mjs
// Debug script to check what data is actually stored in bookings
// Run with: node scripts/debug-booking-fields.mjs <bookingId>
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bookingId = process.argv[2];
  
  if (!bookingId) {
    // Get last 5 bookings
    const bookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        fromCity: true,
        toCity: true,
        pickup: true,
        dropoff: true,
        vehicleDetails: true,
        vehicle: true,
        vehicleType: true,
        pickupOriginType: true,
        dropoffDestinationType: true,
        miles: true,
        price: true,
        status: true,
        createdAt: true,
      },
    });
    
    console.log('\n📦 Last 5 bookings:\n');
    
    for (const b of bookings) {
      console.log('─'.repeat(60));
      console.log(`🆔 ID: ${b.id}`);
      console.log(`📋 Order #: ${b.orderNumber}`);
      console.log(`📍 Status: ${b.status}`);
      console.log(`📍 fromCity: "${b.fromCity}" | toCity: "${b.toCity}"`);
      console.log(`📍 pickupOriginType: "${b.pickupOriginType}"`);
      console.log(`📍 dropoffDestinationType: "${b.dropoffDestinationType}"`);
      console.log(`🚗 vehicle: "${b.vehicle}" | type: "${b.vehicleType}"`);
      console.log(`📏 miles: ${b.miles} | price: $${b.price}`);
      
      // Parse pickup JSON
      const pickup = typeof b.pickup === 'string' ? JSON.parse(b.pickup) : b.pickup;
      console.log(`\n📥 PICKUP (JSON):`);
      console.log(`   address: "${pickup?.address || pickup?.address1 || '—'}"`);
      console.log(`   city: "${pickup?.city || '—'}"`);
      console.log(`   state: "${pickup?.state || '—'}"`);
      console.log(`   zip: "${pickup?.zip || '—'}"`);
      console.log(`   locationType: "${pickup?.locationType || '—'}"`);
      
      // Parse dropoff JSON
      const dropoff = typeof b.dropoff === 'string' ? JSON.parse(b.dropoff) : b.dropoff;
      console.log(`\n📤 DROPOFF (JSON):`);
      console.log(`   address: "${dropoff?.address || dropoff?.address1 || '—'}"`);
      console.log(`   city: "${dropoff?.city || '—'}"`);
      console.log(`   state: "${dropoff?.state || '—'}"`);
      console.log(`   zip: "${dropoff?.zip || '—'}"`);
      console.log(`   locationType: "${dropoff?.locationType || '—'}"`);
      
      // Parse vehicleDetails JSON
      const vd = typeof b.vehicleDetails === 'string' ? JSON.parse(b.vehicleDetails) : b.vehicleDetails;
      console.log(`\n🚗 VEHICLE DETAILS (JSON):`);
      console.log(`   year: "${vd?.year || '—'}"`);
      console.log(`   make: "${vd?.make || '—'}"`);
      console.log(`   model: "${vd?.model || '—'}"`);
      console.log(`   type: "${vd?.type || '—'}"`);
      console.log(`   operable: "${vd?.operable || '—'}"`);
      console.log(`   vin: "${vd?.vin || '—'}"`);
      console.log(`   vehiclesCount: ${vd?.vehiclesCount || 1}`);
      
      if (vd?.vehicles && Array.isArray(vd.vehicles)) {
        console.log(`\n   vehicles array (${vd.vehicles.length} items):`);
        vd.vehicles.forEach((v, i) => {
          const vehicleInfo = v.vehicle || v;
          console.log(`   [${i}] ${vehicleInfo.year || '—'} ${vehicleInfo.make || '—'} ${vehicleInfo.model || '—'}`);
          console.log(`       pickup: ${JSON.stringify(v.pickup || {})}`);
          console.log(`       dropoff: ${JSON.stringify(v.dropoff || {})}`);
        });
      }
      
      console.log('\n');
    }
    
  } else {
    // Get specific booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pickupGatePass: true,
        dropoffGatePass: true,
        documents: true,
        quoteRelation: true,
      },
    });
    
    if (!booking) {
      console.log(`❌ Booking ${bookingId} not found`);
      return;
    }
    
    console.log('\n📦 Full booking data:\n');
    console.log(JSON.stringify(booking, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
