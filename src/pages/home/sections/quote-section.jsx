import React, { useState, useEffect } from 'react';
import QuoteWidget from '../../../components/quote-widget/quote-widget';
import { computeFeeBreakdown, roundMoney, addMoney, formatMoney } from '../../../utils/money';
import './quote-section.css';

function QuoteSection() {
  const [quoteData, setQuoteData] = useState({
    vehicle: '',
    fromZip: '',
    toZip: '',
    miles: 0,
    shippingPrice: 0,
    transportType: '',
    isComplete: false
  });

  useEffect(() => {
    // Correct calculation for 344 miles sedan:
    // 0-50: $150, 50-100: $200, 100-200: 100×$1.80=$180, 200-344: 144×$1.70=$244.80
    // Total: $774.80
    setQuoteData({
      vehicle: 'mercedes AMG CLA 45 2025',
      fromZip: '10001',
      toZip: '23220',
      miles: 344,
      shippingPrice: 774.80,
      transportType: 'open',
      isComplete: true
    });
  }, []);

  const calculateFees = () => {
    const baseRate = roundMoney(quoteData.shippingPrice);
    // Market average = base × 1.08, rounded once to cents so every downstream
    // fee/total is derived from the displayed value (no penny drift).
    const marketAverage = roundMoney(quoteData.shippingPrice * 1.08);
    const carrierPayout = roundMoney(baseRate * (1 - 0.125));

    const typical = computeFeeBreakdown(marketAverage, 0.15);
    const guga = computeFeeBreakdown(marketAverage, 0.03);

    const typicalPerMile = quoteData.miles > 0 ? typical.total / quoteData.miles : 0;
    const gugaPerMile = quoteData.miles > 0 ? guga.total / quoteData.miles : 0;

    const totalSavings = addMoney(typical.total, -guga.total);
    // Savings on fees is structurally exact: (15 - 3) / 15 = 80%.
    const savingsPercent = typical.fee > 0 ? ((typical.fee - guga.fee) / typical.fee) * 100 : 0;
    const perMileSavings = typicalPerMile - gugaPerMile;

    return {
      baseRate,
      marketAverage,
      carrierPayout,
      typical: { brokerFee: typical.fee, total: typical.total, perMile: typicalPerMile },
      guga: { platformFee: guga.fee, total: guga.total, perMile: gugaPerMile },
      savings: { total: totalSavings, percent: savingsPercent, perMile: perMileSavings }
    };
  };

  const fees = quoteData.isComplete ? calculateFees() : null;

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

              {quoteData.isComplete && fees && (
                <div className="qs-comparison-wrapper desktop-only">
                  <div className="qs-comparison-card qs-comparison-typical">
                    <h4 className="qs-comparison-title">Typical Broker (15% fee)</h4>
                    <div className="qs-comparison-details">
                      <div className="qs-comparison-vehicle">Mercedes AMG CLA 45 2025</div>
                      <div className="qs-comparison-route">NY (10001) → VA (23220) · {quoteData.miles} mi</div>
                      <div className="qs-comparison-breakdown">
                        <div className="qs-comparison-line">
                          <span>Base market rate:</span>
                          <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
                        </div>
                        <div className="qs-comparison-line">
                          <span>Broker fee 15%:</span>
                          <span className="qs-comparison-value qs-fee-danger">${formatMoney(fees.typical.brokerFee)}</span>
                        </div>
                      </div>
                      <div className="qs-comparison-total">
                        <span className="qs-total-label">You pay:</span>
                        <span className="qs-total-value qs-total-danger">${formatMoney(fees.typical.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="qs-column qs-middle">
            <div className="qs-quote-wrap">
              <div className="qs-banner">
                <h2 className="qs-banner-title">Your Price. Your Way.</h2>
              </div>
              <QuoteWidget />
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

              {quoteData.isComplete && fees && (
                <div className="qs-comparison-wrapper desktop-only">
                  <div className="qs-comparison-card qs-comparison-guga">
                    <div className="qs-savings-badge">You save 80% on fees</div>
                    <h4 className="qs-comparison-title">Guga (3% fee)</h4>
                    <div className="qs-comparison-details">
                      <div className="qs-comparison-vehicle">Mercedes AMG CLA 45 2025</div>
                      <div className="qs-comparison-route">NY (10001) → VA (23220) · {quoteData.miles} mi</div>
                      <div className="qs-comparison-breakdown">
                        <div className="qs-comparison-line">
                          <span>Base market rate:</span>
                          <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
                        </div>
                        <div className="qs-comparison-line">
                          <span>Platform fee 3%:</span>
                          <span className="qs-comparison-value qs-fee-success">${formatMoney(fees.guga.platformFee)}</span>
                        </div>
                      </div>
                      <div className="qs-comparison-total">
                        <span className="qs-total-label">You pay:</span>
                        <span className="qs-total-value qs-total-success">${formatMoney(fees.guga.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {quoteData.isComplete && fees && (
          <div className="qs-comparison-mobile">
            <div className="qs-comparison-wrapper">
              <div className="qs-comparison-card qs-comparison-typical">
                <h4 className="qs-comparison-title">Typical Broker (15% fee)</h4>
                <div className="qs-comparison-details">
                  <div className="qs-comparison-vehicle">Mercedes AMG CLA 45 2025</div>
                  <div className="qs-comparison-route">NY (10001) → VA (23220) · {quoteData.miles} mi</div>
                  <div className="qs-comparison-breakdown">
                    <div className="qs-comparison-line">
                      <span>Base market rate:</span>
                      <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
                    </div>
                    <div className="qs-comparison-line">
                      <span>Broker fee 15%:</span>
                      <span className="qs-comparison-value qs-fee-danger">${formatMoney(fees.typical.brokerFee)}</span>
                    </div>
                  </div>
                  <div className="qs-comparison-total">
                    <span className="qs-total-label">You pay:</span>
                    <span className="qs-total-value qs-total-danger">${formatMoney(fees.typical.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="qs-comparison-wrapper">
              <div className="qs-comparison-card qs-comparison-guga">
                <div className="qs-savings-badge">You save 80% on fees</div>
                <h4 className="qs-comparison-title">Guga (3% fee)</h4>
                <div className="qs-comparison-details">
                  <div className="qs-comparison-vehicle">Mercedes AMG CLA 45 2025</div>
                  <div className="qs-comparison-route">NY (10001) → VA (23220) · {quoteData.miles} mi</div>
                  <div className="qs-comparison-breakdown">
                    <div className="qs-comparison-line">
                      <span>Base market rate:</span>
                      <span className="qs-comparison-value">${formatMoney(fees.marketAverage)}</span>
                    </div>
                    <div className="qs-comparison-line">
                      <span>Platform fee 3%:</span>
                      <span className="qs-comparison-value qs-fee-success">${formatMoney(fees.guga.platformFee)}</span>
                    </div>
                  </div>
                  <div className="qs-comparison-total">
                    <span className="qs-total-label">You pay:</span>
                    <span className="qs-total-value qs-total-success">${formatMoney(fees.guga.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default QuoteSection;