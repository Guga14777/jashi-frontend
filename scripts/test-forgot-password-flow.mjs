// scripts/test-forgot-password-flow.mjs
// End-to-end verification of the forgot-password flow.
// Runs with: node scripts/test-forgot-password-flow.mjs
//
// Safety: captures the real user's password hash before the reset and restores
// it in `finally` so the user isn't locked out if the test crashes.

import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const prisma = require('../server/db.cjs');
const emailService = require('../server/services/email.service.cjs');
const bcrypt = require('bcryptjs');

// Intercept the email stub so we can read the plaintext code without
// scraping server stdout.
let capturedCode = null;
let captureLog = [];
const origSendCode = emailService.sendPasswordResetCode;
emailService.sendPasswordResetCode = async (args) => {
  capturedCode = args.code;
  captureLog.push({ at: new Date().toISOString(), ...args });
  return { ok: true, stub: true };
};

// Load the controller AFTER the patch so it uses our intercepted emailService.
const authRecovery = require('../server/controllers/auth.recovery.controller.cjs');

// Fake req/res so we can call the Express handlers in-process.
function call(handler, body) {
  return new Promise((resolve) => {
    const req = { body };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(obj) { resolve({ status: this.statusCode, body: obj }); },
    };
    Promise.resolve(handler(req, res)).catch((e) =>
      resolve({ status: 'THROW', error: e.message, stack: e.stack })
    );
  });
}

function line(label) {
  console.log(`\n━━━ ${label} ${'━'.repeat(Math.max(0, 60 - label.length))}`);
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

let savedPasswordHash = null;
let testUser = null;

try {
  // -------------------------------------------------------------
  line('Listing users in DB');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, roles: true },
  });
  console.log(`Found ${users.length} user(s):`);
  users.forEach((u) => console.log(`  - ${u.email}  (id=${u.id}, roles=${u.roles})`));

  if (users.length === 0) {
    console.log('\nNo users in DB. Register a user first, then re-run.');
    process.exit(0);
  }
  testUser = users[0];
  savedPasswordHash = (
    await prisma.user.findUnique({ where: { id: testUser.id }, select: { password: true } })
  ).password;
  console.log(`\nUsing testUser: ${testUser.email}`);

  // -------------------------------------------------------------
  line('Test 1: /recovery/request with a NON-EXISTING email');
  capturedCode = null;
  const r1 = await call(authRecovery.requestCode, {
    identifier: 'definitely-nope-9x7t@example.com',
  });
  record(
    '  client still gets 200 (no account existence leak)',
    r1.status === 200 && r1.body?.success === true,
    `status=${r1.status} body=${JSON.stringify(r1.body)}`
  );
  record(
    '  no code was captured (email stub not called)',
    capturedCode === null,
    capturedCode ? `unexpected code: ${capturedCode}` : 'stub correctly skipped'
  );

  // -------------------------------------------------------------
  line('Test 2: /recovery/request with EXISTING email → issues code');
  capturedCode = null;
  const r2 = await call(authRecovery.requestCode, { identifier: testUser.email });
  record(
    '  request succeeded',
    r2.status === 200 && r2.body?.success === true,
    `status=${r2.status}`
  );
  record(
    '  email stub received a code',
    typeof capturedCode === 'string' && /^\d{6}$/.test(capturedCode),
    capturedCode ? `code=${capturedCode}` : 'no code captured'
  );

  // -------------------------------------------------------------
  line('Test 3: PasswordReset row written to DB');
  const resetsUnused = await prisma.passwordReset.findMany({
    where: { userId: testUser.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  record(
    '  exactly one unused PasswordReset row exists for this user',
    resetsUnused.length === 1,
    `found ${resetsUnused.length} unused rows`
  );
  const latestReset = resetsUnused[0];
  if (latestReset) {
    const hashMatches = await bcrypt.compare(capturedCode, latestReset.codeHash);
    record(
      '  DB row codeHash matches the captured code (bcrypt verify)',
      hashMatches,
      hashMatches ? 'bcrypt.compare returned true' : 'MISMATCH'
    );
    record(
      '  expiresAt is ~10 minutes in the future',
      latestReset.expiresAt.getTime() > Date.now() + 9 * 60 * 1000 &&
        latestReset.expiresAt.getTime() < Date.now() + 11 * 60 * 1000,
      `expiresAt=${latestReset.expiresAt.toISOString()}`
    );
  }

  // -------------------------------------------------------------
  line('Test 4: /recovery/verify with WRONG code → rejects');
  const r4 = await call(authRecovery.verifyCode, {
    identifier: testUser.email,
    code: '000000',
  });
  record(
    '  wrong code returns 4xx with error',
    r4.status >= 400 && r4.status < 500 && !!r4.body?.error,
    `status=${r4.status} body=${JSON.stringify(r4.body)}`
  );

  // -------------------------------------------------------------
  line('Test 5: /recovery/verify with CORRECT code → issues resetToken');
  const r5 = await call(authRecovery.verifyCode, {
    identifier: testUser.email,
    code: capturedCode,
  });
  record(
    '  correct code returns 200 with resetToken',
    r5.status === 200 && typeof r5.body?.resetToken === 'string' && r5.body.resetToken.length > 20,
    `status=${r5.status} tokenLen=${r5.body?.resetToken?.length || 0}`
  );
  const resetToken = r5.body?.resetToken;

  // Verify the reset row is now marked used.
  const usedReset = await prisma.passwordReset.findUnique({ where: { id: latestReset.id } });
  record(
    '  PasswordReset.usedAt is now set (code burned)',
    !!usedReset?.usedAt,
    `usedAt=${usedReset?.usedAt?.toISOString() || 'null'}`
  );

  // -------------------------------------------------------------
  line('Test 6: /recovery/reset-password with resetToken → changes password');
  const newPassword = 'TestPw_' + Math.random().toString(36).slice(2, 10) + '!';
  const r6 = await call(authRecovery.resetPassword, {
    resetToken,
    newPassword,
  });
  record(
    '  reset-password returns 200',
    r6.status === 200 && r6.body?.success === true,
    `status=${r6.status}`
  );

  const afterReset = await prisma.user.findUnique({
    where: { id: testUser.id },
    select: { password: true },
  });
  const newHashWorks = await bcrypt.compare(newPassword, afterReset.password);
  record(
    '  new password hash is persisted in User.password',
    newHashWorks,
    newHashWorks ? 'bcrypt.compare returned true' : 'password did NOT update'
  );

  const oldHashStillMatches = await bcrypt.compare('impossible-old-value-xyz', afterReset.password);
  record(
    '  User.password changed (differs from previous hash)',
    afterReset.password !== savedPasswordHash && !oldHashStillMatches,
    'hash is different from the saved original'
  );

  // -------------------------------------------------------------
  line('Test 7: All PasswordReset rows cleaned up for this user');
  const leftover = await prisma.passwordReset.findMany({ where: { userId: testUser.id } });
  record(
    '  no PasswordReset rows remain (replay protection)',
    leftover.length === 0,
    `found ${leftover.length} rows`
  );

  // -------------------------------------------------------------
  line('Test 8: Token replay — re-using the resetToken fails');
  const r8 = await call(authRecovery.resetPassword, {
    resetToken,
    newPassword: 'ShouldNotWork_123!',
  });
  record(
    '  replayed resetToken is rejected',
    r8.status >= 400 && r8.status < 500,
    `status=${r8.status} body=${JSON.stringify(r8.body)}`
  );
} catch (err) {
  console.error('\n🔥 TEST SCRIPT CRASHED:', err);
  process.exitCode = 1;
} finally {
  // ALWAYS restore the original password hash so the user can still log in.
  if (testUser && savedPasswordHash) {
    await prisma.user
      .update({ where: { id: testUser.id }, data: { password: savedPasswordHash } })
      .then(() => console.log(`\n🔒 Restored original password for ${testUser.email}.`))
      .catch((e) => console.error('FAILED TO RESTORE PASSWORD:', e));
  }

  await prisma.$disconnect();

  // Summary
  line('SUMMARY');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) process.exitCode = 1;
}
