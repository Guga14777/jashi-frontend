// src/pages/shipper-portal/components/policy-modal.jsx
// In-page modal for full cancellation + waiting-fee policy. Opens without a
// route change so the payment form state is preserved — this was the main
// bug with the previous "View full policy →" link, which pushed the user
// to /policies/cancellation and wiped their typed-in card fields.

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import './policy-modal.css';

const PolicyModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="sp-policy-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="sp-policy-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-policy-modal-title"
      >
        <div className="sp-policy-modal__header">
          <h2 id="sp-policy-modal-title">Cancellation &amp; Waiting Fee Policy</h2>
          <button
            type="button"
            className="sp-policy-modal__close"
            onClick={onClose}
            aria-label="Close policy"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="sp-policy-modal__body">
          <section className="sp-policy-section">
            <h3>Cancellation policy</h3>
            <p className="sp-policy-lede">
              We protect both you and the carrier. The longer we wait to cancel, the
              more work the carrier has already put in — so the cost scales with the
              stage of your shipment.
            </p>
            <ol className="sp-policy-stages">
              <li>
                <span className="sp-policy-stage__label">Before a carrier accepts</span>
                <p>Free cancellation. Your platform fee is fully refunded.</p>
              </li>
              <li>
                <span className="sp-policy-stage__label">After acceptance, before the carrier starts driving</span>
                <p>You may cancel. The 6% platform fee is non-refundable. No carrier fee.</p>
              </li>
              <li>
                <span className="sp-policy-stage__label">After the carrier has been dispatched</span>
                <p>You may cancel. The 6% platform fee is non-refundable and a flat <strong>$50 carrier dispatch fee</strong> applies — this covers the carrier's time and fuel while en route or on-site.</p>
              </li>
              <li>
                <span className="sp-policy-stage__label">After your vehicle has been picked up</span>
                <p>Normal cancellation is no longer available. If there's an emergency, contact support — we'll review case-by-case.</p>
              </li>
            </ol>
          </section>

          <section className="sp-policy-section">
            <h3>Waiting fee</h3>
            <p>
              A $50 waiting fee may apply if the carrier is delayed at pickup by more
              than <strong>60 minutes</strong> after the <em>later of</em>:
            </p>
            <ul className="sp-policy-bullets">
              <li>the carrier's verified arrival time, or</li>
              <li>the beginning of your selected pickup window.</li>
            </ul>
            <p>
              If the carrier arrives early — say 7 AM for an 8–10 AM window — the
              timer does not start counting until 8 AM. You're never charged for a
              carrier's own early arrival.
            </p>
          </section>

          <section className="sp-policy-section">
            <h3>Appointments &amp; access</h3>
            <p>
              If pickup requires an appointment (auction, dealership, gated facility),
              please provide gate-pass or appointment details. If the carrier is
              turned away due to a facility closure or access issue through no fault
              of your own, we'll reschedule at no extra charge.
            </p>
          </section>
        </div>

        <div className="sp-policy-modal__footer">
          <button type="button" className="sp-policy-modal__primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PolicyModal;
