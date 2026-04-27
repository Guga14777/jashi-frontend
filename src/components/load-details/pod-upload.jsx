// ============================================================
// FILE: src/components/load-details/pod-upload.jsx
// ✅ NEW: POD (Proof of Delivery) upload component
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './pod-upload.css';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../lib/api-url.js';

// Icons
const FileTextIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const UploadIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CheckCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LoaderIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pod-spinner">
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

const AlertCircleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Helper to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Check if file is a PDF
const isPdfFile = (file) => {
  return file?.type === 'application/pdf' || file?.mimeType === 'application/pdf';
};

// Check if file is an image
const isImageFile = (file) => {
  const type = file?.type || file?.mimeType || '';
  return type.startsWith('image/');
};

/**
 * PODUpload Component
 * 
 * Single file upload component for Proof of Delivery documents
 * 
 * @param {Object} props
 * @param {string} props.bookingId - Booking ID to associate the POD with
 * @param {Function} props.onUpload - Callback when POD is uploaded successfully
 * @param {Function} props.onError - Callback when upload fails
 * @param {Function} props.onRemove - Callback when POD is removed
 * @param {Object} props.document - Existing POD document (if already uploaded)
 * @param {string} props.className - Additional CSS class
 */
const PODUpload = ({
  bookingId,
  onUpload,
  onError,
  onRemove,
  document: existingDocument,
  className = '',
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(existingDocument || null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  // Update when existingDocument changes
  useEffect(() => {
    setUploadedDoc(existingDocument);
  }, [existingDocument]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Validate file
  const validateFile = useCallback((file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF and image files are allowed';
    }

    if (file.size > maxSize) {
      return `File size must be under ${formatFileSize(maxSize)}`;
    }

    return null;
  }, []);

  // Handle file selection
  const handleFile = useCallback(async (selectedFile) => {
    setError(null);

    // Validate
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (isImageFile(selectedFile)) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }

    // Upload immediately
    await uploadFile(selectedFile);
  }, [validateFile]);

  // Upload file to server
  const uploadFile = async (fileToUpload) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      onError?.('Authentication required');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('type', 'pod');
      if (bookingId) formData.append('bookingId', bookingId);

      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      console.log('✅ POD uploaded:', data.document);
      setUploadedDoc(data.document);
      onUpload?.(data.document);

    } catch (err) {
      console.error('❌ POD upload error:', err);
      setError(err.message || 'Upload failed');
      onError?.(err.message);
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setUploading(false);
    }
  };

  // Remove uploaded document
  const handleRemove = useCallback(() => {
    setFile(null);
    setUploadedDoc(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onRemove?.();
  }, [previewUrl, onRemove]);

  // Drag handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  // Click to select file
  const handleClick = () => {
    if (!uploading && !uploadedDoc) {
      inputRef.current?.click();
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Get display info for uploaded document
  const getDocumentPreview = () => {
    const doc = uploadedDoc;
    if (!doc) return null;

    const isImage = isImageFile(doc);
    const isPdf = isPdfFile(doc);
    const fileUrl = doc.filePath || doc.fileUrl;
    const fullUrl = fileUrl?.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl}`;

    return {
      isImage,
      isPdf,
      url: fullUrl,
      name: doc.originalName || doc.fileName || 'POD Document',
      size: doc.size ? formatFileSize(doc.size) : null,
    };
  };

  const docPreview = getDocumentPreview();

  // If document is uploaded, show preview
  if (uploadedDoc && docPreview) {
    return (
      <div className={`pod-container ${className}`}>
        <div className="pod-preview">
          <div className="pod-preview-info">
            {docPreview.isImage && previewUrl ? (
              <img src={previewUrl} alt="POD" className="pod-preview-thumb" />
            ) : docPreview.isImage ? (
              <img src={docPreview.url} alt="POD" className="pod-preview-thumb" />
            ) : (
              <div className="pod-preview-icon">
                <FileTextIcon size={28} />
              </div>
            )}
            <div className="pod-preview-details">
              <span className="pod-preview-name">{docPreview.name}</span>
              {docPreview.size && (
                <span className="pod-preview-size">{docPreview.size}</span>
              )}
            </div>
            <div className="pod-preview-check">
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <button
            type="button"
            className="pod-remove-btn"
            onClick={handleRemove}
            aria-label="Remove POD"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pod-container ${className}`}>
      {/* Dropzone */}
      <div
        className={`pod-dropzone ${dragActive ? 'pod-dropzone--active' : ''} ${uploading ? 'pod-dropzone--disabled' : ''}`}
        onClick={handleClick}
        onDrag={handleDrag}
        onDragStart={handleDrag}
        onDragEnd={handleDragOut}
        onDragOver={handleDragIn}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/jpg,image/png"
          onChange={handleInputChange}
          className="pod-input"
          disabled={uploading}
        />
        
        <div className="pod-dropzone-content">
          {uploading ? (
            <>
              <LoaderIcon size={28} />
              <p className="pod-dropzone-text">Uploading...</p>
            </>
          ) : (
            <>
              <UploadIcon size={28} />
              <p className="pod-dropzone-text">Drop POD here or click to upload</p>
              <p className="pod-dropzone-hint">PDF, JPEG, or PNG • Max 10MB</p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="pod-error">
          <AlertCircleIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PODUpload;