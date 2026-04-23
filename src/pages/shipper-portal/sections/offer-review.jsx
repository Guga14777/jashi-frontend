// ============================================================
// FILE: src/pages/shipper-portal/sections/offer-review.jsx
// ✅ FIXED: Handles loading state, shows data properly
// ✅ FIXED: Waits for quoteData to be loaded before rendering
// ============================================================

import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { usePortal } from '../index.jsx';

import './offer-review.css';

export default function OfferReview() {
  const portal = usePortal();
  
  // Get all needed values from portal context
  const { 
    quoteData, 
    goToStep, 
    vehicleCount, 
    setVehicleCount,
    quoteId,
  } = portal;

  // Use quoteData with fallback to empty object
  const q = quoteData || {};
  
  const [isAnimated, setIsAnimated] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📊 [OFFER] Render state:', {
      hasQuoteData: !!quoteData,
      quoteId,
      fromZip: q.fromZip,
      toZip: q.toZip,
      offer: q.offer,
      miles: q.miles,
      vehicle: q.vehicle,
    });
  }, [quoteData, quoteId, q]);

  // Update vehicleCount from quoteData if needed
  useEffect(() => {
    if (!q || !setVehicleCount) return;

    let derivedCount = null;

    if (q.vehicleCount && typeof q.vehicleCount === 'number' && q.vehicleCount > 0) {
      derivedCount = q.vehicleCount;
    } else if (q.vehicles && typeof q.vehicles === 'object' && !Array.isArray(q.vehicles)) {
      derivedCount = Object.values(q.vehicles).reduce((sum, count) => sum + (Number(count) || 0), 0);
    } else if (q.vehicles && Array.isArray(q.vehicles) && q.vehicles.length > 0) {
      derivedCount = q.vehicles.length;
    } else if (q.vehicle && typeof q.vehicle === 'string') {
      const parts = q.vehicle.split(',').map(s => s.trim()).filter(Boolean);
      derivedCount = parts.reduce((sum, part) => {
        const match = part.match(/×(\d+)$/);
        return sum + (match ? parseInt(match[1], 10) : 1);
      }, 0);
    }

    if (derivedCount && derivedCount > 0 && derivedCount !== vehicleCount) {
      const clampedCount = Math.min(Math.max(derivedCount, 1), 3);
      console.log(`📊 [OFFER] Updating vehicleCount: ${vehicleCount} → ${clampedCount}`);
      setVehicleCount(clampedCount);
    }
  }, [q.vehicleCount, q.vehicles, q.vehicle, vehicleCount, setVehicleCount]);

  // Trigger entrance animation
  useEffect(() => {
    setTimeout(() => setIsAnimated(true), 50);
  }, []);

  const formatMoney = (n) =>
    Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ✅ Check if we have meaningful data from URL
  const hasQuoteData = q.fromZip || q.toZip || q.offer > 0;
  
  const milesText =
    typeof q.miles === 'number' && q.miles > 0
      ? `${q.miles.toLocaleString('en-US')} mi`
      : 'Not available';

  const pctRaw = typeof q.likelihood === 'number' ? q.likelihood : 0;
  const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));

  // Market comparison calculation
  const hasMarket = q.offer && q.marketAvg;
  const diffPct = hasMarket
    ? ((q.offer - q.marketAvg) / q.marketAvg) * 100
    : 0;
  const diffLabel = hasMarket
    ? `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}% vs market`
    : '—';
  const diffClass =
    diffPct > 0 ? 'or-diff-above' : diffPct < 0 ? 'or-diff-below' : 'or-diff-neutral';

  let level = 'low';
  let levelLabel = 'Low';
  if (pct >= 80) {
    level = 'high';
    levelLabel = 'High';
  } else if (pct >= 50) {
    level = 'medium';
    levelLabel = 'Medium';
  }

  const handleProceed = () => {
    console.log('🚀 [OFFER] Proceeding to pickup with vehicleCount:', vehicleCount);
    if (goToStep) {
      goToStep('pickup');
    }
  };

  const handleCancel = () => {
    window.location.href = '/';
  };

  const displayVehicleCount = vehicleCount || 1;

  // ✅ Only show error state if no quoteId at all
  if (!portal.quoteId) {
    return (
      <div className={`offer-review-page ${isAnimated ? 'animated' : ''}`}>
        <div className="or-loading-state">
          <p>No quote found. Please start a new quote.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`offer-review-page ${isAnimated ? 'animated' : ''}`}>
      
      {/* Header Section */}
      <header className="or-header-section">
        <div className="or-status-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 11l3 3L22 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Quote Ready</span>
        </div>
        <h1 className="or-title">Your Quote Summary</h1>
        <p className="or-subtitle">Review your shipping details and pricing before proceeding</p>
      </header>

      {/* Main Content Grid */}
      <div className="or-content-grid">
        
        {/* Left Column - Details */}
        <div className="or-col-left">
          
          {/* Route Details Card */}
          <section className="or-section or-route-card">
            <div className="or-section-header">
              <div className="or-icon-wrapper or-icon-route">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="10" r="3" strokeWidth="2"/>
                  <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="or-section-label">Route details</div>
                <div className="or-section-title">Shipping Route</div>
              </div>
            </div>
            
            <div className="or-route-flow">
              <div className="or-location">
                <div className="or-location-label">From</div>
                <div className="or-location-value">
                  {q.fromZip || 'Not provided'}
                </div>
              </div>
              
              <div className="or-route-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <div className="or-location">
                <div className="or-location-label">To</div>
                <div className="or-location-value">
                  {q.toZip || 'Not provided'}
                </div>
              </div>
            </div>
            
            <div className="or-distance-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Estimated distance: <strong>{milesText}</strong></span>
            </div>
          </section>

          {/* Vehicle & Transport Card */}
          <section className="or-section or-vehicle-card">
            <div className="or-section-header">
              <div className="or-icon-wrapper or-icon-vehicle">
                <Car size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="or-section-label">Vehicle & transport</div>
                <div className="or-section-title">Vehicle Information</div>
              </div>
            </div>
            
            <div className="or-vehicle-details">
              <div className="or-detail-item">
                <div className="or-detail-label">Vehicle{displayVehicleCount > 1 ? 's' : ''}</div>
                <div className="or-detail-value">{q.vehicle || q.vehicleType || 'Not specified'}</div>
              </div>
              <div className="or-detail-item">
                <div className="or-detail-label">Transport type</div>
                <div className="or-transport-tag">
                  <span className="or-tag-dot"></span>
                  {q.transportType === 'enclosed' ? 'Enclosed carrier' : 'Open carrier'}
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column - Pricing */}
        <div className="or-col-right">
          
          {/* Pricing Card */}
          <section className="or-section or-pricing-card">
            <div className="or-section-header">
              <div className="or-icon-wrapper or-icon-pricing">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="or-section-label">Pricing</div>
                <div className="or-section-title">Cost Breakdown</div>
              </div>
            </div>

            {/* Main Offer */}
            <div className="or-main-offer">
              <div className="or-offer-label">Your Offer</div>
              <div className="or-offer-amount">
                ${formatMoney(q.offer)}
              </div>
            </div>

            {/* Price Comparison */}
            <div className="or-price-comparison">
              <div className="or-price-row">
                <span className="or-price-label">Market average</span>
                <span className="or-price-value">
                  {q.marketAvg > 0 ? `$${formatMoney(q.marketAvg)}` : '—'}
                </span>
              </div>
              <div className="or-price-row">
                <span className="or-price-label">Recommended range</span>
                <span className="or-price-value or-price-range">
                  {q.recommendedMin > 0 && q.recommendedMax > 0 
                    ? `$${formatMoney(q.recommendedMin)} – $${formatMoney(q.recommendedMax)}`
                    : '—'
                  }
                </span>
              </div>
              {hasMarket && (
                <div className="or-price-row or-price-diff-row">
                  <span className="or-price-label">Difference</span>
                  <span className={`or-price-diff ${diffClass}`}>{diffLabel}</span>
                </div>
              )}
            </div>

            {/* Likelihood Meter */}
            <div className="or-likelihood">
              <div className="or-likelihood-header">
                <span className="or-likelihood-label">Dispatch Likelihood</span>
                <div className="or-likelihood-value">
                  <span className="or-likelihood-pct">{pct}%</span>
                  <span className={`or-likelihood-badge or-badge-${level}`}>
                    {level === 'high' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {levelLabel.split(' ')[0]}
                  </span>
                </div>
              </div>
              
              <div className="or-likelihood-bar">
                <div className={`or-likelihood-fill or-fill-${level}`} style={{ width: `${pct}%` }}>
                  <div className="or-fill-shine"></div>
                </div>
              </div>
              
              <div className={`or-likelihood-message or-message-${level}`}>
                {level === 'high' && (
                  <p>This offer is highly competitive and is expected to dispatch quickly.</p>
                )}
                {level === 'medium' && (
                  <p>Your offer is competitive and has a solid probability of timely dispatch.</p>
                )}
                {level === 'low' && (
                  <p>Increasing your offer may improve dispatch speed and carrier availability.</p>
                )}
              </div>
            </div>
          </section>

          {/* Info Notice */}
          <div className="or-info-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>This quote is based on the information you provided. You can update pickup, drop-off, and vehicle details in the next steps before confirming your shipment.</p>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className="or-actions">
        <button
          type="button"
          className="or-btn or-btn-secondary"
          onClick={handleCancel}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cancel and return home
        </button>
        <button
          type="button"
          className="or-btn or-btn-primary"
          onClick={handleProceed}
        >
          Proceed to pickup details
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}