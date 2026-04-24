import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { fetchDrivingMilesByZip } from '../../lib/routes-client';
import { api } from '../../utils/request.js';
import { useAuth } from '../../store/auth-context.jsx';
import { clearQuoteCache, setPendingQuotePayload } from '../../utils/quote-cache.js';

import './quote-widget.css';

// ======================================================
// QuoteWidget — HOMEPAGE VERSION
// CORRECTED VERSION - Equal Calibration Factors
//
// CRITICAL RULES (DO NOT MODIFY):
// 1. Flat fee ($350 for first 100 miles) is NEVER multiplied by vehicle multiplier
// 2. Vehicle multiplier (1.05×) applies ONLY to miles ABOVE 100
// 3. Market calibration is ALWAYS applied to OPEN transport first
// 4. Enclosed surcharge (+30%) is ALWAYS applied LAST
// 5. Recommended ±10% range is for UI display only
// 6. Pickup/SUV/Van/Minivan must ALWAYS be more expensive than Sedan (same route)
// 7. SINGLE VEHICLE SELECTION ONLY (max 1 vehicle per quote)
// ======================================================
function QuoteWidget({ onStateChange } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token } = useAuth();

  const [pickupZip, setPickupZip] = useState('');
  const [dropoffZip, setDropoffZip] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [showOtherPanel, setShowOtherPanel] = useState(false);
  const [transportType, setTransportType] = useState('open');
  const [yourOffer, setYourOffer] = useState('');

  const [distanceMi, setDistanceMi] = useState(null);
  const [distanceHours, setDistanceHours] = useState(null);
  const [distanceErr, setDistanceErr] = useState('');
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [recommendedRange, setRecommendedRange] = useState({ min: 0, max: 0, recommended: 0 });
  const [marketAvg, setMarketAvg] = useState(0);

  const [likelihood, setLikelihood] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const distanceAbortRef = useRef(null);
  // Ref-based double-click guard. React state updates aren't synchronous, so
  // two clicks fired within the same microtask both see isSubmitting=false
  // and both enter the handler. A ref flips immediately and blocks re-entry.
  const submitInFlightRef = useRef(false);

  // ============================================================================
  // PRICING CONSTANTS - MUST MATCH pricing-engine.js
  // ============================================================================
  
  // Flat fees - NEVER multiplied by vehicle type
  const FLAT_FEES = {
    FIRST_50: 150,    // 0-50 miles = $150 flat
    NEXT_50: 200,     // 50-100 miles = +$200 flat
    TOTAL_100: 350,   // Total for first 100 miles = $350
  };
  
  const MARKET_UPLIFT = 0.08;     // 8% uplift applied BEFORE calibration
  const ENCLOSED_UPLIFT = 0.30;  // 30% surcharge applied LAST (after calibration)
  
  // Vehicle families - determines +5% on per-mile costs ONLY
  const PICKUP_FAMILY = new Set(['Pickup', 'SUV', 'Van', 'Minivan']);
  const PICKUP_ONLY = new Set(['Pickup']);
  const SUV_VAN_FAMILY = new Set(['SUV', 'Van', 'Minivan']);
  
  // Likelihood constants
  const LIKE_MAX = 95.0;
  const LIKE_MIN = 5.0;
  const LIKE_GAMMA = 1.12;

  const mainVehicleTypes = ['Sedan', 'Pickup', 'SUV', 'Van', 'Other'];
  const otherVehicleOptions = useMemo(
    () => ({
      Recreational: ['ATV', 'Motorcycle', 'Dirt Bike', 'Golf Cart', 'Snowmobile', 'Minivan'],
      Specialty: ['RV/Motorhome', 'Box Truck', 'Trailer', 'Boat on Trailer'],
    }),
    []
  );

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const parseMoney = (s) => {
    const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const formatMoney = (n) =>
    Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ✅ CRITICAL: Pure function to calculate total from any vehicles object
  // This avoids stale closure issues by accepting the object as a parameter
  const calculateTotalFromVehicles = (vehiclesObj) => {
    if (!vehiclesObj || typeof vehiclesObj !== 'object') return 0;
    return Object.values(vehiclesObj).reduce((acc, count) => acc + (Number(count) || 0), 0);
  };

  // ✅ CRITICAL: Pure function to get vehicle count - always 1 for single vehicle selection
  const calculateVehicleCountFromVehicles = (vehiclesObj) => {
    const total = calculateTotalFromVehicles(vehiclesObj);
    // Single vehicle selection - always return 1 if any vehicle selected
    return total > 0 ? 1 : 0;
  };

  // For render-time checks (uses current state)
  const totalSelected = calculateTotalFromVehicles(selectedVehicles);

  const hasOtherTypes = () => {
    const otherList = Object.values(otherVehicleOptions).flat();
    return Object.keys(selectedVehicles).some(
      (k) => otherList.includes(k) || (!mainVehicleTypes.includes(k) && k !== 'Other')
    );
  };

  const isPriceEnabled =
    pickupZip.length === 5 &&
    dropoffZip.length === 5 &&
    totalSelected > 0 &&
    Number.isFinite(distanceMi) &&
    distanceMi > 0;

  const canSubmit = isPriceEnabled && yourOffer && parseMoney(yourOffer) > 0;
  const resetVehicles = () => setSelectedVehicles({});

  const formatVehiclesDisplay = () =>
    Object.entries(selectedVehicles)
      .map(([t, c]) => t)
      .join(', ');

  // ============================================================================
  // Fetch Driving Distance
  // ============================================================================
  useEffect(() => {
    const valid = pickupZip.length === 5 && dropoffZip.length === 5;
    if (!valid) {
      setDistanceMi(null);
      setDistanceErr('');
      return;
    }

    if (distanceAbortRef.current) distanceAbortRef.current.abort();
    const controller = new AbortController();
    distanceAbortRef.current = controller;

    setIsCalculatingDistance(true);
    setDistanceErr('');

    fetchDrivingMilesByZip(pickupZip, dropoffZip, controller.signal)
      .then(({ miles, duration }) => {
        if (!Number.isFinite(miles) || miles <= 0) {
          setDistanceMi(null);
          setDistanceHours(null);
          setDistanceErr('Could not calculate distance for this route.');
          return;
        }
        setDistanceMi(miles);
        setDistanceHours(Number.isFinite(duration?.hours) ? duration.hours : null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('[distance]', err);
        setDistanceMi(null);

        const isDev = !!import.meta.env?.DEV;
        const code = err?.code || '';
        const raw = err?.raw || err?.message || '';

        // User-facing copy per failure mode; in dev, append the raw server
        // message so the root cause is visible without opening devtools.
        const pretty = (() => {
          switch (code) {
            case 'INVALID_ZIP':
              return 'Invalid or unsupported ZIP code. Please double-check and try again.';
            case 'NO_ROUTE':
              return 'No driving route between these ZIP codes.';
            case 'OVER_QUERY_LIMIT':
              return 'Distance lookup is rate-limited. Please try again shortly.';
            case 'REQUEST_DENIED':
            case 'SERVICE_NOT_CONFIGURED':
              return 'Distance service is temporarily unavailable. Our team has been notified.';
            case 'SERVER_ERROR':
              return 'Distance service is temporarily unavailable. Please try again shortly.';
            default:
              return 'Could not calculate distance right now. Please try again.';
          }
        })();

        setDistanceErr(isDev && raw ? `${pretty} [dev: ${raw}]` : pretty);
      })
      .finally(() => setIsCalculatingDistance(false));

    return () => controller.abort();
  }, [pickupZip, dropoffZip]);

  // ============================================================================
  // PRICING LOGIC - CORRECTED
  // ============================================================================
  
  /**
   * Calculate per-mile cost for miles above 100 ONLY
   * CRITICAL: Vehicle multiplier (1.05×) applies ONLY here, NEVER to flat fees
   */
  function calculatePerMileCost(type, milesAbove100) {
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
    
    // CRITICAL: Apply +5% vehicle multiplier ONLY to per-mile costs
    // This multiplier NEVER applies to the $350 flat fee
    if (PICKUP_FAMILY.has(type)) {
      cost *= 1.05;
    }
    
    return cost;
  }

  /**
   * Compute OPEN transport base price
   * CRITICAL ORDER:
   * 1. Flat fee ($350) - NEVER multiplied by vehicle type
   * 2. Per-mile costs - WITH vehicle multiplier (1.05× for Pickup/SUV/Van/Minivan)
   */
  function computeOpenBasePrice(distanceMiles, vehicles) {
    if (!distanceMiles || distanceMiles <= 0) return 0;
    if (!vehicles || Object.keys(vehicles).length === 0) return 0;

    const miles = Math.max(0, distanceMiles);
    let totalPrice = 0;
    
    for (const [type, count] of Object.entries(vehicles)) {
      let perVehicle = 0;
      
      if (miles <= 50) {
        // 0-50 miles: $150 flat (NO vehicle multiplier)
        perVehicle = FLAT_FEES.FIRST_50;
      } else if (miles <= 100) {
        // 51-100 miles: $350 flat (NO vehicle multiplier)
        perVehicle = FLAT_FEES.TOTAL_100;
      } else {
        // Miles > 100:
        // - Flat fee ($350) is NOT multiplied
        // - Per-mile costs ARE multiplied (done in calculatePerMileCost)
        perVehicle = FLAT_FEES.TOTAL_100 + calculatePerMileCost(type, miles - 100);
      }
      
      totalPrice += perVehicle * count;
    }

    return totalPrice;
  }

  // ============================================================================
  // Vehicle Category Detection (kept for backward compatibility, but not used
  // in calibration anymore since all categories use the same factor)
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
  // CALIBRATION - Applied to OPEN transport ONLY
  // 
  // CORRECTED: All vehicle categories now use the SAME calibration factor
  // per distance band. This ensures Pickup/SUV/Van/Minivan are always more
  // expensive than Sedan (because of the +5% per-mile multiplier).
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
  // Compute Market Average & Recommendations
  // 
  // CRITICAL FORMULA ORDER (DO NOT CHANGE):
  // 1. Calculate Base Price (flat fee WITHOUT multiplier + per-mile WITH multiplier)
  // 2. Calculate Raw Market = Base Price × 1.08
  // 3. Apply Calibration to get OPEN Market Average
  // 4. If Enclosed: Enclosed Market Avg = Calibrated Open × 1.30 (APPLIED LAST)
  // 5. Recommended Range = Market Avg ± 10% (for UI display only)
  // ============================================================================
  useEffect(() => {
    if (!distanceMi || totalSelected === 0) {
      setMarketAvg(0);
      setRecommendedRange({ min: 0, max: 0, recommended: 0 });
      return;
    }

    // Step 1: Calculate OPEN transport base price
    const openBase = computeOpenBasePrice(distanceMi, selectedVehicles);
    
    // Step 2: Calculate OPEN raw market average (Base × 1.08)
    const openRawMarket = openBase * (1 + MARKET_UPLIFT);
    
    // Step 3: Apply calibration to get OPEN market average
    // CRITICAL: Calibration is ALWAYS applied to OPEN transport first
    const openMarketAvg = calibrateMarketAvg(openRawMarket, distanceMi, selectedVehicles);
    
    // Step 4: If Enclosed, multiply CALIBRATED open by 1.30
    // CRITICAL: Enclosed surcharge is ALWAYS applied LAST
    const isEnclosed = transportType === 'enclosed';
    const enclosedMultiplier = isEnclosed ? (1 + ENCLOSED_UPLIFT) : 1;
    
    const market = Math.round(openMarketAvg * enclosedMultiplier * 100) / 100;

    setMarketAvg(market);

    // NOTE: Recommended range is for UI display only, not part of pricing engine
    setRecommendedRange({
      min: Math.round(market * 0.9 * 100) / 100,
      max: Math.round(market * 1.1 * 100) / 100,
      recommended: market,
    });
  }, [distanceMi, selectedVehicles, transportType, totalSelected]);

  // ============================================================================
  // Expose relevant form state to the parent (used by the comparison cards on
  // the homepage, so distance / market / vehicle stay in sync with the widget).
  // ============================================================================
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const cb = onStateChangeRef.current;
    if (typeof cb !== 'function') return;
    cb({
      pickupZip,
      dropoffZip,
      distanceMi,
      selectedVehicles,
      transportType,
      marketAvg,
    });
  }, [pickupZip, dropoffZip, distanceMi, selectedVehicles, transportType, marketAvg]);

  // ============================================================================
  // LIKELIHOOD CALCULATION
  // Formula: 95% × (Offer/Market)^1.12, min 5%, max 95%
  // ============================================================================
  useEffect(() => {
    if (!yourOffer || !recommendedRange.recommended || !isPriceEnabled) {
      setLikelihood(0);
      return;
    }

    const offer = parseMoney(yourOffer);
    const market = recommendedRange.recommended;
    const ratio = offer / market;

    let pct;
    if (ratio >= 1) {
      pct = LIKE_MAX;
    } else {
      pct = LIKE_MAX * Math.pow(Math.max(0, ratio), LIKE_GAMMA);
      pct = Math.max(LIKE_MIN, pct);
      pct = Math.min(pct, LIKE_MAX - 0.1);
    }

    setLikelihood(Math.round(pct * 10) / 10);
  }, [yourOffer, recommendedRange, isPriceEnabled]);

  // ============================================================================
  // Save quote to backend
  // ✅ FIXED: Accept vehicleCount as parameter to avoid stale closure
  // ============================================================================
  async function saveQuoteToApi(vehiclesSnapshot, vehicleCountToSave) {
    console.log('🚀 [QUOTE API] Saving with vehicleCount:', vehicleCountToSave);
    console.log('🚀 [QUOTE API] Vehicles snapshot:', JSON.stringify(vehiclesSnapshot));
    
    const body = {
      fromZip: pickupZip,
      toZip: dropoffZip,
      vehicles: vehiclesSnapshot,
      vehicleCount: vehicleCountToSave, // ✅ Use passed count, NOT recalculated
      transportType,
      miles: Math.round(distanceMi || 0),
      durationHours: Number.isFinite(distanceHours) ? distanceHours : null,
      offer: Number(parseMoney(yourOffer).toFixed(2)),
      likelihood: Number(likelihood.toFixed(1)),
      marketAvg: Number(marketAvg.toFixed(2)),
      recommendedMin: Number(recommendedRange.min.toFixed(2)),
      recommendedMax: Number(recommendedRange.max.toFixed(2)),
      vehicle: formatVehiclesDisplay() || 'Vehicle',
      source: 'quote-widget',
      createdAt: new Date().toISOString(),
    };
    return api.post('/api/quotes', body, token);
  }

  const handleOfferChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setYourOffer(raw);
  };

  const shouldShowLikelihood = isPriceEnabled;

  // ============================================================================
  // VEHICLE SELECTION HANDLER - Single vehicle only
  // ============================================================================
  const handleVehicleSelect = (type) => {
    const current = selectedVehicles[type] || 0;
    
    if (current > 0) {
      // If this type is already selected, deselect it
      const copy = { ...selectedVehicles };
      delete copy[type];
      setSelectedVehicles(copy);
    } else {
      // Replace any existing selection with this one (single vehicle only)
      setSelectedVehicles({ [type]: 1 });
    }
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ✅ FIXED: Snapshot selectedVehicles and calculate count ONCE at submit time
  // ============================================================================
  const handleSubmitOffer = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!canSubmit) return;
    // Sync guard: ref flips before any await so a double-click within the
    // same frame can't enter twice and create a duplicate DB row.
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    try {
    // ✅ CRITICAL: Snapshot the selectedVehicles state IMMEDIATELY at submit time
    // This prevents any stale closure issues
    const vehiclesSnapshot = { ...selectedVehicles };
    
    // ✅ CRITICAL: Calculate vehicle count from the snapshot using pure functions
    const snapshotTotal = calculateTotalFromVehicles(vehiclesSnapshot);
    const snapshotVehicleCount = calculateVehicleCountFromVehicles(vehiclesSnapshot);
    
    // ✅ TEMP DEBUG LOG - Shows exactly what we're working with
    console.log('======================================');
    console.log('🚗 [QUOTE WIDGET] SUBMIT DEBUG:');
    console.log('🚗 vehiclesSnapshot:', JSON.stringify(vehiclesSnapshot));
    console.log('🚗 snapshotTotal (raw sum):', snapshotTotal);
    console.log('🚗 snapshotVehicleCount:', snapshotVehicleCount);
    console.log('======================================');

    clearQuoteCache();
    const offerNum = Number(parseMoney(yourOffer).toFixed(2));

    // ✅ Build draft payload with snapshot values
    const draftPayload = {
      fromZip: pickupZip,
      toZip: dropoffZip,
      miles: Math.round(distanceMi || 0),
      offer: offerNum,
      transportType,
      likelihood: Number(likelihood.toFixed(1)),
      vehicle: formatVehiclesDisplay() || 'Vehicle',
      vehicles: vehiclesSnapshot, // ✅ Use snapshot
      vehicleCount: snapshotVehicleCount, // ✅ Use calculated count from snapshot
      marketAvg: Number(marketAvg.toFixed(2)),
      recommendedMin: Number(recommendedRange.min.toFixed(2)),
      recommendedMax: Number(recommendedRange.max.toFixed(2)),
    };

    console.log('🚗 [QUOTE WIDGET] draftPayload.vehicleCount:', draftPayload.vehicleCount);

    if (!isAuthenticated) {
      try {
        setPendingQuotePayload(draftPayload);
        
        // ✅ Include vehicles param in return URL so shipper portal initializes correctly
        const returnParams = new URLSearchParams();
        returnParams.set('vehicles', String(snapshotVehicleCount)); // ✅ Use snapshot count
        returnParams.set('fromZip', pickupZip);
        returnParams.set('toZip', dropoffZip);
        returnParams.set('miles', String(Math.round(distanceMi || 0)));
        returnParams.set('offer', String(offerNum));
        returnParams.set('transportType', transportType);
        
        const returnUrl = `/shipper/offer?${returnParams.toString()}`;
        console.log('🚗 [QUOTE WIDGET] Unauthenticated - returnTo URL:', returnUrl);
        console.log('🚗 [QUOTE WIDGET] Unauthenticated - vehicles param:', snapshotVehicleCount);
        
        sessionStorage.setItem('authReturnTo', returnUrl);
      } catch (err) {
        console.error('Failed to save pending quote:', err);
      }
      navigate('/?auth=shipper-signup');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // ✅ Pass snapshot and count to saveQuoteToApi
      const quoteResponse = await saveQuoteToApi(vehiclesSnapshot, snapshotVehicleCount);
      const savedQuoteId = quoteResponse?.quote?.id || quoteResponse?.id;

      if (savedQuoteId) {
        sessionStorage.setItem('lastQuoteId', savedQuoteId);
      }

      // ✅ Build URL params with correct vehicle count from snapshot
      const params = new URLSearchParams();
      params.set('fromZip', pickupZip);
      params.set('toZip', dropoffZip);
      params.set('miles', String(Math.round(distanceMi || 0)));
      params.set('offer', String(offerNum));
      params.set('transportType', transportType);
      params.set('likelihood', String(Number(likelihood.toFixed(1))));
      params.set('vehicle', formatVehiclesDisplay() || 'Vehicle');
      params.set('vehicles', String(snapshotVehicleCount)); // ✅ CRITICAL: Use snapshot count
      params.set('vehicleCount', String(snapshotVehicleCount)); // ✅ Also as vehicleCount for compatibility
      params.set('marketAvg', String(Number(marketAvg.toFixed(2))));
      params.set('recommendedMin', String(Number(recommendedRange.min.toFixed(2))));
      params.set('recommendedMax', String(Number(recommendedRange.max.toFixed(2))));

      if (savedQuoteId) {
        params.set('quoteId', savedQuoteId);
      }

      const targetUrl = `/shipper/offer?${params.toString()}`;
      
      // ✅ TEMP DEBUG LOG - Shows final navigation URL and params
      console.log('======================================');
      console.log('🚗 [QUOTE WIDGET] NAVIGATION DEBUG:');
      console.log('🚗 Target URL:', targetUrl);
      console.log('🚗 vehicles param value:', snapshotVehicleCount);
      console.log('🚗 vehicleCount param value:', snapshotVehicleCount);
      console.log('======================================');
      
      navigate(targetUrl, { replace: false });
    } catch (err) {
      console.error('Quote submit error:', err);
      alert('Failed to submit your quote, please try again.');
    } finally {
      setIsSubmitting(false);
    }
    } finally {
      submitInFlightRef.current = false;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="quote-widget qw-scoped" id="quote-widget">
      <form
        className="quote-form"
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
        autoComplete="off"
      >
        {/* ROUTE DETAILS */}
        <div className="form-group">
          <label className="form-label">Route Details</label>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                className="form-input"
                placeholder="10001"
                value={pickupZip}
                onChange={(e) => setPickupZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                maxLength="5"
                inputMode="numeric"
                autoComplete="off"
              />
              <span className="field-label">Pickup ZIP</span>
            </div>
            <div className="form-field">
              <input
                type="text"
                className="form-input"
                placeholder="23220"
                value={dropoffZip}
                onChange={(e) => setDropoffZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                maxLength="5"
                inputMode="numeric"
                autoComplete="off"
              />
              <span className="field-label">Drop-off ZIP</span>
            </div>
          </div>
          <div className="distance-row">
            {isCalculatingDistance ? (
              <span className="distance-badge"><span className="inline-spinner" /> Calculating route distance…</span>
            ) : distanceErr ? (
              <span className="distance-badge distance-error">{distanceErr}</span>
            ) : Number.isFinite(distanceMi) ? (
              <span className="distance-badge">Distance: <strong>{Math.round(distanceMi)} mi</strong></span>
            ) : (
              <span className="distance-badge">Enter both ZIPs to calculate distance</span>
            )}
          </div>
        </div>

        {/* VEHICLES - Single selection only */}
        <div className="form-group">
          <label className="form-label">What vehicle would you like to ship?</label>
          <span className="vehicles-helper">Select a vehicle type</span>
          <div className="vehicle-chips-row">
            {mainVehicleTypes.map((type) => {
              const isSelected = type === 'Other' ? hasOtherTypes() : (selectedVehicles[type] || 0) > 0;

              return (
                <button
                  key={type}
                  type="button"
                  className={`qw-chip ${isSelected ? 'qw-active' : ''}`}
                  onClick={() => {
                    if (type === 'Other') {
                      setShowOtherPanel(true);
                      return;
                    }
                    handleVehicleSelect(type);
                  }}
                >
                  <span className="qw-chip-text">{type}</span>
                </button>
              );
            })}
          </div>

          {/* Vehicle summary - simplified for single selection */}
          <div className="vehicle-summary-container">
            {totalSelected > 0 && (
              <div className="vehicle-summary">
                <div className="summary-text">
                  <span className="summary-label">Selected:</span>
                  <span className="summary-value">{formatVehiclesDisplay()}</span>
                </div>
                <button type="button" className="summary-reset" onClick={resetVehicles}>Reset</button>
              </div>
            )}
          </div>
        </div>

        {/* OTHER VEHICLES PANEL - Single selection only */}
        {showOtherPanel && (
          <div className="other-panel-overlay" onClick={() => setShowOtherPanel(false)}>
            <div className="other-panel" onClick={(e) => e.stopPropagation()}>
              <div className="other-panel-header">
                <h3>Select a vehicle type</h3>
                <button type="button" className="other-panel-close" onClick={() => setShowOtherPanel(false)}>×</button>
              </div>
              <div className="other-panel-content">
                {Object.entries(otherVehicleOptions).map(([category, vehicles]) => (
                  <div key={category} className="other-category">
                    <h4 className="other-category-title">{category}</h4>
                    <div className="other-chips-grid">
                      {vehicles.map((v) => {
                        const isSelected = (selectedVehicles[v] || 0) > 0;
                        return (
                          <button
                            key={v}
                            type="button"
                            className={`qw-other-chip ${isSelected ? 'qw-active' : ''}`}
                            onClick={() => {
                              handleVehicleSelect(v);
                              setShowOtherPanel(false);
                            }}
                          >
                            <span className="qw-chip-text">{v}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="other-panel-footer">
                <button type="button" className="btn-primary" onClick={() => setShowOtherPanel(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* TRANSPORT TYPE */}
        <div className="form-group">
          <label className="form-label">Transport Type</label>
          <div className="transport-pills-container">
            <button
              type="button"
              className={`pill-chip transport-pill ${transportType === 'open' ? 'selected' : ''}`}
              onClick={() => setTransportType('open')}
            >
              <span className="pill-label">Open</span>
              <span className="pill-sublabel">Standard carrier</span>
            </button>
            <button
              type="button"
              className={`pill-chip transport-pill ${transportType === 'enclosed' ? 'selected' : ''}`}
              onClick={() => setTransportType('enclosed')}
            >
              <span className="pill-label">Enclosed</span>
              <span className="pill-sublabel">Protected transport (+30%)</span>
            </button>
          </div>
        </div>

        {/* OFFER INPUT */}
        <div className="form-group">
          <label className="form-label">Your Offer ($)</label>
          <input
            type="text"
            className="form-input offer-input no-arrows"
            placeholder={isPriceEnabled ? 'Enter your price' : 'Complete fields above first'}
            value={yourOffer}
            onChange={handleOfferChange}
            disabled={!isPriceEnabled}
          />
          {!isPriceEnabled && <span className="price-helper">Fill in route and vehicle to enable</span>}
        </div>

        {/* DISPATCH LIKELIHOOD */}
        <div className="likelihood-section">
          {shouldShowLikelihood ? (
            <div className="likelihood-card">
              <div className="likelihood-header">
                <span className="likelihood-label">Dispatch Likelihood</span>
                {marketAvg > 0 && <span className="market-badge">Market avg: ${formatMoney(marketAvg)}</span>}
              </div>
              {yourOffer && parseMoney(yourOffer) > 0 ? (
                <div className="likelihood-meter-wrapper">
                  <div className="likelihood-percentage">
                    <span className="percentage-number">{likelihood.toFixed(1)}%</span>
                    <span className={`percentage-label ${likelihood >= 80 ? 'high' : likelihood >= 60 ? 'medium' : 'low'}`}>
                      {likelihood >= 80 ? 'HIGH' : likelihood >= 60 ? 'MEDIUM' : 'LOW'}
                    </span>
                  </div>
                  <div className="likelihood-bar">
                    <div
                      className={`likelihood-bar-fill ${likelihood >= 80 ? 'high' : likelihood >= 60 ? 'medium' : 'low'}`}
                      style={{ width: `${likelihood}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="likelihood-placeholder"><p>Enter your offer to see dispatch likelihood</p></div>
              )}
            </div>
          ) : (
            <div className="likelihood-empty">
              <span className="likelihood-label">Dispatch Likelihood</span>
              <p className="empty-message">Complete route and vehicle to see likelihood</p>
            </div>
          )}
        </div>

        {/* SUBMIT CTA */}
        <div className="qw-footer">
          <button
            type="button"
            onClick={handleSubmitOffer}
            className={`qw-submit-btn ${!canSubmit ? 'qw-disabled' : ''} ${isSubmitting ? 'qw-loading' : ''}`}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? <span>Submitting…</span> : <span>Submit Offer</span>}
          </button>
          <p className="qw-policy-note">No commitment required. Flat 6% fee only when you book.</p>
        </div>
      </form>
    </div>
  );
}

export default QuoteWidget;