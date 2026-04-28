import React from 'react';
import QuoteWidget from '../../../components/quote-widget/quote-widget';
import './quote-section.css';

// ============================================================================
// The two side comparison cards are a STATIC marketing infographic.
// They never react to widget state (vehicle selection, ZIPs, transport type,
// offer amount). The numbers below are hardcoded against a fixed sample:
//
//   Sample shipment: NY 10001 → VA 23220, 338 mi, sedan, open transport
//   Carrier pay:  $701.90
//   Broker fee   (15%): $105.29   →  Customer pays $807.19
//   Platform fee  (6%): $42.11    →  Customer pays $744.01
//   Savings on fees:    $63.18    (≈ 60% off platform fee)
//
// If you change pricing logic in QuoteWidget, update these numbers manually.
// ============================================================================
function QuoteSection() {
  const steps = [
    { number: '1', title: 'Set Your Price', description: 'Choose the price you want to pay.' },
    { number: '2', title: 'Schedule Pickup', description: 'Set pickup, delivery and timing.' },
    { number: '3', title: 'Secure Payment', description: 'Pay the 6% fee and create your order.' },
    { number: '4', title: 'Carrier Accepts Shipment', description: 'Verified carriers accept through portal.' },
  ];

  const features = [
    { title: 'Direct Carrier Access', description: 'Skip middlemen, speak directly with your driver.' },
    { title: 'Live Market Rates', description: 'Real-time prices based on route and demand.' },
    { title: 'Full Transparency', description: 'See carrier payouts and all fees upfront.' },
    { title: 'Trusted & Insured', description: 'Secure payments with vetted, insured carriers.' },
  ];

  // Both cards render an identical row skeleton so heights match exactly:
  //   demo tag → route → 3 breakdown rows → total
  // The 3rd breakdown row mirrors across cards: broker shows the dollar
  // overhead the customer eats, Jashi shows the matching savings.
  const renderTypicalCard = () => (
    <div className="qs-comparison-card qs-comparison-typical">
      <h4 className="qs-comparison-title">Typical Broker (15% fee)</h4>
      <div className="qs-comparison-details">
        <div className="qs-comparison-tag-slot">
          <span className="qs-comparison-demo-tag">Example based on sample shipment</span>
        </div>
        <div className="qs-comparison-route">NY (10001) → VA (23220) · 338 mi</div>
        <div className="qs-comparison-breakdown">
          <div className="qs-comparison-line">
            <span>Carrier pay:</span>
            <span className="qs-comparison-value">$701.90</span>
          </div>
          <div className="qs-comparison-line">
            <span>Broker fee 15%:</span>
            <span className="qs-comparison-value qs-fee-danger">$105.29</span>
          </div>
          <div className="qs-comparison-callout qs-callout-danger">
            <span>Extra broker cost:</span>
            <span className="qs-comparison-callout-value qs-callout-value-danger">$63.18</span>
          </div>
        </div>
        <div className="qs-comparison-total">
          <span className="qs-total-label">Customer pays:</span>
          <span className="qs-total-value qs-total-danger">$807.19</span>
        </div>
      </div>
    </div>
  );

  const renderJashiCard = () => (
    <div className="qs-comparison-card qs-comparison-guga">
      <div className="qs-savings-badge">Save 60% on platform fees</div>
      <h4 className="qs-comparison-title">Jashi Logistics (6% fee)</h4>
      <div className="qs-comparison-details">
        <div className="qs-comparison-tag-slot">
          <span className="qs-comparison-demo-tag">Example based on sample shipment</span>
        </div>
        <div className="qs-comparison-route">NY (10001) → VA (23220) · 338 mi</div>
        <div className="qs-comparison-breakdown">
          <div className="qs-comparison-line">
            <span>Carrier pay:</span>
            <span className="qs-comparison-value">$701.90</span>
          </div>
          <div className="qs-comparison-line">
            <span>Platform fee 6%:</span>
            <span className="qs-comparison-value qs-fee-success">$42.11</span>
          </div>
          <div className="qs-comparison-callout qs-callout-success">
            <span>Estimated savings:</span>
            <span className="qs-comparison-callout-value qs-callout-value-success">$63.18</span>
          </div>
        </div>
        <div className="qs-comparison-total">
          <span className="qs-total-label">Customer pays:</span>
          <span className="qs-total-value qs-total-success">$744.01</span>
        </div>
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
