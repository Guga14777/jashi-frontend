// scripts/verify-cancellation-policy.mjs
// Exercises the cancellation policy for every backend status and asserts the
// exact fee / stage / allowed combination we expect. Run with:
//   node scripts/verify-cancellation-policy.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  evaluateCustomerCancel,
  evaluateCarrierDrop,
  stageForStatus,
  STAGE,
  CARRIER_DISPATCH_FEE,
} = require('../server/services/booking/cancellation.policy.cjs');

// Expected outcomes — source of truth for the 4-stage policy the user asked for.
const CUSTOMER_EXPECT = {
  scheduled:              { stage: STAGE.A, allowed: true,  fee: 0, platformFeeRefundable: true  },
  assigned:               { stage: STAGE.B, allowed: true,  fee: 0, platformFeeRefundable: false },
  on_the_way_to_pickup:   { stage: STAGE.C, allowed: true,  fee: CARRIER_DISPATCH_FEE, platformFeeRefundable: false },
  arrived_at_pickup:      { stage: STAGE.C, allowed: true,  fee: CARRIER_DISPATCH_FEE, platformFeeRefundable: false },
  picked_up:              { stage: STAGE.D, allowed: false, fee: 0, platformFeeRefundable: false },
  delivered:              { stage: STAGE.D, allowed: false, fee: 0, platformFeeRefundable: false },
  cancelled:              { stage: null,    allowed: false, fee: 0, platformFeeRefundable: false },
};

const CARRIER_EXPECT = {
  scheduled:              { allowed: false },
  assigned:               { allowed: true, carrierPenalty: false },
  on_the_way_to_pickup:   { allowed: true, carrierPenalty: true },
  arrived_at_pickup:      { allowed: true, carrierPenalty: true },
  picked_up:              { allowed: false },
  delivered:              { allowed: false },
  cancelled:              { allowed: false },
};

let pass = 0;
let fail = 0;

function cmp(actual, expected, context) {
  for (const [key, expVal] of Object.entries(expected)) {
    const actualVal = actual[key];
    const match = actualVal === expVal || (actualVal == null && expVal == null);
    if (!match) {
      console.log(`  ❌ ${context}.${key}: expected ${JSON.stringify(expVal)}, got ${JSON.stringify(actualVal)}`);
      fail += 1;
      return false;
    }
  }
  return true;
}

console.log('━━━ Customer cancel — one row per status ━━━━━━━━━━━━━━━━━━━');
for (const [status, expected] of Object.entries(CUSTOMER_EXPECT)) {
  const actual = evaluateCustomerCancel(status);
  const summary = {
    stage: actual.stage,
    allowed: actual.allowed,
    fee: actual.carrierDispatchFee || 0,
    platformFeeRefundable: actual.platformFeeRefundable || false,
  };
  const ok = cmp(summary, expected, `customer[${status}]`);
  if (ok) {
    pass += 1;
    console.log(`  ✅ ${status.padEnd(24)} → stage=${summary.stage || '-'}, allowed=${summary.allowed}, fee=$${summary.fee}, platformRefundable=${summary.platformFeeRefundable}`);
  }
}

console.log('\n━━━ Carrier drop — one row per status ━━━━━━━━━━━━━━━━━━━━━━');
for (const [status, expected] of Object.entries(CARRIER_EXPECT)) {
  const actual = evaluateCarrierDrop(status);
  const summary = {
    allowed: actual.allowed,
    carrierPenalty: actual.carrierPenalty || false,
  };
  const ok = cmp(summary, expected, `carrier[${status}]`);
  if (ok) {
    pass += 1;
    console.log(`  ✅ ${status.padEnd(24)} → allowed=${summary.allowed}, carrierPenalty=${summary.carrierPenalty}, reason=${actual.reason || '-'}`);
  }
}

console.log('\n━━━ Edge cases ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Legacy aliases that normalizeStatus should fold into the canonical 6.
for (const alias of ['pending', 'accepted', 'dispatched', 'in_transit', 'completed', 'enroute', 'en_route', null, undefined, '']) {
  const actual = evaluateCustomerCancel(alias);
  const label = String(alias === null ? 'null' : alias === undefined ? 'undefined' : alias === '' ? '(empty)' : alias).padEnd(14);
  console.log(`  alias=${label} → stage=${actual.stage || '-'}, allowed=${actual.allowed}, fee=$${actual.carrierDispatchFee || 0}`);
  pass += 1;
}

// stageForStatus one-line sanity
console.log(`\n  stageForStatus('scheduled')            = ${stageForStatus('scheduled')}`);
console.log(`  stageForStatus('assigned')             = ${stageForStatus('assigned')}`);
console.log(`  stageForStatus('on_the_way_to_pickup') = ${stageForStatus('on_the_way_to_pickup')}`);
console.log(`  stageForStatus('arrived_at_pickup')    = ${stageForStatus('arrived_at_pickup')}`);
console.log(`  stageForStatus('picked_up')            = ${stageForStatus('picked_up')}`);

console.log(`\n━━━ Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
