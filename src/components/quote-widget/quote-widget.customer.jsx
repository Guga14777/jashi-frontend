import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { fetchDrivingMilesByZip } from '../../lib/routes-client';
import { api } from '../../utils/request.js';
import { useAuth } from '../../store/auth-context.jsx';
import { clearQuoteCache, setPendingQuotePayload } from '../../utils/quote-cache.js';

import './quote-widget.css';

// ======================================================
// QuoteWidget — CUSTOMER DASHBOARD VERSION
// CORRECTED VERSION - Equal Calibration Factors
// SINGLE VEHICLE SELECTION ONLY
//
// CRITICAL RULES (DO NOT MODIFY):
// 1. Flat fee ($350 for first 100 miles) is NEVER multiplied by vehicle multiplier
// 2. Vehicle multiplier (1.05×) applies ONLY to miles ABOVE 100
// 3. Market calibration is ALWAYS applied to OPEN transport first
// 4. Enclosed surcharge (+30%) is ALWAYS applied LAST
// 5. Recommended ±10% range is for UI display only
// 6. Pickup/SUV/Van/Minivan must ALWAYS be more expensive than Sedan (same route)
// 7. Only 1 vehicle can be selected per quote
// ======================================================
function QuoteWidgetCustomer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token } = useAuth();

  const [pickupZip, setPickupZip] = useState('');
  const [dropoffZip, setDropoffZip] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null); // Single vehicle selection
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

  // Helper to check if a vehicle is selected
  const hasVehicleSelected = selectedVehicle !== null;

  // Helper to get vehicle count (always 0 or 1 now)
  const getVehicleCount = () => hasVehicleSelected ? 1 : 0;

  // Convert single vehicle to vehicles object format for pricing calculations
  const getVehiclesObject = () => {
    if (!selectedVehicle) return {};
    return { [selectedVehicle]: 1 };
  };

  const hasOtherTypes = () => {
    const otherList = Object.values(otherVehicleOptions).flat();
    return selectedVehicle && (otherList.includes(selectedVehicle) || (!mainVehicleTypes.includes(selectedVehicle) && selectedVehicle !== 'Other'));
  };

  const isPriceEnabled =
    pickupZip.length === 5 &&
    dropoffZip.length === 5 &&
    hasVehicleSelected &&
    Number.isFinite(distanceMi) &&
    distanceMi > 0;

  const canSubmit = isPriceEnabled && yourOffer && parseMoney(yourOffer) > 0;
  const resetVehicle = () => setSelectedVehicle(null);

  const formatVehiclesDisplay = () => selectedVehicle || '';

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
   * Compute OPEN transport base price for single vehicle
   * CRITICAL ORDER:
   * 1. Flat fee ($350) - NEVER multiplied by vehicle type
   * 2. Per-mile costs - WITH vehicle multiplier (1.05× for Pickup/SUV/Van/Minivan)
   */
  function computeOpenBasePrice(distanceMiles, vehicleType) {
    if (!distanceMiles || distanceMiles <= 0) return 0;
    if (!vehicleType) return 0;

    const miles = Math.max(0, distanceMiles);
    let price = 0;
    
    if (miles <= 50) {
      // 0-50 miles: $150 flat (NO vehicle multiplier)
      price = FLAT_FEES.FIRST_50;
    } else if (miles <= 100) {
      // 51-100 miles: $350 flat (NO vehicle multiplier)
      price = FLAT_FEES.TOTAL_100;
    } else {
      // Miles > 100:
      // - Flat fee ($350) is NOT multiplied
      // - Per-mile costs ARE multiplied (done in calculatePerMileCost)
      price = FLAT_FEES.TOTAL_100 + calculatePerMileCost(vehicleType, miles - 100);
    }

    return price;
  }

  // ============================================================================
  // CALIBRATION - Applied to OPEN transport ONLY
  // 
  // CORRECTED: All vehicle categories now use the SAME calibration factor
  // per distance band. This ensures Pickup/SUV/Van/Minivan are always more
  // expensive than Sedan (because of the +5% per-mile multiplier).
  // ============================================================================
  function calibrateMarketAvg(rawMarket, miles) {
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
    if (!distanceMi || !hasVehicleSelected) {
      setMarketAvg(0);
      setRecommendedRange({ min: 0, max: 0, recommended: 0 });
      return;
    }

    // Step 1: Calculate OPEN transport base price for single vehicle
    const openBase = computeOpenBasePrice(distanceMi, selectedVehicle);
    
    // Step 2: Calculate OPEN raw market average (Base × 1.08)
    const openRawMarket = openBase * (1 + MARKET_UPLIFT);
    
    // Step 3: Apply calibration to get OPEN market average
    // CRITICAL: Calibration is ALWAYS applied to OPEN transport first
    const openMarketAvg = calibrateMarketAvg(openRawMarket, distanceMi);
    
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
  }, [distanceMi, selectedVehicle, transportType, hasVehicleSelected]);

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
  // ============================================================================
  async function saveQuoteToApi() {
    const vehicleCount = 1;
    console.log('🚀 [QUOTE API CUSTOMER] Saving with vehicleCount:', vehicleCount);
    
    const body = {
      fromZip: pickupZip,
      toZip: dropoffZip,
      vehicles: getVehiclesObject(),
      vehicleCount: vehicleCount,
      transportType,
      miles: Math.round(distanceMi || 0),
      durationHours: Number.isFinite(distanceHours) ? distanceHours : null,
      offer: Number(parseMoney(yourOffer).toFixed(2)),
      likelihood: Number(likelihood.toFixed(1)),
      marketAvg: Number(marketAvg.toFixed(2)),
      recommendedMin: Number(recommendedRange.min.toFixed(2)),
      recommendedMax: Number(recommendedRange.max.toFixed(2)),
      vehicle: selectedVehicle || 'Vehicle',
      source: 'quote-widget-customer',
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
  // Vehicle Selection Handler - Single selection only
  // ============================================================================
  const handleVehicleSelect = (type) => {
    if (type === 'Other') {
      setShowOtherPanel(true);
      return;
    }
    
    // Toggle selection: if already selected, deselect; otherwise select
    if (selectedVehicle === type) {
      setSelectedVehicle(null);
    } else {
      setSelectedVehicle(type);
    }
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================
  const handleSubmitOffer = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!canSubmit) return;

    const currentVehicleCount = 1;
    
    console.log('🚀 [QUOTE WIDGET CUSTOMER] Submit - selectedVehicle:', selectedVehicle);
    console.log('🚀 [QUOTE WIDGET CUSTOMER] Submit - currentVehicleCount:', currentVehicleCount);

    clearQuoteCache();
    const offerNum = Number(parseMoney(yourOffer).toFixed(2));

    const draftPayload = {
      fromZip: pickupZip,
      toZip: dropoffZip,
      miles: Math.round(distanceMi || 0),
      offer: offerNum,
      transportType,
      likelihood: Number(likelihood.toFixed(1)),
      vehicle: selectedVehicle || 'Vehicle',
      vehicles: getVehiclesObject(),
      vehicleCount: currentVehicleCount,
      marketAvg: Number(marketAvg.toFixed(2)),
      recommendedMin: Number(recommendedRange.min.toFixed(2)),
      recommendedMax: Number(recommendedRange.max.toFixed(2)),
    };

    if (!isAuthenticated) {
      try {
        setPendingQuotePayload(draftPayload);
        const returnParams = new URLSearchParams({
          vehicles: String(currentVehicleCount),
          fromZip: pickupZip,
          toZip: dropoffZip,
        });
        console.log('🚀 [QUOTE WIDGET CUSTOMER] Unauthenticated - returnTo with vehicles:', currentVehicleCount);
        sessionStorage.setItem('authReturnTo', `/shipper/offer?${returnParams.toString()}`);
      } catch (err) {
        console.error('Failed to save pending quote:', err);
      }
      navigate('/?auth=shipper-signup');
      return;
    }

    try {
      setIsSubmitting(true);
      const quoteResponse = await saveQuoteToApi();
      const savedQuoteId = quoteResponse?.quote?.id || quoteResponse?.id;

      if (savedQuoteId) {
        sessionStorage.setItem('lastQuoteId', savedQuoteId);
      }

      const params = new URLSearchParams();
      params.set('fromZip', pickupZip);
      params.set('toZip', dropoffZip);
      params.set('miles', String(Math.round(distanceMi || 0)));
      params.set('offer', String(offerNum));
      params.set('transportType', transportType);
      params.set('likelihood', String(Number(likelihood.toFixed(1))));
      params.set('vehicle', selectedVehicle || 'Vehicle');
      params.set('vehicles', String(currentVehicleCount));
      params.set('vehicleCount', String(currentVehicleCount));
      params.set('marketAvg', String(Number(marketAvg.toFixed(2))));
      params.set('recommendedMin', String(Number(recommendedRange.min.toFixed(2))));
      params.set('recommendedMax', String(Number(recommendedRange.max.toFixed(2))));

      if (savedQuoteId) {
        params.set('quoteId', savedQuoteId);
      }

      const targetUrl = `/shipper/offer?${params.toString()}`;
      console.log('🚀 [QUOTE WIDGET CUSTOMER] Navigating to:', targetUrl);
      console.log('🚀 [QUOTE WIDGET CUSTOMER] vehicles param:', currentVehicleCount);
      
      navigate(targetUrl, { replace: false });
    } catch (err) {
      console.error('Quote submit error:', err);
      alert('Failed to submit your quote, please try again.');
    } finally {
      setIsSubmitting(false);
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

        {/* VEHICLES - Single Selection Only */}
        <div className="form-group">
          <label className="form-label">What vehicle would you like to ship?</label>
          <span className="vehicles-helper">Select your vehicle type</span>
          <div className="vehicle-chips-row">
            {mainVehicleTypes.map((type) => {
              const isSelected = type === 'Other' ? hasOtherTypes() : selectedVehicle === type;
              const disabled = type !== 'Other' && hasVehicleSelected && selectedVehicle !== type;

              return (
                <button
                  key={type}
                  type="button"
                  className={`qw-chip ${isSelected ? 'qw-active' : ''} ${disabled ? 'qw-disabled' : ''}`}
                  disabled={disabled}
                  onClick={() => handleVehicleSelect(type)}
                >
                  <span className="qw-chip-text">{type}</span>
                </button>
              );
            })}
          </div>

          {/* Vehicle Summary */}
          <div className="vehicle-summary-container">
            {hasVehicleSelected && (
              <div className="vehicle-summary">
                <div className="summary-text">
                  <span className="summary-label">Selected:</span>
                  <span className="summary-value">{selectedVehicle}</span>
                </div>
                <button type="button" className="summary-reset" onClick={resetVehicle}>Reset</button>
              </div>
            )}
          </div>
        </div>

        {/* OTHER VEHICLES PANEL */}
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
                        const isSelected = selectedVehicle === v;
                        const disabled = hasVehicleSelected && selectedVehicle !== v;
                        return (
                          <button
                            key={v}
                            type="button"
                            className={`qw-other-chip ${isSelected ? 'qw-active' : ''} ${disabled ? 'qw-disabled' : ''}`}
                            disabled={disabled}
                            onClick={() => {
                              if (selectedVehicle === v) {
                                setSelectedVehicle(null);
                              } else {
                                setSelectedVehicle(v);
                              }
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

export default QuoteWidgetCustomer;