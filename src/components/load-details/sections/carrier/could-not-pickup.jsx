// ============================================================
// FILE: src/components/load-details/sections/carrier/could-not-pickup.jsx
// "Could Not Complete Pickup" UI for carriers
// Allows reporting pickup issues and requesting TONU protection
// ============================================================

import React, { useState } from 'react';

/**
 * Could not pickup reason codes
 */
const COULD_NOT_PICKUP_REASONS = {
  AUCTION_CLOSED: 'auction_closed',
  NO_GATE_PASS: 'no_gate_pass',
  WRONG_ADDRESS: 'wrong_address',
  CUSTOMER_NO_SHOW: 'customer_no_show',
  VEHICLE_NOT_READY: 'vehicle_not_ready',
  VEHICLE_NOT_AS_DESCRIBED: 'vehicle_not_as_described',
  ACCESS_DENIED: 'access_denied',
  OTHER: 'other',
};

/**
 * Human-readable labels
 */
const REASON_LABELS = {
  [COULD_NOT_PICKUP_REASONS.AUCTION_CLOSED]: 'Auction was closed',
  [COULD_NOT_PICKUP_REASONS.NO_GATE_PASS]: 'No gate pass available',
  [COULD_NOT_PICKUP_REASONS.WRONG_ADDRESS]: 'Wrong or incorrect address',
  [COULD_NOT_PICKUP_REASONS.CUSTOMER_NO_SHOW]: 'Customer no-show',
  [COULD_NOT_PICKUP_REASONS.VEHICLE_NOT_READY]: 'Vehicle not ready',
  [COULD_NOT_PICKUP_REASONS.VEHICLE_NOT_AS_DESCRIBED]: 'Vehicle not as described',
  [COULD_NOT_PICKUP_REASONS.ACCESS_DENIED]: 'Access denied to location',
  [COULD_NOT_PICKUP_REASONS.OTHER]: 'Other issue',
};

/**
 * Reasons that qualify for TONU protection
 */
const TONU_ELIGIBLE_REASONS = [
  COULD_NOT_PICKUP_REASONS.AUCTION_CLOSED,
  COULD_NOT_PICKUP_REASONS.NO_GATE_PASS,
  COULD_NOT_PICKUP_REASONS.CUSTOMER_NO_SHOW,
  COULD_NOT_PICKUP_REASONS.VEHICLE_NOT_READY,
  COULD_NOT_PICKUP_REASONS.ACCESS_DENIED,
];

/**
 * Icon components
 */
const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5.5-3.5 10-8 12-4.5-2-8-6.5-8-12V6l8-4z"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="cnp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

/**
 * CouldNotPickup Component
 * 
 * Allows carrier to report why pickup couldn't be completed
 */
const CouldNotPickup = ({
  onSubmit,
  onCancel,
  loading = false,
  isProtected = false,
  tonuAmount = 75,
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  
  // Check if selected reason qualifies for TONU
  const qualifiesForTonu = isProtected && TONU_ELIGIBLE_REASONS.includes(selectedReason);
  
  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }
    
    if (selectedReason === COULD_NOT_PICKUP_REASONS.OTHER && !notes.trim()) {
      setError('Please provide details for "Other" reason');
      return;
    }
    
    setError(null);
    
    try {
      await onSubmit?.({
        reason: selectedReason,
        reasonLabel: REASON_LABELS[selectedReason],
        notes: notes.trim(),
        requestTonu: qualifiesForTonu,
      });
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    }
  };
  
  return (
    <div className="cnp-container">
      {/* Header */}
      <div className="cnp-header">
        <div className="cnp-header__icon">
          <AlertTriangleIcon />
        </div>
        <div className="cnp-header__text">
          <h3>Report Pickup Issue</h3>
          <p>Select the reason you couldn't complete this pickup</p>
        </div>
      </div>
      
      {/* Reason Selection */}
      <div className="cnp-reasons">
        {Object.entries(COULD_NOT_PICKUP_REASONS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            className={`cnp-reason ${selectedReason === value ? 'cnp-reason--selected' : ''}`}
            onClick={() => {
              setSelectedReason(value);
              setError(null);
            }}
          >
            <span className="cnp-reason__check">
              {selectedReason === value && <CheckIcon />}
            </span>
            <span className="cnp-reason__label">{REASON_LABELS[value]}</span>
            {isProtected && TONU_ELIGIBLE_REASONS.includes(value) && (
              <span className="cnp-reason__tonu" title="TONU protection eligible">
                <ShieldIcon />
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Notes (required for "Other") */}
      {(selectedReason === COULD_NOT_PICKUP_REASONS.OTHER || notes) && (
        <div className="cnp-notes">
          <label htmlFor="cnp-notes">
            Additional Details
            {selectedReason === COULD_NOT_PICKUP_REASONS.OTHER && <span className="cnp-required">*</span>}
          </label>
          <textarea
            id="cnp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what happened..."
            rows={3}
          />
        </div>
      )}
      
      {/* TONU Notice */}
      {qualifiesForTonu && (
        <div className="cnp-tonu-notice">
          <ShieldIcon />
          <div>
            <strong>TONU Protection</strong>
            <p>You may be eligible for a ${tonuAmount} fee due to this pickup issue.</p>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="cnp-error">
          {error}
        </div>
      )}
      
      {/* Actions */}
      <div className="cnp-actions">
        <button
          type="button"
          className="cnp-btn cnp-btn--cancel"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cnp-btn cnp-btn--submit"
          onClick={handleSubmit}
          disabled={loading || !selectedReason}
        >
          {loading ? (
            <>
              <SpinnerIcon />
              <span>Submitting...</span>
            </>
          ) : (
            <span>Submit Report</span>
          )}
        </button>
      </div>
      
      {/* Inline Styles */}
      <style>{`
        .cnp-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .cnp-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }
        
        .cnp-header__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: #fef2f2;
          border-radius: 10px;
          color: #dc2626;
          flex-shrink: 0;
        }
        
        .cnp-header__text h3 {
          margin: 0 0 4px;
          font-size: 17px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .cnp-header__text p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }
        
        .cnp-reasons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .cnp-reason {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .cnp-reason:hover {
          background: #f3f4f6;
        }
        
        .cnp-reason--selected {
          background: #eff6ff;
          border-color: #3b82f6;
        }
        
        .cnp-reason__check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        
        .cnp-reason--selected .cnp-reason__check {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }
        
        .cnp-reason__label {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .cnp-reason__tonu {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #dbeafe;
          border-radius: 6px;
          color: #2563eb;
        }
        
        .cnp-notes {
          margin-top: 16px;
        }
        
        .cnp-notes label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        
        .cnp-required {
          color: #dc2626;
          margin-left: 2px;
        }
        
        .cnp-notes textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
        }
        
        .cnp-notes textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .cnp-tonu-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 16px;
          padding: 12px 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          color: #1e40af;
        }
        
        .cnp-tonu-notice svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .cnp-tonu-notice strong {
          display: block;
          font-size: 14px;
          margin-bottom: 2px;
        }
        
        .cnp-tonu-notice p {
          margin: 0;
          font-size: 13px;
          opacity: 0.9;
        }
        
        .cnp-error {
          margin-top: 16px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 13px;
          color: #dc2626;
        }
        
        .cnp-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .cnp-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .cnp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .cnp-btn--cancel {
          background: #f3f4f6;
          color: #374151;
        }
        
        .cnp-btn--cancel:hover:not(:disabled) {
          background: #e5e7eb;
        }
        
        .cnp-btn--submit {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }
        
        .cnp-btn--submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }
        
        .cnp-spinner {
          animation: cnp-spin 1s linear infinite;
        }
        
        @keyframes cnp-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 480px) {
          .cnp-container {
            padding: 16px;
          }
          
          .cnp-header__icon {
            width: 40px;
            height: 40px;
          }
          
          .cnp-header__text h3 {
            font-size: 16px;
          }
          
          .cnp-reason {
            padding: 10px 12px;
          }
          
          .cnp-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CouldNotPickup;

// Export constants for external use
export {
  COULD_NOT_PICKUP_REASONS,
  REASON_LABELS,
  TONU_ELIGIBLE_REASONS,
};