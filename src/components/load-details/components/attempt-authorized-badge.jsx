// ============================================================
// FILE: src/components/load-details/components/attempt-authorized-badge.jsx
// Visual badge showing carrier pickup authorization status
// ============================================================

import React, { useState } from 'react';
import { 
  AUTHORIZATION_STATUS, 
  REASON_LABELS,
  getAuthorizationBadgeInfo 
} from '../utils/attempt-authorization';
import './attempt-authorized-badge.css';

/**
 * Icon components for badge states
 */
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.5 4.5L6.5 11.5L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5L2.5 3.5V7.5C2.5 10.5 4.5 13 8 14.5C11.5 13 13.5 10.5 13.5 7.5V3.5L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5.5V8.5M8 11V11.01M3 13.5H13L8 3.5L3 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 6.5V9.5M7 4.5V4.51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/**
 * Get the appropriate icon component
 */
const getIcon = (status) => {
  switch (status) {
    case AUTHORIZATION_STATUS.YES:
      return <CheckIcon />;
    case AUTHORIZATION_STATUS.YES_PROTECTED:
      return <ShieldIcon />;
    case AUTHORIZATION_STATUS.NO:
      return <XIcon />;
    default:
      return <AlertIcon />;
  }
};

/**
 * AttemptAuthorizedBadge Component
 * 
 * Shows authorization status with expandable details
 */
const AttemptAuthorizedBadge = ({
  authorizationResult,
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!authorizationResult) {
    return null;
  }
  
  const badgeInfo = getAuthorizationBadgeInfo(authorizationResult);
  const { 
    status, 
    blockingReasons, 
    protectionReasons, 
    successReasons,
    primaryReasonLabel,
    metadata,
  } = authorizationResult;
  
  const hasDetails = (
    blockingReasons.length > 0 || 
    protectionReasons.length > 0 || 
    (showDetails && successReasons.length > 0)
  );
  
  const toggleExpand = () => {
    if (hasDetails) {
      setIsExpanded(!isExpanded);
    }
  };
  
  // Compact mode: just the badge
  if (compact) {
    return (
      <span 
        className={`aab-badge aab-badge--${badgeInfo.status} aab-badge--compact ${className}`}
        title={`${badgeInfo.label}: ${primaryReasonLabel}`}
      >
        {getIcon(status)}
        <span className="aab-badge__label">{badgeInfo.label}</span>
      </span>
    );
  }
  
  return (
    <div className={`aab-container aab-container--${badgeInfo.status} ${className}`}>
      {/* Main Badge Row */}
      <button 
        className={`aab-header ${hasDetails ? 'aab-header--expandable' : ''}`}
        onClick={toggleExpand}
        type="button"
        disabled={!hasDetails}
      >
        <div className="aab-header__left">
          <span className={`aab-icon aab-icon--${badgeInfo.status}`}>
            {getIcon(status)}
          </span>
          <div className="aab-header__text">
            <span className="aab-status-label">Attempt Authorized</span>
            <span className={`aab-status-value aab-status-value--${badgeInfo.status}`}>
              {status === AUTHORIZATION_STATUS.YES && 'YES'}
              {status === AUTHORIZATION_STATUS.YES_PROTECTED && 'YES (Protected)'}
              {status === AUTHORIZATION_STATUS.NO && 'NO'}
            </span>
          </div>
        </div>
        
        {hasDetails && (
          <span className={`aab-chevron ${isExpanded ? 'aab-chevron--open' : ''}`}>
            <ChevronDownIcon />
          </span>
        )}
      </button>
      
      {/* Primary Reason (always visible) */}
      <div className="aab-primary-reason">
        <InfoIcon />
        <span>{primaryReasonLabel}</span>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && hasDetails && (
        <div className="aab-details">
          {/* Blocking Reasons */}
          {blockingReasons.length > 0 && (
            <div className="aab-reason-group aab-reason-group--blocking">
              <h4 className="aab-reason-group__title">
                <XIcon /> Requirements Not Met
              </h4>
              <ul className="aab-reason-list">
                {blockingReasons.map((reason, idx) => (
                  <li key={idx} className="aab-reason-item aab-reason-item--blocking">
                    {REASON_LABELS[reason] || reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Protection Reasons */}
          {protectionReasons.length > 0 && (
            <div className="aab-reason-group aab-reason-group--protection">
              <h4 className="aab-reason-group__title">
                <ShieldIcon /> Protection Applied
              </h4>
              <ul className="aab-reason-list">
                {protectionReasons.map((reason, idx) => (
                  <li key={idx} className="aab-reason-item aab-reason-item--protection">
                    {REASON_LABELS[reason] || reason}
                  </li>
                ))}
              </ul>
              <p className="aab-protection-note">
                TONU and detention fees apply if pickup fails due to shipper/location issues.
              </p>
            </div>
          )}
          
          {/* Success Reasons (optional) */}
          {showDetails && successReasons.length > 0 && status === AUTHORIZATION_STATUS.YES && (
            <div className="aab-reason-group aab-reason-group--success">
              <h4 className="aab-reason-group__title">
                <CheckIcon /> Verified
              </h4>
              <ul className="aab-reason-list">
                {successReasons.map((reason, idx) => (
                  <li key={idx} className="aab-reason-item aab-reason-item--success">
                    {REASON_LABELS[reason] || reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Metadata (debug info) */}
          {metadata && (
            <div className="aab-metadata">
              <span className="aab-metadata__item">
                Origin: <strong>{metadata.originType}</strong>
              </span>
              {metadata.hasGatePass && (
                <span className="aab-metadata__item aab-metadata__item--check">
                  ✓ Gate Pass
                </span>
              )}
              {metadata.hasAppointment && (
                <span className="aab-metadata__item aab-metadata__item--check">
                  ✓ Appointment
                </span>
              )}
              {metadata.isWeekend && (
                <span className="aab-metadata__item aab-metadata__item--warn">
                  Weekend Pickup
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Inline badge variant for use in action buttons
 */
export const AuthorizationStatusInline = ({ status, className = '' }) => {
  const badgeInfo = getAuthorizationBadgeInfo({ status });
  
  return (
    <span className={`aab-inline aab-inline--${badgeInfo.status} ${className}`}>
      {getIcon(status)}
    </span>
  );
};

/**
 * Simple text indicator
 */
export const AuthorizationText = ({ authResult, className = '' }) => {
  if (!authResult) return null;
  
  const badgeInfo = getAuthorizationBadgeInfo(authResult);
  
  return (
    <span className={`aab-text aab-text--${badgeInfo.status} ${className}`}>
      {badgeInfo.label}
    </span>
  );
};

export default AttemptAuthorizedBadge;