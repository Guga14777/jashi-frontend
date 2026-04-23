// ============================================================
// FILE: src/pages/customer-notifications/notification-detail-modal.jsx
// ✅ FIXED: Uses numeric orderNumber instead of GAT-... ref in header
// ✅ FIXED: Properly displays likelihood and marketAvg (handles 0 values)
// ✅ FIXED: Fetches booking data for carrier_assigned notifications
// ✅ FIXED: Shows loading state while fetching
// ✅ FIXED: Works with both old and new notifications
// ✅ FIXED: NO MC/DOT shown to customers
// ✅ FIXED: Added "Company:" and "Contact:" labels
// ✅ FIXED: Removed footer buttons (Close/View Shipment)
// ============================================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useCustomerNotifications } from '../../store/customer-notifications-context.jsx';
import { useAuth } from '../../store/auth-context.jsx';
import './notification-detail-modal.css';

// Icons - Same style as LoadDetails
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const MailIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const UserIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BuildingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18"/>
    <path d="M5 21V7l8-4v18"/>
    <path d="M19 21V11l-6-4"/>
    <path d="M9 9v.01"/>
    <path d="M9 12v.01"/>
    <path d="M9 15v.01"/>
    <path d="M9 18v.01"/>
  </svg>
);

const LoadingSpinner = () => (
  <div className="ndm-loading">
    <div className="ndm-spinner"></div>
    <p>Loading carrier details...</p>
  </div>
);

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatPrice = (amount) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ✅ FIXED: Helper to get the correct display order ID
// Prefers numeric order numbers over internal refs (GAT-...)
const getDisplayOrderId = (orderId, meta) => {
  // First, check meta.orderNumber as it's most reliable
  if (meta?.orderNumber != null) {
    return meta.orderNumber;
  }
  
  // If orderId exists and is numeric (not a GAT-... ref), use it
  if (orderId != null) {
    const orderIdStr = String(orderId);
    // If it's a pure number or doesn't start with GAT-, use it
    if (/^\d+$/.test(orderIdStr) || !orderIdStr.startsWith('GAT-')) {
      return orderId;
    }
  }
  
  // Fall back to other options (but not the ref if we can avoid it)
  return meta?.bookingId || orderId;
};

const NotificationDetailModal = () => {
  const { selectedNotification, closeNotificationModal } = useCustomerNotifications();
  const { token } = useAuth();
  const backdropRef = useRef(null);
  const closeButtonRef = useRef(null);
  
  // ✅ State for fetched booking data
  const [bookingData, setBookingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Focus close button when modal opens
  useEffect(() => {
    if (selectedNotification && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [selectedNotification]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!selectedNotification) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeNotificationModal();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedNotification, closeNotificationModal]);

  // ✅ Fetch booking data when carrier_assigned notification is opened
  useEffect(() => {
    if (!selectedNotification) {
      setBookingData(null);
      setFetchError(null);
      return;
    }

    const { type, meta } = selectedNotification;
    
    // Only fetch for carrier_assigned notifications that might need more data
    if (type === 'carrier_assigned' && meta?.bookingId && token) {
      // Check if we already have carrier data in meta
      const hasCarrierData = meta.carrier && (
        meta.carrier.companyName || 
        meta.carrier.phone || 
        meta.carrier.email ||
        meta.carrier.firstName ||
        meta.carrier.lastName
      );
      
      // If we don't have carrier data, fetch it from the booking endpoint
      if (!hasCarrierData) {
        setIsLoading(true);
        setFetchError(null);
        
        console.log('📬 [Modal] Fetching booking data for carrier info:', meta.bookingId);
        
        fetch(`/api/bookings/${meta.bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch booking');
            return res.json();
          })
          .then(data => {
            console.log('📬 [Modal] Fetched booking data:', data);
            setBookingData(data.booking || data);
            setIsLoading(false);
          })
          .catch(err => {
            console.error('❌ [Modal] Failed to fetch booking:', err);
            setFetchError(err.message);
            setIsLoading(false);
          });
      } else {
        console.log('📬 [Modal] Carrier data already in notification meta:', {
          companyName: meta.carrier.companyName,
          phone: meta.carrier.phone,
          email: meta.carrier.email,
        });
      }
    }
  }, [selectedNotification, token]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) closeNotificationModal();
  }, [closeNotificationModal]);

  if (!selectedNotification) return null;

  const { type, title, orderId, meta, message } = selectedNotification;
  
  // ✅ FIXED: Use helper to get correct display order ID
  const displayOrderId = getDisplayOrderId(orderId, meta);

  // Get status badge class
  const getStatusClass = () => {
    switch (type) {
      case 'booking_confirmed':
      case 'booking_created':
        return 'ndm-status--confirmed';
      case 'carrier_assigned':
        return 'ndm-status--assigned';
      case 'booking_cancelled':
        return 'ndm-status--cancelled';
      default:
        return 'ndm-status--waiting';
    }
  };

  const getStatusText = () => {
    switch (type) {
      case 'booking_confirmed':
      case 'booking_created':
        return 'Confirmed';
      case 'carrier_assigned':
        return 'Assigned';
      case 'booking_cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  // ✅ Merge meta with fetched booking data for carrier_assigned
  const getMergedMeta = () => {
    if (type !== 'carrier_assigned') {
      return meta;
    }
    
    // If no booking data was fetched, return original meta
    if (!bookingData) {
      return meta;
    }
    
    // ✅ Build carrier info from booking data if not in meta
    const carrierFromBooking = bookingData.carrier ? {
      id: bookingData.carrier.id,
      companyName: bookingData.carrier.companyName || '',
      firstName: bookingData.carrier.firstName || '',
      lastName: bookingData.carrier.lastName || '',
      contactName: [bookingData.carrier.firstName, bookingData.carrier.lastName].filter(Boolean).join(' '),
      displayName: bookingData.carrier.companyName || 
        [bookingData.carrier.firstName, bookingData.carrier.lastName].filter(Boolean).join(' ') ||
        'Assigned Carrier',
      phone: bookingData.carrier.phone || '',
      email: bookingData.carrier.email || '',
    } : null;
    
    // Merge booking data into meta, preferring existing meta values
    return {
      ...meta,
      // ✅ FIXED: Also get orderNumber from booking if not in meta
      orderNumber: meta?.orderNumber ?? bookingData.orderNumber,
      carrier: meta?.carrier?.phone || meta?.carrier?.email ? meta.carrier : carrierFromBooking,
      pickup: meta?.pickup || bookingData.pickup || {
        city: bookingData.fromCity,
        state: '',
        fullAddress: bookingData.origin,
      },
      dropoff: meta?.dropoff || bookingData.dropoff || {
        city: bookingData.toCity,
        state: '',
        fullAddress: bookingData.destination,
      },
      vehicle: meta?.vehicle || bookingData.vehicleDetails || {
        description: bookingData.vehicle,
        type: bookingData.vehicleType,
      },
      price: meta?.price ?? bookingData.price,
      likelihood: meta?.likelihood ?? bookingData.likelihood,
      marketAvg: meta?.marketAvg ?? bookingData.marketAvg,
      miles: meta?.miles ?? bookingData.miles,
      pickupDate: meta?.pickupDate || bookingData.pickupDate,
      dropoffDate: meta?.dropoffDate || bookingData.dropoffDate,
      transportType: meta?.transportType || bookingData.transportType,
    };
  };

  // ✅ FIXED: Get the correct displayOrderId for carrier_assigned (after potential merge)
  const getFinalDisplayOrderId = () => {
    if (type === 'carrier_assigned') {
      const mergedMeta = getMergedMeta();
      return getDisplayOrderId(orderId, mergedMeta);
    }
    return displayOrderId;
  };

  return ReactDOM.createPortal(
    <div ref={backdropRef} className="ndm-backdrop" onClick={handleBackdropClick}>
      <div 
        className="ndm-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ndm-title"
      >
        {/* Header */}
        <div className="ndm-header">
          <div className="ndm-header__left">
            <h2 id="ndm-title" className="ndm-title">{title}</h2>
            {/* ✅ FIXED: Use getFinalDisplayOrderId for carrier_assigned */}
            {(type === 'carrier_assigned' ? getFinalDisplayOrderId() : displayOrderId) && (
              <span className="ndm-order-badge">
                #{type === 'carrier_assigned' ? getFinalDisplayOrderId() : displayOrderId}
              </span>
            )}
          </div>
          <div className="ndm-header__right">
            <span className={`ndm-status-badge ${getStatusClass()}`}>
              {getStatusText()}
            </span>
            <button 
              ref={closeButtonRef}
              className="ndm-close" 
              onClick={closeNotificationModal}
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="ndm-content">
          {type === 'booking_confirmed' || type === 'booking_created' ? (
            <BookingConfirmedContent meta={meta} />
          ) : type === 'carrier_assigned' ? (
            isLoading ? (
              <LoadingSpinner />
            ) : (
              <CarrierAssignedContent meta={getMergedMeta()} fetchError={fetchError} />
            )
          ) : type === 'booking_cancelled' ? (
            <BookingCancelledContent meta={meta} />
          ) : type === 'payment_received' ? (
            <PaymentReceivedContent meta={meta} />
          ) : (
            <GenericContent message={message} meta={meta} />
          )}
        </div>

        {/* ✅ REMOVED: Footer with Close/View Shipment buttons */}
      </div>
    </div>,
    document.body
  );
};

/* ============================================================
   BOOKING CONFIRMED CONTENT - Matches LoadDetails layout
   ✅ FIXED: Properly handles 0 values for likelihood and marketAvg
   ============================================================ */
const BookingConfirmedContent = ({ meta }) => {
  if (!meta) return <p className="ndm-notes-text">Your booking has been confirmed.</p>;

  const vehicle = meta.vehicle || {};
  const pickup = meta.pickup || {};
  const dropoff = meta.dropoff || {};

  const price = meta.price;
  const likelihood = meta.likelihood;
  const marketAvg = meta.marketAvg;

  const from = pickup.zip || pickup.city || '—';
  const to = dropoff.zip || dropoff.city || '—';
  const miles = meta.miles || 0;
  const transport = (meta.transportType || 'open').charAt(0).toUpperCase() + (meta.transportType || 'open').slice(1);

  const pickupAddr = pickup.fullAddress || [pickup.city, pickup.state, pickup.zip].filter(Boolean).join(', ') || '—';
  const dropoffAddr = dropoff.fullAddress || [dropoff.city, dropoff.state, dropoff.zip].filter(Boolean).join(', ') || '—';

  return (
    <>
      {/* Pricing - Same as LoadDetails accent box */}
      <div className="ndm-section">
        <div className="ndm-box ndm-box--accent ndm-grid ndm-grid--3">
          <div className="ndm-field">
            <span className="ndm-field__label">Price</span>
            <span className="ndm-field__value ndm-field__value--lg ndm-field__value--primary">
              {formatPrice(price)}
            </span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Likelihood</span>
            <span className="ndm-field__value ndm-field__value--lg ndm-field__value--success">
              {/* ✅ FIXED: Use != null to properly handle 0 values */}
              {likelihood != null ? `${likelihood}%` : '—'}
            </span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Market Avg</span>
            <span className="ndm-field__value ndm-field__value--lg">
              {/* ✅ FIXED: Use != null to properly handle 0 values */}
              {marketAvg != null ? formatPrice(marketAvg) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Route & Vehicle - Same as LoadDetails side-by-side boxes */}
      <div className="ndm-section">
        <div className="ndm-grid ndm-grid--2">
          <div className="ndm-box">
            <div className="ndm-section-label">Route</div>
            <div className="ndm-grid ndm-grid--route">
              <div className="ndm-field">
                <span className="ndm-field__label">From</span>
                <span className="ndm-field__value">{from}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">To</span>
                <span className="ndm-field__value">{to}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Distance</span>
                <span className="ndm-field__value">{miles > 0 ? `${miles.toLocaleString()} mi` : '—'}</span>
              </div>
            </div>
          </div>
          <div className="ndm-box">
            <div className="ndm-section-label">Vehicle</div>
            <div className="ndm-grid ndm-grid--2">
              <div className="ndm-field">
                <span className="ndm-field__label">Year</span>
                <span className="ndm-field__value">{vehicle.year || '—'}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Make</span>
                <span className="ndm-field__value">{vehicle.make || '—'}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Model</span>
                <span className="ndm-field__value">{vehicle.model || '—'}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Type</span>
                <span className="ndm-field__value">{vehicle.type || '—'}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Condition</span>
                <span className="ndm-field__value">{vehicle.condition || 'Operable'}</span>
              </div>
              <div className="ndm-field">
                <span className="ndm-field__label">Transport</span>
                <span className="ndm-field__value">{transport}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      {(meta.pickupDate || meta.dropoffDate) && (
        <div className="ndm-section">
          <div className="ndm-section-label">Schedule</div>
          <div className="ndm-box ndm-grid ndm-grid--2">
            <div className="ndm-field">
              <span className="ndm-field__label">Pickup</span>
              <span className="ndm-field__value">{formatDate(meta.pickupDate)}</span>
            </div>
            <div className="ndm-field">
              <span className="ndm-field__label">Drop-off</span>
              <span className="ndm-field__value">{formatDate(meta.dropoffDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Locations */}
      <div className="ndm-section">
        <div className="ndm-section-label">Locations</div>
        <div className="ndm-grid ndm-grid--2">
          <div className="ndm-box">
            <div className="ndm-field">
              <span className="ndm-field__label">Pickup</span>
              <span className="ndm-field__value">{pickupAddr}</span>
            </div>
          </div>
          <div className="ndm-box">
            <div className="ndm-field">
              <span className="ndm-field__label">Drop-off</span>
              <span className="ndm-field__value">{dropoffAddr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {meta.notes && (
        <div className="ndm-section">
          <div className="ndm-section-label">Notes</div>
          <div className="ndm-box">
            <p className="ndm-notes-text">{meta.notes}</p>
          </div>
        </div>
      )}
    </>
  );
};

/* ============================================================
   CARRIER ASSIGNED CONTENT
   ✅ FIXED: Works with both notification meta AND fetched booking data
   ✅ FIXED: NO MC/DOT shown to customers
   ✅ FIXED: Added "Company:" and "Contact:" labels
   ✅ FIXED: Properly handles 0 values for likelihood and marketAvg
   ============================================================ */
const CarrierAssignedContent = ({ meta, fetchError }) => {
  // Debug: Log what we received
  console.log('📬 [CarrierAssignedContent] meta:', JSON.stringify(meta, null, 2));

  if (!meta) {
    return (
      <div className="ndm-section">
        <div className="ndm-box ndm-box--muted">
          <p className="ndm-notes-text">
            A carrier has been assigned to your shipment. Details will be available shortly.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Extract carrier with multiple fallback paths
  const carrier = meta.carrier || {};
  const pickup = meta.pickup || {};
  const dropoff = meta.dropoff || {};
  const vehicle = meta.vehicle || {};

  // ✅ Build carrier company name with robust fallbacks
  const carrierCompanyName = carrier.companyName || '';
  
  // ✅ Build carrier contact name
  const carrierFirstName = carrier.firstName || '';
  const carrierLastName = carrier.lastName || '';
  const carrierContactName = carrier.contactName || 
    [carrierFirstName, carrierLastName].filter(Boolean).join(' ') ||
    '';

  // ✅ Build display name (what shows as the main carrier name)
  const carrierDisplayName = carrier.displayName ||
    carrierCompanyName || 
    carrierContactName ||
    'Assigned Carrier';

  // ✅ Get carrier contact info
  const carrierPhone = carrier.phone || carrier.contactPhone || '';
  const carrierEmail = carrier.email || carrier.contactEmail || '';
  
  // NOTE: MC/DOT intentionally NOT displayed to customers

  // ✅ Build vehicle display with fallbacks
  const vehicleDisplay = typeof vehicle === 'string' 
    ? vehicle 
    : vehicle.description || 
      [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 
      meta.vehicleDescription ||
      '—';

  // ✅ Build pickup/dropoff with fallbacks
  const pickupDisplay = pickup.fullAddress || 
    [pickup.street1, pickup.city, pickup.state, pickup.zip].filter(Boolean).join(', ') ||
    [pickup.city, pickup.state].filter(Boolean).join(', ') ||
    meta.fromCity ||
    '—';

  const dropoffDisplay = dropoff.fullAddress || 
    [dropoff.street1, dropoff.city, dropoff.state, dropoff.zip].filter(Boolean).join(', ') ||
    [dropoff.city, dropoff.state].filter(Boolean).join(', ') ||
    meta.toCity ||
    '—';

  // ✅ Get price with fallback
  const price = meta.price ?? meta.amount ?? meta.total ?? null;
  
  // ✅ Get likelihood and marketAvg
  const likelihood = meta.likelihood;
  const marketAvg = meta.marketAvg;

  // Check if we have any meaningful carrier data
  const hasCarrierData = (
    carrierDisplayName !== 'Assigned Carrier' || 
    carrierPhone || 
    carrierEmail ||
    carrierContactName
  );

  return (
    <>
      {/* ✅ NEW: Pricing section for carrier_assigned (same as booking_confirmed) */}
      <div className="ndm-section">
        <div className="ndm-box ndm-box--accent ndm-grid ndm-grid--3">
          <div className="ndm-field">
            <span className="ndm-field__label">Price</span>
            <span className="ndm-field__value ndm-field__value--lg ndm-field__value--primary">
              {formatPrice(price)}
            </span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Likelihood</span>
            <span className="ndm-field__value ndm-field__value--lg ndm-field__value--success">
              {/* ✅ FIXED: Use != null to properly handle 0 values */}
              {likelihood != null ? `${likelihood}%` : '—'}
            </span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Market Avg</span>
            <span className="ndm-field__value ndm-field__value--lg">
              {/* ✅ FIXED: Use != null to properly handle 0 values */}
              {marketAvg != null ? formatPrice(marketAvg) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Carrier Info - ✅ FIXED: Now shows real carrier data with labels */}
      <div className="ndm-section">
        <div className="ndm-section-label">Carrier</div>
        <div className="ndm-box">
          {hasCarrierData ? (
            <div className="ndm-carrier">
              {/* ✅ Company Name with "Company:" label */}
              {carrierCompanyName && (
                <div className="ndm-carrier__row">
                  <BuildingIcon />
                  <span className="ndm-carrier__label">Company:</span>
                  <span className="ndm-carrier__value">{carrierCompanyName}</span>
                </div>
              )}
              
              {/* ✅ Contact Name with "Contact:" label */}
              {carrierContactName && (
                <div className="ndm-carrier__row">
                  <UserIcon />
                  <span className="ndm-carrier__label">Contact:</span>
                  <span className="ndm-carrier__value">{carrierContactName}</span>
                </div>
              )}
              
              {/* Contact info - Phone & Email */}
              <div className="ndm-carrier__contacts">
                {carrierPhone && (
                  <a href={`tel:${carrierPhone}`} className="ndm-carrier__contact ndm-carrier__contact--phone">
                    <PhoneIcon /> 
                    <span>{carrierPhone}</span>
                  </a>
                )}
                {carrierEmail && (
                  <a href={`mailto:${carrierEmail}`} className="ndm-carrier__contact ndm-carrier__contact--email">
                    <MailIcon /> 
                    <span>{carrierEmail}</span>
                  </a>
                )}
              </div>
              
              {/* Show message if no contact details */}
              {!carrierPhone && !carrierEmail && (
                <p className="ndm-carrier__note">
                  Contact information will be provided shortly.
                </p>
              )}
            </div>
          ) : (
            <div className="ndm-carrier">
              <div className="ndm-carrier__name">Assigned Carrier</div>
              <p className="ndm-carrier__pending">
                {fetchError 
                  ? 'Unable to load carrier details. Please try again later.'
                  : 'Carrier details will be updated shortly.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="ndm-section">
        <div className="ndm-section-label">Route</div>
        <div className="ndm-box ndm-grid ndm-grid--2">
          <div className="ndm-field">
            <span className="ndm-field__label">Pickup</span>
            <span className="ndm-field__value">{pickupDisplay}</span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Drop-off</span>
            <span className="ndm-field__value">{dropoffDisplay}</span>
          </div>
        </div>
      </div>

      {/* Shipment Details */}
      <div className="ndm-section">
        <div className="ndm-section-label">Shipment Details</div>
        <div className="ndm-box ndm-grid ndm-grid--2">
          <div className="ndm-field">
            <span className="ndm-field__label">Vehicle</span>
            <span className="ndm-field__value">{vehicleDisplay}</span>
          </div>
          <div className="ndm-field">
            <span className="ndm-field__label">Distance</span>
            <span className="ndm-field__value">
              {meta.miles > 0 ? `${meta.miles.toLocaleString()} miles` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Schedule - if available */}
      {(meta.pickupDate || meta.dropoffDate || meta.pickupWindow || meta.dropoffWindow) && (
        <div className="ndm-section">
          <div className="ndm-section-label">Schedule</div>
          <div className="ndm-box ndm-grid ndm-grid--2">
            <div className="ndm-field">
              <span className="ndm-field__label">Pickup</span>
              <span className="ndm-field__value">
                {formatDate(meta.pickupDate)}
                {meta.pickupWindow && ` (${meta.pickupWindow})`}
              </span>
            </div>
            <div className="ndm-field">
              <span className="ndm-field__label">Drop-off</span>
              <span className="ndm-field__value">
                {formatDate(meta.dropoffDate)}
                {meta.dropoffWindow && ` (${meta.dropoffWindow})`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ============================================================
   BOOKING CANCELLED CONTENT
   ============================================================ */
const BookingCancelledContent = ({ meta }) => {
  return (
    <>
      <div className="ndm-section">
        <div className="ndm-box ndm-box--muted">
          <div className="ndm-message">
            <div className="ndm-message__icon ndm-message__icon--danger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <p className="ndm-message__text">
              This shipment has been cancelled. If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      </div>
      
      {meta?.orderNumber && (
        <div className="ndm-section">
          <div className="ndm-section-label">Order Details</div>
          <div className="ndm-box">
            <div className="ndm-field">
              <span className="ndm-field__label">Order Number</span>
              <span className="ndm-field__value">#{meta.orderNumber}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ============================================================
   PAYMENT RECEIVED CONTENT
   ============================================================ */
const PaymentReceivedContent = ({ meta }) => {
  return (
    <div className="ndm-section">
      <div className="ndm-section-label">Payment Details</div>
      <div className="ndm-box ndm-grid ndm-grid--2">
        <div className="ndm-field">
          <span className="ndm-field__label">Amount Paid</span>
          <span className="ndm-field__value ndm-field__value--lg ndm-field__value--success">
            {formatPrice(meta?.amount)}
          </span>
        </div>
        {meta?.transactionId && (
          <div className="ndm-field">
            <span className="ndm-field__label">Transaction ID</span>
            <span className="ndm-field__value">{meta.transactionId}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   GENERIC CONTENT
   ============================================================ */
const GenericContent = ({ message, meta }) => {
  return (
    <>
      {message && (
        <div className="ndm-section">
          <div className="ndm-box">
            <p className="ndm-notes-text">{message}</p>
          </div>
        </div>
      )}
      
      {meta && Object.keys(meta).length > 0 && (
        <div className="ndm-section">
          <div className="ndm-section-label">Details</div>
          <div className="ndm-box ndm-grid ndm-grid--2">
            {Object.entries(meta).map(([key, value]) => {
              if (typeof value === 'object' && value !== null) return null;
              if (!value) return null;
              return (
                <div className="ndm-field" key={key}>
                  <span className="ndm-field__label">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="ndm-field__value">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationDetailModal;