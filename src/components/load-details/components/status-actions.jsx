// ============================================================
// FILE: src/components/load-details/components/status-actions.jsx
// Status-based action display component
// Shows appropriate actions based on current shipment status
// ============================================================

import React from 'react';
import { SHIPMENT_STATUS, normalizeStatus } from '../utils/status-map';

// Icons
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Get status message and next action hint
 */
const getStatusInfo = (status, isCarrier) => {
  const normalized = normalizeStatus(status);
  
  const statusInfo = {
    [SHIPMENT_STATUS.SCHEDULED]: {
      message: isCarrier ? 'Waiting for carrier assignment' : 'Your shipment is scheduled',
      hint: isCarrier ? 'This load will be assigned to a carrier soon' : 'A carrier will be assigned shortly',
      type: 'info',
    },
    [SHIPMENT_STATUS.ASSIGNED]: {
      message: isCarrier ? 'You are assigned to this load' : 'Carrier has been assigned',
      hint: isCarrier ? 'Start trip when ready to head to pickup' : 'Carrier will begin trip to pickup soon',
      type: 'success',
    },
    [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: {
      message: isCarrier ? 'You are on the way to pickup' : 'Carrier is on the way',
      hint: isCarrier ? 'Mark as arrived when you reach the pickup location' : 'Carrier is heading to pickup location',
      type: 'progress',
    },
    [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: {
      message: isCarrier ? 'You have arrived at pickup' : 'Carrier has arrived at pickup',
      hint: isCarrier ? 'Complete pickup when vehicle is loaded' : 'Vehicle pickup in progress',
      type: 'progress',
    },
    [SHIPMENT_STATUS.PICKED_UP]: {
      message: isCarrier ? 'Vehicle picked up - in transit' : 'Vehicle is in transit',
      hint: isCarrier ? 'Mark as delivered when you reach destination' : 'Your vehicle is on its way',
      type: 'progress',
    },
    [SHIPMENT_STATUS.DELIVERED]: {
      message: 'Delivery complete',
      hint: 'Shipment has been successfully delivered',
      type: 'complete',
    },
    [SHIPMENT_STATUS.CANCELLED]: {
      message: 'Shipment cancelled',
      hint: 'This shipment has been cancelled',
      type: 'cancelled',
    },
  };
  
  return statusInfo[normalized] || {
    message: 'Unknown status',
    hint: '',
    type: 'info',
  };
};

const StatusActions = ({ status, isCarrier = false, showHint = true }) => {
  const { message, hint, type } = getStatusInfo(status, isCarrier);
  
  const typeStyles = {
    info: { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
    progress: { bg: '#fefce8', border: '#fef08a', color: '#854d0e' },
    complete: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
    cancelled: { bg: '#f9fafb', border: '#e5e7eb', color: '#6b7280' },
  };
  
  const style = typeStyles[type] || typeStyles.info;
  
  return (
    <div 
      className="status-actions"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '10px',
      }}
    >
      <div style={{ color: style.color, flexShrink: 0, marginTop: '0.125rem' }}>
        {type === 'complete' ? <CheckIcon /> : <InfoIcon />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: 600, 
          color: style.color,
        }}>
          {message}
        </span>
        {showHint && hint && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: style.color,
            opacity: 0.8,
          }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatusActions;
