/**
 * Helper utilities for data processing and validation
 */

/**
 * Normalize transaction status by type for consistent UI display
 * Maps various payment method statuses to standardized UI states
 * @param {Object} transaction - Transaction object
 * @returns {Object} Transaction with normalized status
 */
export function normalizeTransactionStatusByType(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return transaction;
  }

  const status = (transaction.status || '').toLowerCase().trim();
  const type = (transaction.type || '').toLowerCase().trim();

  // Comprehensive status mapping for all payment methods
  const statusMap = {
    // Standard statuses
    'paid': 'paid',
    'posted': 'paid',           // ACH/Wire completion
    'completed': 'paid',
    'settled': 'paid',
    'cleared': 'paid',          // Check cleared
    
    // Processing/Pending statuses
    'pending': 'pending',
    'processing': 'processing',
    'authorization': 'processing',
    'sent': 'in_transit',       // Wire/Check sent
    'released': 'in_transit',   // Zelle/Cash ready
    'mailed': 'in_transit',     // Check mailed
    'ready': 'in_transit',      // Cash ready for pickup
    
    // Refund statuses
    'refunded': 'refunded',
    'partial_refund': 'refunded',
    'full_refund': 'refunded',
    
    // Dispute statuses
    'dispute_open': 'disputed',
    'dispute_won': 'dispute_won',
    'dispute_lost': 'dispute_lost',
    'chargeback': 'disputed',
    
    // Failure statuses
    'failed': 'failed',
    'declined': 'failed',
    'rejected': 'failed',
    'returned': 'failed',       // ACH return
    'bounced': 'failed',        // Check bounced
    'insufficient_funds': 'failed',
    'nsf': 'failed',
    
    // Voided/Cancelled statuses
    'voided': 'voided',
    'cancelled': 'cancelled',
    'reversed': 'reversed',
    'revoked': 'voided'
  };

  // Apply type-specific logic if needed
  let normalizedStatus = statusMap[status] || status;

  // Special handling for specific payment types
  switch (type) {
    case 'ach':
      // ACH-specific status handling
      if (status === 'posted' || status === 'settled') {
        normalizedStatus = 'paid';
      } else if (status === 'returned' || status.startsWith('r0')) {
        normalizedStatus = 'failed';
      }
      break;
      
    case 'wire':
      // Wire-specific status handling
      if (status === 'sent') {
        normalizedStatus = 'in_transit';
      } else if (status === 'posted' || status === 'received') {
        normalizedStatus = 'paid';
      }
      break;
      
    case 'check':
      // Check-specific status handling
      if (status === 'mailed' || status === 'sent') {
        normalizedStatus = 'in_transit';
      } else if (status === 'cleared' || status === 'cashed') {
        normalizedStatus = 'paid';
      } else if (status === 'bounced' || status === 'nsf') {
        normalizedStatus = 'failed';
      }
      break;
      
    case 'zelle':
      // Zelle-specific status handling
      if (status === 'released' || status === 'delivered') {
        normalizedStatus = 'paid'; // Zelle is instant once released
      }
      break;
      
    case 'cash':
      // Cash-specific status handling
      if (status === 'released' || status === 'ready') {
        normalizedStatus = 'in_transit'; // Ready for pickup
      } else if (status === 'picked_up' || status === 'collected') {
        normalizedStatus = 'paid';
      }
      break;
      
    case 'card':
      // Card-specific status handling
      if (status === 'authorized') {
        normalizedStatus = 'processing';
      } else if (status === 'captured' || status === 'settled') {
        normalizedStatus = 'paid';
      }
      break;
  }

  return {
    ...transaction,
    status: normalizedStatus,
    originalStatus: transaction.status // Preserve original status
  };
}

/**
 * Format currency amount for display
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  const num = parseFloat(amount);
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num));
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format datetime for display
 * @param {string|Date} datetime - Datetime to format
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(datetime) {
  return formatDate(datetime, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get status display information
 * @param {string} status - Normalized status
 * @returns {Object} Status display info with label and class
 */
export function getStatusDisplay(status) {
  const statusInfo = {
    paid: { label: 'Paid', class: 'paid' },
    pending: { label: 'Pending', class: 'pending' },
    processing: { label: 'Processing', class: 'processing' },
    in_transit: { label: 'In Transit', class: 'in-transit' },
    failed: { label: 'Failed', class: 'failed' },
    refunded: { label: 'Refunded', class: 'refunded' },
    disputed: { label: 'Disputed', class: 'disputed' },
    dispute_won: { label: 'Dispute Won', class: 'dispute-won' },
    dispute_lost: { label: 'Dispute Lost', class: 'dispute-lost' },
    voided: { label: 'Voided', class: 'voided' },
    cancelled: { label: 'Cancelled', class: 'cancelled' },
    reversed: { label: 'Reversed', class: 'reversed' }
  };
  
  return statusInfo[status] || { label: status, class: 'unknown' };
}

/**
 * Get payment method display information
 * @param {string} type - Payment method type
 * @returns {Object} Method display info
 */
export function getPaymentMethodDisplay(type) {
  const methodInfo = {
    card: { label: 'Credit Card', icon: '💳' },
    ach: { label: 'ACH Transfer', icon: '🏦' },
    wire: { label: 'Wire Transfer', icon: '💸' },
    zelle: { label: 'Zelle', icon: '⚡' },
    check: { label: 'Check', icon: '🧾' },
    cash: { label: 'Cash', icon: '💵' },
    digital: { label: 'Digital Transfer', icon: '📱' },
    bank_transfer: { label: 'Bank Transfer', icon: '🏦' }
  };
  
  return methodInfo[type] || { label: type, icon: '❓' };
}

/**
 * Validate transaction data
 * @param {Object} transaction - Transaction to validate
 * @returns {Object} Validation result
 */
export function validateTransaction(transaction) {
  const errors = [];
  
  if (!transaction) {
    return { valid: false, errors: ['Transaction data is required'] };
  }
  
  if (!transaction.id) {
    errors.push('Transaction ID is required');
  }
  
  if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
    errors.push('Valid amount is required');
  }
  
  if (!transaction.type) {
    errors.push('Payment method type is required');
  }
  
  if (!transaction.status) {
    errors.push('Transaction status is required');
  }
  
  if (!transaction.date || isNaN(new Date(transaction.date).getTime())) {
    errors.push('Valid transaction date is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Group transactions by date
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Grouped transactions by date
 */
export function groupTransactionsByDate(transactions) {
  if (!Array.isArray(transactions)) return {};
  
  return transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});
}

/**
 * Filter transactions by criteria
 * @param {Array} transactions - Array of transactions
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered transactions
 */
export function filterTransactions(transactions, criteria = {}) {
  if (!Array.isArray(transactions)) return [];
  
  return transactions.filter(transaction => {
    // Search filter
    if (criteria.search) {
      const searchTerm = criteria.search.toLowerCase();
      const searchableFields = [
        transaction.description,
        transaction.id,
        transaction.reference
      ].filter(Boolean);
      
      const matchesSearch = searchableFields.some(field =>
        String(field).toLowerCase().includes(searchTerm)
      );
      
      if (!matchesSearch) return false;
    }
    
    // Type filter
    if (criteria.type && criteria.type !== 'all' && transaction.type !== criteria.type) {
      return false;
    }
    
    // Status filter
    if (criteria.status && criteria.status !== 'all' && transaction.status !== criteria.status) {
      return false;
    }
    
    // Date range filter
    if (criteria.dateFrom || criteria.dateTo) {
      const transactionDate = new Date(transaction.date);
      
      if (criteria.dateFrom) {
        const fromDate = new Date(criteria.dateFrom + 'T00:00:00');
        if (transactionDate < fromDate) return false;
      }
      
      if (criteria.dateTo) {
        const toDate = new Date(criteria.dateTo + 'T23:59:59');
        if (transactionDate > toDate) return false;
      }
    }
    
    return true;
  });
}

/**
 * Calculate transaction summary statistics
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Summary statistics
 */
export function calculateTransactionSummary(transactions) {
  if (!Array.isArray(transactions)) {
    return {
      totalAmount: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      refundedAmount: 0
    };
  }
  
  const summary = transactions.reduce((acc, transaction) => {
    const amount = parseFloat(transaction.amount) || 0;
    
    acc.totalTransactions++;
    
    if (transaction.status === 'paid') {
      acc.successfulTransactions++;
      acc.totalAmount += amount;
    } else if (transaction.status === 'failed') {
      acc.failedTransactions++;
    } else if (['pending', 'processing', 'in_transit'].includes(transaction.status)) {
      acc.pendingTransactions++;
    } else if (transaction.status === 'refunded') {
      acc.refundedAmount += Math.abs(amount);
    }
    
    return acc;
  }, {
    totalAmount: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    pendingTransactions: 0,
    refundedAmount: 0
  });
  
  return summary;
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
  return obj;
}

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default {
  normalizeTransactionStatusByType,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusDisplay,
  getPaymentMethodDisplay,
  validateTransaction,
  groupTransactionsByDate,
  filterTransactions,
  calculateTransactionSummary,
  debounce,
  deepClone,
  generateId
};