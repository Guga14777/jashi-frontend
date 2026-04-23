// ============================================================
// FILE: src/pages/dashboard/documents/documents-modal.jsx
// ✅ UPDATED: Displays real document details from database
// ============================================================

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { 
  Icons, 
  getDocTypeLabel, 
  formatFileSize, 
  formatDateTime,
  useFocusTrap 
} from "./documents-shared";
import "./documents-modal.css";

const DrawerPortal = ({ children }) => {
  const [portalElement, setPortalElement] = useState(null);
  
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("id", "documents-drawer-root");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.pointerEvents = "none";
    el.style.zIndex = "10000";
    
    document.body.appendChild(el);
    setPortalElement(el);
    
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.body.contains(el)) {
        document.body.removeChild(el);
      }
    };
  }, []);
  
  if (!portalElement) return null;
  return ReactDOM.createPortal(children, portalElement);
};

const PreviewDrawer = ({ document: doc, onClose, onDownload }) => {
  const focusRef = useFocusTrap(true);
  
  const fileName = doc.name || doc.originalName || doc.fileName || 'Document';
  const isImage = fileName.match(/\.(jpg|jpeg|png|heic|gif|webp)$/i);
  const isPDF = fileName.match(/\.pdf$/i);
  const previewUrl = doc.previewUrl || doc.fileUrl || doc.filePath;

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const uploaderName = doc.uploadedBy?.name || 
    (doc.uploadedBy?.firstName && doc.uploadedBy?.lastName 
      ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` 
      : 'Unknown');
  const uploadDate = doc.uploadedAt || doc.createdAt;
  const fileSize = doc.size || doc.fileSize;

  return (
    <DrawerPortal>
      <div 
        className="drawer-overlay" 
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{ pointerEvents: 'auto' }}
      >
        <div 
          ref={focusRef}
          className="preview-drawer" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="preview-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drawer-header">
            <h3 id="preview-title">{fileName}</h3>
            <button 
              className="drawer-close" 
              onClick={onClose} 
              aria-label="Close preview"
              type="button"
            >
              <Icons.Close />
            </button>
          </div>

          <div className="drawer-content">
            <div className="preview-section">
              {isImage && previewUrl ? (
                <img src={previewUrl} alt={fileName} className="preview-image" loading="lazy" />
              ) : isPDF && previewUrl ? (
                <iframe src={previewUrl} className="preview-pdf" title={`Preview of ${fileName}`} loading="lazy" />
              ) : (
                <div className="preview-placeholder">
                  <div className="file-icon-large">📄</div>
                  <p>Preview not available for this file type</p>
                  <button className="btn btn-secondary" onClick={() => onDownload(doc)} type="button">
                    <Icons.Download />
                    Download to View
                  </button>
                </div>
              )}
            </div>

            <div className="metadata-section">
              <h4>Document Details</h4>
              <div className="metadata-grid">
                <div className="metadata-row">
                  <label>Type</label>
                  <span>{getDocTypeLabel(doc.type)}</span>
                </div>
                <div className="metadata-row">
                  <label>Shipment ID</label>
                  <span>{doc.shipmentId || "—"}</span>
                </div>
                <div className="metadata-row">
                  <label>File Size</label>
                  <span>{formatFileSize(fileSize)}</span>
                </div>
                <div className="metadata-row">
                  <label>Upload Date</label>
                  <span>{formatDateTime(uploadDate)}</span>
                </div>
                <div className="metadata-row">
                  <label>Uploaded By</label>
                  <span>{uploaderName}</span>
                </div>
                {doc.storageType && (
                  <div className="metadata-row">
                    <label>Storage</label>
                    <span>{doc.storageType === 'supabase' ? 'Cloud' : 'Local'}</span>
                  </div>
                )}
                {doc.status && (
                  <div className="metadata-row">
                    <label>Status</label>
                    <span className="status-badge">{doc.status}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-actions">
            <button className="btn btn-primary" onClick={() => onDownload(doc)} type="button">
              <Icons.Download />
              Download {isPDF ? "PDF" : "File"}
            </button>
          </div>
        </div>
      </div>
    </DrawerPortal>
  );
};

export default PreviewDrawer;