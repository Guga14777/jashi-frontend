// ============================================================
// FILE: src/pages/dashboard/documents/documents-shared.jsx
// ✅ UPDATED: Uses real API instead of mock data
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

// ============================================================
// REAL API - Fetches from database
// ============================================================
export const DocumentsAPI = {
  async fetchDocuments(filters, token) {
    if (!token) {
      console.warn('⚠️ No auth token provided for fetchDocuments');
      return { documents: [], total: 0 };
    }

    try {
      const params = new URLSearchParams();
      params.set('page', filters.page?.toString() || '1');
      params.set('limit', filters.size?.toString() || '25');
      
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.type) {
        params.set('type', filters.type);
      }

      console.log('📤 Fetching documents:', params.toString());

      const response = await fetch(`${API_BASE}/api/documents?${params}`, {
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
  },

  async getDownloadUrl(id, token) {
    if (!token) {
      throw new Error('Authentication required');
    }
    return { 
      url: `${API_BASE}/api/documents/${id}/download`,
      headers: { 'Authorization': `Bearer ${token}` },
    };
  },

  async downloadDocument(id, token, fileName) {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE}/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFileName = fileName || 'document';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          downloadFileName = match[1].replace(/['"]/g, '');
          try {
            downloadFileName = decodeURIComponent(downloadFileName);
          } catch (e) {}
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, fileName: downloadFileName };
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  },

  async getInspection(inspectionId) {
    console.log('📋 Getting inspection:', inspectionId);
    return null;
  },
};

// ============================================================
// TOAST CONTEXT
// ============================================================
const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
            <span>{toast.message}</span>
            <button 
              className="toast-close" 
              onClick={() => removeToast(toast.id)} 
              aria-label="Close notification"
            >
              <Icons.Close />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ============================================================
// ICONS
// ============================================================
export const Icons = {
  Search: () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
    </svg>
  ),
  Download: () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
  ),
  Close: () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
  ),
  DocumentText: () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
    </svg>
  ),
  Photograph: () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
    </svg>
  ),
};

// ============================================================
// HOOKS
// ============================================================
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  
  return debouncedValue;
};

export const useFocusTrap = (isActive) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const focusable = container.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTab);
    first?.focus();
    
    return () => document.removeEventListener('keydown', handleTab);
  }, [isActive]);
  
  return containerRef;
};

// ============================================================
// DOCUMENT TYPE LABELS
// ============================================================
export const DOCUMENT_TYPES = [
  { value: 'PICKUP_GATEPASS', label: 'Gate Pass (Pickup)' },
  { value: 'DROPOFF_GATEPASS', label: 'Gate Pass (Dropoff)' },
  { value: 'GATE_PASS', label: 'Gate Pass' },
  { value: 'BOL', label: 'Bill of Lading' },
  { value: 'POD', label: 'Proof of Delivery' },
  { value: 'INSPECTION', label: 'Inspection Report' },
  { value: 'INSURANCE', label: 'Insurance Certificate' },
  { value: 'OTHER', label: 'Other' },
];

export const getDocTypeLabel = (type) => {
  if (!type) return 'Document';
  
  const docType = DOCUMENT_TYPES.find(dt => dt.value === type);
  if (docType) return docType.label;
  
  const typeUpper = type.toUpperCase();
  if (typeUpper.includes('GATEPASS') || typeUpper.includes('GATE_PASS')) {
    return 'Gate Pass';
  }
  
  return type
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
};

// ============================================================
// FILE HELPERS
// ============================================================
export const getFileIcon = (fileName) => {
  const ext = (fileName?.split('.').pop() || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp'].includes(ext) 
    ? Icons.Photograph 
    : Icons.DocumentText;
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};