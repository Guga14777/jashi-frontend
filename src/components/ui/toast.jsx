// src/components/ui/toast.jsx
//
// Self-contained, portal-mounted toast.
//
// Why portal + inline styles: this component is consumed across many pages,
// some of which sit inside modals or scroll containers. Without a portal the
// toast gets clipped by `overflow:hidden` ancestors; without inline styles
// the toast renders unstyled wherever the page-level toast CSS isn't loaded
// (which is what was happening on the carrier dashboard).

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const COLORS = {
  success: { bg: '#16a34a', icon: '✓' },
  error:   { bg: '#dc2626', icon: '✕' },
  warning: { bg: '#d97706', icon: '⚠' },
  info:    { bg: '#0a58ff', icon: 'ℹ' },
};

const wrapStyle = {
  position: 'fixed',
  top: 24,
  right: 24,
  zIndex: 100000, // above modal backdrops
  pointerEvents: 'none',
};

const cardBaseStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 280,
  maxWidth: 420,
  padding: '12px 16px',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
  color: '#ffffff',
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 500,
  pointerEvents: 'auto',
  transition: 'opacity 200ms ease, transform 200ms ease',
};

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);
  const closedRef = useRef(false);

  useEffect(() => {
    // Trigger the enter animation on the next frame so the transition runs.
    const enter = requestAnimationFrame(() => setVisible(true));
    const exitTimer = setTimeout(() => {
      setVisible(false);
      // Wait for the fade-out to finish before unmounting.
      setTimeout(() => {
        if (closedRef.current) return;
        closedRef.current = true;
        onClose?.();
      }, 220);
    }, duration);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(exitTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    if (closedRef.current) return;
    setVisible(false);
    setTimeout(() => {
      closedRef.current = true;
      onClose?.();
    }, 220);
  };

  const palette = COLORS[type] || COLORS.info;
  const cardStyle = {
    ...cardBaseStyle,
    background: palette.bg,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-8px)',
  };

  // SSR / test environments without a document — fall back to inline render.
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div style={wrapStyle} role="status" aria-live="polite">
      <div style={cardStyle} className={`toast toast-${type}`}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.18)',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {palette.icon}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '4px 6px',
            opacity: 0.85,
          }}
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
};

// Toast Container to manage multiple toasts.
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    window.showToast = addToast;
  }, []);

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div style={wrapStyle}>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </div>,
    document.body
  );
};

export default Toast;
