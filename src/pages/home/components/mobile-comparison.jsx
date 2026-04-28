import React from 'react';

// ============================================================================
// Mobile pricing comparison — STATIC marketing infographic.
//
// Mirrors the desktop QuoteSection cards: never reacts to widget state
// (vehicle selection, ZIPs, transport type, offer amount). Numbers are
// hardcoded against a fixed sample:
//
//   Sample shipment: NY 10001 → VA 23220, 338 mi, sedan, open transport
//   Carrier pay:  $701.90
//   Broker fee   (15%): $105.29   →  Customer pays $807.19
//   Platform fee  (6%): $42.11    →  Customer pays $744.01
//   Savings on fees:    $63.18    (≈ 60% off platform fee)
//
// If you change pricing logic in QuoteWidget, update these numbers manually
// (and the matching block in src/pages/home/sections/quote-section.jsx).
// ============================================================================
function MobileComparison() {
  return (
    <section className="mh-compare" aria-label="Pricing comparison">
      <header className="mh-compare-head">
        <span className="mh-compare-eyebrow">A new way to ship</span>
        <h2 className="mh-compare-title">
          Control the price from the first quote.
        </h2>
        <p className="mh-compare-lead">
          Traditional brokers set pricing. Jashi lets you make the offer.
        </p>
        <p className="mh-compare-meta">
          NY (10001) → VA (23220) · 338 mi
        </p>
      </header>

      <div className="mh-compare-card">
        {/* Traditional broker */}
        <div className="mh-compare-row mh-compare-row--broker">
          <div className="mh-compare-row-head">
            <span className="mh-compare-tag mh-compare-tag--bad">Traditional broker</span>
            <span className="mh-compare-fee">15% fee</span>
          </div>
          <ul className="mh-compare-attrs">
            <li>Broker controls price</li>
            <li>15% fee</li>
          </ul>
          <dl className="mh-compare-lines">
            <div className="mh-compare-line">
              <dt>Carrier pay</dt>
              <dd>$701.90</dd>
            </div>
            <div className="mh-compare-line">
              <dt>Broker fee 15%</dt>
              <dd>$105.29</dd>
            </div>
            <div className="mh-compare-line mh-compare-line--accent-bad">
              <dt>Extra broker cost</dt>
              <dd>$63.18</dd>
            </div>
          </dl>
          <div className="mh-compare-amount mh-compare-amount--bad">
            <span className="mh-compare-amount-prefix">Customer pays</span>
            <span className="mh-compare-amount-value">$807.19</span>
          </div>
        </div>

        <div className="mh-compare-divider" aria-hidden="true" />

        {/* Jashi Logistics */}
        <div className="mh-compare-row mh-compare-row--jashi">
          <div className="mh-compare-row-head">
            <span className="mh-compare-tag mh-compare-tag--good">Jashi Logistics</span>
            <span className="mh-compare-fee">6% fee</span>
          </div>
          <ul className="mh-compare-attrs">
            <li className="mh-compare-attrs--lead">
              <span className="mh-compare-attrs-badge" aria-hidden="true">Core</span>
              You set your offer
            </li>
            <li>6% platform fee</li>
          </ul>
          <dl className="mh-compare-lines">
            <div className="mh-compare-line">
              <dt>Carrier pay</dt>
              <dd>$701.90</dd>
            </div>
            <div className="mh-compare-line">
              <dt>Platform fee 6%</dt>
              <dd>$42.11</dd>
            </div>
            <div className="mh-compare-line mh-compare-line--accent-good">
              <dt>Estimated savings</dt>
              <dd>$63.18</dd>
            </div>
          </dl>
          <div className="mh-compare-amount mh-compare-amount--good">
            <span className="mh-compare-amount-prefix">Customer pays</span>
            <span className="mh-compare-amount-value">$744.01</span>
          </div>
        </div>

        <div className="mh-compare-savings">
          <div className="mh-compare-savings-line">
            <span>You save</span>
            <strong>$63.18</strong>
          </div>
          <div className="mh-compare-savings-sub">
            60% less in platform fees
          </div>
        </div>
      </div>

      <p className="mh-compare-disclaimer">
        Example based on sample shipment.
      </p>
    </section>
  );
}

export default MobileComparison;
