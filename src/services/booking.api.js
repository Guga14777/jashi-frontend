// ============================================================
// FILE: src/services/booking.api.js
// ✅ UPDATED: Added markPickup and markDelivered functions for carrier flow
// ✅ UPDATED: Added downloadBol function for BOL PDF download
// ============================================================

import { api } from '../utils/request.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

// ============================================================
// BOOKINGS
// ============================================================

/**
 * Create a new booking with complete data
 * @param {object} bookingData - Complete booking data
 * @param {string} token - Auth token
 * @returns {Promise} Booking creation response with orderNumber
 */
export async function createBooking(bookingData, token) {
  console.log('📤 Creating booking:', bookingData);

  const response = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Create booking failed:', error);
    throw new Error(error.message || 'Failed to create booking');
  }

  const result = await response.json();
  console.log('✅ Booking created:', result);
  return result;
}

/**
 * List all bookings for the current user with pagination
 * @param {string} token - Auth token
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Promise} Paginated bookings response with orderNumbers
 */
export async function listMyBookings(token, page = 1, limit = 10, search = '', filters = {}) {
  console.log('📤 Fetching bookings - Page:', page, 'Limit:', limit, 'Search:', search || '(none)', 'Filters:', filters);
  console.log('🔑 Token:', token ? 'EXISTS' : 'MISSING');

  if (!token) {
    console.error('❌ No token provided to listMyBookings');
    throw new Error('Authentication required');
  }

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && search.trim()) params.append('search', search.trim());
    if (filters?.statusFilter) params.append('statusFilter', filters.statusFilter);
    const url = `${API_BASE}/api/bookings?${params.toString()}`;
    console.log('🌐 Requesting:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { message: errorText };
      }
      
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Bookings response:', data);
    
    return data;
  } catch (error) {
    console.error('❌ listMyBookings error:', error);
    throw error;
  }
}

/**
 * Get a single booking by ID
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Booking data with orderNumber
 */
export function getBooking(bookingId, token) {
  console.log('📤 Fetching booking:', bookingId);
  return api.get(`/api/bookings/${bookingId}`, token);
}

/**
 * Get full booking details (for modal/detail view)
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Full booking data with orderNumber
 */
export function getFullBooking(bookingId, token) {
  console.log('📤 Fetching full booking:', bookingId);
  return api.get(`/api/bookings/${bookingId}`, token);
}

/**
 * Fetch whole-account dashboard stats for the authenticated customer.
 * These are DB aggregates — unaffected by Orders table pagination/search/filters.
 * @param {string} token - Auth token
 * @returns {Promise<{ success: boolean, stats: {
 *   totalQuotes: number,
 *   totalOrders: number,
 *   totalOpenOrders: number,
 *   totalDeliveredOrders: number,
 *   totalCancelledOrders: number,
 *   totalSpend: number,
 *   conversionRate: number
 * } }>}
 */
export function getCustomerDashboardStats(token) {
  return api.get('/api/customer/dashboard-stats', token);
}

/**
 * Update a booking
 * @param {string} bookingId - The booking ID
 * @param {object} updates - Fields to update
 * @param {string} token - Auth token
 * @returns {Promise} Updated booking
 */
export function updateBooking(bookingId, updates, token) {
  // Backend exposes PUT /api/bookings/:id (server.cjs) — not PATCH.
  return api.put(`/api/bookings/${bookingId}`, updates, token);
}

/**
 * Cancel a booking (Customer)
 * @param {string} bookingId - The booking ID
 * @param {object} cancelData - Cancellation details (reason, notes)
 * @param {string} token - Auth token
 * @returns {Promise} Cancellation response
 */
export async function cancelBooking(bookingId, cancelData, token) {
  console.log('📤 Cancelling booking:', bookingId);

  const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      cancelledBy: 'CUSTOMER',
      reason: cancelData.reason,
      notes: cancelData.notes || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to cancel' }));
    throw new Error(error.message || error.error || 'Failed to cancel booking');
  }

  return response.json();
}

/**
 * Cancel a load (Carrier)
 * @param {string} loadId - The load ID
 * @param {object} cancelData - Cancellation details (reason, notes)
 * @param {string} token - Auth token
 * @returns {Promise} Cancellation response
 */
export async function cancelLoad(loadId, cancelData, token) {
  console.log('📤 Cancelling load:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      cancelledBy: 'CARRIER',
      reason: cancelData.reason,
      notes: cancelData.notes || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to cancel' }));
    throw new Error(error.message || error.error || 'Failed to cancel load');
  }

  return response.json();
}

// ============================================================
// ✅ NEW: BOL PDF DOWNLOAD
// ============================================================

/**
 * Download BOL (Bill of Lading) PDF for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @param {string} orderNumber - Optional order number for filename
 * @returns {Promise<void>} Triggers file download
 */
export async function downloadBol(bookingId, token, orderNumber = null) {
  console.log('📄 Downloading BOL for booking:', bookingId);

  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/bol`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { message: errorText || 'Failed to download BOL' };
      }
      console.error('❌ Download BOL failed:', error);
      throw new Error(error.message || error.error || 'Failed to download BOL');
    }

    // Get the blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `BOL-${orderNumber || bookingId.slice(-6)}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ BOL downloaded successfully:', filename);
  } catch (error) {
    console.error('❌ downloadBol error:', error);
    throw error;
  }
}

/**
 * Get BOL data (without PDF generation) for preview
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} BOL data object
 */
export async function getBolData(bookingId, token) {
  console.log('📄 Fetching BOL data for booking:', bookingId);

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/bol-data`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch BOL data' }));
    console.error('❌ Get BOL data failed:', error);
    throw new Error(error.message || error.error || 'Failed to fetch BOL data');
  }

  const result = await response.json();
  console.log('✅ BOL data fetched:', result);
  return result;
}

// ============================================================
// CARRIER PICKUP/DELIVERY FUNCTIONS
// ============================================================

/**
 * Mark a load as picked up with pickup photos
 * @param {string} loadId - The load/booking ID
 * @param {string[]} documentIds - Array of uploaded document IDs for pickup photos
 * @param {string} token - Auth token
 * @returns {Promise} Updated booking with pickup status
 */
export async function markPickup(loadId, documentIds, token) {
  console.log('📤 Marking load as picked up:', loadId, 'with documents:', documentIds);

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ documentIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark as picked up' }));
    console.error('❌ Mark pickup failed:', error);
    throw new Error(error.message || error.error || 'Failed to mark as picked up');
  }

  const result = await response.json();
  console.log('✅ Load marked as picked up:', result);
  return result;
}

/**
 * Mark a load as delivered with delivery photos and POD
 * @param {string} loadId - The load/booking ID
 * @param {string[]} deliveryDocumentIds - Array of uploaded document IDs for delivery photos
 * @param {string|null} podDocumentId - The POD document ID (optional)
 * @param {string} token - Auth token
 * @returns {Promise} Updated booking with delivered status
 */
export async function markDelivered(loadId, deliveryDocumentIds, podDocumentId, token) {
  console.log('📤 Marking load as delivered:', loadId);
  console.log('   Delivery photos:', deliveryDocumentIds);
  console.log('   POD document:', podDocumentId);

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      deliveryDocumentIds,
      podDocumentId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark as delivered' }));
    console.error('❌ Mark delivered failed:', error);
    throw new Error(error.message || error.error || 'Failed to mark as delivered');
  }

  const result = await response.json();
  console.log('✅ Load marked as delivered:', result);
  return result;
}

/**
 * Get documents for a load (pickup photos, delivery photos, POD)
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Documents categorized by type
 */
export async function getLoadDocuments(loadId, token) {
  console.log('📤 Fetching load documents:', loadId);

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/documents`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch documents' }));
    console.error('❌ Get load documents failed:', error);
    throw new Error(error.message || error.error || 'Failed to fetch documents');
  }

  const result = await response.json();
  console.log('✅ Load documents fetched:', result);
  return result;
}

// ============================================================
// SHIPMENTS (Alias for bookings)
// ============================================================

/**
 * Get all shipments with pagination
 * @param {string} token - Auth token
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise} Paginated shipments
 */
export async function getShipments(token, page = 1, limit = 10) {
  return listMyBookings(token, page, limit);
}

/**
 * Get full shipment details
 * @param {string} shipmentId - The shipment ID
 * @param {string} token - Auth token
 * @returns {Promise} Full shipment data
 */
export function getFullShipment(shipmentId, token) {
  return getFullBooking(shipmentId, token);
}

/**
 * Get a single shipment by ID
 * @param {string} shipmentId - The shipment ID
 * @param {string} token - Auth token
 * @returns {Promise} Shipment data
 */
export function getShipment(shipmentId, token) {
  return getBooking(shipmentId, token);
}

/**
 * Update a shipment
 * @param {string} shipmentId - The shipment ID
 * @param {object} updates - Fields to update
 * @param {string} token - Auth token
 * @returns {Promise} Updated shipment
 */
export function updateShipment(shipmentId, updates, token) {
  return updateBooking(shipmentId, updates, token);
}

// ============================================================
// DRAFTS
// ============================================================

/**
 * Create a new draft
 * @param {object} draftData - Draft data
 * @param {string} token - Auth token
 * @returns {Promise} Created draft
 */
export function createDraft(draftData, token) {
  console.log('📤 Creating draft:', draftData);
  return api.post('/api/drafts', draftData, token);
}

/**
 * Get a draft by ID
 * @param {string} draftId - The draft ID
 * @param {string} token - Auth token
 * @returns {Promise} Draft data
 */
export function getDraft(draftId, token) {
  console.log('📤 Fetching draft:', draftId);
  return api.get(`/api/drafts/${draftId}`, token);
}

/**
 * Update a draft
 * @param {string} draftId - The draft ID
 * @param {object} updates - Fields to update
 * @param {string} token - Auth token
 * @returns {Promise} Updated draft
 */
export function patchDraft(draftId, updates, token) {
  console.log('📤 Updating draft:', draftId, updates);
  return api.patch(`/api/drafts/${draftId}`, updates, token);
}

/**
 * Delete a draft
 * @param {string} draftId - The draft ID
 * @param {string} token - Auth token
 * @returns {Promise} Deletion response
 */
export function deleteDraft(draftId, token) {
  console.log('📤 Deleting draft:', draftId);
  return api.delete(`/api/drafts/${draftId}`, token);
}

/**
 * List all drafts for the current user
 * @param {string} token - Auth token
 * @returns {Promise} Array of user's drafts
 */
export function listMyDrafts(token) {
  console.log('📤 Fetching all drafts');
  return api.get('/api/drafts', token);
}

// ============================================================
// TRACKING & STATUS
// ============================================================

/**
 * Get tracking information for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Tracking data
 */
export function getTrackingInfo(bookingId, token) {
  return api.get(`/api/bookings/${bookingId}/tracking`, token);
}

/**
 * Get status history for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Status history array
 */
export function getStatusHistory(bookingId, token) {
  return api.get(`/api/bookings/${bookingId}/status-history`, token);
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * Get payment information for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Payment data
 */
export function getPaymentInfo(bookingId, token) {
  return api.get(`/api/bookings/${bookingId}/payment`, token);
}

/**
 * Process payment for a booking
 * @param {string} bookingId - The booking ID
 * @param {object} paymentData - Payment details
 * @param {string} token - Auth token
 * @returns {Promise} Payment response
 */
export function processPayment(bookingId, paymentData, token) {
  return api.post(`/api/bookings/${bookingId}/payment`, paymentData, token);
}

// ============================================================
// DOCUMENTS & RECEIPTS
// ============================================================

/**
 * Get receipt for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Receipt data
 */
export function getReceipt(bookingId, token) {
  return api.get(`/api/bookings/${bookingId}/receipt`, token);
}

/**
 * Download invoice for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Invoice file/URL
 */
export function downloadInvoice(bookingId, token) {
  return api.get(`/api/bookings/${bookingId}/invoice`, token);
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  // Bookings
  createBooking,
  getBooking,
  getFullBooking,
  listMyBookings,
  updateBooking,
  cancelBooking,

  // Shipments
  getShipments,
  getFullShipment,
  getShipment,
  updateShipment,

  // Drafts
  createDraft,
  getDraft,
  patchDraft,
  deleteDraft,
  listMyDrafts,

  // Tracking
  getTrackingInfo,
  getStatusHistory,

  // Payments
  getPaymentInfo,
  processPayment,

  // Documents
  getReceipt,
  downloadInvoice,
  getLoadDocuments,

  // Carrier pickup/delivery/cancel
  markPickup,
  markDelivered,
  cancelLoad,

  // BOL
  downloadBol,
  getBolData,
};