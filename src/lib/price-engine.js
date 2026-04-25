// ============================================================================
// Professional Pricing Engine for Auto Transport Quotes
// CORRECTED VERSION - Equal Calibration Factors
// ============================================================================
//
// CRITICAL RULES (DO NOT MODIFY):
// 1. Flat fee ($350 for first 100 miles) is NEVER multiplied by vehicle multiplier
// 2. Vehicle multiplier (1.05×) applies ONLY to miles ABOVE 100
// 3. Market calibration is ALWAYS applied to OPEN transport first
// 4. Enclosed surcharge (+30%) is ALWAYS applied LAST
// 5. Recommended ±10% range is for UI display only, not part of engine
// 6. Pickup/SUV/Van/Minivan must ALWAYS be more expensive than Sedan (same route)
//
// ============================================================================

// ============================================================================
// 1. FLAT FEES (0-100 miles) - NEVER MULTIPLIED BY VEHICLE TYPE
// ============================================================================

const FLAT_FEES = {
  FIRST_50: 150,    // 0-50 miles = $150 flat (NO vehicle multiplier)
  NEXT_50: 200,     // 50-100 miles = +$200 flat (NO vehicle multiplier)
  TOTAL_100: 350,   // Total for first 100 miles = $350 (NO vehicle multiplier)
};

// ============================================================================
// 2. PER-MILE RATES (miles above 100 only)
// Vehicle multiplier ONLY applies to these per-mile costs
// ============================================================================

const BASE_PER_MILE_RATES = [
  { min: 100, max: 200, rate: 1.80 },   // 100-200 miles: $1.80/mi
  { min: 200, max: 500, rate: 1.70 },   // 200-500 miles: $1.70/mi
  { min: 500, max: 1000, rate: 1.20 },  // 500-1000 miles: $1.20/mi
  { min: 1000, max: Infinity, rate: 1.00 }, // 1000+ miles: $1.00/mi
];

// ============================================================================
// 3. VEHICLE FAMILIES - Determines which vehicles get +5% on per-mile ONLY
// ============================================================================

const PICKUP_FAMILY = new Set(['Pickup', 'SUV', 'Van', 'Minivan']);
const PICKUP_ONLY = new Set(['Pickup']);
const SUV_VAN_FAMILY = new Set(['SUV', 'Van', 'Minivan']);

// ============================================================================
// 4. BASE CONSTANTS
// ============================================================================

const MARKET_UPLIFT = 0.08;      // 8% uplift for market average
const ENCLOSED_UPLIFT = 0.30;   // 30% surcharge for enclosed transport (APPLIED LAST)

// ============================================================================
// 5. LIKELIHOOD CONSTANTS
// ============================================================================

const LIKE_MAX = 95.0;
const LIKE_MIN = 5.0;
const LIKE_GAMMA = 1.12;

// ============================================================================
// 6. VEHICLE CATEGORY DETECTION
// ============================================================================

function getVehicleCategory(vehicleTypes) {
  const types = Object.keys(vehicleTypes || {});
  
  const hasPickup = types.some(type => PICKUP_ONLY.has(type));
  if (hasPickup) return 'pickup';
  
  const hasSuvVan = types.some(type => SUV_VAN_FAMILY.has(type));
  if (hasSuvVan) return 'suv_van';
  
  return 'sedan';
}

// ============================================================================
// 7. CALCULATE PER-MILE COST (for miles above 100 ONLY)
// 
// CRITICAL: The vehicle multiplier (1.05×) is applied here to the TOTAL
// per-mile cost AFTER summing all tiers. It is NEVER applied to flat fees.
// ============================================================================

function calculatePerMileCost(vehicleType, milesAbove100) {
  if (milesAbove100 <= 0) return 0;
  
  let cost = 0;
  let remaining = milesAbove100;
  
  // Tier 1: 100-200 miles (first 100 miles above base)
  const tier1Miles = Math.min(remaining, 100);
  cost += tier1Miles * 1.80;
  remaining -= tier1Miles;
  
  // Tier 2: 200-500 miles (next 300 miles)
  if (remaining > 0) {
    const tier2Miles = Math.min(remaining, 300);
    cost += tier2Miles * 1.70;
    remaining -= tier2Miles;
  }
  
  // Tier 3: 500-1000 miles (next 500 miles)
  if (remaining > 0) {
    const tier3Miles = Math.min(remaining, 500);
    cost += tier3Miles * 1.20;
    remaining -= tier3Miles;
  }
  
  // Tier 4: 1000+ miles (everything remaining)
  if (remaining > 0) {
    cost += remaining * 1.00;
  }
  
  // CRITICAL: Apply +5% vehicle type multiplier ONLY to per-mile costs
  // This multiplier NEVER applies to the $350 flat fee
  if (PICKUP_FAMILY.has(vehicleType)) {
    cost *= 1.05;
  }
  
  return cost;
}

// ============================================================================
// 8. COMPUTE BASE PRICE FOR A SINGLE VEHICLE
// 
// CRITICAL ORDER:
// 1. Start with flat fee ($350 for first 100 miles) - NO multiplier
// 2. Add per-mile costs for miles above 100 - WITH vehicle multiplier
// ============================================================================

function computeVehicleBasePrice(vehicleType, miles) {
  if (!miles || miles <= 0) return 0;
  
  // 0-50 miles: $150 flat (NO vehicle multiplier)
  if (miles <= 50) {
    return FLAT_FEES.FIRST_50;
  }
  
  // 51-100 miles: $350 flat (NO vehicle multiplier)
  if (miles <= 100) {
    return FLAT_FEES.TOTAL_100;
  }
  
  // Miles > 100: 
  // - Flat fee ($350) is NOT multiplied by vehicle type
  // - Per-mile costs ARE multiplied by vehicle type (done in calculatePerMileCost)
  const flatFee = FLAT_FEES.TOTAL_100; // $350, never multiplied
  const perMileCost = calculatePerMileCost(vehicleType, miles - 100); // Includes 1.05× if applicable
  
  return flatFee + perMileCost;
}

// ============================================================================
// 9. COMPUTE LINE ITEMS WITH MULTI-VEHICLE DISCOUNTS
// Multi-vehicle discount: 5% off when shipping 2+ of SAME vehicle type
// ============================================================================

function computeLineItems(selectedVehicles, miles) {
  const items = [];

  for (const [type, count] of Object.entries(selectedVehicles)) {
    if (!count || count === 0) continue;

    const basePricePerUnit = computeVehicleBasePrice(type, miles);
    
    // Apply multi-vehicle discount (5% for 2+ of same type)
    const discount = count >= 2 ? 0.05 : 0;
    const finalPricePerUnit = basePricePerUnit * (1 - discount);
    const lineTotal = finalPricePerUnit * count;

    items.push({
      type,
      count,
      basePricePerUnit: Math.round(basePricePerUnit * 100) / 100,
      finalPricePerUnit: Math.round(finalPricePerUnit * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
      hasDiscount: count >= 2,
      discountAmount: count >= 2 
        ? Math.round((basePricePerUnit - finalPricePerUnit) * count * 100) / 100 
        : 0,
    });
  }

  return items;
}

// ============================================================================
// 10. COMPUTE OPEN TRANSPORT BASE PRICE
// This is the sum of all line item totals (with discounts applied)
// ============================================================================

function computeOpenBasePrice(selectedVehicles, miles) {
  if (!miles || miles <= 0) return 0;
  if (!selectedVehicles || Object.keys(selectedVehicles).length === 0) return 0;
  
  const lineItems = computeLineItems(selectedVehicles, miles);
  return lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
}

// ============================================================================
// 11. CALIBRATION FOR MARKET AVERAGE (OPEN TRANSPORT ONLY)
// 
// CORRECTED: All vehicle categories now use the SAME calibration factor
// per distance band. This ensures Pickup/SUV/Van/Minivan are always more
// expensive than Sedan (because of the +5% per-mile multiplier).
//
// Previously, different calibration factors for different vehicle types
// were causing Pickup to be CHEAPER than Sedan in some distance ranges.
// ============================================================================

function calibrateMarketAvg(rawMarket, miles, vehicleTypes) {
  if (!miles || miles <= 0) return rawMarket;
  
  // CORRECTED: Use the same calibration factor for ALL vehicle types
  // The +5% per-mile multiplier for Pickup/SUV/Van/Minivan already makes them
  // more expensive. Using equal calibration preserves that relationship.
  
  if (miles <= 200) {
    // 0-200 miles: All vehicle types use 0.83
    return rawMarket * 0.83;
  }
  
  if (miles <= 350) {
    // 201-350 miles: All vehicle types use 0.85
    return rawMarket * 0.85;
  }
  
  if (miles <= 500) {
    // 351-500 miles: All vehicle types use 0.73
    return rawMarket * 0.73;
  }
  
  if (miles <= 700) {
    // 501-700 miles: All vehicle types use 0.66
    return rawMarket * 0.66;
  }
  
  // 700+ miles: All vehicle types use 0.60
  return rawMarket * 0.60;
}

// ============================================================================
// 12. COMPLETE PRICE BREAKDOWN
// 
// CRITICAL FORMULA ORDER (DO NOT CHANGE):
// 1. Calculate Base Price (flat fee WITHOUT multiplier + per-mile WITH multiplier)
// 2. Apply multi-vehicle discount if applicable
// 3. Calculate Raw Market = Base Price × 1.08
// 4. Apply Calibration to get OPEN Market Average
// 5. If Enclosed: Enclosed Market Avg = Calibrated Open × 1.30 (APPLIED LAST)
// 6. Recommended Range = Market Avg ± 10% (for UI display only)
// ============================================================================

export function priceBreakdown(selectedVehicles, miles, transportType = 'open') {
  if (!miles || miles <= 0 || !Object.keys(selectedVehicles).length) {
    return {
      miles,
      transportType,
      lineItems: [],
      subtotal: 0,
      enclosedSurcharge: 0,
      total: 0,
      marketAvg: 0,
      recommendedMin: 0,
      recommendedMax: 0,
      openMarketAvg: 0,
    };
  }

  // Step 1: Calculate OPEN transport line items and subtotal
  const lineItems = computeLineItems(selectedVehicles, miles);
  const openSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  // Step 2: Calculate OPEN raw market average (Base × 1.08)
  const openRawMarket = openSubtotal * (1 + MARKET_UPLIFT);
  
  // Step 3: Apply calibration to OPEN market average
  // CRITICAL: Calibration is ALWAYS applied to OPEN transport first
  const openMarketAvg = calibrateMarketAvg(openRawMarket, miles, selectedVehicles);
  
  // Step 4: If Enclosed, multiply the CALIBRATED open market avg by 1.30
  // CRITICAL: Enclosed surcharge is ALWAYS applied LAST, after calibration
  const isEnclosed = transportType === 'enclosed';
  const enclosedMultiplier = isEnclosed ? (1 + ENCLOSED_UPLIFT) : 1;
  
  // Calculate final values
  const subtotal = Math.round(openSubtotal * 100) / 100;
  const enclosedSurcharge = isEnclosed 
    ? Math.round(openMarketAvg * ENCLOSED_UPLIFT * 100) / 100 
    : 0;
  const total = Math.round((openSubtotal * enclosedMultiplier) * 100) / 100;
  
  // CRITICAL: Enclosed Market Avg = Calibrated Open Market Avg × 1.30
  const marketAvg = Math.round(openMarketAvg * enclosedMultiplier * 100) / 100;

  // Recommended range: ±10% of market average
  // NOTE: This is for UI display only, not part of the pricing engine logic
  const recommendedMin = Math.round(marketAvg * 0.90 * 100) / 100;
  const recommendedMax = Math.round(marketAvg * 1.10 * 100) / 100;

  return {
    miles,
    transportType,
    lineItems,
    subtotal,
    enclosedSurcharge,
    total,
    marketAvg,
    recommendedMin,  // UI display only
    recommendedMax,  // UI display only
    openMarketAvg: Math.round(openMarketAvg * 100) / 100,
  };
}

// ============================================================================
// 13. DISPATCH LIKELIHOOD CALCULATION
// 
// Formula:
// - If Offer/Market ≥ 1.0 → 95%
// - If Offer/Market < 1.0 → 95% × (Offer/Market)^1.12
// - Minimum: 5%, Maximum: 95%
// ============================================================================

export function dispatchLikelihood(offer, marketAvg) {
  if (!offer || !marketAvg || offer <= 0 || marketAvg <= 0) {
    return {
      pct: 0,
      band: 'low',
      message: 'Enter your offer to see dispatch likelihood.',
      savings: 0,
      savingsPercent: 0,
    };
  }

  const ratio = offer / marketAvg;
  const savings = Math.max(0, marketAvg - offer);
  const savingsPercent = savings > 0 ? Math.round((savings / marketAvg) * 100) : 0;

  let pct, band, message;

  if (ratio >= 1.0) {
    pct = LIKE_MAX;
    band = 'high';
    message = 'Carriers likely to accept; fast dispatch.';
  } else {
    pct = LIKE_MAX * Math.pow(Math.max(0, ratio), LIKE_GAMMA);
    pct = Math.max(LIKE_MIN, pct);
    pct = Math.min(pct, LIKE_MAX - 0.1);
    
    if (pct >= 80) {
      band = 'high';
      message = 'Carriers likely to accept; fast dispatch.';
    } else if (pct >= 60) {
      band = 'medium';
      message = 'Fair chance; may take longer.';
    } else {
      band = 'low';
      message = 'Recommend increasing the offer.';
    }
  }

  pct = Math.max(LIKE_MIN, Math.min(LIKE_MAX, pct));

  return {
    pct: Math.round(pct * 10) / 10,
    band,
    message,
    savings: Math.round(savings * 100) / 100,
    savingsPercent,
  };
}

// ============================================================================
// 14. FORMATTING HELPERS
// ============================================================================

export function formatPrice(num) {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') ?? '';
}

export function formatMiles(num) {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') ?? '';
}

// ============================================================================
// 15. EXPORTS
// ============================================================================

export {
  FLAT_FEES,
  BASE_PER_MILE_RATES,
  PICKUP_FAMILY,
  PICKUP_ONLY,
  SUV_VAN_FAMILY,
  MARKET_UPLIFT,
  ENCLOSED_UPLIFT,
  LIKE_MAX,
  LIKE_MIN,
  LIKE_GAMMA,
  calculatePerMileCost,
  computeVehicleBasePrice,
  computeLineItems,
  computeOpenBasePrice,
  calibrateMarketAvg,
  getVehicleCategory,
};