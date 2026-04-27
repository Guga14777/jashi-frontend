// ============================================================
// FILE: src/components/load-details/load-details-modal.jsx
// Main modal wrapper - composes all sub-components
// ✅ UPDATED: Passes authorization props to CarrierActions
// ✅ NEW: Includes AttemptAuthorizedBadge for carrier view
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './load-details-modal.css';

// Hooks
import { useLoadDetailsState } from './hooks/use-load-details-state';
import { useAuth } from '../../store/auth-context.jsx';

// Test-only allowlist for the "Force start (test mode)" link rendered
// below Start Trip. Mirrors the server-side allowlist in
// server/controllers/booking/booking.carrier.status.controller.cjs —
// keep both in sync. Adding more accounts is a code change, on purpose.
const FORCE_START_ALLOWED_EMAILS = ['gjashi10@gmail.com'];

// Components
import {
  StatusStepper,
  ModalHeader,
  ModalFooter,
  CancelledNotice,
  OnTheWayBanner,
  ArrivedBanner,
  DeliveredBanner,
  CustomerCard,
  CarrierCard,
  PayoutLikelihoodCard,
  RouteVehicleCard,
  ScheduleCard,
  LocationsCard,
  RouteSummaryCard,
  MultiVehicleSection,
  NotesCard,
  BolButton,
  GatePassSection,
  PhotosDocumentsSection,
  ImageLightbox,
  CancelConfirmModal,
  ShipperDocumentsCard,
} from './components';

// Carrier sections
import { CarrierActions, DetentionPanel } from './sections/carrier';

// Services
import { downloadBol, cancelBooking, cancelLoad, updateBooking } from '../../services/booking.api';

// Existing modals
import PickupModal from './pickup-modal.jsx';
import DeliveryModal from './delivery-modal.jsx';
import EditBookingModal from './components/edit-booking-modal.jsx';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../lib/api-url.js';

const LoadDetailsModal = ({
  open,
  onClose,
  load,
  onAccept,
  acceptDisabled,
  acceptLoading,
  type = 'booking',
  portal = 'shipper',
  onLoadUpdated,
  onDownloadBol,
  downloadingBol: externalDownloadingBol,
  isPreviewOnly = false,
}) => {
  // Modal sub-states
  const [activeModal, setActiveModal] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [downloadingBol, setDownloadingBol] = useState(false);
  
  // Carrier action loading states
  const [startTripLoading, setStartTripLoading] = useState(false);
  const [arrivedLoading, setArrivedLoading] = useState(false);
  const [requestingFee, setRequestingFee] = useState(false);
  
  // Error state for action errors (shown as inline toast now)
  const [actionError, setActionError] = useState(null);
  
  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  
  // Refs
  const backdropRef = useRef(null);
  const closeButtonRef = useRef(null);

  const { user: currentUser } = useAuth();
  const callerEmail = String(currentUser?.email || '').toLowerCase().trim();
  const canForceStart =
    portal === 'carrier' &&
    !!callerEmail &&
    FORCE_START_ALLOWED_EMAILS.includes(callerEmail);

  // Main state hook
  const state = useLoadDetailsState({
    open,
    load,
    type,
    portal,
    isPreviewOnly,
  });

  const {
    L,
    fullLoad,
    loading,
    updateLoad,
    isCarrier,
    isQuote,
    isCustomer,
    customer,
    carrier,
    vehicle,
    times,
    dates,
    notes,
    locationTypes,
    gatePasses,
    isMultiVehicle,
    multiVehicleData,
    vehicleCount,
    status,
    statusDisplay,
    isDelivered,
    isCancelled,
    isOnTheWay,
    isArrivedAtPickup,
    orderNum,
    price,
    likelihood,
    marketAvg,
    miles,
    pricePerMile,
    from,
    to,
    transport,
    pickup,
    dropoff,
    canStartTrip,
    canMarkArrived,
    canMarkPickup,
    canMarkDelivery,
    canCancel,
    canEdit,
    cancelledBy,
    showCustomer,
    showCarrier,
    hasNotes,
    showGatePass,
    showBolButton,
    showBolButtonForQuote,
    showProgressBar,
    pickupPhotos,
    deliveryPhotos,
    podDocument,
    hasDocuments,
    waitTimerStartAt,
    waitFeeAmount,
    waitFeeRequestedAt,
    // Pickup time window info
    scheduledPickupDate,
    pickupWindowStart,
    pickupWindowEnd,
  } = state;

  // ============================================================
  // ✅ NEW: Extract authorization-related data from load
  // ============================================================
  const originType = L?.pickupOriginType || 
                     L?.pickup?.locationType || 
                     L?.pickup?.originType || 
                     'private';
  
  const hasGatePass = Boolean(
    L?.pickupGatePass || 
    L?.pickupGatePassId || 
    gatePasses?.pickup?.length > 0
  );
  
  const hasAppointment = Boolean(
    L?.appointmentConfirmed || 
    L?.pickup?.appointmentConfirmed ||
    (pickupWindowStart && pickupWindowEnd)
  );
  
  const weekendConfirmed = Boolean(
    L?.weekendConfirmed || 
    L?.pickup?.weekendConfirmed
  );
  
  // Track if this is the first pickup attempt
  const isFirstAttempt = !L?.pickupAttempts || L.pickupAttempts === 0;

  // Clear error when status changes
  useEffect(() => {
    setActionError(null);
  }, [status]);

  // Focus management
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open, loading]);

  // Escape key and body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIndex === null && activeModal === null && !showCancelModal) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, lightboxIndex, activeModal, showCancelModal]);

  // Backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  // Pickup/Delivery modal handlers
  const handlePickupSuccess = (result) => {
    setActiveModal(null);
    if (result.booking) {
      updateLoad(result.booking);
    }
    onLoadUpdated?.(result.booking);
  };

  const handleDeliverySuccess = (result) => {
    setActiveModal(null);
    if (result.booking) {
      updateLoad(result.booking);
    }
    onLoadUpdated?.(result.booking);
  };

  // Carrier action handlers
  const handleStartTrip = async (options = {}) => {
    if (!L?.id) return;
    const { force = false } = options;
    setStartTripLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/carrier/loads/${L.id}/start-trip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start trip');
      if (data.booking) updateLoad(data.booking);
      onLoadUpdated?.(data.booking);
    } catch (err) {
      setActionError(err.message || 'Failed to start trip. Please try again.');
      showToast(err.message || 'Failed to start trip', 'error');
    } finally {
      setStartTripLoading(false);
    }
  };

  const handleForceStartTrip = () => handleStartTrip({ force: true });

  const handleMarkArrived = async () => {
    if (!L?.id) return;
    setArrivedLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/carrier/loads/${L.id}/arrived-at-pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'ARRIVAL_TOO_EARLY' || data.code === 'ARRIVAL_TOO_LATE') {
          throw new Error(data.error || 'Cannot mark as arrived at this time');
        }
        if (data.code === 'NOT_AUTHORIZED') {
          throw new Error(data.error || 'Pickup attempt not authorized');
        }
        throw new Error(data.error || 'Failed to mark as arrived');
      }
      if (data.booking) updateLoad(data.booking);
      onLoadUpdated?.(data.booking);
    } catch (err) {
      setActionError(err.message || 'Failed to mark as arrived. Please try again.');
      showToast(err.message || 'Failed to mark as arrived', 'error');
    } finally {
      setArrivedLoading(false);
    }
  };

  // Handle frontend validation error (from CarrierActions component)
  const handleArrivedError = (error) => {
    console.log('[LoadDetailsModal] Arrival blocked:', error.message);
  };

  const handleRequestWaitingFee = async () => {
    if (!L?.id) return;
    setRequestingFee(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/carrier/loads/${L.id}/request-waiting-fee`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to request waiting fee');
      if (data.booking) updateLoad(data.booking);
      onLoadUpdated?.(data.booking);
      showToast('Waiting fee requested successfully', 'success');
    } catch (err) {
      setActionError(err.message || 'Failed to request waiting fee. Please try again.');
      showToast(err.message || 'Failed to request waiting fee', 'error');
    } finally {
      setRequestingFee(false);
    }
  };

  // Edit handler
  const handleEditSubmit = async (updates) => {
    if (!L?.id) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const result = await updateBooking(L.id, updates, token);
      const updated = result?.booking || result;
      if (updated) {
        updateLoad(updated);
        onLoadUpdated?.(updated);
      }
      setShowEditModal(false);
    } finally {
      setEditLoading(false);
    }
  };

  // Cancel handlers
  const handleCancelConfirm = async (cancelData) => {
    if (!L?.id) return;
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('token');
      const result = isCarrier 
        ? await cancelLoad(L.id, cancelData, token)
        : await cancelBooking(L.id, cancelData, token);
      
      if (result.booking) {
        updateLoad({ ...result.booking, status: 'cancelled' });
      } else {
        updateLoad({ status: 'cancelled', cancelledAt: new Date().toISOString() });
      }
      setShowCancelModal(false);
      onLoadUpdated?.(result.booking || { ...L, status: 'cancelled' });
      showToast('Load cancelled successfully', 'info');
      setTimeout(() => onClose(), 300);
    } catch (err) {
      const message = err.message?.toLowerCase() || '';
      if (message.includes('already') || message.includes('cancelled') || message.includes('canceled')) {
        updateLoad({ status: 'cancelled' });
      }
      throw err;
    } finally {
      setCancelLoading(false);
    }
  };

  // BOL download handler
  const handleDownloadBol = async () => {
    if (!L?.id) return;
    if (onDownloadBol) {
      onDownloadBol(L);
      return;
    }
    setDownloadingBol(true);
    try {
      const token = localStorage.getItem('token');
      await downloadBol(L.id, token, L.orderNumber);
    } catch (err) {
      showToast('Failed to download BOL', 'error');
    } finally {
      setDownloadingBol(false);
    }
  };

  // Lightbox handlers
  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxImages([]);
  };

  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);

  // Derived values
  const isDownloading = downloadingBol || externalDownloadingBol;
  const hasCarrierActions = canStartTrip || canMarkArrived || canMarkPickup || canMarkDelivery;

  // Early returns
  if (!open) return null;

  // Render pickup/delivery modals
  if (activeModal === 'pickup') {
    return <PickupModal open={true} onClose={() => setActiveModal(null)} load={L} onSuccess={handlePickupSuccess} />;
  }
  if (activeModal === 'delivery') {
    return <DeliveryModal open={true} onClose={() => setActiveModal(null)} load={L} onSuccess={handleDeliverySuccess} />;
  }

  // Loading state
  if (loading && !fullLoad) {
    return ReactDOM.createPortal(
      <div className="ldm-backdrop" ref={backdropRef}>
        <div className="ldm-modal ldm-modal--loading" role="dialog" aria-modal="true" aria-label="Loading">
          <div className="ldm-spinner" />
          <span>Loading…</span>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div ref={backdropRef} className="ldm-backdrop" onClick={handleBackdropClick}>
      <div className="ldm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ldm-title">
        
        {/* Header */}
        <ModalHeader
          isQuote={isQuote}
          orderNum={orderNum}
          loadId={L.id}
          isMultiVehicle={isMultiVehicle}
          vehicleCount={vehicleCount}
          statusDisplay={statusDisplay}
          isPreviewOnly={isPreviewOnly}
          onClose={onClose}
          closeButtonRef={closeButtonRef}
        />

        {/* Content */}
        <div className="ldm-content">
          {/* Cancelled Notice */}
          {isCancelled && <CancelledNotice cancelledAt={L.cancelledAt} />}

          {/* Status Progress Bar */}
          {showProgressBar && !isCancelled && (
            <div className="ldm-section">
              <StatusStepper 
                status={status}
                timestamps={{
                  createdAt: L.createdAt,
                  assignedAt: L.assignedAt || L.carrierAcceptedAt,
                  onTheWayAt: L.onTheWayAt || L.pickupTripStartedAt,
                  arrivedAtPickupAt: L.arrivedAtPickupAt,
                  pickedUpAt: L.pickedUpAt || L.pickupAt,
                  deliveredAt: L.deliveredAt,
                }}
              />
            </div>
          )}

          {/* Download BOL Button — kept for carrier and quote views.
              Customer/shipper downloads happen in the consolidated
              Documents card rendered below the Notes section. */}
          {(showBolButton || showBolButtonForQuote) && !isCustomer && (
            <BolButton onClick={handleDownloadBol} isLoading={isDownloading} />
          )}

          {/* ✅ UPDATED: Carrier Action Buttons - Now with full authorization props */}
          {isCarrier && !isPreviewOnly && !isCancelled && hasCarrierActions && (
            <CarrierActions
              canStartTrip={canStartTrip}
              canMarkArrived={canMarkArrived}
              canMarkPickup={canMarkPickup}
              canMarkDelivery={canMarkDelivery}
              startTripLoading={startTripLoading}
              arrivedLoading={arrivedLoading}
              onStartTrip={handleStartTrip}
              onMarkArrived={handleMarkArrived}
              onMarkPickup={() => setActiveModal('pickup')}
              onMarkDelivery={() => setActiveModal('delivery')}
              scheduledPickupDate={scheduledPickupDate}
              pickupWindowStart={pickupWindowStart}
              pickupWindowEnd={pickupWindowEnd}
              pickupState={pickup?.state || L?.pickup?.state}
              onArrivedError={handleArrivedError}
              // ✅ NEW: Authorization props
              originType={originType}
              hasGatePass={hasGatePass}
              hasAppointment={hasAppointment}
              weekendConfirmed={weekendConfirmed}
              isFirstAttempt={isFirstAttempt}
              // Test-only override: shows a small "Force start (test mode)"
              // link below the Start Trip button for the configured test
              // account. Backend mirrors this allowlist.
              canForceStart={canForceStart}
              onForceStartTrip={handleForceStartTrip}
            />
          )}

          {/* On the Way Banner */}
          {isOnTheWay && (
            <OnTheWayBanner 
              isCarrier={isCarrier} 
              onTheWayAt={L.onTheWayAt} 
              pickupTripStartedAt={L.pickupTripStartedAt} 
            />
          )}

          {/* Arrived at Pickup Banner + Waiting Timer */}
          {isArrivedAtPickup && (
            <div className="ldm-section">
              <ArrivedBanner isCarrier={isCarrier} arrivedAtPickupAt={L.arrivedAtPickupAt} />
              {isCarrier && waitTimerStartAt && (
                <DetentionPanel
                  waitTimerStartAt={waitTimerStartAt}
                  waitFeeAmount={waitFeeAmount}
                  waitFeeRequestedAt={waitFeeRequestedAt}
                  onRequestFee={handleRequestWaitingFee}
                  requestingFee={requestingFee}
                />
              )}
            </div>
          )}

          {/* Delivered Banner */}
          {isDelivered && <DeliveredBanner deliveredAt={L.deliveredAt} />}

          {/* Customer Info (for carriers) */}
          {showCustomer && <CustomerCard customer={customer} />}

          {/* Carrier Info (for customers) */}
          {showCarrier && <CarrierCard carrier={carrier} />}

          {/* Pricing */}
          <PayoutLikelihoodCard
            price={price}
            likelihood={likelihood}
            marketAvg={marketAvg}
            pricePerMile={pricePerMile}
            isCarrier={isCarrier}
          />

          {/* Route & Vehicle (single vehicle) */}
          {!isMultiVehicle && (
            <RouteVehicleCard
              from={from}
              to={to}
              miles={miles}
              vehicle={vehicle}
              transport={transport}
            />
          )}

          {/* Multi-Vehicle Section */}
          {isMultiVehicle && multiVehicleData.vehicles.length > 0 && (
            <MultiVehicleSection 
              vehicles={multiVehicleData.vehicles} 
              showGatePass={showGatePass}
            />
          )}

          {/* Route Summary for Multi-Vehicle */}
          {isMultiVehicle && (
            <RouteSummaryCard
              from={from}
              to={to}
              miles={miles}
              transport={transport}
              pickupStopsCount={multiVehicleData.pickupStops.length}
              dropoffStopsCount={multiVehicleData.dropoffStops.length}
            />
          )}

          {/* Schedule */}
          <ScheduleCard
            dates={dates}
            times={times}
            pickupAt={L.pickupAt}
            deliveredAt={L.deliveredAt}
          />

          {/* Locations (single vehicle) */}
          {!isMultiVehicle && (
            <LocationsCard
              pickup={pickup}
              dropoff={dropoff}
              locationTypes={locationTypes}
              showGatePass={showGatePass}
              pickupGatePass={L.pickupGatePass}
              dropoffGatePass={L.dropoffGatePass}
              isPreviewOnly={isPreviewOnly}
            />
          )}

          {/* Gate Passes Section — carrier/quote views keep the standalone
              "Order Documents" gate-pass list. The shipper view shows gate
              passes inside the consolidated ShipperDocumentsCard rendered
              below the Notes section instead, so we hide this here for
              customers to avoid a duplicate "Order Documents" panel. */}
          {!isMultiVehicle && !isCustomer && (
            <GatePassSection gatePasses={gatePasses} showGatePass={showGatePass} />
          )}

          {/* Photos & Documents (carrier only) */}
          {isCarrier && !isPreviewOnly && hasDocuments && (
            <PhotosDocumentsSection
              pickupPhotos={pickupPhotos}
              deliveryPhotos={deliveryPhotos}
              podDocument={podDocument}
              orderNum={orderNum}
              loadId={L.id}
              onOpenLightbox={openLightbox}
            />
          )}

          {/* Notes */}
          {hasNotes && <NotesCard notes={notes} />}

          {/* Documents — shipper portal. Consolidates BOL download +
              gate passes + auction/dealership uploads in one section
              below Notes. Carrier/quote views keep the existing
              BolButton + GatePassSection layout above.
              The BOL is auto-generated by the backend for every booking
              regardless of status, so we always show its row here (the
              card hides it itself only when the booking is cancelled). */}
          {isCustomer && !isPreviewOnly && !isQuote && (
            <ShipperDocumentsCard
              status={status}
              isCancelled={isCancelled}
              showBol
              bolDownloading={isDownloading}
              onDownloadBol={handleDownloadBol}
              documents={L.documents || []}
              gatePasses={gatePasses || []}
            />
          )}
        </div>

        {/* Footer */}
        <ModalFooter
          canCancel={canCancel}
          canEdit={canEdit}
          isCarrier={isCarrier}
          onCancelClick={() => setShowCancelModal(true)}
          onEditClick={() => setShowEditModal(true)}
          onClose={onClose}
          onAccept={onAccept}
          isQuote={isQuote}
          load={L}
          acceptDisabled={acceptDisabled}
          acceptLoading={acceptLoading}
        />
      </div>

      {/* Edit Shipment Modal (customer only) */}
      <EditBookingModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        booking={L}
        loading={editLoading}
      />

      {/* Cancel Confirmation Modal */}
      <CancelConfirmModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        isCarrier={isCarrier}
        status={status}
        orderNumber={orderNum || L.id?.slice(-6) || '—'}
        loading={cancelLoading}
      />

      {/* Image Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>,
    document.body
  );
};

// Toast helper function
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

export default LoadDetailsModal;

// Re-export utilities for backwards compatibility
export { 
  SHIPMENT_STATUS, 
  STATUS_LABELS, 
  STATUS_ORDER, 
  normalizeStatus, 
  getStatusStep 
} from './utils/status-map';

export {
  WAITING_FEE_THRESHOLD_MINUTES,
  WAITING_FEE_AMOUNT,
  calculateWaitTimerStart,
  calculateWaitingMinutes,
  isWaitingFeeEligible
} from './hooks/use-detention-timer';

// ✅ NEW: Export authorization utilities
export {
  AUTHORIZATION_STATUS,
  AUTHORIZATION_REASONS,
  checkAttemptAuthorization,
  canAttemptPickup,
  getAuthorizationBadgeInfo,
} from './utils/attempt-authorization';