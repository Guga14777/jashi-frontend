import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('Checking links...\n');
  
  const quotes = await prisma.quote.findMany({
    orderBy: { orderNumber: 'desc' },
    take: 5,
    include: {
      bookings: {
        select: { id: true, orderNumber: true },
        take: 1,
      }
    }
  });

  console.log('QUOTES:');
  for (const q of quotes) {
    const b = q.bookings[0];
    console.log('  Quote #' + q.orderNumber + ' -> Booking: ' + (b ? '#' + b.orderNumber : 'NONE'));
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { orderNumber: 'desc' },
    take: 5,
    select: { orderNumber: true, quoteId: true }
  });

  console.log('\nBOOKINGS:');
  for (const b of bookings) {
    console.log('  Booking #' + b.orderNumber + ' -> quoteId: ' + (b.quoteId || 'NULL'));
  }

  await prisma.$disconnect();
}

check().catch(console.error);
