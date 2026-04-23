// ============================================================
// FILE: src/components/ui/file-uploader.jsx
// ✅ UPDATED: Increased max files to 30, improved validation messages
// ✅ ADDED: Better progress tracking and batch upload support
// ✅ ADDED: Multi-vehicle gate pass support (vehicleIndex, stage props)
// ✅ FIXED: Token retrieval from multiple storage locations
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './file-uploader.css';

// ✅ FIX: Use empty string as default to work with Vite proxy
// When using Vite proxy, requests to /api/* are proxied to the backend
const API_BASE = import.meta.env.VITE_API_URL || '';

// Icons
const UploadCloudIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const ImageIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const FileIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LoaderIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fu-spinner-icon">
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

// Helper to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Check if file is an image
const isImageFile = (file) => {
  return file.type.startsWith('image/');
};

// Check if file is a PDF
const isPdfFile = (file) => {
  return file.type === 'application/pdf';
};

// ✅ Helper to get auth token from multiple storage locations
const getAuthToken = () => {
  // Try multiple possible storage keys
  const possibleKeys = ['token', 'authToken', 'auth_token', 'accessToken', 'access_token'];
  
  // Check localStorage first
  for (const key of possibleKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      console.log(`🔑 [FileUploader] Found token in localStorage.${key}`);
      return token;
    }
  }
  
  // Then check sessionStorage
  for (const key of possibleKeys) {
    const token = sessionStorage.getItem(key);
    if (token) {
      console.log(`🔑 [FileUploader] Found token in sessionStorage.${key}`);
      return token;
    }
  }
  
  // Check for session object in localStorage
  const sessionStr = localStorage.getItem('session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session?.token) {
        console.log('🔑 [FileUploader] Found token in localStorage.session object');
        return session.token;
      }
      if (session?.accessToken) {
        console.log('🔑 [FileUploader] Found accessToken in localStorage.session object');
        return session.accessToken;
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  // Check sessionStorage for session object
  const sessionStorageStr = sessionStorage.getItem('session');
  if (sessionStorageStr) {
    try {
      const session = JSON.parse(sessionStorageStr);
      if (session?.token) {
        console.log('🔑 [FileUploader] Found token in sessionStorage.session object');
        return session.token;
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  return null;
};

/**
 * FileUploader Component
 * 
 * @param {Object} props
 * @param {string} props.type - Document type (e.g., 'pickup_photo', 'delivery_photo', 'pod')
 * @param {string} props.bookingId - Booking ID to associate documents with
 * @param {string} props.quoteId - Quote ID to associate documents with (optional)
 * @param {boolean} props.multiple - Allow multiple file uploads (default: true)
 * @param {number} props.maxFiles - Maximum number of files (default: 30)
 * @param {number} props.maxSize - Maximum file size in bytes (default: 10MB)
 * @param {string[]} props.accept - Accepted file types (default: images and PDF)
 * @param {boolean} props.imagesOnly - Only accept images (default: false)
 * @param {Function} props.onUpload - Callback when files are uploaded successfully
 * @param {Function} props.onError - Callback when upload fails
 * @param {Function} props.onChange - Callback when files change (before upload)
 * @param {boolean} props.autoUpload - Automatically upload files (default: true)
 * @param {string} props.label - Label text for the dropzone
 * @param {string} props.hint - Hint text below the label
 * @param {boolean} props.showPreview - Show file previews (default: true)
 * @param {boolean} props.compact - Use compact layout (default: false)
 * @param {string} props.className - Additional CSS class
 * @param {string} props.uploadTypeLabel - Label for validation messages (e.g., 'pickup', 'delivery')
 * @param {number} props.vehicleIndex - Vehicle index for multi-vehicle gate passes
 * @param {string} props.stage - Stage for gate passes ('pickup' or 'delivery')
 * @param {string} props.token - Auth token (optional, will try to get from storage if not provided)
 */
const FileUploader = ({
  type = 'OTHER',
  bookingId,
  quoteId,
  multiple = true,
  maxFiles = 30,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = ['image/*', 'application/pdf'],
  imagesOnly = false,
  onUpload,
  onError,
  onChange,
  autoUpload = true,
  label,
  hint,
  showPreview = true,
  compact = false,
  className = '',
  uploadTypeLabel = '',
  vehicleIndex,
  stage,
  token: propToken, // ✅ Allow token to be passed as prop
}) => {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef(null);
  const previewUrlsRef = useRef([]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Get accept string for input
  const acceptString = imagesOnly 
    ? 'image/jpeg,image/png,image/gif,image/webp' 
    : accept.join(',');

  // Validate file
  const validateFile = useCallback((file) => {
    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds ${formatFileSize(maxSize)} limit`;
    }

    // Check file type
    if (imagesOnly && !isImageFile(file)) {
      return `File "${file.name}" is not an image`;
    }

    return null;
  }, [maxSize, imagesOnly]);

  // Generate context-specific error message for max files
  const getMaxFilesErrorMessage = useCallback(() => {
    if (uploadTypeLabel) {
      return `Maximum ${maxFiles} photos allowed for ${uploadTypeLabel}`;
    }
    return `Maximum ${maxFiles} files allowed`;
  }, [maxFiles, uploadTypeLabel]);

  // Handle file selection
  const handleFiles = useCallback((newFiles) => {
    setError(null);
    
    const fileArray = Array.from(newFiles);
    
    // Check max files limit with better error message
    const totalFiles = files.length + uploadedFiles.length + fileArray.length;
    if (totalFiles > maxFiles) {
      const errorMsg = getMaxFilesErrorMessage();
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate each file
    const validFiles = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onError?.(validationError);
        return;
      }
      
      // Create preview URL for images
      const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : null;
      if (previewUrl) {
        previewUrlsRef.current.push(previewUrl);
      }
      
      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        previewUrl,
        status: 'pending', // pending, uploading, uploaded, error
        progress: 0,
        documentId: null,
      });
    }

    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(updatedFiles);
    onChange?.(updatedFiles);

    // Auto upload if enabled
    if (autoUpload && validFiles.length > 0) {
      uploadFiles(validFiles);
    }
  }, [files, uploadedFiles, maxFiles, multiple, validateFile, onChange, autoUpload, getMaxFilesErrorMessage, onError]);

  // Upload files to server
  const uploadFiles = async (filesToUpload) => {
    // ✅ FIX: Use prop token first, then try to get from storage
    const token = propToken || getAuthToken();
    
    if (!token) {
      console.error('❌ [FileUploader] No auth token found!');
      console.log('  Checked localStorage keys:', Object.keys(localStorage));
      console.log('  Checked sessionStorage keys:', Object.keys(sessionStorage));
      setError('Authentication required - please refresh and log in again');
      onError?.('Authentication required');
      return;
    }
    
    console.log('🔑 [FileUploader] Using token:', token.substring(0, 20) + '...');

    setUploading(true);
    setUploadProgress(0);

    const results = [];
    const total = filesToUpload.length;
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const fileItem = filesToUpload[i];
      
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('type', type);
        if (bookingId) formData.append('bookingId', bookingId);
        if (quoteId) formData.append('quoteId', quoteId);
        
        // Multi-vehicle gate pass support
        if (vehicleIndex !== undefined && vehicleIndex !== null) {
          formData.append('vehicleIndex', vehicleIndex.toString());
        }
        if (stage) {
          formData.append('stage', stage);
        }

        console.log('📤 [FileUploader] Uploading to:', `${API_BASE}/api/documents/upload`);
        console.log('📤 [FileUploader] With headers:', { Authorization: `Bearer ${token.substring(0, 20)}...` });

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        console.log('📥 [FileUploader] Response status:', response.status);

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || `Upload failed with status ${response.status}`);
        }

        // Update status to uploaded
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'uploaded', documentId: data.document.id } 
            : f
        ));

        // Add to uploaded files
        setUploadedFiles(prev => [...prev, {
          ...fileItem,
          status: 'uploaded',
          documentId: data.document.id,
          document: data.document,
        }]);

        results.push({
          success: true,
          file: fileItem.file,
          document: data.document,
        });

        // Update overall progress
        setUploadProgress(Math.round(((i + 1) / total) * 100));

      } catch (err) {
        console.error('❌ Upload error:', err);
        
        // Update status to error
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error', error: err.message } : f
        ));

        results.push({
          success: false,
          file: fileItem.file,
          error: err.message,
        });
      }
    }

    setUploading(false);
    setUploadProgress(0);

    // Notify parent of results
    const successfulUploads = results.filter(r => r.success);
    const failedUploads = results.filter(r => !r.success);

    if (successfulUploads.length > 0) {
      onUpload?.(successfulUploads.map(r => r.document));
    }

    if (failedUploads.length > 0) {
      const errorMsg = failedUploads.map(r => r.error).join(', ');
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  // Manual upload trigger
  const triggerUpload = () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0) {
      uploadFiles(pendingFiles);
    }
  };

  // Remove file
  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== fileId);
    });
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setError(null);
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    files.forEach(f => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles([]);
    setUploadedFiles([]);
    setError(null);
  }, [files]);

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
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Click to select files
  const handleClick = () => {
    inputRef.current?.click();
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  // Get all files (pending + uploaded)
  const allFiles = [...files];
  const totalCount = allFiles.length;
  const uploadedCount = allFiles.filter(f => f.status === 'uploaded').length;
  const remainingCount = maxFiles - totalCount;

  // Default label and hint with 30 files limit
  const displayLabel = label || (imagesOnly ? 'Drop photos here or click to upload' : 'Drop files here or click to upload');
  const displayHint = hint || `${imagesOnly ? 'JPEG, PNG, GIF, WebP' : 'Images or PDF'} • Max ${formatFileSize(maxSize)} each${maxFiles > 1 ? ` • Up to ${maxFiles} files` : ''}`;

  return (
    <div className={`fu-container ${className}`}>
      {/* Dropzone */}
      <div
        className={`fu-dropzone ${dragActive ? 'fu-dropzone--active' : ''} ${compact ? 'fu-dropzone--compact' : ''} ${uploading ? 'fu-dropzone--disabled' : ''}`}
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
          accept={acceptString}
          multiple={multiple}
          onChange={handleInputChange}
          className="fu-input"
          disabled={uploading}
        />
        
        <div className="fu-dropzone-content">
          {imagesOnly ? (
            <ImageIcon size={compact ? 28 : 36} />
          ) : (
            <UploadCloudIcon size={compact ? 28 : 36} />
          )}
          <p className="fu-dropzone-label">{displayLabel}</p>
          <p className="fu-dropzone-hint">{displayHint}</p>
        </div>
      </div>

      {/* Uploading indicator with progress */}
      {uploading && (
        <div className="fu-uploading">
          <LoaderIcon size={16} />
          <span>Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
          {uploadProgress > 0 && (
            <div className="fu-progress-bar">
              <div className="fu-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="fu-error">
          <AlertCircleIcon size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* File previews */}
      {showPreview && totalCount > 0 && (
        <div className="fu-files">
          <div className="fu-files-header">
            <span className="fu-files-label">
              {uploadedCount} of {totalCount} uploaded
            </span>
            <span className="fu-files-remaining">
              {remainingCount} remaining
            </span>
          </div>
          
          <div className="fu-files-grid">
            {allFiles.map((fileItem) => (
              <div 
                key={fileItem.id} 
                className={`fu-file ${fileItem.status === 'error' ? 'fu-file--error' : ''}`}
              >
                {/* Preview */}
                {fileItem.previewUrl ? (
                  <img 
                    src={fileItem.previewUrl} 
                    alt={fileItem.file.name}
                    className="fu-file-preview"
                  />
                ) : (
                  <div className="fu-file-icon">
                    {isPdfFile(fileItem.file) ? (
                      <FileIcon size={24} />
                    ) : (
                      <ImageIcon size={24} />
                    )}
                  </div>
                )}

                {/* Status overlay */}
                {fileItem.status === 'uploading' && (
                  <div className="fu-file-overlay fu-file-overlay--uploading">
                    <LoaderIcon size={20} />
                  </div>
                )}

                {fileItem.status === 'uploaded' && (
                  <div className="fu-file-check">
                    <CheckCircleIcon size={14} />
                  </div>
                )}

                {fileItem.status === 'error' && (
                  <div className="fu-file-overlay fu-file-overlay--error">
                    <AlertCircleIcon size={20} />
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  className="fu-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                  }}
                  disabled={fileItem.status === 'uploading'}
                  aria-label={`Remove ${fileItem.file.name}`}
                >
                  <XIcon size={12} />
                </button>

                {/* File name (for non-images) */}
                {!fileItem.previewUrl && (
                  <span className="fu-file-name">{fileItem.file.name}</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Clear all button for many files */}
          {totalCount > 5 && (
            <button
              type="button"
              className="fu-clear-all-btn"
              onClick={clearAll}
              disabled={uploading}
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Manual upload button (if autoUpload is disabled) */}
      {!autoUpload && files.some(f => f.status === 'pending') && (
        <button
          type="button"
          className="fu-upload-btn"
          onClick={triggerUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      )}
    </div>
  );
};

// Export helper functions for external use
export { formatFileSize, isImageFile, isPdfFile, getAuthToken };
export default FileUploader;