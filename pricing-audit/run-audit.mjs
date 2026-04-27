// Pricing audit — single-vehicle price audit.
// READ-ONLY: this script does not modify any product code.
//
// It exercises TWO real pricing implementations and writes the results to
// single-vehicle-prices.csv:
//
//   1. priceBreakdown() from src/lib/price-engine.js  (exported, but not
//      currently imported by any UI code — see summary.md).
//   2. The customer quote widget's INLINE pricing functions, copy-pasted
//      verbatim from src/components/quote-widget/quote-widget.customer.jsx
//      (lines 57–301). The widget logic is nested inside a React component
//      and therefore cannot be imported; replicating it here is the only way
//      to "run the customer widget formula" outside the browser without
//      reimplementing it.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  priceBreakdown,
  FLAT_FEES as ENGINE_FLAT_FEES,
  MARKET_UPLIFT as ENGINE_MARKET_UPLIFT,
  ENCLOSED_UPLIFT as ENGINE_ENCLOSED_UPLIFT,
} from '../src/lib/price-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================================
// VERBATIM EXTRACT — quote-widget.customer.jsx lines 57–301
// (constants and three pricing functions, byte-for-byte from the widget)
// =====================================================================

const FLAT_FEES = {
  FIRST_50: 150,
  NEXT_50: 200,
  TOTAL_100: 350,
};

const MARKET_UPLIFT = 0.08;
const ENCLOSED_UPLIFT = 0.30;

const PICKUP_FAMILY = new Set(['Pickup', 'SUV', 'Van', 'Minivan']);

function calculatePerMileCost(type, milesAbove100) {
  if (milesAbove100 <= 0) return 0;

  let cost = 0;
  let remaining = milesAbove100;

  const tier1Miles = Math.min(remaining, 100);
  cost += tier1Miles * 1.80;
  remaining -= tier1Miles;

  if (remaining > 0) {
    const tier2Miles = Math.min(remaining, 300);
    cost += tier2Miles * 1.70;
    remaining -= tier2Miles;
  }

  if (remaining > 0) {
    const tier3Miles = Math.min(remaining, 500);
    cost += tier3Miles * 1.20;
    remaining -= tier3Miles;
  }

  if (remaining > 0) {
    cost += remaining * 1.00;
  }

  if (PICKUP_FAMILY.has(type)) {
    cost *= 1.05;
  }

  return cost;
}

function computeOpenBasePrice(distanceMiles, vehicleType) {
  if (!distanceMiles || distanceMiles <= 0) return 0;
  if (!vehicleType) return 0;

  const miles = Math.max(0, distanceMiles);
  let price = 0;

  if (miles <= 50) {
    price = FLAT_FEES.FIRST_50;
  } else if (miles <= 100) {
    price = FLAT_FEES.TOTAL_100;
  } else {
    price = FLAT_FEES.TOTAL_100 + calculatePerMileCost(vehicleType, miles - 100);
  }

  return price;
}

function calibrateMarketAvg(rawMarket, miles) {
  if (!miles || miles <= 0) return rawMarket;

  if (miles <= 100) return rawMarket * 1.00;
  if (miles <= 200) return rawMarket * 0.95;
  if (miles <= 350) return rawMarket * 0.85;
  if (miles <= 500) return rawMarket * 0.73;
  if (miles <= 700) return rawMarket * 0.66;
  return rawMarket * 0.60;
}

// END verbatim extract
// =====================================================================

function calibrationFactor(miles) {
  if (miles <= 100) return 1.00;
  if (miles <= 200) return 0.95;
  if (miles <= 350) return 0.85;
  if (miles <= 500) return 0.73;
  if (miles <= 700) return 0.66;
  return 0.60;
}

function flatFeeFor(miles) {
  if (miles <= 50) return FLAT_FEES.FIRST_50;
  return FLAT_FEES.TOTAL_100;
}

function widgetPriceWithBreakdown(vehicle, distance, transport) {
  const flat = flatFeeFor(distance);
  const perMile = distance > 100
    ? calculatePerMileCost(vehicle, distance - 100)
    : 0;
  const base = computeOpenBasePrice(distance, vehicle);
  const afterUplift = base * (1 + MARKET_UPLIFT);
  const calFactor = calibrationFactor(distance);
  const afterCalibration = calibrateMarketAvg(afterUplift, distance);
  const isEnclosed = transport === 'enclosed';
  const enclosedMultiplier = isEnclosed ? (1 + ENCLOSED_UPLIFT) : 1;
  const final = Math.round(afterCalibration * enclosedMultiplier * 100) / 100;
  return {
    flat,
    perMile,
    base,
    afterUplift,
    calFactor,
    afterCalibration,
    enclosedMultiplier: isEnclosed ? enclosedMultiplier : null,
    final,
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

const distances = [50, 100, 150, 200, 300, 500, 700, 1000, 1500];
const vehicles = ['Sedan', 'Pickup', 'SUV', 'Van', 'Minivan', 'Motorcycle'];
const transports = ['open', 'enclosed'];

const rows = [];
const mismatches = [];

for (const vehicle of vehicles) {
  for (const distance of distances) {
    for (const transport of transports) {
      const w = widgetPriceWithBreakdown(vehicle, distance, transport);

      // Cross-check with src/lib/price-engine.js priceBreakdown
      const engine = priceBreakdown({ [vehicle]: 1 }, distance, transport);
      if (engine.marketAvg !== w.final) {
        mismatches.push({
          vehicle, distance, transport,
          widgetFinal: w.final,
          engineFinal: engine.marketAvg,
        });
      }

      rows.push({
        vehicle_type: vehicle,
        distance_miles: distance,
        transport_type: transport,
        quantity: 1,
        flat_fee: round2(w.flat),
        per_mile_subtotal: round2(w.perMile),
        base_price: round2(w.base),
        after_market_uplift: round2(w.afterUplift),
        calibration_factor_applied: w.calFactor,
        after_calibration: round2(w.afterCalibration),
        enclosed_multiplier_applied: w.enclosedMultiplier === null ? 'N/A' : w.enclosedMultiplier,
        final_price: round2(w.final),
        source_function:
          'src/components/quote-widget/quote-widget.customer.jsx:computeOpenBasePrice+calibrateMarketAvg (verbatim) | xref src/lib/price-engine.js:priceBreakdown',
      });
    }
  }
}

const header = [
  'vehicle_type',
  'distance_miles',
  'transport_type',
  'quantity',
  'flat_fee',
  'per_mile_subtotal',
  'base_price',
  'after_market_uplift',
  'calibration_factor_applied',
  'after_calibration',
  'enclosed_multiplier_applied',
  'final_price',
  'source_function',
];

const csvLines = [header.join(',')];
for (const r of rows) {
  const v = header.map((k) => {
    const cell = r[k];
    const s = String(cell);
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  });
  csvLines.push(v.join(','));
}

const outPath = path.join(__dirname, 'single-vehicle-prices.csv');
writeFileSync(outPath, csvLines.join('\n') + '\n');

// Sanity checks against the user's reference values
const sanity = [
  { vehicle: 'Sedan',  distance: 250, transport: 'open',     expected: 564.57 },
  { vehicle: 'Pickup', distance: 250, transport: 'open',     expected: 576.73 },
  { vehicle: 'SUV',    distance: 500, transport: 'enclosed', expected: 1101.28 },
];
const sanityResults = sanity.map((s) => {
  const w = widgetPriceWithBreakdown(s.vehicle, s.distance, s.transport).final;
  const engine = priceBreakdown({ [s.vehicle]: 1 }, s.distance, s.transport).marketAvg;
  return { ...s, widget: w, engine, deltaWidget: round2(w - s.expected) };
});

console.log(`Wrote ${rows.length} rows to ${outPath}`);
console.log(`Engine vs widget mismatches (should be 0): ${mismatches.length}`);
if (mismatches.length) console.log(JSON.stringify(mismatches, null, 2));
console.log('\nSanity checks:');
for (const r of sanityResults) {
  console.log(
    `  ${r.vehicle.padEnd(11)} ${String(r.distance).padStart(4)} mi ${r.transport.padEnd(8)} → widget=$${r.widget}  engine=$${r.engine}  expected=$${r.expected}  Δ=${r.deltaWidget}`
  );
}

// Engine constants sanity
console.log('\nEngine constants from src/lib/price-engine.js:');
console.log('  FLAT_FEES =', ENGINE_FLAT_FEES);
console.log('  MARKET_UPLIFT =', ENGINE_MARKET_UPLIFT);
console.log('  ENCLOSED_UPLIFT =', ENGINE_ENCLOSED_UPLIFT);
