/**
 * DANGER: Complete Database Wipe
 * This will DELETE ALL DATA from your database
 * Run with: node scripts/wipe-database.mjs
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const REQUIRED_PHRASE = 'YES DELETE EVERYTHING';

const prisma = new PrismaClient();

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askPhrase(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function describeDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return '(DATABASE_URL is not set)';
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, '') || '(no database)';
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.hostname}${port}/${dbName}`;
  } catch {
    return '(could not parse DATABASE_URL)';
  }
}

async function wipeDatabase() {
  try {
    console.log('\n⚠️  ═══════════════════════════════════════════════════════');
    console.log('⚠️  WARNING: COMPLETE DATABASE WIPE');
    console.log('⚠️  ═══════════════════════════════════════════════════════');
    console.log(`⚠️  Target database: ${describeDatabase()}`);
    console.log('⚠️  ───────────────────────────────────────────────────────');
    console.log('⚠️  This will delete ALL data from the database above:');
    console.log('⚠️  - All users (including YOUR account)');
    console.log('⚠️  - All bookings');
    console.log('⚠️  - All quotes');
    console.log('⚠️  - All notifications');
    console.log('⚠️  - All addresses');
    console.log('⚠️  - All drafts');
    console.log('⚠️  - All account events');
    console.log('⚠️  - Everything else');
    console.log('⚠️  ═══════════════════════════════════════════════════════\n');

    const answer = await askPhrase(
      `⚠️  Type exactly "${REQUIRED_PHRASE}" to confirm: `
    );

    if (answer !== REQUIRED_PHRASE) {
      console.log('\n❌ Confirmation phrase did not match. Database wipe cancelled.\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  Starting complete database wipe...\n');

    // Delete in correct order to respect foreign key constraints
    
    console.log('🗑️  Deleting notifications...');
    const notifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${notifications.count} notifications`);

    console.log('🗑️  Deleting account events...');
    const events = await prisma.accountEvent.deleteMany({});
    console.log(`   ✅ Deleted ${events.count} account events`);

    console.log('🗑️  Deleting bookings...');
    const bookings = await prisma.booking.deleteMany({});
    console.log(`   ✅ Deleted ${bookings.count} bookings`);

    console.log('🗑️  Deleting drafts...');
    const drafts = await prisma.draft.deleteMany({});
    console.log(`   ✅ Deleted ${drafts.count} drafts`);

    console.log('🗑️  Deleting quotes...');
    const quotes = await prisma.quote.deleteMany({});
    console.log(`   ✅ Deleted ${quotes.count} quotes`);

    console.log('🗑️  Deleting addresses...');
    const addresses = await prisma.address.deleteMany({});
    console.log(`   ✅ Deleted ${addresses.count} addresses`);

    console.log('🗑️  Deleting payment transactions...');
    const payments = await prisma.paymentTransaction.deleteMany({});
    console.log(`   ✅ Deleted ${payments.count} payment transactions`);

    console.log('🗑️  Deleting carrier ratings...');
    const ratings = await prisma.carrierRating.deleteMany({});
    console.log(`   ✅ Deleted ${ratings.count} carrier ratings`);

    console.log('🗑️  Deleting users...');
    const users = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${users.count} users`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE COMPLETELY WIPED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🗑️  Total records deleted:`);
    console.log(`    - ${users.count} users`);
    console.log(`    - ${bookings.count} bookings`);
    console.log(`    - ${quotes.count} quotes`);
    console.log(`    - ${notifications.count} notifications`);
    console.log(`    - ${addresses.count} addresses`);
    console.log(`    - ${drafts.count} drafts`);
    console.log(`    - ${events.count} account events`);
    console.log(`    - ${payments.count} payment transactions`);
    console.log(`    - ${ratings.count} carrier ratings`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Your database is now empty.');
    console.log('📝 You will need to create a new account to use the app.\n');

  } catch (error) {
    console.error('\n❌ Database wipe error:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

wipeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Database wipe failed:', error);
    process.exit(1);
  });
