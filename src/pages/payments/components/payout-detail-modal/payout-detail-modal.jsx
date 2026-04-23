import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './payout-detail-modal.css';

/**
 * PayoutDetailModal Component
 * ✅ UPDATED: Shows real Load ID (#1045), COD/ACH method only, real reference
 */
const PayoutDetailModal = ({ 
  open, 
  payout, 
  onClose, 
  formatPrice, 
  onGoToLoad,
  allowBackdropClose = true,
  showAmountBreakdown = false 
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [copiedField, setCopiedField] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  const n = (v) => (typeof v === 'number' ? v : Number(v) || 0);

  // Derive net payout from available fields
  const netPayout = useMemo(() => {
    if (!payout) return 0;
    if (payout.netAmount !== undefined && payout.netAmount !== null) {
      return n(payout.netAmount);
    }
    return n(payout.grossAmount);
  }, [payout]);

  const formatCurrency = useMemo(() => {
    if (formatPrice) return formatPrice;
    return (value) => {
      if (!value && value !== 0) return '$0.00';
      if (typeof value !== 'number' || isNaN(value)) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };
  }, [formatPrice]);

  const copyToClipboard = useCallback(async (text, fieldName) => {
    if (!text || text === 'N/A') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      const fieldLabels = {
        reference: 'Reference',
        id: 'Payout ID',
        loadId: 'Load ID'
      };
      const message = `${fieldLabels[fieldName] || 'Value'} copied`;
      setToastMessage(message);
      setTimeout(() => {
        setCopiedField(null);
        setToastMessage('');
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setToastMessage('Copy failed');
      setTimeout(() => setToastMessage(''), 2000);
    }
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (!allowBackdropClose) return;
    if (e.target.classList.contains('pdm-overlay')) {
      onClose();
    }
  }, [onClose, allowBackdropClose]);

  /**
   * ✅ Handle navigation to load using booking.id
   */
  const handleGoToLoad = useCallback(() => {
    if (!payout) return;
    
    if (onGoToLoad) {
      onGoToLoad(payout);
    } else if (payout.booking?.id) {
      window.location.href = `/carrier/loads/${payout.booking.id}`;
    }
  }, [onGoToLoad, payout]);

  const handleDownloadReceipt = useCallback(async () => {
    if (!payout?.id) return;
    setReceiptLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setToastMessage('Receipt download started');
      setTimeout(() => setToastMessage(''), 2000);
    } catch (error) {
      setToastMessage('Receipt download failed');
      setTimeout(() => setToastMessage(''), 2000);
    } finally {
      setReceiptLoading(false);
    }
  }, [payout]);

  const formatDate = useCallback((dateStr, format = 'short') => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const formatTimestamp = useCallback((dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  /**
   * ✅ Normalize payment method - ONLY 'cod' or 'ach'
   */
  const normalizePaymentMethod = useCallback((payout) => {
    const method = payout?.paymentMethod || payout?.method || 'ach';
    const m = String(method).toLowerCase().trim();
    
    // COD variations
    if (['cod', 'cash', 'cash_on_delivery', 'check', 'zelle'].includes(m)) {
      return { 
        code: 'cod', 
        label: 'COD',
        description: 'Cash on Delivery - Customer pays carrier directly'
      };
    }
    
    // Everything else is ACH
    return { 
      code: 'ach', 
      label: 'ACH',
      description: 'ACH Transfer - Platform pays carrier'
    };
  }, []);

  const getTimelineText = useCallback(() => {
    if (!payout) return null;
    const created = formatDate(payout.createdAt);
    const status = payout.status;
    
    if (status === 'paid') {
      const paid = formatDate(payout.paidAt || payout.updatedAt);
      return `Created ${created}${paid ? ` • Paid ${paid}` : ''}`;
    } else if (status === 'pending') {
      return `Created ${created} • Processing`;
    } else if (status === 'cancelled') {
      const cancelled = formatDate(payout.updatedAt);
      return `Created ${created}${cancelled ? ` • Cancelled ${cancelled}` : ''}`;
    }
    return `Created ${created}`;
  }, [payout, formatDate]);

  const getScrollbarWidth = useCallback(() => {
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    outer.style.msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode.removeChild(outer);
    return scrollbarWidth;
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    const appRoot = document.querySelector('#root, [data-reactroot], main');
    if (appRoot) {
      appRoot.setAttribute('aria-hidden', 'true');
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      if (appRoot) {
        appRoot.removeAttribute('aria-hidden');
      }
    };
  }, [open, getScrollbarWidth]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        if (previousFocusRef.current && previousFocusRef.current.focus) {
          previousFocusRef.current.focus();
        }
      }, 100);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const getFocusableElements = () => {
      return dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    };
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [open]);

  if (!open) return null;

  // Skeleton state
  if (!payout) {
    const skeletonModal = (
      <div className="pdm-overlay" role="presentation">
        <div 
          className="pdm pdm-skeleton" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="pdm-title"
          ref={dialogRef}
          tabIndex={-1}
        >
          <div className="pdm-header">
            <h2 id="pdm-title" className="pdm-title">Loading...</h2>
            <button className="pdm-close" aria-label="Close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="pdm-content">
            <div className="pdm-skeleton-summary">
              <div className="pdm-skeleton-block pdm-skeleton-amount"></div>
              <div className="pdm-skeleton-block pdm-skeleton-status"></div>
              <div className="pdm-skeleton-block pdm-skeleton-reference"></div>
            </div>
            <div className="pdm-skeleton-details">
              <div className="pdm-skeleton-block pdm-skeleton-field"></div>
              <div className="pdm-skeleton-block pdm-skeleton-field"></div>
            </div>
          </div>
        </div>
      </div>
    );
    return createPortal(skeletonModal, document.body);
  }

  const timelineText = getTimelineText();
  // ✅ Real Load ID like #1045
  const hasLoadId = payout.loadId && payout.loadId !== 'N/A' && payout.loadId !== '—';
  // ✅ Real reference from DB
  const hasReference = payout.reference && payout.reference !== 'N/A';
  // ✅ Only COD or ACH
  const normalizedMethod = normalizePaymentMethod(payout);
  
  // Route info from booking
  const hasRoute = payout.booking?.fromCity && payout.booking?.toCity;
  const routeText = hasRoute ? `${payout.booking.fromCity} → ${payout.booking.toCity}` : null;

  const modalContent = (
    <div className="pdm-overlay" role="presentation" onClick={handleBackdropClick}>
      <div 
        className="pdm" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="pdm-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="pdm-header">
          <h2 id="pdm-title" className="pdm-title">Payout Details</h2>
          <button 
            className="pdm-close" 
            aria-label="Close payout details" 
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="pdm-content">
          {/* Summary Card */}
          <div className="pdm-summary">
            <div className="pdm-summary-left">
              <div className="pdm-amount-section">
                <div className="pdm-amount-label">Net Payout</div>
                <div className="pdm-amount">{formatCurrency(netPayout)}</div>
              </div>
              <div className="pdm-date">
                {payout.date ? formatDate(payout.date, 'full') : formatDate(payout.createdAt, 'full') || 'No date'}
              </div>
            </div>
            <div className="pdm-summary-right">
              <span className={`pdm-status status-${payout.status}`}>
                {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
              </span>
              {hasReference && (
                <div className="pdm-ref">
                  <span className="reference-display" title={payout.reference}>
                    {payout.reference}
                  </span>
                  <button 
                    className="pdm-copy"
                    onClick={() => copyToClipboard(payout.reference, 'reference')}
                    aria-label="Copy reference number"
                  >
                    {copiedField === 'reference' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="pdm-details">
            {/* ✅ Real Load ID like #1045 */}
            {hasLoadId && (
              <div className="pdm-field">
                <span className="pdm-field-label">Load ID</span>
                <span className="pdm-field-value">
                  <button 
                    className="pdm-link"
                    onClick={handleGoToLoad}
                    aria-label={`Go to load ${payout.loadId}`}
                  >
                    {payout.loadId}
                  </button>
                </span>
              </div>
            )}

            {/* Route info */}
            {routeText && (
              <div className="pdm-field">
                <span className="pdm-field-label">Route</span>
                <span className="pdm-field-value">{routeText}</span>
              </div>
            )}

            {/* Vehicle info */}
            {payout.booking?.vehicle && (
              <div className="pdm-field">
                <span className="pdm-field-label">Vehicle</span>
                <span className="pdm-field-value">{payout.booking.vehicle}</span>
              </div>
            )}

            {/* ✅ Payment Method - Only COD or ACH */}
            <div className="pdm-field">
              <span className="pdm-field-label">Payment Method</span>
              <span className="pdm-field-value">
                <span className={`method-badge method-${normalizedMethod.code}`}>
                  {normalizedMethod.label}
                </span>
                <span className="pdm-method-desc">
                  {normalizedMethod.code === 'cod' 
                    ? 'Customer pays you directly' 
                    : 'Platform ACH transfer'}
                </span>
              </span>
            </div>

            {/* Timeline */}
            {timelineText && (
              <div className="pdm-timeline-compact">
                {timelineText}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pdm-footer">
          <div className="pdm-footer-left">
            <button 
              className="pdm-text-link"
              onClick={handleDownloadReceipt}
              disabled={receiptLoading}
            >
              {receiptLoading ? 'Downloading...' : 'Download receipt'}
            </button>
            {payout.updatedAt && (
              <span className="pdm-updated">
                Last updated {formatTimestamp(payout.updatedAt)}
              </span>
            )}
          </div>
          {hasLoadId && (
            <button 
              className="pdm-btn-primary"
              onClick={handleGoToLoad}
              aria-label={`Go to load ${payout.loadId}`}
            >
              Go to Load
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      <div className="pdm-live" role="status" aria-live="polite" aria-atomic="true">
        {toastMessage}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PayoutDetailModal;