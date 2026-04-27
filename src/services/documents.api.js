// ============================================================
// FILE: src/services/documents.api.js
// Full Document Management API Service
// ✅ Handles all document operations including multi-vehicle gate passes
// ✅ ADDED: getDownloadUrl function for LoadDetailsModal compatibility
// ✅ FIXED: Correct import path for api
// ============================================================

import { api } from '../utils/request.js';
// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../lib/api-url.js';

// ============================================================================
// DOCUMENT TYPES CONFIGURATION
// ============================================================================

export const DOCUMENT_TYPES = {
  // Order Documents
  BILL_OF_LADING: 'bill_of_lading',
  GATE_PASS: 'gate_pass',
  INSPECTION_REPORT: 'inspection_report',
  PROOF_OF_DELIVERY: 'proof_of_delivery',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  
  // Vehicle Documents
  VEHICLE_PHOTOS: 'vehicle_photos',
  DAMAGE_PHOTOS: 'damage_photos',
  VIN_PHOTO: 'vin_photo',
  PICKUP_PHOTO: 'pickup_photo',
  DELIVERY_PHOTO: 'delivery_photo',
  
  // Carrier Documents
  CARRIER_AGREEMENT: 'carrier_agreement',
  INSURANCE_CERTIFICATE: 'insurance_certificate',
  MC_AUTHORITY: 'mc_authority',
  W9: 'w9',
  
  // Customer Documents
  CUSTOMER_ID: 'customer_id',
  AUTHORIZATION: 'authorization',
  RELEASE_FORM: 'release_form',
  
  // Other
  OTHER: 'other'
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.BILL_OF_LADING]: 'Bill of Lading',
  [DOCUMENT_TYPES.GATE_PASS]: 'Gate Pass',
  [DOCUMENT_TYPES.INSPECTION_REPORT]: 'Inspection Report',
  [DOCUMENT_TYPES.PROOF_OF_DELIVERY]: 'Proof of Delivery',
  [DOCUMENT_TYPES.INVOICE]: 'Invoice',
  [DOCUMENT_TYPES.RECEIPT]: 'Receipt',
  [DOCUMENT_TYPES.VEHICLE_PHOTOS]: 'Vehicle Photos',
  [DOCUMENT_TYPES.DAMAGE_PHOTOS]: 'Damage Photos',
  [DOCUMENT_TYPES.VIN_PHOTO]: 'VIN Photo',
  [DOCUMENT_TYPES.PICKUP_PHOTO]: 'Pickup Photo',
  [DOCUMENT_TYPES.DELIVERY_PHOTO]: 'Delivery Photo',
  [DOCUMENT_TYPES.CARRIER_AGREEMENT]: 'Carrier Agreement',
  [DOCUMENT_TYPES.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
  [DOCUMENT_TYPES.MC_AUTHORITY]: 'MC Authority',
  [DOCUMENT_TYPES.W9]: 'W-9 Form',
  [DOCUMENT_TYPES.CUSTOMER_ID]: 'Customer ID',
  [DOCUMENT_TYPES.AUTHORIZATION]: 'Authorization Form',
  [DOCUMENT_TYPES.RELEASE_FORM]: 'Release Form',
  [DOCUMENT_TYPES.OTHER]: 'Other Document'
};

// Gate Pass Stages for Multi-Vehicle Support
export const GATE_PASS_STAGES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery'
};

export const GATE_PASS_STAGE_LABELS = {
  [GATE_PASS_STAGES.PICKUP]: 'Pickup Gate Pass',
  [GATE_PASS_STAGES.DELIVERY]: 'Delivery Gate Pass'
};

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// ✅ DOWNLOAD URL FUNCTIONS (Used by LoadDetailsModal)
// ============================================================================

/**
 * Get download URL for a document by ID
 * @param {string} documentId - The document ID
 * @returns {string} - Download URL
 */
export const getDownloadUrl = (documentId) => {
  if (!documentId) return null;
  return `${API_BASE}/api/documents/${documentId}/download`;
};

/**
 * Get document view URL (alias for compatibility)
 * @param {string} documentId - The document ID
 * @returns {string} - View URL
 */
export const getViewUrl = (documentId) => {
  if (!documentId) return null;
  return `${API_BASE}/api/documents/${documentId}/view`;
};

// ============================================================================
// DOCUMENT UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload a document for an order
 * @param {string} orderId - The order ID
 * @param {File} file - The file to upload
 * @param {string} documentType - Type of document (from DOCUMENT_TYPES)
 * @param {Object} options - Additional options
 * @param {number} options.vehicleIndex - Vehicle index for multi-vehicle orders (0-based)
 * @param {string} options.stage - Gate pass stage ('pickup' or 'delivery')
 * @param {string} options.description - Optional description
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} - Upload result
 */
export const uploadDocument = async (orderId, file, documentType, options = {}, onProgress) => {
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: PDF, JPEG, PNG, GIF, WEBP, DOC, DOCX`);
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  formData.append('orderId', orderId);
  
  // Add optional parameters
  if (options.description) {
    formData.append('description', options.description);
  }
  
  // Multi-vehicle gate pass support
  if (options.vehicleIndex !== undefined && options.vehicleIndex !== null) {
    formData.append('vehicleIndex', options.vehicleIndex.toString());
  }
  
  if (options.stage) {
    formData.append('stage', options.stage);
  }
  
  try {
    const response = await api.post(`/api/documents/upload/${orderId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data || response;
  } catch (error) {
    console.error('Document upload error:', error);
    throw error;
  }
};

/**
 * Upload a gate pass document with vehicle and stage info
 * @param {string} orderId - The order ID
 * @param {File} file - The gate pass file
 * @param {number} vehicleIndex - Vehicle index (0-based)
 * @param {string} stage - 'pickup' or 'delivery'
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Upload result
 */
export const uploadGatePass = async (orderId, file, vehicleIndex, stage, onProgress) => {
  return uploadDocument(orderId, file, DOCUMENT_TYPES.GATE_PASS, {
    vehicleIndex,
    stage
  }, onProgress);
};

/**
 * Upload multiple documents at once
 * @param {string} orderId - The order ID
 * @param {Array<{file: File, documentType: string, options?: Object}>} documents - Array of document objects
 * @param {Function} onProgress - Progress callback (receives overall progress)
 * @returns {Promise<Array<Object>>} - Array of upload results
 */
export const uploadMultipleDocuments = async (orderId, documents, onProgress) => {
  const results = [];
  const total = documents.length;
  
  for (let i = 0; i < documents.length; i++) {
    const { file, documentType, options } = documents[i];
    
    try {
      const result = await uploadDocument(orderId, file, documentType, options, (fileProgress) => {
        if (onProgress) {
          const overallProgress = Math.round(((i + fileProgress / 100) / total) * 100);
          onProgress(overallProgress);
        }
      });
      
      results.push({ success: true, result, file: file.name });
    } catch (error) {
      results.push({ success: false, error: error.message, file: file.name });
    }
  }
  
  return results;
};

// ============================================================================
// DOCUMENT RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get all documents for an order
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} - Array of documents
 */
export const getDocumentsByOrder = async (orderId, token) => {
  try {
    const response = await api.get(`/api/documents/order/${orderId}`, token);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Get documents grouped by type
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Documents grouped by type
 */
export const getDocumentsGroupedByType = async (orderId, token) => {
  try {
    const documents = await getDocumentsByOrder(orderId, token);
    
    const grouped = {};
    documents.forEach(doc => {
      const type = doc.documentType || DOCUMENT_TYPES.OTHER;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(doc);
    });
    
    return grouped;
  } catch (error) {
    console.error('Error fetching grouped documents:', error);
    throw error;
  }
};

/**
 * Get gate passes for an order, optionally filtered by vehicle or stage
 * @param {string} orderId - The order ID
 * @param {Object} filters - Optional filters
 * @param {number} filters.vehicleIndex - Filter by vehicle index
 * @param {string} filters.stage - Filter by stage ('pickup' or 'delivery')
 * @param {string} token - Auth token
 * @returns {Promise<Array>} - Array of gate pass documents
 */
export const getGatePasses = async (orderId, filters = {}, token) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.vehicleIndex !== undefined) {
      params.append('vehicleIndex', filters.vehicleIndex);
    }
    
    if (filters.stage) {
      params.append('stage', filters.stage);
    }
    
    const queryString = params.toString();
    const url = `/api/documents/gate-passes/${orderId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url, token);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    throw error;
  }
};

/**
 * Get gate passes organized by vehicle
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Gate passes grouped by vehicle index
 */
export const getGatePassesByVehicle = async (orderId, token) => {
  try {
    const response = await api.get(`/api/documents/gate-passes-by-vehicle/${orderId}`, token);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching gate passes by vehicle:', error);
    
    // Fallback: get all gate passes and group manually
    try {
      const gatePasses = await getGatePasses(orderId, {}, token);
      return groupGatePassesByVehicle(gatePasses);
    } catch (fallbackError) {
      throw error;
    }
  }
};

/**
 * Helper function to group gate passes by vehicle
 * @param {Array} gatePasses - Array of gate pass documents
 * @returns {Object} - Gate passes grouped by vehicle index
 */
export const groupGatePassesByVehicle = (gatePasses) => {
  const grouped = {};
  
  gatePasses.forEach(gatePass => {
    const vehicleIndex = gatePass.vehicleIndex ?? 0;
    
    if (!grouped[vehicleIndex]) {
      grouped[vehicleIndex] = {
        vehicleIndex,
        pickup: null,
        delivery: null,
        all: []
      };
    }
    
    grouped[vehicleIndex].all.push(gatePass);
    
    if (gatePass.stage === GATE_PASS_STAGES.PICKUP) {
      grouped[vehicleIndex].pickup = gatePass;
    } else if (gatePass.stage === GATE_PASS_STAGES.DELIVERY) {
      grouped[vehicleIndex].delivery = gatePass;
    }
  });
  
  return grouped;
};

/**
 * Get a single document by ID
 * @param {string} documentId - The document ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Document object
 */
export const getDocumentById = async (documentId, token) => {
  try {
    const response = await api.get(`/api/documents/${documentId}`, token);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
};

/**
 * Get document URL (async version)
 * @param {string} documentId - The document ID
 * @param {string} token - Auth token
 * @returns {Promise<string>} - URL
 */
export const getDocumentUrl = async (documentId, token) => {
  try {
    const response = await api.get(`/api/documents/${documentId}/url`, token);
    return response.data?.url || response.url;
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw error;
  }
};

/**
 * Download a document
 * @param {string} documentId - The document ID
 * @param {string} filename - Optional filename for download
 * @param {string} token - Auth token
 */
export const downloadDocument = async (documentId, filename, token) => {
  try {
    // Create download link directly
    const url = getDownloadUrl(documentId);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `document-${documentId}`);
    
    // Add auth header via fetch if needed
    if (token) {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } else {
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

// ============================================================================
// DOCUMENT DELETE FUNCTIONS
// ============================================================================

/**
 * Delete a document
 * @param {string} documentId - The document ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Delete result
 */
export const deleteDocument = async (documentId, token) => {
  try {
    const response = await api.delete(`/api/documents/${documentId}`, token);
    return response.data || response;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Delete multiple documents
 * @param {Array<string>} documentIds - Array of document IDs to delete
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Delete result with success/failure counts
 */
export const deleteMultipleDocuments = async (documentIds, token) => {
  const results = {
    success: [],
    failed: []
  };
  
  for (const documentId of documentIds) {
    try {
      await deleteDocument(documentId, token);
      results.success.push(documentId);
    } catch (error) {
      results.failed.push({ documentId, error: error.message });
    }
  }
  
  return results;
};

// ============================================================================
// DOCUMENT UPDATE FUNCTIONS
// ============================================================================

/**
 * Update document metadata
 * @param {string} documentId - The document ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.description - New description
 * @param {string} updates.documentType - New document type
 * @param {number} updates.vehicleIndex - Vehicle index (for gate passes)
 * @param {string} updates.stage - Stage (for gate passes)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Updated document
 */
export const updateDocument = async (documentId, updates, token) => {
  try {
    const response = await api.patch(`/api/documents/${documentId}`, updates, token);
    return response.data || response;
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// ============================================================================
// BILL OF LADING FUNCTIONS
// ============================================================================

/**
 * Generate Bill of Lading PDF
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Blob>} - PDF blob
 */
export const generateBOL = async (orderId, token) => {
  try {
    const response = await fetch(`${API_BASE}/api/bookings/${orderId}/bol`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate BOL');
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error generating BOL:', error);
    throw error;
  }
};

/**
 * Download Bill of Lading
 * @param {string} orderId - The order ID
 * @param {string} orderNumber - Order number for filename
 * @param {string} token - Auth token
 */
export const downloadBOL = async (orderId, orderNumber, token) => {
  try {
    const blob = await generateBOL(orderId, token);
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BOL-${orderNumber || orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading BOL:', error);
    throw error;
  }
};

/**
 * Get signed BOL if available
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Object|null>} - Signed BOL document or null
 */
export const getSignedBOL = async (orderId, token) => {
  try {
    const documents = await getDocumentsByOrder(orderId, token);
    const signedBOL = documents.find(doc => 
      doc.documentType === DOCUMENT_TYPES.BILL_OF_LADING && doc.signed
    );
    return signedBOL || null;
  } catch (error) {
    console.error('Error fetching signed BOL:', error);
    throw error;
  }
};

// ============================================================================
// INSPECTION REPORT FUNCTIONS
// ============================================================================

/**
 * Get inspection reports for an order
 * @param {string} orderId - The order ID
 * @param {string} type - 'pickup' or 'delivery'
 * @param {string} token - Auth token
 * @returns {Promise<Array>} - Inspection report documents
 */
export const getInspectionReports = async (orderId, type, token) => {
  try {
    const documents = await getDocumentsByOrder(orderId, token);
    return documents.filter(doc => 
      doc.documentType === DOCUMENT_TYPES.INSPECTION_REPORT &&
      (!type || doc.inspectionType === type)
    );
  } catch (error) {
    console.error('Error fetching inspection reports:', error);
    throw error;
  }
};

// ============================================================================
// PROOF OF DELIVERY FUNCTIONS
// ============================================================================

/**
 * Get proof of delivery documents
 * @param {string} orderId - The order ID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} - POD documents
 */
export const getProofOfDelivery = async (orderId, token) => {
  try {
    const documents = await getDocumentsByOrder(orderId, token);
    return documents.filter(doc => 
      doc.documentType === DOCUMENT_TYPES.PROOF_OF_DELIVERY
    );
  } catch (error) {
    console.error('Error fetching proof of delivery:', error);
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get document type label
 * @param {string} documentType - Document type key
 * @returns {string} - Human readable label
 */
export const getDocumentTypeLabel = (documentType) => {
  return DOCUMENT_TYPE_LABELS[documentType] || documentType;
};

/**
 * Get gate pass stage label
 * @param {string} stage - Gate pass stage
 * @returns {string} - Human readable label
 */
export const getGatePassStageLabel = (stage) => {
  return GATE_PASS_STAGE_LABELS[stage] || stage;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - File extension (lowercase)
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

/**
 * Check if file is an image
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
export const isImage = (mimeType) => {
  return mimeType && mimeType.startsWith('image/');
};

/**
 * Check if file is a PDF
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
export const isPDF = (mimeType) => {
  return mimeType === 'application/pdf';
};

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}}
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type || 'unknown'} is not allowed` 
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
    };
  }
  
  return { valid: true };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Constants
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  GATE_PASS_STAGES,
  GATE_PASS_STAGE_LABELS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  
  // URL functions
  getDownloadUrl,
  getViewUrl,
  
  // Upload functions
  uploadDocument,
  uploadGatePass,
  uploadMultipleDocuments,
  
  // Retrieval functions
  getDocumentsByOrder,
  getDocumentsGroupedByType,
  getGatePasses,
  getGatePassesByVehicle,
  groupGatePassesByVehicle,
  getDocumentById,
  getDocumentUrl,
  downloadDocument,
  
  // Delete functions
  deleteDocument,
  deleteMultipleDocuments,
  
  // Update functions
  updateDocument,
  
  // BOL functions
  generateBOL,
  downloadBOL,
  getSignedBOL,
  
  // Inspection functions
  getInspectionReports,
  
  // POD functions
  getProofOfDelivery,
  
  // Utility functions
  getDocumentTypeLabel,
  getGatePassStageLabel,
  formatFileSize,
  getFileExtension,
  isImage,
  isPDF,
  validateFile
};
