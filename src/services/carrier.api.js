// ============================================================
// FILE: src/services/carrier.api.js
// ✅ UPDATED: Added arrivedAtPickup and requestWaitingFee endpoints
// ✅ Added for 6-step status flow with detention/waiting fee logic
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

// ============================================================
// AVAILABLE LOADS (for all carriers to browse)
// ============================================================

/**
 * Get available loads (bookings waiting for carriers)
 * @param {string} token - Auth token (optional for public view)
 * @param {object} options - Query options
 * @returns {Promise} Available loads response
 */
export async function getAvailableLoads(token, options = {}) {
  const {
    page = 1,
    limit = 20,
    pickupState,
    dropoffState,
    originZip,
    destZip,
    vehicleType,
    transportType,
    q,
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (pickupState) params.append('pickupState', pickupState);
  if (dropoffState) params.append('dropoffState', dropoffState);
  if (originZip) params.append('originZip', originZip);
  if (destZip) params.append('destZip', destZip);
  if (vehicleType) params.append('vehicleType', vehicleType);
  if (transportType) params.append('transportType', transportType);
  if (q) params.append('q', q);

  console.log('📤 Fetching available loads:', params.toString());

  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/carrier/available-loads?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// MY LOADS (carrier's assigned loads)
// ============================================================

/**
 * Get carrier's assigned loads
 * @param {string} token - Auth token (required)
 * @param {object} options - Query options
 * @returns {Promise} Carrier's loads response
 */
export async function getMyLoads(token, options = {}) {
  if (!token) {
    throw new Error('Authentication required');
  }

  const {
    page = 1,
    limit = 20,
    status,
    vehicleType,
    transportType,
    dateFrom,
    dateTo,
    q,
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) params.append('status', status);
  if (vehicleType) params.append('vehicleType', vehicleType);
  if (transportType) params.append('transportType', transportType);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (q) params.append('q', q);

  console.log('📤 Fetching my loads:', params.toString());

  const response = await fetch(`${API_BASE}/api/carrier/my-loads?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get single load details
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Load details
 */
export async function getLoadDetails(loadId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Fetching load details:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// LOAD ACTIONS
// ============================================================

/**
 * Accept a load
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Accept response with full load details
 */
export async function acceptLoad(loadId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Accepting load:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Decline/Pass on a load
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @param {string} reason - Optional reason for declining
 * @returns {Promise} Decline response
 */
export async function declineLoad(loadId, token, reason = '') {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Declining load:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/decline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Start trip to pickup location
 * Changes status from 'assigned' to 'on_the_way_to_pickup'
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Updated load details
 */
export async function startTripToPickup(loadId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Starting trip to pickup:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/start-trip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * ✅ NEW: Mark arrived at pickup location
 * Changes status from 'on_the_way_to_pickup' to 'arrived_at_pickup'
 * Starts the waiting timer for detention fee eligibility
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Updated load details with arrivedAtPickupAt timestamp
 */
export async function arrivedAtPickup(loadId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Marking arrived at pickup:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/arrived-at-pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * ✅ NEW: Request waiting fee ($50)
 * Only available after 60 minutes of waiting at pickup
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @returns {Promise} Updated load details with waitFeeAmount applied
 */
export async function requestWaitingFee(loadId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Requesting waiting fee:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/request-waiting-fee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Mark load as picked up (with photos)
 * @param {string} loadId - The load/booking ID
 * @param {FormData} formData - Form data with photos
 * @param {string} token - Auth token
 * @returns {Promise} Updated load details
 */
export async function markAsPickedUp(loadId, formData, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Marking load as picked up:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/pickup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Note: Don't set Content-Type for FormData - browser will set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Mark load as delivered (with photos)
 * @param {string} loadId - The load/booking ID
 * @param {FormData} formData - Form data with photos
 * @param {string} token - Auth token
 * @returns {Promise} Updated load details
 */
export async function markAsDelivered(loadId, formData, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Marking load as delivered:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/deliver`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update load status (for assigned loads)
 * @param {string} loadId - The load/booking ID
 * @param {string} status - New status (assigned, in_transit, delivered)
 * @param {string} token - Auth token
 * @returns {Promise} Update response
 */
export async function updateLoadStatus(loadId, status, token) {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Updating load status:', loadId, 'to', status);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Cancel/drop a load as carrier
 * @param {string} loadId - The load/booking ID
 * @param {string} token - Auth token
 * @param {string} reason - Reason for cancellation
 * @returns {Promise} Cancel response
 */
export async function cancelLoad(loadId, token, reason = '') {
  if (!token) {
    throw new Error('Authentication required');
  }

  console.log('📤 Cancelling load:', loadId);

  const response = await fetch(`${API_BASE}/api/carrier/loads/${loadId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  // Available loads
  getAvailableLoads,
  
  // My loads
  getMyLoads,
  getLoadDetails,
  
  // Actions
  acceptLoad,
  declineLoad,
  startTripToPickup,
  arrivedAtPickup,      // ✅ NEW
  requestWaitingFee,    // ✅ NEW
  markAsPickedUp,
  markAsDelivered,
  updateLoadStatus,
  cancelLoad,
};