import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const bookings = await prisma.booking.findMany({
    orderBy: { orderNumber: 'desc' },
    take: 5,
    select: { orderNumber: true, status: true, quoteId: true }
  });

  console.log('BOOKING STATUSES:');
  for (const b of bookings) {
    console.log('  Booking #' + b.orderNumber + ' -> status: ' + b.status);
  }

  const quotes = await prisma.quote.findMany({
    orderBy: { orderNumber: 'desc' },
    take: 5,
    select: { orderNumber: true, status: true }
  });

  console.log('\nQUOTE STATUSES:');
  for (const q of quotes) {
    console.log('  Quote #' + q.orderNumber + ' -> status: ' + q.status);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
