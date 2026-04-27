// ============================================================
// FILE: src/components/load-details/pickup-modal.jsx
// ✅ FIXED: Adapts UI based on current load status
// - If status is 'assigned': shows "Confirm Pickup" flow
// - If status is 'picked_up': shows "Add More Photos" flow
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Upload, X, Image, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import { markPickup } from '../../services/booking.api.js';
import './pickup-modal.css';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../lib/api-url.js';

// Maximum pickup photos constant
const MAX_PICKUP_PHOTOS = 30;

const PickupModal = ({ 
  open, 
  onClose, 
  load, 
  onSuccess 
}) => {
  const { token } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const backdropRef = useRef(null);

  // ✅ NEW: Determine if this is first pickup or adding more photos
  const currentStatus = load?.status?.toLowerCase() || 'assigned';
  const isAlreadyPickedUp = currentStatus === 'picked_up' || currentStatus === 'in_transit';
  const existingPickupPhotos = load?.pickupPhotos?.length || 0;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setUploadedFiles([]);
      setError(null);
      setIsUploading(false);
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    // Filter to only images
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please select image files (JPG, PNG)');
      return;
    }

    // Calculate total including existing photos
    const totalPhotos = existingPickupPhotos + uploadedFiles.length + imageFiles.length;
    if (totalPhotos > MAX_PICKUP_PHOTOS) {
      setError(`Maximum ${MAX_PICKUP_PHOTOS} photos allowed for pickup. You already have ${existingPickupPhotos} photos.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    for (const file of imageFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'pickup_photo');
        formData.append('bookingId', load.id);

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        setUploadedFiles(prev => [...prev, {
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

    setIsUploading(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one pickup photo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const documentIds = uploadedFiles.map(f => f.id);
      // Test-mode override: when the carrier latched force mode by
      // clicking "Force start (test mode)" earlier in this session,
      // walk the rest of the lifecycle through with force:true so
      // server-side time gates don't block subsequent transitions.
      let force = false;
      try {
        force = sessionStorage.getItem(`ldm:force-mode:${load.id}`) === '1';
      } catch (_) { /* sessionStorage unavailable */ }
      const result = await markPickup(load.id, documentIds, token, { force });
      
      console.log('✅ Pickup confirmed:', result);
      
      // Clean up previews
      uploadedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      onSuccess?.(result);
      onClose();
    } catch (err) {
      console.error('❌ Failed to mark as picked up:', err);
      setError(err.message || 'Failed to mark as picked up');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const orderNumber = load?.orderNumber || load?.ref || load?.id?.slice(-6);
  const totalPhotosAfterUpload = existingPickupPhotos + uploadedFiles.length;
  const remainingPhotos = MAX_PICKUP_PHOTOS - totalPhotosAfterUpload;

  // ✅ NEW: Dynamic title and button text based on status
  const modalTitle = isAlreadyPickedUp ? 'Add Pickup Photos' : 'Mark as Picked Up';
  const submitButtonText = isAlreadyPickedUp ? 'Add Photos' : 'Confirm Pickup';
  const submittingText = isAlreadyPickedUp ? 'Adding...' : 'Confirming...';

  return ReactDOM.createPortal(
    <div 
      ref={backdropRef}
      className="pickup-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div 
        className="pickup-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-modal-title"
      >
        {/* Header */}
        <div className="pickup-modal__header">
          <div>
            <h2 id="pickup-modal-title" className="pickup-modal__title">
              {modalTitle}
            </h2>
            <p className="pickup-modal__subtitle">
              Order #{orderNumber}
            </p>
          </div>
          <button 
            className="pickup-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="pickup-modal__content">
          {/* ✅ NEW: Show existing photos count if already picked up */}
          {isAlreadyPickedUp && existingPickupPhotos > 0 && (
            <div className="pickup-modal__existing-info">
              <CheckCircle size={16} />
              <span>This load already has {existingPickupPhotos} pickup photo{existingPickupPhotos !== 1 ? 's' : ''}. You can add more below.</span>
            </div>
          )}

          <p className="pickup-modal__instructions">
            {isAlreadyPickedUp 
              ? 'Upload additional photos of the vehicle to add to the pickup documentation.'
              : 'Upload photos of the vehicle at pickup to confirm condition and complete the pickup process.'
            }
          </p>

          {/* Upload Area */}
          <div
            className={`pickup-modal__dropzone ${dragActive ? 'pickup-modal__dropzone--active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {isAlreadyPickedUp ? (
              <Plus className="pickup-modal__dropzone-icon" />
            ) : (
              <Upload className="pickup-modal__dropzone-icon" />
            )}
            <p className="pickup-modal__dropzone-text">
              {isAlreadyPickedUp 
                ? 'Add more photos - drag & drop or click to browse'
                : 'Drag & drop photos here or click to browse'
              }
            </p>
            <p className="pickup-modal__dropzone-hint">
              JPG, PNG • Max {MAX_PICKUP_PHOTOS} photos total • 10MB each
            </p>
          </div>

          {/* Uploading indicator */}
          {isUploading && (
            <div className="pickup-modal__uploading">
              <Loader2 className="pickup-modal__spinner" />
              <span>Uploading...</span>
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="pickup-modal__files">
              <div className="pickup-modal__files-header">
                <p className="pickup-modal__files-label">
                  {isAlreadyPickedUp ? 'New Photos' : 'Pickup Photos'} ({uploadedFiles.length})
                  {existingPickupPhotos > 0 && (
                    <span className="pickup-modal__files-total"> • Total: {totalPhotosAfterUpload}/{MAX_PICKUP_PHOTOS}</span>
                  )}
                </p>
                <span className="pickup-modal__files-remaining">
                  {remainingPhotos} remaining
                </span>
              </div>
              <div className="pickup-modal__files-grid">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="pickup-modal__file">
                    {file.preview ? (
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="pickup-modal__file-preview"
                      />
                    ) : (
                      <div className="pickup-modal__file-placeholder">
                        <Image size={24} />
                      </div>
                    )}
                    <button
                      className="pickup-modal__file-remove"
                      onClick={() => removeFile(file.id)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                    <div className="pickup-modal__file-check">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="pickup-modal__error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pickup-modal__footer">
          <button 
            className="pickup-modal__btn pickup-modal__btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="pickup-modal__btn pickup-modal__btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting || uploadedFiles.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="pickup-modal__btn-spinner" />
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

export default PickupModal;