// ============================================================
// FILE: src/components/load-details/sections/carrier/detention-panel.jsx
// Detention/waiting fee timer panel for carrier pickup
// Shows elapsed time and allows requesting waiting fee
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';

/**
 * Default waiting fee threshold (minutes)
 */
const DEFAULT_THRESHOLD_MINUTES = 60;

/**
 * Default waiting fee amount
 */
const DEFAULT_FEE_AMOUNT = 50;

/**
 * Icon components
 */
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="dp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

/**
 * Format minutes into human-readable duration
 */
const formatDuration = (minutes) => {
  if (minutes < 1) return 'Just arrived';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }
  
  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${mins}m`;
};

/**
 * DetentionPanel Component
 * 
 * Shows waiting time and allows carrier to request detention fee
 */
const DetentionPanel = ({
  waitTimerStartAt,
  waitFeeAmount = DEFAULT_FEE_AMOUNT,
  waitFeeRequestedAt = null,
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES,
  onRequestFee,
  requestingFee = false,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate elapsed minutes
  const elapsedMinutes = useMemo(() => {
    if (!waitTimerStartAt) return 0;
    
    const startTime = new Date(waitTimerStartAt).getTime();
    const elapsed = (currentTime - startTime) / (1000 * 60);
    return Math.max(0, elapsed);
  }, [waitTimerStartAt, currentTime]);
  
  // Check if eligible for fee
  const isEligible = elapsedMinutes >= thresholdMinutes;
  const isRequested = Boolean(waitFeeRequestedAt);
  
  // Calculate progress percentage
  const progressPercent = Math.min(100, (elapsedMinutes / thresholdMinutes) * 100);
  
  // Calculate time remaining until eligible
  const minutesUntilEligible = Math.max(0, thresholdMinutes - elapsedMinutes);
  
  if (!waitTimerStartAt) {
    return null;
  }
  
  return (
    <div className={`dp-container ${isEligible ? 'dp-container--eligible' : ''} ${isRequested ? 'dp-container--requested' : ''}`}>
      {/* Timer Section */}
      <div className="dp-timer">
        <div className="dp-timer__icon">
          <ClockIcon />
        </div>
        <div className="dp-timer__content">
          <span className="dp-timer__label">Waiting Time</span>
          <span className="dp-timer__value">{formatDuration(elapsedMinutes)}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="dp-progress">
        <div className="dp-progress__bar">
          <div 
            className={`dp-progress__fill ${isEligible ? 'dp-progress__fill--complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="dp-progress__labels">
          <span>0 min</span>
          <span className="dp-progress__threshold">
            {thresholdMinutes} min threshold
          </span>
        </div>
      </div>
      
      {/* Status/Action Section */}
      <div className="dp-action">
        {isRequested ? (
          <div className="dp-status dp-status--requested">
            <CheckIcon />
            <span>Waiting fee requested</span>
          </div>
        ) : isEligible ? (
          <button
            className="dp-btn dp-btn--request"
            onClick={onRequestFee}
            disabled={requestingFee}
          >
            {requestingFee ? (
              <>
                <SpinnerIcon />
                <span>Requesting...</span>
              </>
            ) : (
              <>
                <DollarIcon />
                <span>Request ${waitFeeAmount} Waiting Fee</span>
              </>
            )}
          </button>
        ) : (
          <div className="dp-status dp-status--waiting">
            <span>
              Eligible for waiting fee in <strong>{formatDuration(minutesUntilEligible)}</strong>
            </span>
          </div>
        )}
      </div>
      
      {/* Info Note */}
      {!isRequested && (
        <div className="dp-note">
          {isEligible 
            ? 'You may request a waiting fee for delays beyond the threshold.'
            : 'Waiting fee becomes available after exceeding the threshold time.'
          }
        </div>
      )}
      
      {/* Inline Styles */}
      <style>{`
        .dp-container {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 14px 16px;
          margin-top: 12px;
        }
        
        .dp-container--eligible {
          background: #f0fdf4;
          border-color: #86efac;
        }
        
        .dp-container--requested {
          background: #f0f9ff;
          border-color: #bae6fd;
        }
        
        .dp-timer {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .dp-timer__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 10px;
          color: #d97706;
        }
        
        .dp-container--eligible .dp-timer__icon {
          color: #16a34a;
        }
        
        .dp-container--requested .dp-timer__icon {
          color: #0284c7;
        }
        
        .dp-timer__content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .dp-timer__label {
          font-size: 12px;
          font-weight: 500;
          color: #78716c;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .dp-timer__value {
          font-size: 20px;
          font-weight: 700;
          color: #292524;
        }
        
        .dp-progress {
          margin-top: 14px;
        }
        
        .dp-progress__bar {
          height: 8px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .dp-progress__fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .dp-progress__fill--complete {
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }
        
        .dp-progress__labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 11px;
          color: #78716c;
        }
        
        .dp-progress__threshold {
          font-weight: 600;
        }
        
        .dp-action {
          margin-top: 14px;
        }
        
        .dp-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .dp-btn--request {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
        }
        
        .dp-btn--request:hover:not(:disabled) {
          background: linear-gradient(135deg, #16a34a, #15803d);
          transform: translateY(-1px);
        }
        
        .dp-btn--request:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .dp-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .dp-status--waiting {
          background: rgba(0, 0, 0, 0.05);
          color: #57534e;
        }
        
        .dp-status--waiting strong {
          color: #292524;
        }
        
        .dp-status--requested {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 600;
        }
        
        .dp-note {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed rgba(0, 0, 0, 0.1);
          font-size: 12px;
          color: #78716c;
          line-height: 1.4;
        }
        
        .dp-spinner {
          animation: dp-spin 1s linear infinite;
        }
        
        @keyframes dp-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 480px) {
          .dp-container {
            padding: 12px;
          }
          
          .dp-timer__icon {
            width: 36px;
            height: 36px;
          }
          
          .dp-timer__value {
            font-size: 18px;
          }
          
          .dp-btn {
            padding: 10px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default DetentionPanel;