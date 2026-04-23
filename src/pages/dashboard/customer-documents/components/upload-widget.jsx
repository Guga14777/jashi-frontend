import React, { useState, useRef, useCallback, useEffect } from 'react';
import './upload-widget.css';

// File type validation constants
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.heic'];
const ALLOWED_MIME_TYPES = [
  'application/pdf', 
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'image/heic'
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Document type options
const DOCUMENT_TYPES = [
  { value: 'bol', label: 'Bill of Lading' },
  { value: 'pickup_inspection', label: 'Pickup Inspection' },
  { value: 'delivery_pod', label: 'Proof of Delivery' },
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' }
];

const UploadWidget = ({
  defaultType = '',
  defaultShipmentId = '',
  versioning = false,
  existingDocumentId = null,
  onUploaded,
  onCancel,
  className = '',
  mode = 'full', // 'full' | 'minimal'
  onAnalytics = () => {} // Analytics callback
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState(defaultType);
  const [shipmentId, setShipmentId] = useState(defaultShipmentId);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const abortControllerRef = useRef(null);
  const liveRegionRef = useRef(null);

  // Track widget open
  useEffect(() => {
    onAnalytics('upload_widget_open', { mode, versioning });
  }, [mode, versioning, onAnalytics]);

  // Announce to screen readers
  const announceToScreenReader = useCallback((message) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  // Enhanced file validation
  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';
    
    // Check file extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => 
      ext.slice(1) === fileExtension
    );
    
    if (!hasValidExtension) {
      return 'Please select a PDF, JPG, PNG, or HEIC file';
    }
    
    // Check MIME type (note: can be spoofed, server should re-validate)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Invalid file type detected';
    }
    
    // Check file size with actual size in error message
    if (file.size > MAX_FILE_SIZE) {
      const actualSize = formatFileSize(file.size);
      const maxSize = formatFileSize(MAX_FILE_SIZE);
      return `File size (${actualSize}) exceeds the ${maxSize} limit`;
    }
    
    return null;
  }, []);

  const handleFileSelect = useCallback((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      announceToScreenReader(`File selection failed: ${validationError}`);
      onAnalytics('upload_file_validation_error', { 
        error: validationError, 
        fileSize: file?.size,
        fileType: file?.type 
      });
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    setIsRetrying(false);
    
    // Special handling for HEIC files
    const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
    if (isHeic) {
      announceToScreenReader('HEIC file selected. Note: Preview may not be available in all browsers');
    } else {
      announceToScreenReader(`File selected: ${file.name}`);
    }
    
    onAnalytics('upload_file_selected', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isHeic
    });
  }, [validateFile, announceToScreenReader, onAnalytics]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClickToSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClickToSelect();
    }
  }, [handleClickToSelect]);

  // Simulate upload with abort capability
  const simulateUpload = useCallback(async (file, signal) => {
    setUploadProgress(0);
    announceToScreenReader('Upload started');
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      if (signal?.aborted) {
        throw new Error('Upload cancelled');
      }
      setUploadProgress(i);
      if (i === 50) {
        announceToScreenReader('Upload 50% complete');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    announceToScreenReader('Upload complete, scanning file');
    // Simulate virus scan
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (signal?.aborted) {
      throw new Error('Upload cancelled');
    }

    // Create mock document response with server-generated ID
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = {
      id: docId,
      name: file.name,
      type: documentType || 'other',
      typeLabel: DOCUMENT_TYPES.find(t => t.value === documentType)?.label || 'Other',
      shipmentId: shipmentId || null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: { id: 'user_current', name: 'Current User' },
      sourceType: 'customer',
      status: 'pending_review',
      version: versioning ? (existingDocumentId ? 2 : 1) : 1,
      versionId: versioning ? `v${Date.now()}` : null,
      previewUrl: `/api/documents/${docId}/preview`, // Server-generated URL
      downloadUrl: `/api/documents/${docId}/download`, // Server-generated URL
      mimeType: file.type,
      sizeBytes: file.size,
      checksum: `sha256:mock_${Date.now()}`, // Would be computed server-side
      required: false,
      expiresAt: null,
      dueAt: null,
      previewType: file.type.startsWith('image/') ? 'image' : 'pdf',
      tags: ['uploaded', 'customer'],
      notes: versioning ? `New version uploaded via web interface` : null
    };

    return newDoc;
  }, [documentType, shipmentId, versioning, existingDocumentId, announceToScreenReader]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || isUploading) return;
    
    if (!documentType) {
      setError('Please select a document type');
      announceToScreenReader('Upload failed: Document type is required');
      return;
    }

    setError(null);
    setIsUploading(true);
    setSuccess(false);
    setIsRetrying(false);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      onAnalytics('upload_started', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        documentType,
        shipmentId,
        versioning,
        isRetry: isRetrying
      });

      const newDoc = await simulateUpload(selectedFile, abortControllerRef.current.signal);
      
      setSuccess(true);
      setUploadProgress(100);
      announceToScreenReader(`Upload successful! ${versioning ? 'New version uploaded.' : 'File uploaded.'} Status: Pending Review`);
      
      onAnalytics('upload_success', {
        documentId: newDoc.id,
        fileName: selectedFile.name,
        documentType,
        version: newDoc.version,
        versioning
      });
      
      // Call the callback immediately for data freshness
      onUploaded?.(selectedFile, newDoc);
      
    } catch (err) {
      if (err.message === 'Upload cancelled') {
        announceToScreenReader('Upload cancelled');
        onAnalytics('upload_cancelled', {
          fileName: selectedFile.name,
          progress: uploadProgress
        });
      } else {
        const errorMessage = 'Upload failed. Please try again.';
        setError(errorMessage);
        announceToScreenReader(`Upload failed: ${errorMessage}`);
        onAnalytics('upload_error', {
          fileName: selectedFile.name,
          error: err.message,
          progress: uploadProgress
        });
      }
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [selectedFile, documentType, simulateUpload, onUploaded, shipmentId, versioning, isUploading, uploadProgress, isRetrying, announceToScreenReader, onAnalytics]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (onCancel) {
      onCancel();
      onAnalytics('upload_widget_cancelled');
    }
  }, [onCancel, onAnalytics]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsRetrying(true);
    setUploadProgress(0);
    announceToScreenReader('Retrying upload');
    onAnalytics('upload_retry_clicked', {
      fileName: selectedFile?.name
    });
    handleUpload();
  }, [selectedFile?.name, handleUpload, announceToScreenReader, onAnalytics]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setIsUploading(false);
    setIsRetrying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    announceToScreenReader('File selection cleared');
    onAnalytics('upload_reset');
    
    // Return focus to drop zone for keyboard users
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.focus();
      }
    }, 100);
  }, [announceToScreenReader, onAnalytics]);

  // Prevent accidental navigation during upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isFormValid = documentType && selectedFile;
  const isHeicFile = selectedFile && (
    selectedFile.type === 'image/heic' || 
    selectedFile.name.toLowerCase().endsWith('.heic')
  );

  return (
    <div className={`upload-widget ${className}`}>
      {/* Screen reader live region */}
      <div 
        ref={liveRegionRef}
        aria-live="polite" 
        aria-atomic="true"
        className="upload-widget__sr-only"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        onChange={handleFileInputChange}
        className="upload-widget__file-input"
        aria-label="Select file to upload"
      />

      {!selectedFile && !isUploading && !success && (
        mode === 'minimal' ? (
          <div className="upload-minimal">
            <button
              type="button"
              className="upload-minimal__btn"
              onClick={handleClickToSelect}
              onKeyDown={handleKeyDown}
              aria-describedby="upload-instructions"
            >
              <svg 
                className="upload-minimal__icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 5v14m-7-7h14"/>
              </svg>
              Upload
            </button>
            <div id="upload-instructions" className="upload-minimal__hint">
              PDF, JPG, PNG, HEIC • up to 25MB
            </div>
          </div>
        ) : (
          <div
            className={`upload-widget__drop-zone ${isDragOver ? 'upload-widget__drop-zone--active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClickToSelect}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-describedby="drop-zone-instructions"
          >
            <div className="upload-widget__drop-zone-content">
              <div className="upload-widget__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div className="upload-widget__primary-text">Drop files here or click to browse</div>
              <div id="drop-zone-instructions" className="upload-widget__secondary-text">
                PDF, JPG, PNG, HEIC up to 25MB. Press Enter or Space to browse files.
              </div>
            </div>
          </div>
        )
      )}

      {selectedFile && !isUploading && !success && (
        <div className="upload-widget__file-preview">
          <div className="upload-widget__file-info">
            <div 
              className="upload-widget__file-name" 
              title={selectedFile.name}
              aria-label={`Selected file: ${selectedFile.name}`}
            >
              {selectedFile.name}
            </div>
            <div className="upload-widget__file-details">
              {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
            </div>
            {isHeicFile && (
              <div className="upload-widget__file-note">
                Note: HEIC files may not preview in all browsers
              </div>
            )}
          </div>
          <button
            type="button"
            className="upload-widget__remove-btn"
            onClick={handleReset}
            aria-label={`Remove file ${selectedFile.name}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Show current shipment when defaultShipmentId is provided */}
      {defaultShipmentId && selectedFile && !success && (
        <div className="upload-widget__shipment-info">
          <strong>Shipment:</strong> {defaultShipmentId}
        </div>
      )}

      {selectedFile && !success && (
        <div className={`upload-widget__form ${mode === 'minimal' ? 'upload-widget__form--compact' : ''}`}>
          <div className="upload-widget__field">
            <label htmlFor="document-type" className="upload-widget__label">
              Document Type <span className="upload-widget__required">*</span>
            </label>
            <select
              id="document-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="upload-widget__select"
              disabled={isUploading}
              aria-required="true"
              aria-describedby="document-type-help"
            >
              <option value="">Select type...</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div id="document-type-help" className="upload-widget__help">
              Required field
            </div>
          </div>

          {!defaultShipmentId && (
            <div className="upload-widget__field">
              <label htmlFor="shipment-id" className="upload-widget__label">
                Shipment ID
              </label>
              <input
                id="shipment-id"
                type="text"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                className="upload-widget__input"
                placeholder="e.g., QT-2025-001"
                disabled={isUploading}
                aria-describedby="shipment-id-help"
              />
              <div id="shipment-id-help" className="upload-widget__help">
                Optional: Link this document to a specific shipment
              </div>
            </div>
          )}
        </div>
      )}

      {isUploading && (
        <div className="upload-widget__uploading">
          <div className="upload-widget__progress-info">
            <span>Uploading {selectedFile?.name}...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div 
            className="upload-widget__progress-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={uploadProgress}
            aria-label="Upload progress"
          >
            <div 
              className="upload-widget__progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {uploadProgress === 100 && (
            <div className="upload-widget__scanning">
              <div className="upload-widget__spinner" aria-hidden="true" />
              Scanning file for security...
            </div>
          )}
          <button
            type="button"
            className="upload-widget__btn upload-widget__btn--secondary"
            onClick={() => abortControllerRef.current?.abort()}
            disabled={uploadProgress === 100}
          >
            Cancel Upload
          </button>
        </div>
      )}

      {success && (
        <div className="upload-widget__success" role="status" aria-live="polite">
          <div className="upload-widget__success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="upload-widget__success-text">
            {versioning ? 'New version uploaded successfully!' : 'File uploaded successfully!'}
          </div>
          <div className="upload-widget__success-detail">
            Status: Pending Review
          </div>
        </div>
      )}

      {error && (
        <div className="upload-widget__error" role="alert">
          <strong>Upload Error</strong>
          <div>{error}</div>
          {selectedFile && (
            <button
              type="button"
              className="upload-widget__retry-btn"
              onClick={handleRetry}
            >
              Retry Upload
            </button>
          )}
        </div>
      )}

      {selectedFile && !isUploading && !success && (
        <div className={`upload-widget__actions ${mode === 'minimal' ? 'upload-widget__actions--left' : ''}`}>
          <button
            type="button"
            className="upload-widget__btn upload-widget__btn--primary"
            onClick={handleUpload}
            disabled={!isFormValid}
            aria-describedby={!isFormValid ? 'form-validation-help' : undefined}
          >
            {versioning ? 'Upload New Version' : 'Upload Document'}
          </button>
          {onCancel && (
            <button
              type="button"
              className="upload-widget__btn upload-widget__btn--secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
          {!isFormValid && (
            <div id="form-validation-help" className="upload-widget__validation-hint">
              Please select a document type to continue
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadWidget;