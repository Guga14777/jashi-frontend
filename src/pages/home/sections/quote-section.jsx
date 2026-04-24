import React, { useCallback, useState } from 'react';
import QuoteWidget from '../../../components/quote-widget/quote-widget';
import {
  computeFeeBreakdown,
  roundMoney,
  addMoney,
  formatMoney,
  BROKER_FEE_RATE,
  PLATFORM_FEE_RATE,
  BROKER_FEE_PCT_LABEL,
  PLATFORM_FEE_PCT_LABEL,
  SAVINGS_PCT_ON_FEES_LABEL,
} from '../../../utils/money';
import './quote-section.css';

const EMPTY_FORM_STATE = {
  pickupZip: '',
  dropoffZip: '',
  distanceMi: null,
  selectedVehicles: {},
  transportType: 'open',
  marketAvg: 0,
};

function QuoteSection() {
  // Single source of truth for the comparison cards: the live widget state.
  // distanceMi / marketAvg / ZIPs come straight from the form, so every
  // surface (distance badge, broker card, Jashi card) stays in sync.
  const [form, setForm] = useState(EMPTY_FORM_STATE);

  const handleWidgetStateChange = useCallback((next) => {
    setForm((prev) => {
      if (
        prev.pickupZip === next.pickupZip &&
        prev.dropoffZip === next.dropoffZip &&
        prev.distanceMi === next.distanceMi &&
        prev.transportType === next.transportType &&
        prev.marketAvg === next.marketAvg &&
        prev.selectedVehicles === next.selectedVehicles
      ) {
        return prev;
      }
      return { ...prev, ...next };
    });
  }, []);

  const hasQuote =
    Number.isFinite(form.distanceMi) &&
    form.distanceMi > 0 &&
    form.marketAvg > 0;

  const fees = hasQuote
    ? (() => {
        const marketAverage = roundMoney(form.marketAvg);
        const typical = computeFeeBreakdown(marketAverage, BROKER_FEE_RATE);
        const jashi = computeFeeBreakdown(marketAverage, PLATFORM_FEE_RATE);
        const miles = form.distanceMi;
        const typicalPerMile = miles > 0 ? typical.total / miles : 0;
        const jashiPerMile = miles > 0 ? jashi.total / miles : 0;
        const totalSavings = addMoney(typical.total, -jashi.total);
        // Savings on fees is structurally exact: (broker - platform) / broker.
        const savingsPercent =
          typical.fee > 0 ? ((typical.fee - jashi.fee) / typical.fee) * 100 : 0;
        return {
          marketAverage,
          typical: { brokerFee: typical.fee, total: typical.total, perMile: typicalPerMile },
          jashi: { platformFee: jashi.fee, total: jashi.total, perMile: jashiPerMile },
          savings: { total: totalSavings, percent: savingsPercent },
        };
      })()
    : null;

  const vehicleLabel = (() => {
    const keys = Object.keys(form.selectedVehicles || {});
    return keys.length > 0 ? keys.join(', ') : 'Your Vehicle';
  })();

  const routeLabel = hasQuote
    ? `${form.pickupZip} → ${form.dropoffZip} · ${Math.round(form.distanceMi)} mi`
    : null;

  const steps = [
    { number: '1', title: 'Set Your Price', description: 'Name your offer — you\'re in control of the price.' },
    { number: '2', title: 'Carriers Bid', description: 'Verified drivers compete to win your shipping job.' },
    { number: '3', title: 'Schedule Pickup', description: 'Pick the time window that fits your schedule.' },
    { number: '4', title: 'Secure Payment', description: 'Pay upfront or on delivery — card, transfer, or cash.' },
  ];

  const features = [
    { title: 'Direct Carrier Access', description: 'Skip middlemen, speak directly with your driver.' },
    { title: 'Live Market Rates', description: 'Real-time prices based on route and demand.' },
    { title: 'Full Transparency', description: 'See carrier payouts and all fees upfront.' },
    { title: 'Trusted & Insured', description: 'Secure payments with vetted, insured carriers.' },
  ];

  const renderTypicalCard = () => (
    <div className="qs-comparison-card qs-comparison-typical">
      <h4 className="qs-comparison-title">Typical Broker ({BROKER_FEE_PCT_LABEL} fee)</h4>
      <div className="qs-comparison-details">
        {hasQuote ? (
          <>
            <div className="qs-comparison-vehicle">{vehicleLabel}</div>
            <div className="qs-comparison-route">{routeLabel}</div>
            <div className="qs-comparison-breakdown">
              <div className="qs-comparison-line">
                <span>Base market rate:</span>
                <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
              </div>
              <div className="qs-comparison-line">
                <span>Broker fee {BROKER_FEE_PCT_LABEL}:</span>
                <span className="qs-comparison-value qs-fee-danger">${formatMoney(fees.typical.brokerFee)}</span>
              </div>
            </div>
            <div className="qs-comparison-total">
              <span className="qs-total-label">You pay:</span>
              <span className="qs-total-value qs-total-danger">${formatMoney(fees.typical.total)}</span>
            </div>
          </>
        ) : (
          <div className="qs-comparison-placeholder">Enter ZIPs to calculate distance</div>
        )}
      </div>
    </div>
  );

  const renderJashiCard = () => (
    <div className="qs-comparison-card qs-comparison-guga">
      {hasQuote && (
        <div className="qs-savings-badge">You save {SAVINGS_PCT_ON_FEES_LABEL} on fees</div>
      )}
      <h4 className="qs-comparison-title">Jashi Logistics ({PLATFORM_FEE_PCT_LABEL} fee)</h4>
      <div className="qs-comparison-details">
        {hasQuote ? (
          <>
            <div className="qs-comparison-vehicle">{vehicleLabel}</div>
            <div className="qs-comparison-route">{routeLabel}</div>
            <div className="qs-comparison-breakdown">
              <div className="qs-comparison-line">
                <span>Base market rate:</span>
                <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
              </div>
              <div className="qs-comparison-line">
                <span>Platform fee {PLATFORM_FEE_PCT_LABEL}:</span>
                <span className="qs-comparison-value qs-fee-success">${formatMoney(fees.jashi.platformFee)}</span>
              </div>
            </div>
            <div className="qs-comparison-total">
              <span className="qs-total-label">You pay:</span>
              <span className="qs-total-value qs-total-success">${formatMoney(fees.jashi.total)}</span>
            </div>
          </>
        ) : (
          <div className="qs-comparison-placeholder">Enter ZIPs to calculate distance</div>
        )}
      </div>
    </div>
  );

  return (
    <section className="quote-section" id="quote-widget">
      <div className="container">
        <div className="qs-grid">
          <div className="qs-column qs-left">
            <div className="qs-content-wrapper">
              <div className="qs-timeline">
                {steps.map((step, index) => (
                  <div key={index} className="qs-timeline-item">
                    <div className="qs-timeline-marker">
                      <div className={`qs-timeline-badge step-${index + 1}`}>
                        <span className="qs-timeline-number">{step.number}</span>
                      </div>
                      {index < steps.length - 1 && <div className="qs-timeline-arrow"></div>}
                    </div>
                    <div className="qs-timeline-content">
                      <h4 className="qs-timeline-title">{step.title}</h4>
                      <p className="qs-timeline-description">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="qs-comparison-wrapper desktop-only">
                {renderTypicalCard()}
              </div>
            </div>
          </div>

          <div className="qs-column qs-middle">
            <div className="qs-quote-wrap">
              <div className="qs-banner">
                <h2 className="qs-banner-title">Your Price. Your Way.</h2>
              </div>
              <QuoteWidget onStateChange={handleWidgetStateChange} />
            </div>
          </div>

          <div className="qs-column qs-right">
            <div className="qs-content-wrapper">
              <div className="qs-features-list">
                {features.map((feature, index) => (
                  <div key={index} className="qs-feature-item">
                    <h4 className="qs-feature-title">{feature.title}</h4>
                    <p className="qs-feature-description">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="qs-comparison-wrapper desktop-only">
                {renderJashiCard()}
              </div>
            </div>
          </div>
        </div>

        <div className="qs-comparison-mobile">
          <div className="qs-comparison-wrapper">{renderTypicalCard()}</div>
          <div className="qs-comparison-wrapper">{renderJashiCard()}</div>
        </div>
      </div>
    </section>
  );
}

export default QuoteSection;
