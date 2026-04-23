// src/components/admin/admin-action-modal.jsx
// Lightweight confirm/prompt modal for admin ops (status change, reassign,
// cancel, detention approve/deny, CNP resolve). One modal, many fields.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';
import './admin-action-modal.css';

export default function AdminActionModal({
  title,
  description,
  fields = [],
  onConfirm,
  onClose,
  confirmLabel = 'Confirm',
  confirmTone = 'primary', // 'primary' | 'danger' | 'warn'
  destructive = false,
}) {
  const [values, setValues] = useState(() =>
    fields.reduce((acc, f) => ({ ...acc, [f.name]: f.initial ?? '' }), {})
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleConfirm = async () => {
    setError(null);
    // client-side required check
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? '').trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await onConfirm(values);
    } catch (err) {
      setError(err?.message || 'Action failed');
      setSubmitting(false);
      return;
    }
    // parent closes us on success
  };

  return (
    <div className="admin-action-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-action-panel" onClick={(e) => e.stopPropagation()}>
        <header className="admin-action-header">
          {destructive && <AlertTriangle size={18} className="admin-action-warn-icon" />}
          <h3>{title}</h3>
          <button type="button" className="admin-action-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {description && <p className="admin-action-desc">{description}</p>}

        <div className="admin-action-fields">
          {fields.map((f) => (
            <label key={f.name} className="admin-action-field">
              <span>{f.label}{f.required && <em> *</em>}</span>
              {f.type === 'select' ? (
                <select
                  value={values[f.name] ?? ''}
                  onChange={(e) => update(f.name, e.target.value)}
                  disabled={submitting}
                >
                  <option value="" disabled>Select…</option>
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(e) => update(f.name, e.target.value)}
                  disabled={submitting}
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(e) => update(f.name, e.target.value)}
                  disabled={submitting}
                />
              )}
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
        </div>

        {error && <div className="admin-action-error">{error}</div>}

        <footer className="admin-action-footer">
          <button type="button" className="admin-action-btn ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={`admin-action-btn ${confirmTone}`}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <><RefreshCw size={14} className="spin" /> Working…</> : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

AdminActionModal.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  fields: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    type: PropTypes.string,
    initial: PropTypes.any,
    placeholder: PropTypes.string,
    required: PropTypes.bool,
    hint: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })),
  })),
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  confirmTone: PropTypes.oneOf(['primary', 'danger', 'warn']),
  destructive: PropTypes.bool,
};
