/**
 * Migrate pre-Postgres bookings from server/storage/bookings.json into Postgres.
 *
 * Usage:
 *   node scripts/migrate-json-to-postgres.js           # dry run (no writes)
 *   node scripts/migrate-json-to-postgres.js --commit  # actually write to DB
 *
 * Idempotent: skips any booking whose `ref` already exists in the DB.
 * Wraps all inserts in a single transaction — all-or-nothing.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, '..', 'server', 'storage', 'bookings.json');
const COMMIT = process.argv.includes('--commit');

const prisma = new PrismaClient({ log: ['error'] });

function toDate(v, fallback = null) {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

function buildScheduling(b) {
  return {
    pickupWindowStart: b.pickup?.windowStart ?? null,
    pickupWindowEnd: b.pickup?.windowEnd ?? null,
    dropoffWindowStart: b.dropoff?.windowStart ?? null,
    dropoffWindowEnd: b.dropoff?.windowEnd ?? null,
  };
}

function buildQuoteJson(b) {
  return {
    offer: b.price ?? 0,
    fromZip: b.fromCity ?? '',
    toZip: b.toCity ?? '',
    miles: b.miles ?? 0,
    vehicle: b.vehicle ?? '',
    transportType: b.transportType ?? 'open',
  };
}

async function main() {
  console.log(`\n=== JSON → Postgres booking import ===`);
  console.log(`Mode: ${COMMIT ? '⚠️  COMMIT (will write)' : 'dry-run (no writes)'}`);
  console.log(`Snapshot: ${SNAPSHOT_PATH}\n`);

  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const snapshot = JSON.parse(raw);
  if (!Array.isArray(snapshot)) throw new Error('Snapshot is not an array');
  console.log(`Snapshot contains ${snapshot.length} bookings.\n`);

  // Resolve userEmail → user.id
  const emails = [...new Set(snapshot.map((b) => b.userEmail).filter(Boolean))];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userIdByEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const missingEmails = emails.filter((e) => !userIdByEmail[e]);
  console.log(`Users found:    ${users.length}/${emails.length}`);
  if (missingEmails.length) {
    console.log(`Missing users:  ${missingEmails.join(', ')}`);
    console.log(`(bookings under those emails will be SKIPPED)\n`);
  }

  // Existing refs in DB — skip duplicates
  const existing = await prisma.booking.findMany({ select: { ref: true } });
  const existingRefs = new Set(existing.map((b) => b.ref));

  // Next orderNumber
  const lastOrder = await prisma.booking.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  let nextOrderNumber = (lastOrder?.orderNumber ?? 100000) + 1;

  // Build the insert payloads
  const toInsert = [];
  const skipped = { duplicateRef: 0, missingUser: 0, missingRef: 0, missingDates: 0 };

  for (const b of snapshot) {
    if (!b.ref) { skipped.missingRef++; continue; }
    if (existingRefs.has(b.ref)) { skipped.duplicateRef++; continue; }

    const userId = userIdByEmail[b.userEmail];
    if (!userId) { skipped.missingUser++; continue; }

    const pickupDate = toDate(b.pickupDate);
    const dropoffDate = toDate(b.dropoffDate, pickupDate);
    if (!pickupDate) { skipped.missingDates++; continue; }

    toInsert.push({
      ref: b.ref,
      userId,
      userEmail: b.userEmail,
      orderNumber: nextOrderNumber++,
      fromCity: String(b.fromCity ?? ''),
      toCity: String(b.toCity ?? ''),
      vehicle: String(b.vehicle ?? ''),
      vehicleType: String(b.vehicleType ?? b.vehicle ?? ''),
      vehicleDetails: b.vehicleDetails ?? {},
      price: Number(b.price ?? 0),
      miles: Number(b.miles ?? 0),
      transportType: String(b.transportType ?? 'open'),
      pickupDate,
      dropoffDate: dropoffDate ?? pickupDate,
      pickup: b.pickup ?? {},
      dropoff: b.dropoff ?? {},
      pickupOriginType: 'private',
      quote: buildQuoteJson(b),
      scheduling: buildScheduling(b),
      status: 'delivered',
      createdAt: toDate(b.createdAt) ?? new Date(),
      updatedAt: toDate(b.updatedAt) ?? toDate(b.createdAt) ?? new Date(),
    });
  }

  console.log(`Plan:`);
  console.log(`  to insert:         ${toInsert.length}`);
  console.log(`  skipped (dup ref): ${skipped.duplicateRef}`);
  console.log(`  skipped (no user): ${skipped.missingUser}`);
  console.log(`  skipped (no ref):  ${skipped.missingRef}`);
  console.log(`  skipped (no date): ${skipped.missingDates}`);
  console.log(`  orderNumber range: ${toInsert[0]?.orderNumber ?? '-'} → ${toInsert[toInsert.length - 1]?.orderNumber ?? '-'}\n`);

  console.log(`Sample of first 3 to insert:`);
  for (const r of toInsert.slice(0, 3)) {
    console.log(`  #${r.orderNumber}  ${r.ref}  ${r.createdAt.toISOString()}  ${r.userEmail}  ${r.fromCity}>${r.toCity}  ${r.vehicle}  $${r.price}`);
  }

  if (!COMMIT) {
    console.log(`\nDry run only — no rows written. Re-run with --commit to apply.\n`);
    await prisma.$disconnect();
    return;
  }

  if (toInsert.length === 0) {
    console.log(`\nNothing to insert.\n`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n⚠️  Writing ${toInsert.length} bookings in a single transaction...`);
  const result = await prisma.$transaction(
    toInsert.map((data) => prisma.booking.create({ data })),
    { timeout: 60_000 }
  );
  console.log(`✅ Inserted ${result.length} bookings.`);

  const finalCount = await prisma.booking.count();
  console.log(`Total bookings in DB now: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n❌ Import failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
