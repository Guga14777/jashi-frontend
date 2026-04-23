// ============================================================
// FILE: src/components/load-details/sections/carrier/carrier-actions.jsx
// Carrier action buttons with Attempt Authorization enforcement
// ✅ NEW: Blocks actions if not authorized
// ✅ NEW: Shows authorization status inline
// ============================================================

import React, { useMemo, useState } from 'react';
import { isArrivalAllowed } from '../../utils/permissions';
import { 
  checkAttemptAuthorization, 
  AUTHORIZATION_STATUS,
  getAuthorizationBadgeInfo 
} from '../../utils/attempt-authorization';
import AttemptAuthorizedBadge from '../../components/attempt-authorized-badge';
import '../../styles/actions.css';

// Toast helper
const showToast = (message, type = 'info') => {
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(message, type);
    return;
  }
  
  const existingToast = document.querySelector('.carrier-toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `carrier-toast carrier-toast--${type}`;
  toast.innerHTML = `
    <span class="carrier-toast__message">${message}</span>
    <button class="carrier-toast__close" onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};

/**
 * Button icon components
 */
const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
  </svg>
);

const MapPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="ca-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

/**
 * CarrierActions Component
 * 
 * Renders action buttons for carriers with authorization enforcement
 */
const CarrierActions = ({
  canStartTrip,
  canMarkArrived,
  canMarkPickup,
  canMarkDelivery,
  startTripLoading,
  arrivedLoading,
  onStartTrip,
  onMarkArrived,
  onMarkPickup,
  onMarkDelivery,
  // Pickup time window props
  scheduledPickupDate,
  pickupWindowStart,
  pickupWindowEnd,
  pickupState,
  // NEW: Authorization-related props
  originType = 'private',
  hasGatePass = false,
  hasAppointment = false,
  weekendConfirmed = false,
  isFirstAttempt = true,
  // Error callback
  onArrivedError,
}) => {
  // Check time-based arrival window
  const arrivalCheck = useMemo(() => {
    if (!canMarkArrived) return { allowed: true, reason: null };
    return isArrivalAllowed(
      scheduledPickupDate,
      pickupWindowStart,
      pickupWindowEnd,
      pickupState,
      2, // 2 hours before
      4  // 4 hours after
    );
  }, [canMarkArrived, scheduledPickupDate, pickupWindowStart, pickupWindowEnd, pickupState]);
  
  // ✅ NEW: Check attempt authorization
  const authorizationResult = useMemo(() => {
    // Only check authorization for start trip and mark arrived actions
    if (!canStartTrip && !canMarkArrived) return null;
    
    return checkAttemptAuthorization({
      originType,
      hasGatePass,
      hasAppointment,
      weekendConfirmed,
      pickupDate: scheduledPickupDate,
      pickupState,
      pickupWindowStart,
      pickupWindowEnd,
      isFirstAttempt,
      status: canStartTrip ? 'assigned' : 'on_the_way',
    });
  }, [
    canStartTrip, 
    canMarkArrived, 
    originType, 
    hasGatePass, 
    hasAppointment, 
    weekendConfirmed,
    scheduledPickupDate,
    pickupState,
    pickupWindowStart,
    pickupWindowEnd,
    isFirstAttempt,
  ]);
  
  // Determine if actions are blocked by authorization
  const isAuthorized = authorizationResult?.authorized ?? true;
  const isProtected = authorizationResult?.protected ?? false;
  
  // Handle start trip with authorization check
  const handleStartTrip = () => {
    if (!isAuthorized) {
      const reason = authorizationResult?.primaryReasonLabel || 'Not authorized';
      showToast(`Cannot start trip: ${reason}`, 'error');
      return;
    }
    onStartTrip?.();
  };
  
  // Handle mark arrived with both time and authorization checks
  const handleMarkArrived = () => {
    // Check authorization first
    if (!isAuthorized) {
      const reason = authorizationResult?.primaryReasonLabel || 'Not authorized';
      showToast(`Cannot mark arrived: ${reason}`, 'error');
      onArrivedError?.({ message: reason, code: 'NOT_AUTHORIZED' });
      return;
    }
    
    // Then check time window
    if (!arrivalCheck.allowed) {
      showToast(arrivalCheck.reason || 'Cannot mark arrived at this time', 'warning');
      onArrivedError?.({ message: arrivalCheck.reason, code: 'TIME_WINDOW' });
      return;
    }
    
    onMarkArrived?.();
  };
  
  // No actions available
  if (!canStartTrip && !canMarkArrived && !canMarkPickup && !canMarkDelivery) {
    return null;
  }
  
  return (
    <div className="ca-container">
      {/* ✅ NEW: Authorization Status Badge */}
      {authorizationResult && (canStartTrip || canMarkArrived) && (
        <div className="ca-authorization-section">
          <AttemptAuthorizedBadge 
            authorizationResult={authorizationResult}
            showDetails={true}
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="ca-actions">
        {/* Start Trip Button */}
        {canStartTrip && (
          <button
            className={`ca-btn ca-btn--primary ${!isAuthorized ? 'ca-btn--blocked' : ''}`}
            onClick={handleStartTrip}
            disabled={startTripLoading || !isAuthorized}
            title={!isAuthorized ? authorizationResult?.primaryReasonLabel : 'Start trip to pickup location'}
          >
            {startTripLoading ? (
              <SpinnerIcon />
            ) : !isAuthorized ? (
              <LockIcon />
            ) : (
              <TruckIcon />
            )}
            <span>
              {startTripLoading ? 'Starting...' : 'Start Trip'}
            </span>
            {isProtected && isAuthorized && (
              <span className="ca-btn__badge ca-btn__badge--protected" title="TONU/Detention protection applies">
                Protected
              </span>
            )}
          </button>
        )}
        
        {/* Mark Arrived Button */}
        {canMarkArrived && (
          <div className="ca-arrived-wrapper">
            <button
              className={`ca-btn ca-btn--primary ${(!isAuthorized || !arrivalCheck.allowed) ? 'ca-btn--blocked' : ''}`}
              onClick={handleMarkArrived}
              disabled={arrivedLoading || !isAuthorized || !arrivalCheck.allowed}
              title={
                !isAuthorized 
                  ? authorizationResult?.primaryReasonLabel 
                  : !arrivalCheck.allowed 
                    ? arrivalCheck.reason 
                    : 'Mark as arrived at pickup location'
              }
            >
              {arrivedLoading ? (
                <SpinnerIcon />
              ) : (!isAuthorized || !arrivalCheck.allowed) ? (
                <LockIcon />
              ) : (
                <MapPinIcon />
              )}
              <span>
                {arrivedLoading ? 'Updating...' : 'Arrived at Pickup'}
              </span>
              {isProtected && isAuthorized && arrivalCheck.allowed && (
                <span className="ca-btn__badge ca-btn__badge--protected" title="TONU/Detention protection applies">
                  Protected
                </span>
              )}
            </button>
            
            {/* Time window helper text */}
            {!arrivalCheck.allowed && arrivalCheck.reason && (
              <div className="ca-time-hint">
                <ClockIcon />
                <span>{arrivalCheck.reason}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Mark Pickup Button */}
        {canMarkPickup && (
          <button
            className="ca-btn ca-btn--secondary"
            onClick={onMarkPickup}
          >
            <PackageIcon />
            <span>Mark Picked Up</span>
          </button>
        )}
        
        {/* Mark Delivery Button */}
        {canMarkDelivery && (
          <button
            className="ca-btn ca-btn--success"
            onClick={onMarkDelivery}
          >
            <CheckCircleIcon />
            <span>Mark Delivered</span>
          </button>
        )}
      </div>
      
      {/* Authorization Info for Blocked State */}
      {!isAuthorized && authorizationResult && (
        <div className="ca-blocked-info">
          <div className="ca-blocked-info__icon">
            <LockIcon />
          </div>
          <div className="ca-blocked-info__content">
            <strong>Action Blocked</strong>
            <p>
              {authorizationResult.primaryReasonLabel}
              {authorizationResult.blockingReasons.length > 1 && (
                <span> (+{authorizationResult.blockingReasons.length - 1} more issues)</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierActions;