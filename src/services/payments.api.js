/**
 * Payments API Service
 * ✅ UPDATED: Connects to real backend endpoints for carrier payouts
 */

const API_BASE = '/api/dashboard/payments';
const CARRIER_API_BASE = '/api/carrier/payouts';

/**
 * Helper to get auth token from localStorage
 */
const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.token) return parsed.token;
        if (parsed.accessToken) return parsed.accessToken;
      } catch (e) {
        if (authData && !authData.startsWith('{')) return authData;
      }
    }
    const token = localStorage.getItem('token');
    if (token) return token;
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) return accessToken;
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.token) return parsed.token;
        if (parsed.accessToken) return parsed.accessToken;
      } catch (e) {}
    }
    console.warn('No auth token found in localStorage');
    return null;
  } catch (e) {
    console.error('Error getting auth token:', e);
    return null;
  }
};

/**
 * Helper to make authenticated requests
 */
const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No token provided');
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
  }
  return response.json();
};

// ============================================
// CARRIER PAYOUTS API
// ============================================

/**
 * Get all payouts for the logged-in carrier
 * ✅ Returns real data with real Load IDs (#1045), COD/ACH methods, real references
 * @param {Object} filters - Optional filters (status, dateFrom, dateTo, page, limit, search)
 * @returns {Promise<{success: boolean, summary: Object, items: Array, pagination: Object}>}
 */
export async function getCarrierPayouts(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  
  const queryString = params.toString();
  const url = queryString ? `${CARRIER_API_BASE}?${queryString}` : CARRIER_API_BASE;
  
  return authFetch(url, { method: 'GET' });
}

/**
 * Get single payout by ID for carrier
 * @param {string} payoutId - Payout ID
 * @returns {Promise<{success: boolean, payout: Object}>}
 */
export async function getCarrierPayoutById(payoutId) {
  return authFetch(`${CARRIER_API_BASE}/${payoutId}`, { method: 'GET' });
}

// ============================================
// CUSTOMER PAYMENTS API (existing)
// ============================================

/**
 * Get all payments for the logged-in customer
 */
export async function getCustomerPayments(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  
  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
  
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }
  return response.json();
}

/**
 * Get single payment by ID
 */
export async function getPaymentById(paymentId, token) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_BASE}/${paymentId}`, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error('Failed to fetch payment details');
  }
  return response.json();
}

/**
 * Create a payment record
 */
export async function createPayment(paymentData, token) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch('/api/shipper/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify(paymentData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }
  return response.json();
}

export default {
  getCarrierPayouts,
  getCarrierPayoutById,
  getCustomerPayments,
  getPaymentById,
  createPayment,
};