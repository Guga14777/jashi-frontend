// src/pages/dashboard/customer-documents/hooks/use-customer-docs.js
// ✅ UPDATED: Fetches from real API instead of mock data

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../../store/auth-context.jsx";

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../../lib/api-url.js';

/** ---------------------------------------------------------
 *  CONSTANTS & TYPES
 *  --------------------------------------------------------- */

// Document status constants
export const DOC_STATUS = {
  PROVIDED: 'provided',
  PENDING_REVIEW: 'pending_review',
  REJECTED: 'rejected',
  MISSING: 'missing',
  EXPIRED: 'expired',
  PROCESSING: 'processing',
  UPLOADED: 'uploaded'
};

// Document type constants
export const DOC_TYPES = {
  BOL: 'bol',
  BOL_UPPER: 'BOL',
  PICKUP_INSPECTION: 'pickup_inspection',
  DELIVERY_POD: 'delivery_pod',
  POD: 'POD',
  INSURANCE: 'insurance',
  GATE_PASS: 'GATE_PASS',
  PICKUP_GATEPASS: 'PICKUP_GATEPASS',
  DROPOFF_GATEPASS: 'DROPOFF_GATEPASS',
  OTHER: 'other',
  OTHER_UPPER: 'OTHER'
};

// Status labels and styling
const STATUS_CONFIG = {
  [DOC_STATUS.PROVIDED]: { label: "PROVIDED", tone: "success" },
  [DOC_STATUS.PENDING_REVIEW]: { label: "PENDING", tone: "warning" },
  [DOC_STATUS.REJECTED]: { label: "REJECTED", tone: "danger" },
  [DOC_STATUS.MISSING]: { label: "MISSING", tone: "neutral" },
  [DOC_STATUS.EXPIRED]: { label: "EXPIRED", tone: "danger" },
  [DOC_STATUS.PROCESSING]: { label: "PROCESSING", tone: "info" },
  [DOC_STATUS.UPLOADED]: { label: "PROVIDED", tone: "success" },
  'uploaded': { label: "PROVIDED", tone: "success" }
};

// Document type labels
const TYPE_LABELS = {
  [DOC_TYPES.BOL]: "Bill of Lading",
  [DOC_TYPES.BOL_UPPER]: "Bill of Lading",
  [DOC_TYPES.PICKUP_INSPECTION]: "Pickup Inspection",
  [DOC_TYPES.DELIVERY_POD]: "Proof of Delivery (POD)",
  [DOC_TYPES.POD]: "Proof of Delivery (POD)",
  [DOC_TYPES.INSURANCE]: "Insurance Certificate",
  [DOC_TYPES.GATE_PASS]: "Gate Pass",
  [DOC_TYPES.PICKUP_GATEPASS]: "Gate Pass (Pickup)",
  [DOC_TYPES.DROPOFF_GATEPASS]: "Gate Pass (Dropoff)",
  [DOC_TYPES.OTHER]: "Other Document",
  [DOC_TYPES.OTHER_UPPER]: "Other Document"
};

/** ---------------------------------------------------------
 *  UTILITY FUNCTIONS
 *  --------------------------------------------------------- */

const formatDate = (isoString, options = {}) => {
  const { 
    locale = "en-US", 
    format = "short" // "short" | "long" | "iso"
  } = options;
  
  if (!isoString) return "—";
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";
    
    switch (format) {
      case "long":
        return date.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "iso":
        return date.toISOString().split('T')[0];
      default:
        return date.toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    }
  } catch (error) {
    console.warn("Invalid date format:", isoString);
    return "—";
  }
};

const getStatusBadge = (status) => {
  if (!status) return { label: "PROVIDED", tone: "success" };
  const normalizedStatus = status.toLowerCase();
  return STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[status] || { label: "PROVIDED", tone: "success" };
};

const getTypeLabel = (type) => {
  if (!type) return "Document";
  return TYPE_LABELS[type] || TYPE_LABELS[type.toUpperCase()] || type
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const normalizeSearchText = (text) => {
  return (text || '')
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
};

const enhanceDocument = (doc, options = {}) => {
  const { dateFormat, locale } = options;
  
  // Get the display name
  const displayName = doc.name || doc.originalName || doc.fileName || 'Document';
  
  // Get uploader name
  const uploaderName = doc.uploadedBy?.name || 
    (doc.uploadedBy?.firstName && doc.uploadedBy?.lastName 
      ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` 
      : doc.uploaderName || 'System');
  
  // Get upload date
  const uploadDate = doc.uploadedAt || doc.createdAt;
  
  // Determine status - default to 'provided' for uploaded documents
  const status = doc.status || 'provided';
  
  return {
    ...doc,
    name: displayName,
    typeLabel: getTypeLabel(doc.type),
    dateFormatted: formatDate(uploadDate, { locale, format: dateFormat }),
    statusBadge: getStatusBadge(status),
    status: status,
    uploaderName: uploaderName,
    uploadedAt: uploadDate,
    searchableText: normalizeSearchText([
      displayName,
      doc.shipmentId,
      getTypeLabel(doc.type),
      doc.type,
      uploaderName
    ].join(" "))
  };
};

const applyFilters = (docs, filters) => {
  return docs.filter((doc) => {
    // Text search
    if (filters.query) {
      const normalizedQuery = normalizeSearchText(filters.query);
      if (!doc.searchableText.includes(normalizedQuery)) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status) {
      const docStatus = (doc.status || '').toLowerCase();
      const filterStatus = filters.status.toLowerCase();
      if (docStatus !== filterStatus) {
        return false;
      }
    }
    
    // Type filter
    if (filters.type) {
      const docType = (doc.type || '').toLowerCase();
      const filterType = filters.type.toLowerCase();
      if (docType !== filterType) {
        return false;
      }
    }
    
    // Shipment ID filter
    if (filters.shipmentId && doc.shipmentId !== filters.shipmentId) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom && doc.uploadedAt) {
      const docDate = new Date(doc.uploadedAt);
      const fromDate = new Date(filters.dateFrom);
      if (docDate < fromDate) return false;
    }
    
    if (filters.dateTo && doc.uploadedAt) {
      const docDate = new Date(doc.uploadedAt);
      const toDate = new Date(filters.dateTo);
      if (docDate > toDate) return false;
    }
    
    return true;
  });
};

const sortDocuments = (docs, sortConfig = {}) => {
  const { 
    sortBy = 'uploadedAt', 
    sortOrder = 'desc' 
  } = sortConfig;
  
  return [...docs].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'type':
        aVal = (a.typeLabel || '').toLowerCase();
        bVal = (b.typeLabel || '').toLowerCase();
        break;
      case 'shipmentId':
        aVal = a.shipmentId || '';
        bVal = b.shipmentId || '';
        break;
      case 'status':
        aVal = a.statusBadge?.label || '';
        bVal = b.statusBadge?.label || '';
        break;
      case 'uploader':
        aVal = (a.uploaderName || '').toLowerCase();
        bVal = (b.uploaderName || '').toLowerCase();
        break;
      case 'uploadedAt':
      default:
        // Handle null dates - missing dates go to end for desc, beginning for asc
        aVal = a.uploadedAt ? new Date(a.uploadedAt).getTime() : (sortOrder === 'desc' ? 0 : Date.now());
        bVal = b.uploadedAt ? new Date(b.uploadedAt).getTime() : (sortOrder === 'desc' ? 0 : Date.now());
        break;
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    
    // Secondary sort by name for consistency
    return (a.name || '').localeCompare(b.name || '');
  });
};

const paginateDocuments = (docs, page, limit) => {
  const start = (page - 1) * limit;
  return docs.slice(start, start + limit);
};

const calculateCounts = (docs) => {
  // Initialize with all known statuses to ensure stable keys
  const countsByStatus = {
    provided: 0,
    pending_review: 0,
    rejected: 0,
    missing: 0,
    expired: 0,
    processing: 0,
    uploaded: 0
  };
  
  const countsByType = {};
  
  docs.forEach((doc) => {
    const status = (doc.status || 'provided').toLowerCase();
    if (countsByStatus.hasOwnProperty(status)) {
      countsByStatus[status]++;
    } else {
      countsByStatus.provided++;
    }
    
    const type = doc.type || 'other';
    countsByType[type] = (countsByType[type] || 0) + 1;
  });
  
  return { countsByStatus, countsByType };
};

/** ---------------------------------------------------------
 *  API FUNCTIONS
 *  --------------------------------------------------------- */

const fetchDocumentsFromAPI = async (token, params = {}) => {
  if (!token) {
    console.warn('⚠️ No auth token provided for fetchDocuments');
    return { documents: [], total: 0 };
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', params.page?.toString() || '1');
    queryParams.set('limit', params.limit?.toString() || '50');
    
    if (params.search) {
      queryParams.set('search', params.search);
    }
    if (params.type) {
      queryParams.set('type', params.type);
    }

    console.log('📤 Fetching documents:', queryParams.toString());

    const response = await fetch(`${API_BASE}/api/documents?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to fetch documents: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Documents fetched:', {
      count: data.documents?.length || 0,
      total: data.total || data.pagination?.total || 0,
    });

    return {
      documents: data.documents || [],
      total: data.total || data.pagination?.total || 0,
    };
  } catch (error) {
    console.error('❌ Failed to fetch documents:', error);
    throw error;
  }
};

/** ---------------------------------------------------------
 *  HOOK
 *  --------------------------------------------------------- */
export const useCustomerDocs = (options = {}) => {
  const {
    // Pagination
    page = 1,
    limit = 10,
    
    // Filters
    query = "",
    status = null,
    type = null,
    shipmentId = null,
    dateFrom = null,
    dateTo = null,
    
    // Sorting
    sortBy = 'uploadedAt',
    sortOrder = 'desc',
    
    // Formatting
    dateFormat = 'short',
    locale = 'en-US',
    
    // Behavior
    minLoadingDuration = 200,
    
    // Deprecated (with warning)
    pageSize
  } = options;

  const { token } = useAuth();

  // State
  const [allDocuments, setAllDocuments] = useState([]);
  const [fetchStatus, setFetchStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);

  // Warn about deprecated props
  useEffect(() => {
    if (pageSize && pageSize !== limit) {
      console.warn('useCustomerDocs: pageSize is deprecated, use limit instead');
    }
  }, [pageSize, limit]);

  // Normalize inputs
  const effectiveLimit = Math.max(1, Math.floor(limit || pageSize || 10));
  const normalizedPage = Math.max(1, Math.floor(page) || 1);

  const filters = useMemo(() => ({
    query: typeof query === "string" ? query.trim() : "",
    status: status || null,
    type: type || null,
    shipmentId: shipmentId || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null
  }), [query, status, type, shipmentId, dateFrom, dateTo]);

  const sortConfig = useMemo(() => ({
    sortBy: sortBy || 'uploadedAt',
    sortOrder: sortOrder || 'desc'
  }), [sortBy, sortOrder]);

  // Fetch documents from API
  const fetchDocs = useCallback(async () => {
    if (!token) {
      console.warn('⚠️ No auth token, skipping document fetch');
      setFetchStatus('success');
      return;
    }

    setFetchStatus('loading');
    setError(null);

    try {
      const result = await fetchDocumentsFromAPI(token, {
        page: 1,
        limit: 500, // Fetch all documents, filter client-side
        search: filters.query || undefined,
        type: filters.type || undefined
      });

      setAllDocuments(result.documents || []);
      setFetchStatus('success');
    } catch (err) {
      console.error('❌ Failed to fetch documents:', err);
      setError(err.message || 'Failed to fetch documents');
      setFetchStatus('error');
    }
  }, [token, filters.query, filters.type]);

  // Initial fetch
  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Main computation (filtering, sorting, pagination)
  const computed = useMemo(() => {
    try {
      // Enhance documents
      const enhanced = allDocuments.map(doc => enhanceDocument(doc, { dateFormat, locale }));
      
      // Global counts (before filtering)
      const globalCounts = calculateCounts(enhanced);
      
      // Apply filters
      const filtered = applyFilters(enhanced, filters);
      
      // Apply sorting
      const sorted = sortDocuments(filtered, sortConfig);
      
      // Calculate filtered counts
      const filteredCounts = calculateCounts(sorted);
      
      // Pagination
      const totalItems = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / effectiveLimit));
      const clampedPage = Math.min(normalizedPage, totalPages);
      const items = paginateDocuments(sorted, clampedPage, effectiveLimit);
      
      // Pagination helpers
      const hasNext = clampedPage < totalPages;
      const hasPrev = clampedPage > 1;
      
      return {
        items,
        totalItems,
        totalPages,
        page: clampedPage,
        hasNext,
        hasPrev,
        countsGlobal: globalCounts,
        countsFiltered: filteredCounts,
        appliedFilters: filters,
        appliedSort: sortConfig
      };
    } catch (e) {
      console.error("Error in useCustomerDocs computation:", e);
      setError(e.message);
      
      // Return safe fallback
      return {
        items: [],
        totalItems: 0,
        totalPages: 1,
        page: 1,
        hasNext: false,
        hasPrev: false,
        countsGlobal: calculateCounts([]),
        countsFiltered: calculateCounts([]),
        appliedFilters: filters,
        appliedSort: sortConfig
      };
    }
  }, [allDocuments, filters, sortConfig, normalizedPage, effectiveLimit, dateFormat, locale]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchDocs();
    return computed;
  }, [fetchDocs, computed]);

  // Reset function
  const reset = useCallback(() => {
    setError(null);
    setFetchStatus('idle');
    setAllDocuments([]);
  }, []);

  return {
    // Data
    items: computed.items,
    totalItems: computed.totalItems,
    totalPages: computed.totalPages,
    page: computed.page,
    
    // Pagination helpers
    hasNext: computed.hasNext,
    hasPrev: computed.hasPrev,
    
    // State
    isLoading: fetchStatus === 'loading',
    isSuccess: fetchStatus === 'success',
    isError: fetchStatus === 'error',
    error,
    
    // Counts
    countsGlobal: computed.countsGlobal,
    countsFiltered: computed.countsFiltered,
    
    // Applied filters/sort (for UI sync)
    appliedFilters: computed.appliedFilters,
    appliedSort: computed.appliedSort,
    
    // Actions
    refetch,
    reset,
    
    // Constants (for consumers)
    STATUS: DOC_STATUS,
    TYPES: DOC_TYPES
  };
};

export default useCustomerDocs;