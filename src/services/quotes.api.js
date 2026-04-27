// ============================================================
// FILE: src/services/quotes.api.js
// ✅ Quote API service - VIN is returned from backend automatically
// ✅ UPDATED: Added patchDraft function for shipper portal
// ✅ FIXED: Added updateDraft alias for backward compatibility
// ============================================================

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../lib/api-url.js';

/**
 * Create a new quote
 */
export async function createQuote(quoteData, token) {
  const response = await fetch(`${API_BASE}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(quoteData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create quote');
  }

  return response.json();
}

/**
 * List user's quotes with pagination
 * Response includes VIN field when available
 */
export async function listMyQuotes(options = {}, token) {
  const {
    page = 1,
    pageSize = 10,
    status,
    sortBy,
    sortOrder,
    search,
    statusFilter,
    likelihoodFilter,
  } = options;

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (status) params.append('status', status);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (search && String(search).trim()) params.append('search', String(search).trim());
  if (statusFilter) params.append('statusFilter', statusFilter);
  if (likelihoodFilter) params.append('likelihoodFilter', likelihoodFilter);

  const response = await fetch(`${API_BASE}/api/quotes?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch quotes');
  }

  return response.json();
}

/**
 * Get single quote by ID
 * Response includes VIN field when available
 */
export async function getQuoteById(id, token) {
  const response = await fetch(`${API_BASE}/api/quotes/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch quote');
  }

  return response.json();
}

/**
 * Accept/Book a quote
 */
export async function acceptQuote(id, token) {
  const response = await fetch(`${API_BASE}/api/quotes/${id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to accept quote');
  }

  return response.json();
}

/**
 * Update a quote
 */
export async function updateQuote(id, updates, token) {
  const response = await fetch(`${API_BASE}/api/quotes/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update quote');
  }

  return response.json();
}

/**
 * Delete a quote
 */
export async function deleteQuote(id, token) {
  const response = await fetch(`${API_BASE}/api/quotes/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete quote');
  }

  return response.json();
}

/**
 * Get quote statistics
 */
export async function getQuoteStats(token) {
  const response = await fetch(`${API_BASE}/api/quotes/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch quote stats');
  }

  return response.json();
}

/**
 * Patch/Update a draft
 * Used by shipper portal to save pickup/dropoff details
 */
export async function patchDraft(draftId, updates, token) {
  const response = await fetch(`${API_BASE}/api/drafts/${draftId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update draft');
  }

  return response.json();
}

/**
 * ✅ FIXED: Alias for patchDraft for backward compatibility
 * Some components call quotesApi.updateDraft instead of quotesApi.patchDraft
 */
export const updateDraft = patchDraft;

export default {
  createQuote,
  listMyQuotes,
  getQuoteById,
  acceptQuote,
  updateQuote,
  deleteQuote,
  getQuoteStats,
  patchDraft,
  updateDraft, // ✅ Alias for backward compatibility
};