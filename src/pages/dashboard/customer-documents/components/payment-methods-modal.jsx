// src/pages/dashboard/customer-documents/components/payment-methods-modal.jsx
import React, { useMemo, useState } from 'react';
import './payment-methods-modal.css';

const luhn = (num) => {
  const s = (num || '').replace(/\D/g, '');
  let sum = 0, flip = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (flip) { n *= 2; if (n > 9) n -= 9; }
    sum += n; flip = !flip;
  }
  return s.length >= 12 && (sum % 10 === 0);
};

const brandFromPAN = (pan) => {
  const n = (pan || '').replace(/\s|-/g, '');
  if (/^4\d{12,18}$/.test(n)) return 'visa';
  if (/^5[1-5]\d{14}$/.test(n) || /^2(2[2-9]|[3-6]\d|7[0-1]|720)\d{12}$/.test(n)) return 'mastercard';
  if (/^3[47]\d{13}$/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return 'card';
};

const maskPan = (pan) =>
  (pan || '').replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();

const normalizeExpiry = (v) => {
  const s = v.replace(/\D/g, '').slice(0, 4);
  if (s.length <= 2) return s;
  return `${s.slice(0, 2)}/${s.slice(2)}`;
};

const isValidExpiry = (mmYY) => {
  const m = mmYY.split('/');
  if (m.length !== 2) return false;
  const [mm, yy] = m;
  const month = parseInt(mm, 10);
  if (!(month >= 1 && month <= 12)) return false;
  const year = 2000 + parseInt(yy, 10);
  const exp = new Date(year, month, 1);
  const now = new Date();
  exp.setMonth(exp.getMonth(), 1); // 1st day next month
  return exp > now;
};

const CardRow = ({ card, onDefault, onDelete }) => (
  <div className="pm-card">
    <div className="pm-card-left">
      <div className={`pm-brand ${card.brand}`} aria-hidden />
      <div className="pm-card-meta">
        <div className="pm-card-line">
          **** **** **** {card.last4}
          {card.isDefault && <span className="pm-badge">Default</span>}
        </div>
        <div className="pm-card-sub">
          Expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
          {card.name ? ` • ${card.name}` : ''}
        </div>
      </div>
    </div>
    <div className="pm-card-actions">
      {!card.isDefault && (
        <button className="pm-btn ghost" onClick={() => onDefault(card.id)}>
          Set as default
        </button>
      )}
      <button className="pm-btn danger" onClick={() => onDelete(card.id)}>
        Delete
      </button>
    </div>
  </div>
);

const emptyForm = { pan: '', expiry: '', cvc: '', name: '', postal: '' };

export default function PaymentMethodsModal({ initialCards = [], onSave, onClose }) {
  const [cards, setCards] = useState(() => initialCards);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    const cleaned = form.pan.replace(/\D/g, '');
    return (
      luhn(cleaned) &&
      isValidExpiry(form.expiry) &&
      /^\d{3,4}$/.test(form.cvc)
    );
  }, [form]);

  const addCard = async (e) => {
    e?.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('Please enter a valid card, expiry, and CVC.');
      return;
    }
    setSubmitting(true);
    try {
      // Normally you would tokenize with your PSP here (Stripe, etc.)
      const cleaned = form.pan.replace(/\D/g, '');
      const brand = brandFromPAN(cleaned);
      const [mm, yy] = form.expiry.split('/');
      const newCard = {
        id: `card_${Date.now()}`,
        brand,
        last4: cleaned.slice(-4),
        expMonth: parseInt(mm, 10),
        expYear: 2000 + parseInt(yy, 10),
        name: form.name.trim(),
        postal: form.postal.trim(),
        isDefault: cards.length === 0 // first card becomes default
      };
      const next = [...cards, newCard];
      setCards(next);
      setForm(emptyForm);
    } catch {
      setError('Something went wrong adding your card.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDefault = (id) => {
    setCards((prev) => prev.map(c => ({ ...c, isDefault: c.id === id })));
  };

  const removeCard = (id) => {
    setCards((prev) => {
      const filtered = prev.filter(c => c.id !== id);
      // ensure one default if any remain
      if (filtered.length && !filtered.some(c => c.isDefault)) {
        filtered[0].isDefault = true;
      }
      return [...filtered];
    });
  };

  const handleSave = () => {
    onSave?.(cards);
  };

  return (
    <div className="pmodal-backdrop" role="dialog" aria-modal="true" aria-label="Manage payment methods">
      <div className="pmodal">
        <div className="pmodal-header">
          <h2>Manage payment methods</h2>
          <button className="pm-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="pmodal-body">
          {/* Saved cards */}
          {cards.length > 0 ? (
            <div className="pm-cards-list">
              {cards.map((c) => (
                <CardRow
                  key={c.id}
                  card={c}
                  onDefault={setDefault}
                  onDelete={removeCard}
                />
              ))}
            </div>
          ) : (
            <div className="pm-empty">
              <p>You don’t have any saved cards yet.</p>
            </div>
          )}

          {/* Divider */}
          <div className="pm-divider" />

          {/* Add new card */}
          <form className="pm-form" onSubmit={addCard}>
            <h3>Add a new card</h3>

            <label className="pm-field">
              <span>Card number</span>
              <input
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                value={maskPan(form.pan)}
                onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
              />
            </label>

            <div className="pm-row">
              <label className="pm-field">
                <span>Expiry</span>
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  value={normalizeExpiry(form.expiry)}
                  onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                />
              </label>
              <label className="pm-field">
                <span>CVC</span>
                <input
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="CVC"
                  value={form.cvc.replace(/\D/g, '').slice(0, 4)}
                  onChange={(e) => setForm((f) => ({ ...f, cvc: e.target.value }))}
                />
              </label>
            </div>

            <div className="pm-row">
              <label className="pm-field">
                <span>Name on card (optional)</span>
                <input
                  autoComplete="cc-name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="pm-field">
                <span>ZIP / Postal (optional)</span>
                <input
                  autoComplete="postal-code"
                  placeholder="ZIP"
                  value={form.postal}
                  onChange={(e) => setForm((f) => ({ ...f, postal: e.target.value }))}
                />
              </label>
            </div>

            {error && <div className="pm-error">{error}</div>}

            <div className="pm-actions">
              <button type="submit" className="pm-btn primary" disabled={!canSubmit || submitting}>
                {submitting ? 'Adding…' : 'Add card'}
              </button>
            </div>
          </form>
        </div>

        <div className="pmodal-footer">
          <button className="pm-btn ghost" onClick={onClose}>Cancel</button>
          <button className="pm-btn primary" onClick={handleSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
