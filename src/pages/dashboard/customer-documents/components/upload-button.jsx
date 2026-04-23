// src/pages/dashboard/customer-documents/components/upload-button.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Modal from '../../../../components/ui/modal';
import UploadWidget from './upload-widget';

const UploadButton = ({ onUploaded }) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const triggerRef = useRef(null);

  // Analytics helper
  const trackEvent = useCallback((eventName, properties = {}) => {
    // Replace with your analytics implementation
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track(eventName, {
        source: 'customer_documents',
        ...properties
      });
    }
  }, []);

  const handleClose = useCallback((reason = 'button') => {
    // Prevent closing while uploading unless confirmed
    if (isUploading) {
      const confirmed = window.confirm('Upload in progress — are you sure you want to leave?');
      if (!confirmed) return;
    }

    setOpen(false);
    setShowSuccess(false);
    setIsUploading(false);
    
    // Return focus to trigger button
    if (triggerRef.current) {
      triggerRef.current.focus();
    }

    // Track close event
    trackEvent('upload_modal_closed', { reason });
  }, [isUploading, trackEvent]);

  const handleOpen = useCallback(() => {
    // Prevent double-open on rapid clicks
    if (open || isOpening) return;
    
    setIsOpening(true);
    setOpen(true);
    
    // Track open event
    trackEvent('upload_modal_opened');
    
    // Reset opening state after a tick
    setTimeout(() => setIsOpening(false), 100);
  }, [open, isOpening, trackEvent]);

  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
    trackEvent('upload_started');
  }, [trackEvent]);

  const handleUploadSuccess = useCallback((file, doc) => {
    setIsUploading(false);
    setShowSuccess(true);
    
    // Track success with file details
    const fileSizeBucket = file.size <= 5 * 1024 * 1024 ? '0-5MB' : 
                          file.size <= 15 * 1024 * 1024 ? '5-15MB' : '15-25MB+';
    
    trackEvent('upload_succeeded', {
      doc_type: doc?.type || 'unknown',
      file_size_bucket: fileSizeBucket,
      is_new_doc: !doc?.version_of
    });
    
    // Call parent callback
    onUploaded?.(file, doc);
    
    // Auto-close after showing success for 1.5 seconds
    setTimeout(() => {
      handleClose('success');
    }, 1500);
  }, [onUploaded, handleClose, trackEvent]);

  const handleUploadError = useCallback((error) => {
    setIsUploading(false);
    trackEvent('upload_failed', {
      error_message: error?.message || 'Unknown error'
    });
  }, [trackEvent]);

  // Handle escape key and backdrop clicks
  const handleModalClose = useCallback((reason) => {
    handleClose(reason === 'backdrop' ? 'backdrop' : 'esc');
  }, [handleClose]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="ud-btn"
        onClick={handleOpen}
        disabled={isOpening}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          minWidth: '44px',
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md, 8px)',
          backgroundColor: 'var(--color-primary, #0066cc)',
          color: 'var(--color-primary-contrast, #ffffff)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          outline: 'none',
          position: 'relative'
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = '0 0 0 2px var(--color-focus-ring, rgba(0, 102, 204, 0.3))';
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = 'none';
        }}
        onMouseOver={(e) => {
          if (!e.target.disabled) {
            e.target.style.backgroundColor = 'var(--color-primary-hover, #0052a3)';
          }
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'var(--color-primary, #0066cc)';
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 3l4 4h-3v5h-2V7H8l4-4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 14v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Upload
      </button>

      <Modal 
        open={open} 
        onClose={handleModalClose}
        title="Upload document"
        preventCloseWhileLoading={isUploading}
        style={{
          zIndex: 'var(--z-modal, 1200)'
        }}
      >
        {showSuccess ? (
          <div className="ud-success" style={{
            textAlign: 'center',
            padding: '32px',
            color: 'var(--color-success, #22c55e)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Upload Successful!
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary, #666)' }}>
              Your document has been uploaded and is pending review.
            </p>
          </div>
        ) : (
          <UploadWidget
            mode="full"
            onUploadStart={handleUploadStart}
            onUploaded={handleUploadSuccess}
            onError={handleUploadError}
            onCancel={() => handleClose('cancel')}
            className="ud-widget"
            isUploading={isUploading}
          />
        )}
      </Modal>
    </>
  );
};

export default UploadButton;