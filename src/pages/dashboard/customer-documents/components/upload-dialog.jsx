import React, { useState, useCallback, useRef, useMemo } from 'react';
import Modal from '../../../../components/ui/modal';
import UploadWidget from './upload-widget';

const UploadDialog = ({ 
  onUploaded, 
  buttonLabel = 'Upload', 
  buttonClassName = 'btn btn-primary', // Updated to match View buttons
  showSuccessState = true,
  successStateDuration = 1000 
}) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const triggerRef = useRef(null);
  const lastClickTime = useRef(0);

  // Debounced open handler to prevent rapid double-open
  const handleOpen = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return; // 300ms debounce
    lastClickTime.current = now;
    
    if (open) return; // Already open
    
    setOpen(true);
    setUploadKey(prev => prev + 1); // Reset UploadWidget state
    
    // Analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('upload_dialog_opened', {
        source: 'customer_documents'
      });
    }
  }, [open]);

  const handleClose = useCallback((reason = 'button') => {
    // Prevent close during active upload unless confirmed
    if (isUploading) {
      const confirmed = window.confirm(
        'Upload in progress. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }

    setOpen(false);
    setShowSuccess(false);
    setIsUploading(false);
    
    // Return focus to trigger
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
    
    // Analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('upload_dialog_closed', {
        reason,
        source: 'customer_documents'
      });
    }
  }, [isUploading]);

  // Handle backdrop/ESC close with upload protection
  const canClose = useMemo(() => !isUploading, [isUploading]);

  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
    
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('upload_started', {
        source: 'customer_documents'
      });
    }
  }, []);

  const handleUploadSuccess = useCallback((file, doc) => {
    setIsUploading(false);
    
    // Analytics with file details
    if (typeof window !== 'undefined' && window.analytics) {
      const fileSizeBucket = file.size < 1024 * 1024 ? 'small' : 
                           file.size < 10 * 1024 * 1024 ? 'medium' : 'large';
      
      window.analytics.track('upload_succeeded', {
        source: 'customer_documents',
        file_size_bucket: fileSizeBucket,
        doc_type: doc?.type || 'unknown'
      });
    }
    
    // Call parent callback
    onUploaded?.(file, doc);
    
    if (showSuccessState) {
      // Show success state briefly before closing
      setShowSuccess(true);
      setTimeout(() => {
        handleClose('success');
      }, successStateDuration);
    } else {
      // Close immediately and show toast
      handleClose('success');
      
      // Show page-level toast (assuming a toast system exists)
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Document uploaded — Pending Review'
        });
      }
    }
  }, [onUploaded, showSuccessState, successStateDuration, handleClose]);

  const handleUploadError = useCallback((error) => {
    setIsUploading(false);
    
    // Analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('upload_failed', {
        source: 'customer_documents',
        error_type: error?.type || 'unknown'
      });
    }
  }, []);

  // Memoized handlers to prevent unnecessary re-renders
  const memoizedHandlers = useMemo(() => ({
    onUploadStart: handleUploadStart,
    onUploaded: handleUploadSuccess,
    onError: handleUploadError,
    onCancel: () => handleClose('cancel')
  }), [handleUploadStart, handleUploadSuccess, handleUploadError, handleClose]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="ud-upload-btn"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={open}
        style={{
          minWidth: '44px',
          minHeight: '44px'
        }}
      >
        {buttonLabel}
      </button>

      <Modal
        open={open} // Use single, standardized prop
        onClose={handleClose}
        onBackdropClick={canClose ? () => handleClose('backdrop') : undefined}
        onEscapeKey={canClose ? () => handleClose('escape') : undefined}
        preventClose={!canClose}
        title="Upload document"
        aria-describedby="upload-dialog-description"
        size="lg"
        initialFocus="first" // Let Modal handle initial focus
        restoreFocus={false} // We handle focus restoration manually
      >
        <div id="upload-dialog-description" className="sr-only">
          Select a document type and upload your file. Maximum file size is 25MB.
        </div>
        
        {showSuccess ? (
          <div className="upload-success-state" role="status" aria-live="polite">
            <div className="success-icon">✓</div>
            <h3>Upload Successful</h3>
            <p>Your document has been uploaded and is pending review.</p>
          </div>
        ) : (
          <UploadWidget
            key={uploadKey} // Force reset on dialog reopen
            mode="full"
            onUploadStart={memoizedHandlers.onUploadStart}
            onUploaded={memoizedHandlers.onUploaded}
            onError={memoizedHandlers.onError}
            onCancel={memoizedHandlers.onCancel}
            disabled={isUploading}
          />
        )}
      </Modal>
    </>
  );
};

export default UploadDialog;