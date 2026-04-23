// ============================================================
// FILE: src/components/load-details/components/payout-likelihood-card.jsx
// Pricing card showing price, likelihood, market avg
// ============================================================

import React from 'react';
import { formatPrice } from '../../../utils/formatters';

const PayoutLikelihoodCard = ({
  price,
  likelihood,
  marketAvg,
  pricePerMile,
  isCarrier,
}) => {
  return (
    <div className="ldm-section">
      <div className="ldm-box ldm-box--accent ldm-grid ldm-grid--3">
        <div className="ldm-field">
          <span className="ldm-field__label">{isCarrier ? 'Payout' : 'Price'}</span>
          <span className="ldm-field__value ldm-field__value--lg ldm-field__value--primary">
            {price != null ? formatPrice(price) : '—'}
          </span>
          {pricePerMile && (
            <span className="ldm-field__sub ldm-price-per-mile">{pricePerMile}</span>
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
