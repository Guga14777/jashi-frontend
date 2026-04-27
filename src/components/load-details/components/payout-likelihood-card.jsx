// ============================================================
// FILE: src/components/load-details/components/payout-likelihood-card.jsx
// Pricing card showing price, likelihood, market avg
// ============================================================

import React from 'react';
import { formatPrice } from '../../../utils/formatters';

// Price-per-mile coming from the hook is a bare numeric string like
// "2.96". Format it as "$2.96/mile" with proper rounding, and hide the
// line entirely when there's nothing meaningful to show.
const formatPricePerMile = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `$${num.toFixed(2)}/mile`;
};

const PayoutLikelihoodCard = ({
  price,
  likelihood,
  marketAvg,
  pricePerMile,
  isCarrier,
}) => {
  const pricePerMileLabel = formatPricePerMile(pricePerMile);

  return (
    <div className="ldm-section">
      <div className="ldm-box ldm-box--accent ldm-grid ldm-grid--3">
        <div className="ldm-field">
          <span className="ldm-field__label">{isCarrier ? 'Payout' : 'Price'}</span>
          <span className="ldm-field__value ldm-field__value--lg ldm-field__value--primary">
            {price != null ? formatPrice(price) : '—'}
          </span>
          {pricePerMileLabel && (
            <span className="ldm-field__sub ldm-price-per-mile">{pricePerMileLabel}</span>
          )}
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Likelihood</span>
          <span className="ldm-field__value ldm-field__value--lg ldm-field__value--success">
            {likelihood != null && likelihood > 0 ? `${likelihood}%` : '—'}
          </span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Market Avg</span>
          <span className="ldm-field__value ldm-field__value--lg">
            {marketAvg != null && marketAvg > 0 ? formatPrice(marketAvg) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayoutLikelihoodCard;
