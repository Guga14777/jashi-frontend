// src/components/load-details/components/edit-booking-modal.jsx
// Customer-facing edit form for a booking. Surfaces the fields the backend
// allow-lists on PUT /api/bookings/:id — see booking.core.controller.cjs:792.
// Addresses are intentionally not editable here: they're coupled to pricing
// and carrier assignment; that flow needs product decisions before we wire it.

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import './edit-booking-modal.css';

const toDateInputValue = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const EditBookingModal = ({ open, onClose, onSubmit, booking, loading }) => {
  const [form, setForm] = useState({
    pickupDate: '',
    dropoffDate: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerInstructions: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !booking) return;
    setError(null);
    setForm({
      pickupDate: toDateInputValue(booking.pickupDate),
      dropoffDate: toDateInputValue(booking.dropoffDate),
      customerFirstName: booking.customerFirstName || booking.user?.firstName || '',
      customerLastName: booking.customerLastName || booking.user?.lastName || '',
      customerPhone: booking.customerPhone || booking.user?.phone || '',
      customerInstructions: booking.customerInstructions || booking.instructions || booking.notes || '',
    });
  }, [open, booking]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (form.pickupDate && form.dropoffDate) {
      const p = new Date(form.pickupDate);
      const d = new Date(form.dropoffDate);
      if (d < p) return 'Drop-off date cannot be before pickup date.';
    }
    if (form.customerPhone) {
      const digits = form.customerPhone.replace(/\D/g, '');
      if (digits.length < 10) return 'Phone must be at least 10 digits.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);

    const payload = {};
    Object.entries(form).forEach(([k, val]) => {
      if (val !== '' && val != null) payload[k] = val;
    });

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err?.message || 'Failed to save changes.');
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  return ReactDOM.createPortal(
    <div className="ebm-backdrop" onClick={handleBackdrop} role="presentation">
      <div
        className="ebm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ebm-title"
      >
        <div className="ebm-header">
          <div className="ebm-header__text">
            <h2 id="ebm-title" className="ebm-title">Edit shipment</h2>
            <p className="ebm-subtitle">
              Update pickup or drop-off dates, contact details, or carrier instructions. Address changes aren't available here — contact support to move the route.
            </p>
          </div>
          <button
            type="button"
            className="ebm-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ebm-body">
            <section className="ebm-section">
              <h3 className="ebm-section__title">Schedule</h3>
              <div className="ebm-field ebm-field--row">
                <div className="ebm-field">
                  <label className="ebm-label" htmlFor="ebm-pickup-date">Pickup date</label>
                  <input
                    id="ebm-pickup-date"
                    className="ebm-input"
                    type="date"
                    value={form.pickupDate}
                    onChange={setField('pickupDate')}
                    disabled={loading}
                  />
                </div>
                <div className="ebm-field">
                  <label className="ebm-label" htmlFor="ebm-dropoff-date">Drop-off date</label>
                  <input
                    id="ebm-dropoff-date"
                    className="ebm-input"
                    type="date"
                    value={form.dropoffDate}
                    onChange={setField('dropoffDate')}
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="ebm-helper">
                Changing dates after a carrier is assigned may require you to confirm with the carrier.
              </p>
            </section>

            <section className="ebm-section">
              <h3 className="ebm-section__title">Primary contact</h3>
              <div className="ebm-field ebm-field--row">
                <div className="ebm-field">
                  <label className="ebm-label" htmlFor="ebm-first">First name</label>
                  <input
                    id="ebm-first"
                    className="ebm-input"
                    type="text"
                    value={form.customerFirstName}
                    onChange={setField('customerFirstName')}
                    autoComplete="given-name"
                    disabled={loading}
                  />
                </div>
                <div className="ebm-field">
                  <label className="ebm-label" htmlFor="ebm-last">Last name</label>
                  <input
                    id="ebm-last"
                    className="ebm-input"
                    type="text"
                    value={form.customerLastName}
                    onChange={setField('customerLastName')}
                    autoComplete="family-name"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="ebm-field">
                <label className="ebm-label" htmlFor="ebm-phone">Contact phone</label>
                <input
                  id="ebm-phone"
                  className="ebm-input"
                  type="tel"
                  value={form.customerPhone}
                  onChange={setField('customerPhone')}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </section>

            <section className="ebm-section">
              <h3 className="ebm-section__title">Note for the carrier</h3>
              <div className="ebm-field">
                <textarea
                  className="ebm-textarea"
                  rows={3}
                  value={form.customerInstructions}
                  onChange={setField('customerInstructions')}
                  placeholder="e.g. Please call 30 minutes before arrival. Use the side gate."
                  disabled={loading}
                />
                <span className="ebm-helper">
                  Pickup and drop-off access details are set on the booking's steps — this field is for anything else.
                </span>
              </div>
            </section>

            {error && <div role="alert" className="ebm-error">{error}</div>}
          </div>

          <div className="ebm-footer">
            <button
              type="button"
              className="ebm-btn ebm-btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ebm-btn ebm-btn--primary"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditBookingModal;
