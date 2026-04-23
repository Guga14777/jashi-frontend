/**
 * Seed Script: Add 11 Sample Orders
 * Email: gjashi10@gmail.com
 */

import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const generateRef = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

const USER_EMAIL = 'gjashi10@gmail.com';

const orders = [
  { pickup: { street1: '2000 Dealer Dr', city: 'Newburgh', state: 'NY', zip: '12550' }, dropoff: { street1: '712 Lancaster Rd', city: 'Manheim', state: 'PA', zip: '17545' }, vehicle: '2020 Toyota Corolla', vehicleType: 'sedan', transportType: 'open', miles: 202, price: 380, basePrice: 533.40, marketAvg: 576.07, likelihood: 59.6, pickupDate: '2025-11-19T11:00:00.000Z', dropoffDate: '2025-11-20T10:00:00.000Z', pickupTimeWindow: { start: '11:00 AM', end: '2:00 PM' }, dropoffTimeWindow: { start: '10:00 AM', end: '2:00 PM' }, notes: 'Runs and drives, 1 key, auction release required', customerBehavior: 'Price-conscious' },
  { pickup: { street1: '8400 Eastgate Blvd', city: 'Mt. Juliet', state: 'TN', zip: '37122' }, dropoff: { street1: '8028 Chapman Highway', city: 'Knoxville', state: 'TN', zip: '37920' }, vehicle: '2017 Honda CR-V', vehicleType: 'suv', transportType: 'open', miles: 166, price: 540, basePrice: 474.74, marketAvg: 512.72, likelihood: 95.0, pickupDate: '2025-11-20T09:00:00.000Z', dropoffDate: '2025-11-20T15:00:00.000Z', pickupTimeWindow: { start: '9:00 AM', end: '1:00 PM' }, dropoffTimeWindow: { start: '3:00 PM', end: '6:00 PM' }, notes: 'Runs, light hail damage', customerBehavior: 'Urgent shipping' },
  { pickup: { street1: '2718 S 19th St', city: 'Manitowoc', state: 'WI', zip: '54220' }, dropoff: { street1: '10104 Caseview Dr', city: 'Harrison', state: 'TN', zip: '37341' }, vehicle: '2015 Ford F-150', vehicleType: 'pickup', transportType: 'open', miles: 801, price: 1250, basePrice: 1453.76, marketAvg: 1570.06, likelihood: 73.6, pickupDate: '2025-11-21T13:00:00.000Z', dropoffDate: '2025-11-23T10:00:00.000Z', pickupTimeWindow: { start: '1:00 PM', end: '4:00 PM' }, dropoffTimeWindow: { start: '10:00 AM', end: '2:00 PM' }, notes: 'Runs, long bed, dealer unit', customerBehavior: 'Dealer offering under market' },
  { pickup: { street1: '2040 Airport Road', city: 'Atlanta', state: 'GA', zip: '30341' }, dropoff: { street1: '4900 Buffington Rd', city: 'College Park', state: 'GA', zip: '30349' }, vehicle: '2023 Tesla Model 3', vehicleType: 'sedan', transportType: 'enclosed', miles: 33, price: 300, basePrice: 195.00, marketAvg: 210.60, likelihood: 95.0, pickupDate: '2025-11-19T15:00:00.000Z', dropoffDate: '2025-11-19T18:30:00.000Z', pickupTimeWindow: { start: '3:00 PM', end: '6:00 PM' }, dropoffTimeWindow: { start: '6:30 PM', end: '9:00 PM' }, notes: 'Enclosed preferred, low front bumper', customerBehavior: 'Luxury EV owner' },
  { pickup: { street1: '2705 Asbury Park St', city: 'Chattanooga', state: 'TN', zip: '37404' }, dropoff: { street1: '2626 Lithonia Industrial Blvd', city: 'Lithonia', state: 'GA', zip: '30058' }, vehicle: '2019 Dodge Grand Caravan', vehicleType: 'minivan', transportType: 'open', miles: 135, price: 650, basePrice: 416.15, marketAvg: 449.44, likelihood: 95.0, pickupDate: '2025-11-22T10:00:00.000Z', dropoffDate: '2025-11-23T12:00:00.000Z', pickupTimeWindow: { start: '10:00 AM', end: '1:00 PM' }, dropoffTimeWindow: { start: '12:00 PM', end: '4:00 PM' }, notes: 'Runs, interior dirty, dealer trade', customerBehavior: 'Dealer trying to save' },
  { pickup: { street1: '2604 Main Street', city: 'Cedar Falls', state: 'IA', zip: '50613' }, dropoff: { street1: '1705 20th Ave South', city: 'Escanaba', state: 'MI', zip: '49829' }, vehicle: '2014 Chevrolet Malibu', vehicleType: 'sedan', transportType: 'open', miles: 444, price: 925, basePrice: 944.80, marketAvg: 1020.38, likelihood: 85.1, pickupDate: '2025-11-19T08:00:00.000Z', dropoffDate: '2025-11-20T12:00:00.000Z', pickupTimeWindow: { start: '8:00 AM', end: '12:00 PM' }, dropoffTimeWindow: { start: '12:00 PM', end: '4:00 PM' }, notes: 'Flat tire, rolls, needs winch', customerBehavior: 'Understands extra work' },
  { pickup: { street1: '761 Clark Drive', city: 'Ellenwood', state: 'GA', zip: '30294' }, dropoff: { street1: '3024 Franks Road', city: 'Huntingdon Valley', state: 'PA', zip: '19006' }, vehicle: '2022 Kia Telluride', vehicleType: 'suv', transportType: 'open', miles: 802, price: 1300, basePrice: 1455.02, marketAvg: 1571.42, likelihood: 76.8, pickupDate: '2025-11-20T14:00:00.000Z', dropoffDate: '2025-11-22T11:00:00.000Z', pickupTimeWindow: { start: '2:00 PM', end: '5:00 PM' }, dropoffTimeWindow: { start: '11:00 AM', end: '3:00 PM' }, notes: 'Runs, front-right fender damage', customerBehavior: 'Wants fast dispatch' },
  { pickup: { street1: '399 Old Hickory Boulevard', city: 'Nashville', state: 'TN', zip: '37138' }, dropoff: { street1: '1180 Newtown Pike', city: 'Lexington', state: 'KY', zip: '40511' }, vehicle: '2016 Mercedes-Benz C300', vehicleType: 'sedan', transportType: 'open', miles: 216, price: 520, basePrice: 557.20, marketAvg: 601.78, likelihood: 80.7, pickupDate: '2025-11-21T11:00:00.000Z', dropoffDate: '2025-11-21T17:00:00.000Z', pickupTimeWindow: { start: '11:00 AM', end: '3:00 PM' }, dropoffTimeWindow: { start: '5:00 PM', end: '8:00 PM' }, notes: 'Runs, luxury customer', customerBehavior: 'Wants clean hauler, fast service' },
  { pickup: { street1: '4398 Deerwood Lane', city: 'Evans', state: 'GA', zip: '30809' }, dropoff: { street1: '2126 Blue Ridge Blvd', city: 'Hoover', state: 'AL', zip: '35226' }, vehicle: '2018 Nissan Altima', vehicleType: 'sedan', transportType: 'open', miles: 392, price: 575, basePrice: 856.40, marketAvg: 924.91, likelihood: 55.8, pickupDate: '2025-11-22T09:00:00.000Z', dropoffDate: '2025-11-23T12:00:00.000Z', pickupTimeWindow: { start: '9:00 AM', end: '12:00 PM' }, dropoffTimeWindow: { start: '12:00 PM', end: '4:00 PM' }, notes: 'Runs, clean title', customerBehavior: 'Budget-focused' },
  { pickup: { street1: '1700 Thomas Street NW', city: 'Atlanta', state: 'GA', zip: '30318' }, dropoff: { street1: '4851 GA Hwy 85 #100', city: 'Forest Park', state: 'GA', zip: '30297' }, vehicle: '2024 BMW X5', vehicleType: 'suv', transportType: 'enclosed', miles: 18, price: 420, basePrice: 195.00, marketAvg: 210.60, likelihood: 95.0, pickupDate: '2025-11-21T10:00:00.000Z', dropoffDate: '2025-11-21T15:00:00.000Z', pickupTimeWindow: { start: '10:00 AM', end: '2:00 PM' }, dropoffTimeWindow: { start: '3:00 PM', end: '6:00 PM' }, notes: 'High-value, enclosed recommended', customerBehavior: 'Luxury owner' },
  { pickup: { street1: '4433–4477 Deerwood Ln W', city: 'Evans', state: 'GA', zip: '30809' }, dropoff: { street1: '2126 Blue Ridge Blvd', city: 'Hoover', state: 'AL', zip: '35226' }, vehicle: '2011 Ford Econoline E-250', vehicleType: 'van', transportType: 'open', miles: 340, price: 700, basePrice: 788.90, marketAvg: 852.01, likelihood: 76.2, pickupDate: '2025-11-23T08:00:00.000Z', dropoffDate: '2025-11-24T12:00:00.000Z', pickupTimeWindow: { start: '8:00 AM', end: '11:00 AM' }, dropoffTimeWindow: { start: '12:00 PM', end: '5:00 PM' }, notes: 'Heavy work van, runs rough', customerBehavior: 'Commercial customer' }
];

async function seedOrders() {
  try {
    console.log('🌱 Seeding orders for:', USER_EMAIL, '\n');
    const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    if (!user) { console.error('❌ User not found'); process.exit(1); }
    console.log('✅ Found:', user.firstName, user.lastName, '\n');

    let success = 0;
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      try {
        console.log(`[${i+1}/11] ${o.vehicle} | $${o.price}`);
        const q = await prisma.quote.create({ data: { userId: user.id, userEmail: user.email, role: 'CUSTOMER', fromZip: o.pickup.zip, toZip: o.dropoff.zip, miles: o.miles, vehicle: o.vehicle, vehicles: { [o.vehicle]: 1 }, transportType: o.transportType, offer: o.price, likelihood: Math.round(o.likelihood), marketAvg: o.marketAvg, recommendedMin: o.basePrice * 0.9, recommendedMax: o.marketAvg * 1.1, pickupDate: new Date(o.pickupDate), notes: o.customerBehavior, status: 'booked', source: 'seed' } });
        await prisma.booking.create({ data: { ref: generateRef(), userId: user.id, userEmail: user.email, quoteId: q.id, orderNumber: q.orderNumber, customerFirstName: user.firstName, customerLastName: user.lastName, customerPhone: user.phone, fromCity: `${o.pickup.city}, ${o.pickup.state}`, toCity: `${o.dropoff.city}, ${o.dropoff.state}`, vehicle: o.vehicle, vehicleType: o.vehicleType, vehicleDetails: { year: parseInt(o.vehicle.split(' ')[0]), make: o.vehicle.split(' ')[1], model: o.vehicle.split(' ').slice(2).join(' '), type: o.vehicleType, runs: true }, price: o.price, miles: o.miles, transportType: o.transportType, pickupDate: new Date(o.pickupDate), dropoffDate: new Date(o.dropoffDate), pickup: { ...o.pickup, timeWindow: o.pickupTimeWindow }, dropoff: { ...o.dropoff, timeWindow: o.dropoffTimeWindow }, pickupOriginType: 'dealer', dropoffDestinationType: 'dealer', customerInstructions: o.notes, notes: o.customerBehavior, quote: { id: q.id, quoteId: q.id, orderNumber: q.orderNumber, offer: o.price, likelihood: Math.round(o.likelihood), marketAvg: o.marketAvg, recommendedMin: o.basePrice * 0.9, recommendedMax: o.marketAvg * 1.1, fromZip: o.pickup.zip, toZip: o.dropoff.zip, miles: o.miles, vehicle: o.vehicle, transportType: o.transportType }, scheduling: { pickupDate: o.pickupDate, dropoffDate: o.dropoffDate, pickupTimeWindow: o.pickupTimeWindow, dropoffTimeWindow: o.dropoffTimeWindow }, status: 'waiting' } });
        success++;
      } catch (err) { console.error('❌', err.message); }
    }
    console.log(`\n✅ Created ${success}/11 orders\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedOrders().then(() => process.exit(0)).catch(() => process.exit(1));
