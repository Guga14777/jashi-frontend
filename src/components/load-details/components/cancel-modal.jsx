// ============================================================
// FILE: src/components/load-details/components/cancel-modal.jsx
// Cancel confirmation modal with carrier reason selection
// ✅ UPDATED: Added carrier-specific cancellation reasons
// ✅ UPDATED: Cleaner UI without big colored banners
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { WarningIcon, InfoCircleIcon } from './icons';
import { SHIPMENT_STATUS, normalizeStatus } from '../utils/status-map';
import {
  evaluateCustomerCancel,
  evaluateCarrierDrop,
} from '../utils/cancellation-policy';

// Carrier cancellation reasons
const CARRIER_CANCEL_REASONS = [
  { value: 'equipment_issue', label: 'Equipment/truck breakdown' },
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'customer_unresponsive', label: 'Customer unresponsive' },
  { value: 'incorrect_info', label: 'Incorrect load information' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'personal_emergency', label: 'Personal emergency' },
  { value: 'other', label: 'Other reason' },
];

// Customer cancellation reasons
const CUSTOMER_CANCEL_REASONS = [
  { value: 'plans_changed', label: 'Plans changed' },
  { value: 'found_alternative', label: 'Found alternative transport' },
  { value: 'vehicle_issue', label: 'Issue with vehicle' },
  { value: 'pricing', label: 'Pricing concern' },
  { value: 'delay', label: 'Delay unacceptable' },
  { value: 'other', label: 'Other reason' },
];

const CancelConfirmModal = ({
  open,
  onClose,
  onConfirm,
  isCarrier,
  status,
  orderNumber,
  loading,
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  const normalizedStatus = normalizeStatus(status);
  const isAlreadyCancelled = normalizedStatus === SHIPMENT_STATUS.CANCELLED;
  const reasons = isCarrier ? CARRIER_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;

  // Evaluate the cancellation against the shared policy — same rules as
  // backend booking.cancel.controller.cjs.
  const policy = isCarrier
    ? evaluateCarrierDrop(status)
    : evaluateCustomerCancel(status);
  const cancellationFee = policy.carrierDispatchFee || 0;
  const isHighImpact = normalizedStatus === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP ||
                       normalizedStatus === SHIPMENT_STATUS.ARRIVED_AT_PICKUP;

  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedReason('');
      setOtherReason('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  const handleConfirm = async () => {
    setError(null);
    
    // Require reason for carriers
    if (isCarrier && !selectedReason) {
      setError('Please select a cancellation reason');
      return;
    }
    
    const reason = selectedReason === 'other' && otherReason.trim()
      ? otherReason.trim()
      : reasons.find(r => r.value === selectedReason)?.label || selectedReason || 'User cancelled';
    
    try {
      await onConfirm({ 
        reason,
        reasonCode: selectedReason,
        notes: selectedReason === 'other' ? otherReason : null,
      });
    } catch (err) {
      const message = err.message || 'Failed to cancel. Please try again.';
      
      if (message.toLowerCase().includes('already') || 
          message.toLowerCase().includes('cancelled') ||
          message.toLowerCase().includes('canceled')) {
        setError('This shipment has already been cancelled.');
      } else if (message.toLowerCase().includes('in progress') || 
                 message.toLowerCase().includes('picked up') ||
                 message.toLowerCase().includes('transit')) {
        setError('Cannot cancel - shipment is already in transit.');
      } else if (message.toLowerCase().includes('delivered') || 
                 message.toLowerCase().includes('completed')) {
        setError('Cannot cancel - shipment has already been delivered.');
      } else {
        setError(message);
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!open) return null;

  // Already cancelled state
  if (isAlreadyCancelled) {
    return ReactDOM.createPortal(
      <div className="cancel-modal-backdrop" onClick={handleBackdropClick}>
        <div className="cancel-modal cancel-modal--simple" ref={modalRef} role="dialog" aria-modal="true">
          <div className="cancel-modal__header">
            <div className="cancel-modal__header-icon cancel-modal__header-icon--info">
              <InfoCircleIcon />
            </div>
            <div>
              <h3 className="cancel-modal__title">Shipment Cancelled</h3>
              <p className="cancel-modal__subtitle">Order #{orderNumber}</p>
            </div>
            <button 
              className="cancel-modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="cancel-modal__body cancel-modal__body--simple">
            <div className="cancel-modal__already-cancelled">
              <InfoCircleIcon />
              <span>This shipment is no longer active.</span>
            </div>
          </div>

          <div className="cancel-modal__footer cancel-modal__footer--single">
            <button
              className="cancel-modal__btn cancel-modal__btn--secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div className="cancel-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cancel-modal" ref={modalRef} role="dialog" aria-modal="true">
        <div className="cancel-modal__header">
          <div className="cancel-modal__header-icon">
            <WarningIcon />
          </div>
          <div>
            <h3 className="cancel-modal__title">
              {isCarrier ? 'Cancel Load' : 'Cancel Shipment'}
            </h3>
            <p className="cancel-modal__subtitle">
              Order #{orderNumber}
            </p>
          </div>
          <button 
            className="cancel-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cancel-modal__body">
          {/* Stage-aware policy summary — driven by the shared cancellation
              policy so this modal and the payment-page disclosure always
              agree on fees and wording. */}
          {policy.headline && (
            <div className="cancel-modal__policy-box">
              <p className="cancel-modal__policy-headline">{policy.headline}</p>
              {policy.detail && (
                <p className="cancel-modal__policy-detail">{policy.detail}</p>
              )}
            </div>
          )}

          {/* Reason selection */}
          <div className="cancel-modal__reason-section">
            <label className="cancel-modal__label">
              {isCarrier ? 'Reason for cancellation *' : 'Reason (optional)'}
            </label>
            <div className="cancel-modal__reason-options">
              {reasons.map((reason) => (
                <label key={reason.value} className="cancel-modal__reason-option">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={loading}
                  />
                  <span className="cancel-modal__reason-radio" />
                  <span className="cancel-modal__reason-label">{reason.label}</span>
                </label>
              ))}
            </div>

            {/* Other reason text input */}
            {selectedReason === 'other' && (
              <textarea
                className="cancel-modal__other-input"
                placeholder="Please describe..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                disabled={loading}
                rows={2}
              />
            )}
          </div>

          {/* Warning for carriers */}
          {isCarrier && isHighImpact && (
            <div className="cancel-modal__warning-inline">
              <InfoCircleIcon />
              <span>Late cancellations are tracked and may affect future load offers.</span>
            </div>
          )}

          {error && (
            <div className="cancel-modal__error">
              <InfoCircleIcon />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="cancel-modal__footer">
          <button
            className="cancel-modal__btn cancel-modal__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Keep {isCarrier ? 'Load' : 'Shipment'}
          </button>
          <button
            className="cancel-modal__btn cancel-modal__btn--danger"
            onClick={handleConfirm}
            disabled={loading || (isCarrier && !selectedReason)}
          >
            {loading ? (
              <>
                <span className="cancel-modal__spinner" />
                Cancelling…
              </>
            ) : (
              cancellationFee > 0
                ? `Cancel Shipment — $${cancellationFee} dispatch fee`
                : `Cancel ${isCarrier ? 'Load' : 'Shipment'}`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelConfirmModal;