// ============================================================
// FILE: src/components/load-details/components/customer-card.jsx
// Customer information display card
// ============================================================

import React from 'react';

const CustomerCard = ({ customer }) => {
  if (!customer) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Customer</div>
      <div className="ldm-box ldm-grid ldm-grid--3">
        <div className="ldm-field">
          <span className="ldm-field__label">Name</span>
          <span className="ldm-field__value">{customer.name || '—'}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Phone</span>
          {customer.phone ? (
            <a href={`tel:${customer.phone}`} className="ldm-link">{customer.phone}</a>
          ) : <span className="ldm-field__value">—</span>}
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Email</span>
          {customer.email ? (
            <a href={`mailto:${customer.email}`} className="ldm-link">{customer.email}</a>
          ) : <span className="ldm-field__value">—</span>}
        </div>
      </div>
    </div>
  );
};

// Carrier information display card
export const CarrierCard = ({ carrier }) => {
  if (!carrier) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Assigned Carrier</div>
      <div className="ldm-box ldm-grid ldm-grid--3">
        <div className="ldm-field">
          <span className="ldm-field__label">Company</span>
          <span className="ldm-field__value">{carrier.name || '—'}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Phone</span>
          {carrier.phone ? (
            <a href={`tel:${carrier.phone}`} className="ldm-link">{carrier.phone}</a>
          ) : <span className="ldm-field__value">—</span>}
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Email</span>
          {carrier.email ? (
            <a href={`mailto:${carrier.email}`} className="ldm-link">{carrier.email}</a>
          ) : <span className="ldm-field__value">—</span>}
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
