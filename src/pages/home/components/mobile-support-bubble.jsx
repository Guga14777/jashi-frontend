import React, { useEffect, useState } from 'react';
import { HiOutlineChat, HiX } from 'react-icons/hi';

import './mobile-support-bubble.css';

const SUPPORT_EMAIL = 'support@jashilogistics.com';

/**
 * Lightweight mobile-only support affordance.
 *
 * The shared <LiveChat> panel renders a desktop-sized 400×600 modal that
 * iOS Safari mis-scales — even with mobile overrides, an open chat panel
 * fights the on-screen keyboard and the viewport. Until the chat surface
 * is rebuilt mobile-first, this component is what we render on the mobile
 * homepage instead: a small bubble in the bottom-right, and a simple
 * contact modal (email link + close) when tapped.
 */
function MobileSupportBubble() {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape (helps when device has a hardware keyboard attached).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="msb-bubble"
        aria-label="Contact support"
        onClick={() => setOpen(true)}
      >
        <HiOutlineChat aria-hidden="true" />
      </button>

      {open && (
        <div
          className="msb-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="msb-modal-title"
        >
          <button
            type="button"
            className="msb-modal-scrim"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="msb-modal-card">
            <div className="msb-modal-header">
              <h2 id="msb-modal-title" className="msb-modal-title">Need help?</h2>
              <button
                type="button"
                className="msb-modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <HiX aria-hidden="true" />
              </button>
            </div>

            <p className="msb-modal-body">
              Email us and the team will get back to you shortly.
            </p>

            <a
              className="msb-modal-cta"
              href={`mailto:${SUPPORT_EMAIL}`}
              onClick={() => setOpen(false)}
            >
              {SUPPORT_EMAIL}
            </a>

            <button
              type="button"
              className="msb-modal-secondary"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileSupportBubble;
