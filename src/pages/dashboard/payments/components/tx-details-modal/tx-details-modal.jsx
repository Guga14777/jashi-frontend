import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './tx-details-modal.css';

export default function TxDetailsModal({
  open = false,
  onClose,
  children,
  // responsive shell: min 560px → up to 820px, ~70vw in between
  maxWidth = 'clamp(560px, 70vw, 820px)',
  className = '',
  padV = 28,        // small breathing room to the viewport
  minScale = 0.82,  // allow a bit of shrink on short screens
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  const containerRef = useRef(null);
  const contentRef   = useRef(null);
  const previousFocusRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Freeze page scroll while open
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => containerRef.current?.focus(), 0);
    return () => {
      document.documentElement.style.overflow = prev;
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Fit-to-viewport scaling (no scroll anywhere)
  const measureAndScale = () => {
    if (!contentRef.current) return;
    const naturalHeight = contentRef.current.scrollHeight;
    const vh = window.innerHeight;
    const available = vh - padV * 2; // keep breathing room
    const s = Math.min(1, available / Math.max(1, naturalHeight));
    setScale(Math.max(s, minScale));
  };

  useLayoutEffect(() => {
    if (!open) return;
    measureAndScale();
    const onResize = () => measureAndScale();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="txd-overlay"
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      <div
        ref={containerRef}
        className={`txd-container ${className}`}
        tabIndex={-1}
        style={{ maxWidth, '--txd-scale': scale }}
        {...props}
      >
        <button
          type="button"
          className="txd-close-btn"
          onClick={onClose}
          aria-label="Close transaction details"
        >
          <X size={20} />
        </button>

        <div ref={contentRef} className="txd-content">
          {children}
        </div>
      </div>
    </div>
  );
}