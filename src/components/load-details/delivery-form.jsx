// ============================================================
// FILE: src/components/load-details/delivery-form.jsx
// ✅ UPDATED: Removed POD upload, added Customer Signature placeholder
// ============================================================

import React, { useState, useCallback } from 'react';
import FileUploader from '../ui/file-uploader.jsx';
import { markDelivered } from '../../services/booking.api.js';
import './delivery-form.css';

// Maximum photos allowed for delivery
const MAX_DELIVERY_PHOTOS = 30;

// Icons
const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="df-spinner">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ✅ NEW: Pen/Signature icon
const PenToolIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

// ✅ NEW: Smartphone icon
const SmartphoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

/**
 * DeliveryForm Component
 * 
 * Form for marking a load as delivered with photos
 * Customer signature is captured via mobile app (read-only display here)
 * 
 * @param {Object} props
 * @param {Object} props.load - The load/booking object
 * @param {Function} props.onSuccess - Callback on successful delivery
 * @param {Function} props.onCancel - Callback to cancel/close form
 * @param {boolean} props.embedded - Whether the form is embedded (no cancel button)
 */
const DeliveryForm = ({ load, onSuccess, onCancel, embedded = false }) => {
  const [deliveryPhotos, setDeliveryPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadId = load?.id;
  const orderNumber = load?.orderNumber || load?.displayOrderId || loadId?.slice(-6);

  // ✅ NEW: Customer signature data (will come from mobile app)
  const customerSignature = load?.customerSignature || null;
  const signedBy = load?.signedBy || null;
  const signedAt = load?.signedAt || null;

  // Handle successful delivery photo uploads
  const handlePhotoUpload = useCallback((documents) => {
    console.log('📷 Delivery photos uploaded:', documents);
    setDeliveryPhotos(prev => [...prev, ...documents]);
    setError(null);
  }, []);

  // Handle photo upload errors
  const handlePhotoError = useCallback((err) => {
    console.error('❌ Photo upload error:', err);
    setError(typeof err === 'string' ? err : 'Failed to upload photos');
  }, []);

  // ✅ NEW: Format signature timestamp
  const formatSignatureTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  // Submit delivery confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (deliveryPhotos.length === 0) {
      setError('Please upload at least one delivery photo');
      return;
    }

    if (deliveryPhotos.length > MAX_DELIVERY_PHOTOS) {
      setError(`Maximum ${MAX_DELIVERY_PHOTOS} photos allowed for delivery`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const deliveryDocumentIds = deliveryPhotos.map(doc => doc.id);
      // ✅ UPDATED: No longer requiring POD document
      const podDocumentId = null;

      console.log('🚛 Marking load as delivered:', loadId, {
        deliveryDocumentIds,
        podDocumentId,
      });

      const result = await markDelivered(loadId, deliveryDocumentIds, podDocumentId, token);
      
      console.log('✅ Delivery confirmed:', result);
      setSuccess(true);
      
      // Notify parent after short delay
      setTimeout(() => {
        onSuccess?.(result);
      }, 1500);

    } catch (err) {
      console.error('❌ Delivery error:', err);
      setError(err.message || 'Failed to mark as delivered');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="df-container">
        <div className="df-success">
          <div className="df-success-icon">
            <CheckIcon />
          </div>
          <h3 className="df-success-title">Delivery Complete!</h3>
          <p className="df-success-text">
            Load #{orderNumber} has been marked as delivered. 
            The customer has been notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="df-container">
      <form onSubmit={handleSubmit} className="df-form">
        {/* Header */}
        <div className="df-header">
          <div className="df-header-icon">
            <TruckIcon />
          </div>
          <div className="df-header-text">
            <h3 className="df-title">Confirm Delivery</h3>
            <p className="df-subtitle">Load #{orderNumber}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="df-instructions">
          <p>Take photos of the vehicle after unloading to document its condition 
          at delivery. Customer signature can be captured via the mobile app.</p>
        </div>

        {/* Delivery Photos Section */}
        <div className="df-section">
          <label className="df-label">
            Delivery Photos <span className="df-required">*</span>
          </label>
          <p className="df-hint">Upload 1-{MAX_DELIVERY_PHOTOS} photos showing the delivered vehicle (required)</p>
          
          <FileUploader
            type="delivery_photo"
            bookingId={loadId}
            multiple={true}
            maxFiles={MAX_DELIVERY_PHOTOS}
            maxSize={10 * 1024 * 1024}
            imagesOnly={true}
            onUpload={handlePhotoUpload}
            onError={handlePhotoError}
            autoUpload={true}
            label="Drop delivery photos here or click to upload"
            hint={`JPEG, PNG • Max 10MB each • Up to ${MAX_DELIVERY_PHOTOS} photos`}
            showPreview={true}
            uploadTypeLabel="delivery"
          />
        </div>

        {/* Photo count indicator */}
        {deliveryPhotos.length > 0 && (
          <div className="df-photo-count">
            <CheckIcon />
            <span>{deliveryPhotos.length} photo{deliveryPhotos.length !== 1 ? 's' : ''} ready</span>
            <span className="df-photo-remaining">
              ({MAX_DELIVERY_PHOTOS - deliveryPhotos.length} remaining)
            </span>
          </div>
        )}

        {/* ✅ NEW: Customer Signature Section (Read-only) */}
        <div className="df-section">
          <label className="df-label">
            Customer Signature
          </label>
          <p className="df-hint">Signature captured on driver's mobile app at drop-off</p>
          
          {customerSignature ? (
            // Display signature when available (future integration)
            <div className="df-signature-display">
              <div className="df-signature-image-wrapper">
                <img 
                  src={customerSignature} 
                  alt="Customer signature" 
                  className="df-signature-image"
                />
              </div>
              <div className="df-signature-info">
                {signedBy && (
                  <p className="df-signature-name">
                    Signed by: <strong>{signedBy}</strong>
                  </p>
                )}
                {signedAt && (
                  <p className="df-signature-time">
                    {formatSignatureTime(signedAt)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Placeholder when no signature yet
            <div className="df-signature-placeholder">
              <div className="df-signature-placeholder-icon">
                <PenToolIcon />
              </div>
              <div className="df-signature-placeholder-content">
                <p className="df-signature-placeholder-text">
                  No signature captured yet
                </p>
                <p className="df-signature-placeholder-hint">
                  <SmartphoneIcon />
                  <span>Use the mobile app to collect customer signature at delivery</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="df-error">
            <AlertCircleIcon />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="df-actions">
          {!embedded && onCancel && (
            <button
              type="button"
              className="df-btn df-btn--secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="df-btn df-btn--primary"
            disabled={submitting || deliveryPhotos.length === 0}
          >
            {submitting ? (
              <>
                <LoaderIcon />
                Confirming...
              </>
            ) : (
              'Confirm Delivery'
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="df-help">
          By confirming delivery, you acknowledge that the vehicle has been 
          successfully delivered to the destination.
        </p>
      </form>
    </div>
  );
};

export default DeliveryForm;