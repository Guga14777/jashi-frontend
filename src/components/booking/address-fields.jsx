// src/components/booking/address-fields.jsx
import React from 'react';

export default function AddressFields({ label, value, onChange, disabled }) {
  const v = value || {};
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });

  return (
    <div className="address-fields">
      <h4 className="af-title">{label}</h4>
      <div className="af-grid">
        <input disabled={disabled} value={v.name || ''} onChange={set('name')} className="af-input" placeholder="Contact name" />
        <input disabled={disabled} value={v.phone || ''} onChange={set('phone')} className="af-input" placeholder="Phone" />
        <input disabled={disabled} value={v.email || ''} onChange={set('email')} className="af-input" placeholder="Email" />
        <input disabled={disabled} value={v.street || ''} onChange={set('street')} className="af-input" placeholder="Street address" />
        <input disabled={disabled} value={v.city || ''} onChange={set('city')} className="af-input" placeholder="City" />
        <input disabled={disabled} value={v.state || ''} onChange={set('state')} className="af-input" placeholder="State (e.g., NY)" />
        <input disabled={disabled} value={v.zip || ''} onChange={set('zip')} maxLength={5} className="af-input" placeholder="ZIP" />
      </div>
    </div>
  );
}
