// ============================================================
// FILE: src/components/load-details/pickup-form.jsx
// ✅ UPDATED: Increased max photos to 30 for pickup
// ============================================================

import React, { useState, useCallback } from 'react';
import FileUploader from '../ui/file-uploader.jsx';
import { markPickup } from '../../services/booking.api.js';
import './pickup-form.css';

// Maximum photos allowed for pickup
const MAX_PICKUP_PHOTOS = 30;

// Icons
const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pf-spinner">
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

/**
 * PickupForm Component
 * 
 * Form for marking a load as picked up with photos
 * 
 * @param {Object} props
 * @param {Object} props.load - The load/booking object
 * @param {Function} props.onSuccess - Callback on successful pickup
 * @param {Function} props.onCancel - Callback to cancel/close form
 * @param {boolean} props.embedded - Whether the form is embedded (no cancel button)
 */
const PickupForm = ({ load, onSuccess, onCancel, embedded = false }) => {
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadId = load?.id;
  const orderNumber = load?.orderNumber || load?.displayOrderId || loadId?.slice(-6);

  // Handle successful file uploads
  const handleUpload = useCallback((documents) => {
    console.log('📷 Photos uploaded:', documents);
    setUploadedDocs(prev => [...prev, ...documents]);
    setError(null);
  }, []);

  // Handle upload errors
  const handleUploadError = useCallback((err) => {
    console.error('❌ Upload error:', err);
    setError(typeof err === 'string' ? err : 'Failed to upload photos');
  }, []);

  // Submit pickup confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (uploadedDocs.length === 0) {
      setError('Please upload at least one photo of the vehicle');
      return;
    }

    // ✅ UPDATED: Validate max photos on submit as well
    if (uploadedDocs.length > MAX_PICKUP_PHOTOS) {
      setError(`Maximum ${MAX_PICKUP_PHOTOS} photos allowed for pickup`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const documentIds = uploadedDocs.map(doc => doc.id);
      console.log('🚛 Marking load as picked up:', loadId, documentIds);

      const result = await markPickup(loadId, documentIds, token);
      
      console.log('✅ Pickup confirmed:', result);
      setSuccess(true);
      
      // Notify parent after short delay
      setTimeout(() => {
        onSuccess?.(result);
      }, 1500);

    } catch (err) {
      console.error('❌ Pickup error:', err);
      setError(err.message || 'Failed to mark as picked up');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="pf-container">
        <div className="pf-success">
          <div className="pf-success-icon">
            <CheckIcon />
          </div>
          <h3 className="pf-success-title">Vehicle Picked Up!</h3>
          <p className="pf-success-text">
            Load #{orderNumber} has been marked as picked up. 
            The customer has been notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-container">
      <form onSubmit={handleSubmit} className="pf-form">
        {/* Header */}
        <div className="pf-header">
          <div className="pf-header-icon">
            <CameraIcon />
          </div>
          <div className="pf-header-text">
            <h3 className="pf-title">Confirm Pickup</h3>
            <p className="pf-subtitle">Load #{orderNumber}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="pf-instructions">
          <p>Take photos of the vehicle showing its current condition before loading. 
          This protects you and documents the vehicle's state at pickup.</p>
        </div>

        {/* Photo Upload Section */}
        <div className="pf-section">
          <label className="pf-label">
            Pickup Photos <span className="pf-required">*</span>
          </label>
          {/* ✅ UPDATED: Changed hint to show 30 max */}
          <p className="pf-hint">Upload 1-{MAX_PICKUP_PHOTOS} photos of the vehicle (required)</p>
          
          <FileUploader
            type="pickup_photo"
            bookingId={loadId}
            multiple={true}
            maxFiles={MAX_PICKUP_PHOTOS}  // ✅ UPDATED: 30 photos max
            maxSize={10 * 1024 * 1024}
            imagesOnly={true}
            onUpload={handleUpload}
            onError={handleUploadError}
            autoUpload={true}
            label="Drop pickup photos here or click to upload"
            hint={`JPEG, PNG • Max 10MB each • Up to ${MAX_PICKUP_PHOTOS} photos`}  // ✅ UPDATED
            showPreview={true}
            uploadTypeLabel="pickup"  // ✅ NEW: For context-specific error messages
          />
        </div>

        {/* Photo count indicator */}
        {uploadedDocs.length > 0 && (
          <div className="pf-photo-count">
            <CheckIcon />
            <span>{uploadedDocs.length} photo{uploadedDocs.length !== 1 ? 's' : ''} ready</span>
            {/* ✅ NEW: Show remaining count */}
            <span className="pf-photo-remaining">
              ({MAX_PICKUP_PHOTOS - uploadedDocs.length} remaining)
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="pf-error">
            <AlertCircleIcon />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pf-actions">
          {!embedded && onCancel && (
            <button
              type="button"
              className="pf-btn pf-btn--secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="pf-btn pf-btn--primary"
            disabled={submitting || uploadedDocs.length === 0}
          >
            {submitting ? (
              <>
                <LoaderIcon />
                Confirming...
              </>
            ) : (
              'Confirm Pickup'
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="pf-help">
          By confirming pickup, you acknowledge that you have loaded the vehicle 
          and are responsible for its safe transport.
        </p>
      </form>
    </div>
  );
};

export default PickupForm;