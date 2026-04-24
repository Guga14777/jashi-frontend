// src/utils/money.js
//
// Single source of truth for pricing arithmetic. Prevents penny drift by
// converting to integer cents for every rounding step, so displayed totals
// always equal the sum of displayed components.
//
// Rule: total = roundMoney(base) + roundMoney(fee) — never sum unrounded
// floats and round once at the end.

// ---------------------------------------------------------------------------
// Shared fee rates — every surface that displays or charges a fee reads from
// here so marketing copy, quote cards, and checkout can never drift apart.
// ---------------------------------------------------------------------------
export const BROKER_FEE_RATE = 0.15;
export const PLATFORM_FEE_RATE = 0.06;
export const CARRIER_FEE_RATE = 0.125;

const pctLabel = (rate) => `${Math.round(rate * 100)}%`;

export const BROKER_FEE_PCT_LABEL = pctLabel(BROKER_FEE_RATE);
export const PLATFORM_FEE_PCT_LABEL = pctLabel(PLATFORM_FEE_RATE);

// Fee savings vs a typical broker, expressed as a percentage of the broker
// fee. Structurally exact because both fees apply to the same base.
export const SAVINGS_PCT_ON_FEES = Math.round(
  ((BROKER_FEE_RATE - PLATFORM_FEE_RATE) / BROKER_FEE_RATE) * 100,
);
export const SAVINGS_PCT_ON_FEES_LABEL = `${SAVINGS_PCT_ON_FEES}%`;

const toCents = (value) => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Two-step rounding to defeat IEEE-754 noise: `1.005 * 100` is really
  // 100.4999… in float, so a single Math.round underflows. We round to
  // 1/10000 precision first to absorb the noise, then to cents.
  const tenThousandths = Math.round(n * 10000);
  return Math.round(tenThousandths / 100);
};

const fromCents = (cents) => cents / 100;

/** Round a monetary value to 2 decimals (returns a Number). */
export const roundMoney = (value) => fromCents(toCents(value));

/** Sum any number of monetary values, rounding each to cents before adding. */
export const addMoney = (...values) =>
  fromCents(values.reduce((acc, v) => acc + toCents(v), 0));

/**
 * Apply a percentage fee to an already-rounded base. Returns the fee
 * rounded to cents (so the displayed fee matches what's summed into total).
 */
export const applyFeeRate = (base, rate) => roundMoney(roundMoney(base) * rate);

/**
 * Canonical breakdown for a comparison card: base + percentage fee.
 * Guarantees total === base + fee at cent precision.
 */
export const computeFeeBreakdown = (base, rate) => {
  const roundedBase = roundMoney(base);
  const fee = applyFeeRate(roundedBase, rate);
  return {
    base: roundedBase,
    fee,
    total: addMoney(roundedBase, fee),
  };
};

/** Format a money number as "1,234.56" (no symbol). */
export const formatMoney = (value) =>
  roundMoney(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Format a money number as "$1,234.56". */
export const formatUSD = (value) => `$${formatMoney(value)}`;
