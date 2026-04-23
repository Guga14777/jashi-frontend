import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import './confirm-modal.css';

const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm,
  title, 
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary", // "primary" or "danger"
  loading = false,
  returnFocusTo = null,
  actionType = "processing", // for dynamic loading text: "processing", "deleting", "deactivating"
  message = null, // { type: 'success' | 'error' | 'info', text: string }
  hideActionsOnMessage = true, // hide buttons when message is shown
  requirePassword = false // ⭐ NEW: whether password confirmation is required
}) => {
  const dialogRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const passwordInputRef = useRef(null);
  const previousBodyOverflow = useRef(null);
  
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading text mapping
  const getLoadingText = () => {
    const loadingTexts = {
      processing: "Processing...",
      deleting: "Deleting...",
      deactivating: "Deactivating...",
      saving: "Saving..."
    };
    return loadingTexts[actionType] || "Processing...";
  };

  // Focus trap implementation
  const handleKeyDown = useCallback((e) => {
    if (!open) return;

    if (e.key === 'Escape') {
      // Only allow ESC close for non-destructive actions when not loading
      if (variant !== 'danger' && !loading && !message) {
        onClose?.();
      }
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [open, variant, loading, message, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading && !message) {
      // Only allow backdrop close for non-destructive actions
      if (variant !== 'danger') {
        onClose?.();
      }
    }
  };

  // Handle confirm action
  const handleConfirm = async () => {
    if (loading) return;
    
    setError(null);
    
    // ⭐ Validate password if required
    if (requirePassword && !password.trim()) {
      setError('Password is required to delete account');
      return;
    }
    
    try {
      // ⭐ Pass password to onConfirm if required
      if (requirePassword) {
        await onConfirm?.(password);
      } else {
        await onConfirm?.();
      }
    } catch (error) {
      console.error('Confirm action failed:', error);
      setError(error.message || 'An error occurred. Please try again.');
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    if (loading) return;
    setError(null);
    setPassword('');
    setShowPassword(false);
    onClose?.();
  };

  // Reset password when modal closes
  useEffect(() => {
    if (!open) {
      setPassword('');
      setShowPassword(false);
      setError(null);
    }
  }, [open]);

  // Setup focus management and scroll lock
  useEffect(() => {
    if (!open) return;

    // Save current body overflow
    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Set up keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Focus management
    const focusTimer = setTimeout(() => {
      // Focus the password input if required, otherwise confirm button
      if (requirePassword && passwordInputRef.current && !message) {
        passwordInputRef.current.focus();
      } else if (confirmButtonRef.current && !message) {
        confirmButtonRef.current.focus();
      }
    }, 100);

    return () => {
      // Restore body overflow
      document.body.style.overflow = previousBodyOverflow.current || '';
      
      // Remove event listener
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear timeout
      clearTimeout(focusTimer);

      // Return focus to trigger element
      if (returnFocusTo?.current) {
        returnFocusTo.current.focus();
      }
    };
  }, [open, handleKeyDown, returnFocusTo, message, requirePassword]);

  if (!open) return null;

  const titleId = `confirm-modal-title-${Date.now()}`;
  const descId = `confirm-modal-desc-${Date.now()}`;

  const content = (
    <div className="confirm-modal-backdrop" onClick={handleBackdropClick}>
      <div 
        ref={dialogRef}
        className="confirm-modal-dialog" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={loading}
      >
        {/* Header */}
        <div className="confirm-modal-header">
          <h2 id={titleId} className="confirm-modal-title">{title}</h2>
          <button
            ref={firstFocusableRef}
            className="confirm-modal-close"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="confirm-modal-body">
          {description && <p id={descId} className="confirm-modal-description">{description}</p>}
          
          {/* ⭐ Password Input Field */}
          {requirePassword && !message && (
            <div className="confirm-modal-password-field">
              <label htmlFor="confirm-password" className="password-label">
                Enter your password to confirm
              </label>
              <div className="password-input-wrapper">
                <input
                  ref={passwordInputRef}
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password.trim() && !loading) {
                      handleConfirm();
                    }
                  }}
                  placeholder="Enter your password"
                  disabled={loading}
                  className={error ? 'error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          
          {/* Inline status message INSIDE modal */}
          {message && (
            <div className={`modal-inline-alert ${message.type || 'info'}`} role="alert" aria-live="polite">
              {message.text}
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="confirm-modal-error" role="alert" aria-live="polite">
              <span className="error-icon">⚠</span>
              <span className="error-message">{error}</span>
            </div>
          )}
        </div>

        {/* Actions - Hide when showing final message */}
        {!(message && hideActionsOnMessage) && (
          <div className="confirm-modal-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              className={`btn btn-${variant}`}
              onClick={handleConfirm}
              disabled={loading || (requirePassword && !password.trim())}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span aria-live="polite">{getLoadingText()}</span>
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render modal outside of #root using a portal
  return createPortal(content, document.body);
};

export default ConfirmModal;