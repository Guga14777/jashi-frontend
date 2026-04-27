// src/pages/dashboard/customer-documents/components/document-modal.jsx
// ✅ FIXED: Uses React Portal to render at body level - prevents footer overlap
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../../store/auth-context.jsx';
import './document-modal.css';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../../lib/api-url.js';

const DocumentModal = ({ doc, onClose, locale = 'en-US' }) => {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const openerElementRef = useRef(null);
  const [announcement, setAnnouncement] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { token } = useAuth();

  useEffect(() => {
    openerElementRef.current = document.activeElement;
    setAnnouncement(`Document modal opened: ${doc.name}`);

    // Lock body scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    // Focus the modal
    setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    const setupFocusTrap = () => {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      
      const focusableArray = Array.from(focusableElements || []);
      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
          return;
        }

        if (e.key === 'Tab') {
          if (focusableArray.length === 0) {
            e.preventDefault();
            return;
          }

          if (focusableArray.length === 1) {
            e.preventDefault();
            firstElement?.focus();
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    };

    const cleanupFocusTrap = setupFocusTrap();

    return () => {
      cleanupFocusTrap();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [doc.name]);

  const handleClose = () => {
    setAnnouncement(`Document modal closed: ${doc.name}`);
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  const handleDownload = async () => {
    if (!doc.id) {
      setDownloadError('Document ID not available');
      return;
    }
    
    if (!token) {
      setDownloadError('Please log in to download documents');
      return;
    }
    
    setDownloadError('');
    setIsDownloading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = doc.name || doc.originalName || 'document';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '');
          try {
            fileName = decodeURIComponent(fileName);
          } catch (e) {}
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setAnnouncement(`Download started: ${fileName}`);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadError('Download failed. Please try again or contact support.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      
      return date.toLocaleDateString(locale, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'provided' || s === 'approved' || s === 'uploaded') return 'provided';
    if (s === 'pending_review' || s === 'pending') return 'pending-review';
    if (s === 'rejected' || s === 'declined') return 'rejected';
    if (s === 'missing' || s === 'required') return 'missing';
    if (s === 'expired') return 'rejected';
    return 'provided';
  };

  const getStatusDisplayText = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending_review') return 'Pending Review';
    if (s === 'provided' || s === 'uploaded') return 'Uploaded';
    if (s === 'rejected') return 'Rejected';
    if (s === 'missing') return 'Missing';
    if (s === 'expired') return 'Expired';
    return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Uploaded';
  };

  const displayName = doc.name || doc.originalName || doc.fileName || 'Document';
  const displayType = doc.typeLabel || doc.type || 'Document';
  const displayShipmentId = doc.shipmentId || doc.orderNumber || '—';
  const displayUploader = doc.uploadedBy?.name || doc.uploaderName || '—';
  const displayStatus = doc.status || 'uploaded';

  // Modal content
  const modalContent = (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div 
        className="docmodal-overlay"
        ref={overlayRef}
        onClick={handleOverlayClick}
      >
        <div 
          className="docmodal" 
          ref={modalRef}
          onClick={handleModalClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          tabIndex={-1}
        >
          {/* Close button */}
          <button 
            className="docmodal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="docmodal-header">
            <h2 id="modal-title" className="docmodal-title">
              {displayName}
            </h2>
            <p className="docmodal-subtitle">
              {displayType}
            </p>
          </div>

          <div className="docmodal-body">
            {downloadError && (
              <div className="docmodal-toaster error" role="alert">
                <strong>Download Error</strong>
                <p>{downloadError}</p>
              </div>
            )}

            <div className="docmodal-section">
              <h3 className="docmodal-section-title">Document Information</h3>
              <div id="modal-description" className="docmodal-description">
                Document details and download options for {displayName}
              </div>
              
              <div className="docmodal-field-group">
                <div className="docmodal-field">
                  <div className="docmodal-label">Document Name</div>
                  <div className="docmodal-value">{displayName}</div>
                </div>
                
                <div className="docmodal-separator"></div>
                <div className="docmodal-field">
                  <div className="docmodal-label">Document Type</div>
                  <div className="docmodal-value">{displayType}</div>
                </div>
                
                <div className="docmodal-separator"></div>
                <div className="docmodal-field">
                  <div className="docmodal-label">Order ID</div>
                  <div className="docmodal-value">
                    {displayShipmentId !== '—' ? (
                      <span className="docmodal-orderid-badge">{displayShipmentId}</span>
                    ) : '—'}
                  </div>
                </div>
                
                <div className="docmodal-separator"></div>
                <div className="docmodal-field">
                  <div className="docmodal-label">Upload Date</div>
                  <div className="docmodal-value">{formatDate(doc.uploadedAt || doc.createdAt)}</div>
                </div>
                
                <div className="docmodal-separator"></div>
                <div className="docmodal-field">
                  <div className="docmodal-label">Status</div>
                  <div className="docmodal-value">
                    <span className={`docmodal-status-badge ${getStatusBadgeClass(displayStatus)}`}>
                      {getStatusDisplayText(displayStatus)}
                    </span>
                  </div>
                </div>
                
                {displayUploader !== '—' && (
                  <>
                    <div className="docmodal-separator"></div>
                    <div className="docmodal-field">
                      <div className="docmodal-label">Uploaded By</div>
                      <div className="docmodal-value">{displayUploader}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {doc.description && (
              <div className="docmodal-section">
                <h3 className="docmodal-section-title">Additional Notes</h3>
                <div className="docmodal-notes">{doc.description}</div>
              </div>
            )}
          </div>

          <div className="docmodal-footer">
            <button
              ref={downloadButtonRef}
              type="button"
              className="docmodal-download-btn"
              onClick={handleDownload}
              disabled={isDownloading || !doc.id}
              aria-describedby={downloadError ? 'download-error' : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isDownloading ? 'Downloading...' : 'Download Document'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Use Portal to render at document.body level - this ensures modal is ABOVE everything
  return createPortal(modalContent, document.body);
};

export default DocumentModal;