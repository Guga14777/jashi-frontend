import React from "react";

// SIMPLIFIED VERSION - No longer requires typing confirmation
// This component is now just a wrapper that can be retired
// Use the regular Modal component with simple confirm content instead

export default function ConfirmTextModal({
  open,
  title = "Confirm",
  description,
  confirmButtonLabel = "Confirm",
  cancelButtonLabel = "Cancel",
  onClose,
  onConfirm,
  confirmVariant = "danger", // "primary" or "danger"
  loading = false
}) {
  
  // This is now just a simple confirmation modal without text input
  // Recommend using the Modal component directly instead
  
  if (!open) return null;

  const handleConfirm = async () => {
    await onConfirm?.();
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {description && (
            <p className="modal-description" style={{ 
              textAlign: 'center',
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: 'var(--text-secondary, #475569)',
              lineHeight: '1.5'
            }}>
              {description}
            </p>
          )}
        </div>

        <div className="modal-actions" style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          padding: '0 24px 24px'
        }}>
          <button 
            className="btn btn-secondary btn-md" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelButtonLabel}
          </button>
          <button
            className={`btn ${confirmVariant === 'primary' ? 'btn-primary' : 'btn-danger'} btn-md`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="animate-spin"
                  style={{ marginRight: '8px' }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Processing...
              </>
            ) : (
              confirmButtonLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// NOTE: This component is deprecated in favor of using Modal component directly
// Consider removing this file and updating imports to use Modal instead