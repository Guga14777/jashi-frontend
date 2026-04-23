import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('Fixing quote-booking links...\n');
  
  const bookings = await prisma.booking.findMany({
    where: { quoteId: null },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Found ' + bookings.length + ' bookings without quoteId\n');

  for (const booking of bookings) {
    console.log('Booking #' + booking.orderNumber);
    
    const quotes = await prisma.quote.findMany({
      where: {
        userEmail: booking.userEmail,
        createdAt: { lte: new Date(booking.createdAt.getTime() + 60000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const quote of quotes) {
      const diff = Math.abs(quote.offer - booking.price);
      if (diff <= quote.offer * 0.1) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { quoteId: quote.id },
        });
        await prisma.quote.update({
          where: { id: quote.id },
          data: { status: 'booked' },
        });
        console.log('  Linked to Quote #' + quote.orderNumber);
        break;
      }
    }
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

fix().catch(console.error);
