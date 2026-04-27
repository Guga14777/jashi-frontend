// ============================================================
// FILE: src/components/load-details/delivery-modal.jsx
// ✅ FIXED: Adapts UI based on current load status
// - If status is 'picked_up': shows "Confirm Delivery" flow
// - If status is 'delivered': shows "Add More Photos" flow
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Upload, X, Image, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import { markDelivered } from '../../services/booking.api.js';
import './delivery-modal.css';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../lib/api-url.js';

// Maximum delivery photos constant
const MAX_DELIVERY_PHOTOS = 30;

// Pen/Signature icon component
const PenToolIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

// Smartphone icon for mobile app reference
const SmartphoneIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const DeliveryModal = ({ 
  open, 
  onClose, 
  load, 
  onSuccess 
}) => {
  const { token } = useAuth();
  const [deliveryPhotos, setDeliveryPhotos] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [dragActivePhotos, setDragActivePhotos] = useState(false);
  const photoInputRef = useRef(null);
  const backdropRef = useRef(null);

  // ✅ NEW: Determine if this is first delivery or adding more photos
  const currentStatus = load?.status?.toLowerCase() || 'picked_up';
  const isAlreadyDelivered = currentStatus === 'delivered' || currentStatus === 'completed';
  const existingDeliveryPhotos = load?.deliveryPhotos?.length || 0;

  // Customer signature data (will come from mobile app later)
  const customerSignature = load?.customerSignature || null;
  const signedBy = load?.signedBy || null;
  const signedAt = load?.signedAt || null;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setDeliveryPhotos([]);
      setError(null);
      setIsUploadingPhotos(false);
      setIsSubmitting(false);
    }
  }, [open]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  // Photo drag handlers
  const handlePhotoDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActivePhotos(true);
    } else if (e.type === 'dragleave') {
      setDragActivePhotos(false);
    }
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePhotos(false);
    const files = Array.from(e.dataTransfer.files);
    handlePhotoFiles(files);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    handlePhotoFiles(files);
    e.target.value = '';
  };

  const handlePhotoFiles = async (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please select image files (JPG, PNG)');
      return;
    }

    // Calculate total including existing photos
    const totalPhotos = existingDeliveryPhotos + deliveryPhotos.length + imageFiles.length;
    if (totalPhotos > MAX_DELIVERY_PHOTOS) {
      setError(`Maximum ${MAX_DELIVERY_PHOTOS} photos allowed for delivery. You already have ${existingDeliveryPhotos} photos.`);
      return;
    }

    setIsUploadingPhotos(true);
    setError(null);

    for (const file of imageFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'delivery_photo');
        formData.append('bookingId', load.id);

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        
        setDeliveryPhotos(prev => [...prev, {
          id: data.document.id,
          name: file.name,
          preview: URL.createObjectURL(file),
          size: file.size,
        }]);

      } catch (err) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}`);
      }
    }

    setIsUploadingPhotos(false);
  };

  const removePhoto = (fileId) => {
    setDeliveryPhotos(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSubmit = async () => {
    if (deliveryPhotos.length === 0) {
      setError('Please upload at least one delivery photo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const deliveryDocumentIds = deliveryPhotos.map(f => f.id);
      const podDocumentId = null;

      // Test-mode override: latched by handleForceStartTrip in
      // load-details-modal.jsx. Lets gjashi10@gmail.com walk every
      // transition without time gates blocking the next step.
      let force = false;
      try {
        force = sessionStorage.getItem(`ldm:force-mode:${load.id}`) === '1';
      } catch (_) { /* sessionStorage unavailable */ }

      const result = await markDelivered(load.id, deliveryDocumentIds, podDocumentId, token, { force });
      
      console.log('✅ Delivery confirmed:', result);
      
      // Clean up previews
      deliveryPhotos.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      onSuccess?.(result);
      onClose();
    } catch (err) {
      console.error('❌ Failed to mark as delivered:', err);
      setError(err.message || 'Failed to mark as delivered');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format signature timestamp
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

  if (!open) return null;

  const orderNumber = load?.orderNumber || load?.ref || load?.id?.slice(-6);
  const totalPhotosAfterUpload = existingDeliveryPhotos + deliveryPhotos.length;
  const remainingPhotos = MAX_DELIVERY_PHOTOS - totalPhotosAfterUpload;

  // ✅ NEW: Dynamic title and button text based on status
  const modalTitle = isAlreadyDelivered ? 'Add Delivery Photos' : 'Mark as Delivered';
  const submitButtonText = isAlreadyDelivered ? 'Add Photos' : 'Confirm Delivery';
  const submittingText = isAlreadyDelivered ? 'Adding...' : 'Confirming...';

  return ReactDOM.createPortal(
    <div 
      ref={backdropRef}
      className="delivery-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div 
        className="delivery-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-modal-title"
      >
        {/* Header */}
        <div className="delivery-modal__header">
          <div>
            <h2 id="delivery-modal-title" className="delivery-modal__title">
              {modalTitle}
            </h2>
            <p className="delivery-modal__subtitle">
              Order #{orderNumber}
            </p>
          </div>
          <button 
            className="delivery-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="delivery-modal__content">
          {/* ✅ NEW: Show existing photos count if already delivered */}
          {isAlreadyDelivered && existingDeliveryPhotos > 0 && (
            <div className="delivery-modal__existing-info">
              <CheckCircle size={16} />
              <span>This load already has {existingDeliveryPhotos} delivery photo{existingDeliveryPhotos !== 1 ? 's' : ''}. You can add more below.</span>
            </div>
          )}

          {/* Delivery Photos Section */}
          <div className="delivery-modal__section">
            <h3 className="delivery-modal__section-title">
              Delivery Photos <span className="delivery-modal__required">*</span>
            </h3>
            <p className="delivery-modal__section-hint">
              {isAlreadyDelivered 
                ? 'Upload additional photos to add to the delivery documentation'
                : 'Upload photos showing the delivered vehicle condition'
              }
            </p>

            <div
              className={`delivery-modal__dropzone ${dragActivePhotos ? 'delivery-modal__dropzone--active' : ''}`}
              onDragEnter={handlePhotoDrag}
              onDragLeave={handlePhotoDrag}
              onDragOver={handlePhotoDrag}
              onDrop={handlePhotoDrop}
              onClick={() => photoInputRef.current?.click()}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              {isAlreadyDelivered ? (
                <Plus className="delivery-modal__dropzone-icon" />
              ) : (
                <Upload className="delivery-modal__dropzone-icon" />
              )}
              <p className="delivery-modal__dropzone-text">
                {isAlreadyDelivered 
                  ? 'Add more photos - drag & drop or click to browse'
                  : 'Drag & drop photos or click to browse'
                }
              </p>
              <p className="delivery-modal__dropzone-hint">
                JPG, PNG • Max {MAX_DELIVERY_PHOTOS} photos total
              </p>
            </div>

            {isUploadingPhotos && (
              <div className="delivery-modal__uploading">
                <Loader2 className="delivery-modal__spinner" />
                <span>Uploading photos...</span>
              </div>
            )}

            {deliveryPhotos.length > 0 && (
              <div className="delivery-modal__files">
                <div className="delivery-modal__files-header">
                  <p className="delivery-modal__files-label">
                    {isAlreadyDelivered ? 'New Photos' : 'Delivery Photos'} ({deliveryPhotos.length})
                    {existingDeliveryPhotos > 0 && (
                      <span className="delivery-modal__files-total"> • Total: {totalPhotosAfterUpload}/{MAX_DELIVERY_PHOTOS}</span>
                    )}
                  </p>
                  <span className="delivery-modal__files-remaining">
                    {remainingPhotos} remaining
                  </span>
                </div>
                <div className="delivery-modal__files-grid">
                  {deliveryPhotos.map((file) => (
                    <div key={file.id} className="delivery-modal__file">
                      {file.preview ? (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="delivery-modal__file-preview"
                        />
                      ) : (
                        <div className="delivery-modal__file-placeholder">
                          <Image size={24} />
                        </div>
                      )}
                      <button
                        className="delivery-modal__file-remove"
                        onClick={() => removePhoto(file.id)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                      <div className="delivery-modal__file-check">
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Signature Section (Read-only placeholder) */}
          <div className="delivery-modal__section">
            <h3 className="delivery-modal__section-title">
              Customer Signature
            </h3>
            <p className="delivery-modal__section-hint">
              Signature captured on driver's mobile app at drop-off
            </p>

            {customerSignature ? (
              <div className="delivery-modal__signature-display">
                <div className="delivery-modal__signature-image-wrapper">
                  <img 
                    src={customerSignature} 
                    alt="Customer signature" 
                    className="delivery-modal__signature-image"
                  />
                </div>
                <div className="delivery-modal__signature-info">
                  {signedBy && (
                    <p className="delivery-modal__signature-name">
                      Signed by: <strong>{signedBy}</strong>
                    </p>
                  )}
                  {signedAt && (
                    <p className="delivery-modal__signature-time">
                      {formatSignatureTime(signedAt)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="delivery-modal__signature-placeholder">
                <div className="delivery-modal__signature-placeholder-icon">
                  <PenToolIcon size={28} />
                </div>
                <div className="delivery-modal__signature-placeholder-content">
                  <p className="delivery-modal__signature-placeholder-text">
                    No signature captured yet
                  </p>
                  <p className="delivery-modal__signature-placeholder-hint">
                    <SmartphoneIcon size={14} />
                    <span>Use the mobile app to collect customer signature at delivery</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="delivery-modal__error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="delivery-modal__footer">
          <button 
            className="delivery-modal__btn delivery-modal__btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="delivery-modal__btn delivery-modal__btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting || deliveryPhotos.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="delivery-modal__btn-spinner" />
                {submittingText}
              </>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeliveryModal;