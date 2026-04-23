// ============================================================
// FILE: src/components/load-details/utils/formatters.js
// Formatting utilities for load details display
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

/**
 * Safely parse JSON that might already be an object
 */
export const safeJson = (val) => {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  return {};
};

/**
 * Capitalize first letter of string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format address object to display string
 */
export const formatAddr = (addr) => {
  if (!addr) return '—';
  
  const parts = [];
  
  // Street address
  const street = addr.address || addr.address1 || addr.street || '';
  if (street) parts.push(street);
  
  // City, State ZIP
  const cityStateZip = [];
  if (addr.city) cityStateZip.push(addr.city);
  if (addr.state) cityStateZip.push(addr.state);
  if (addr.zip || addr.zipCode) cityStateZip.push(addr.zip || addr.zipCode);
  
  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }
  
  // Use fullAddress as fallback
  if (parts.length === 0 && addr.fullAddress) {
    return addr.fullAddress;
  }
  
  return parts.join(', ') || '—';
};

/**
 * Format location type for display
 */
export const formatLocationType = (type) => {
  if (!type) return null;
  const typeStr = String(type).toLowerCase().trim();
  
  const typeMap = {
    'auction': 'Auction',
    'dealership': 'Dealership',
    'dealer': 'Dealership',
    'private': 'Private',
    'residential': 'Private',
    'business': 'Business',
    'terminal': 'Terminal',
    'port': 'Port',
  };
  
  for (const [key, label] of Object.entries(typeMap)) {
    if (typeStr.includes(key)) return label;
  }
  
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Format time window for display
 */
export const formatTimeWindow = (start, end, preferred) => {
  if (preferred) {
    if (preferred.includes('-')) {
      const parts = preferred.split('-');
      return `${parts[0]} - ${parts[1]}`;
    }
    if (preferred.toLowerCase() === 'flexible') return 'Flexible';
    return preferred;
  }
  
  if (start && end) return `${start} - ${end}`;
  if (start) return `After ${start}`;
  if (end) return `Before ${end}`;
  
  return null;
};

/**
 * Format date for display
 */
export const formatDate = (value) => {
  if (!value) return '—';
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format currency for display
 */
export const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined) return '—';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX for 11 digits
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
};

/**
 * Check if document is a gate pass
 */
export const isGatePassDocument = (doc) => {
  if (!doc) return false;
  const type = (doc.type || '').toLowerCase();
  const name = (doc.originalName || doc.fileName || '').toLowerCase();
  
  return type.includes('gate') || 
         type.includes('pass') || 
         name.includes('gate') || 
         name.includes('pass');
};

/**
 * Get full image URL
 */
export const getFullImageUrl = (photo) => {
  if (!photo) return '';
  
  const url = photo.fileUrl || photo.filePath || '';
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  
  return `${API_BASE}/${url}`;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(date);
};

export default {
  safeJson,
  capitalize,
  formatAddr,
  formatLocationType,
  formatTimeWindow,
  formatDate,
  formatCurrency,
  formatPhone,
  isGatePassDocument,
  getFullImageUrl,
  formatFileSize,
  formatRelativeTime,
};