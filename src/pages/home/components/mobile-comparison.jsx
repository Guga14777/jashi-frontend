import React from 'react';

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

// Same illustrative state the desktop QuoteSection uses, kept in sync so the
// mobile + desktop story tells the exact same dollar figures before the user
// has entered ZIPs.
const DEMO_SAMPLE = {
  vehicleLabel: 'Mercedes AMG CLA 45 2025',
  routeLabel: 'NY (10001) → VA (23220) · 338 mi',
  marketAverage: 701.90,
};

function buildFees(marketAverage) {
  const base = roundMoney(marketAverage);
  const typical = computeFeeBreakdown(base, BROKER_FEE_RATE);
  const jashi = computeFeeBreakdown(base, PLATFORM_FEE_RATE);
  return {
    marketAverage: base,
    typical: { brokerFee: typical.fee, total: typical.total },
    jashi: { platformFee: jashi.fee, total: jashi.total },
    savings: { total: addMoney(typical.total, -jashi.total) },
  };
}

const DEMO_FEES = buildFees(DEMO_SAMPLE.marketAverage);

function MobileComparison({ form }) {
  const hasQuote =
    form &&
    Number.isFinite(form.distanceMi) &&
    form.distanceMi > 0 &&
    form.marketAvg > 0;

  const fees = hasQuote ? buildFees(form.marketAvg) : DEMO_FEES;

  const vehicleLabel = (() => {
    const keys = Object.keys(form?.selectedVehicles || {});
    return keys.length > 0 ? keys.join(', ') : DEMO_SAMPLE.vehicleLabel;
  })();

  const routeLabel = hasQuote
    ? `${form.pickupZip} → ${form.dropoffZip} · ${Math.round(form.distanceMi)} mi`
    : DEMO_SAMPLE.routeLabel;

  return (
    <section className="mh-compare" aria-label="Pricing comparison">
      <header className="mh-compare-head">
        <span className="mh-compare-eyebrow">A new way to ship</span>
        <h2 className="mh-compare-title">
          The first platform where you control the price.
        </h2>
        <p className="mh-compare-lead">
          Traditional brokers set pricing. Jashi lets you make the offer.
        </p>
        <p className="mh-compare-meta">
          {hasQuote ? vehicleLabel : DEMO_SAMPLE.vehicleLabel} · {routeLabel}
        </p>
      </header>

      <div className="mh-compare-card">
        {/* Traditional broker */}
        <div className="mh-compare-row mh-compare-row--broker">
          <div className="mh-compare-row-head">
            <span className="mh-compare-tag mh-compare-tag--bad">Traditional broker</span>
            <span className="mh-compare-fee">{BROKER_FEE_PCT_LABEL} fee</span>
          </div>
          <ul className="mh-compare-attrs">
            <li>Broker controls price</li>
            <li>{BROKER_FEE_PCT_LABEL} fee</li>
          </ul>
          <dl className="mh-compare-lines">
            <div className="mh-compare-line">
              <dt>Carrier pay</dt>
              <dd>${formatMoney(fees.marketAverage)}</dd>
            </div>
            <div className="mh-compare-line">
              <dt>Broker fee {BROKER_FEE_PCT_LABEL}</dt>
              <dd>${formatMoney(fees.typical.brokerFee)}</dd>
            </div>
            <div className="mh-compare-line mh-compare-line--accent-bad">
              <dt>Broker markup</dt>
              <dd>${formatMoney(fees.savings.total)}</dd>
            </div>
          </dl>
          <div className="mh-compare-amount mh-compare-amount--bad">
            <span className="mh-compare-amount-prefix">Customer pays</span>
            <span className="mh-compare-amount-value">${formatMoney(fees.typical.total)}</span>
          </div>
        </div>

        <div className="mh-compare-divider" aria-hidden="true" />

        {/* Jashi Logistics */}
        <div className="mh-compare-row mh-compare-row--jashi">
          <div className="mh-compare-row-head">
            <span className="mh-compare-tag mh-compare-tag--good">Jashi Logistics</span>
            <span className="mh-compare-fee">{PLATFORM_FEE_PCT_LABEL} fee</span>
          </div>
          <ul className="mh-compare-attrs">
            <li className="mh-compare-attrs--lead">
              <span className="mh-compare-attrs-badge" aria-hidden="true">Core</span>
              You set your offer
            </li>
            <li>{PLATFORM_FEE_PCT_LABEL} platform fee</li>
          </ul>
          <dl className="mh-compare-lines">
            <div className="mh-compare-line">
              <dt>Carrier pay</dt>
              <dd>${formatMoney(fees.marketAverage)}</dd>
            </div>
            <div className="mh-compare-line">
              <dt>Platform fee {PLATFORM_FEE_PCT_LABEL}</dt>
              <dd>${formatMoney(fees.jashi.platformFee)}</dd>
            </div>
            <div className="mh-compare-line mh-compare-line--accent-good">
              <dt>Estimated savings</dt>
              <dd>${formatMoney(fees.savings.total)}</dd>
            </div>
          </dl>
          <div className="mh-compare-amount mh-compare-amount--good">
            <span className="mh-compare-amount-prefix">Customer pays</span>
            <span className="mh-compare-amount-value">${formatMoney(fees.jashi.total)}</span>
          </div>
        </div>

        <div className="mh-compare-savings">
          <div className="mh-compare-savings-line">
            <span>You save</span>
            <strong>${formatMoney(fees.savings.total)}</strong>
          </div>
          <div className="mh-compare-savings-sub">
            {SAVINGS_PCT_ON_FEES_LABEL} less in platform fees
          </div>
        </div>
      </div>

      <p className="mh-compare-disclaimer">
        {hasQuote ? 'Live quote based on your route and vehicle.' : 'Example based on sample shipment.'}
      </p>
    </section>
  );
}

export default MobileComparison;
