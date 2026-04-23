// src/services/draft.api.js
import api from '../utils/request.js';

/**
 * Create a new draft
 */
export async function createDraft(draftData, token) {
  const response = await api.post('/api/drafts', draftData, token);

  if (!response.success) {
    throw new Error(response.error || 'Failed to create draft');
  }

  return response.draft;
}

/**
 * Update an existing draft (PATCH)
 */
export async function patchDraft(draftId, updates, token) {
  const response = await api.patch(`/api/drafts/${draftId}`, updates, token);

  if (!response.success) {
    throw new Error(response.error || 'Failed to update draft');
  }

  return response.draft;
}

/**
 * Get a draft by ID
 */
export async function getDraft(draftId, token) {
  const response = await api.get(`/api/drafts/${draftId}`, token);

  if (!response.success) {
    throw new Error(response.error || 'Failed to get draft');
  }

  return response.draft;
}

/**
 * List all drafts for current user
 */
export async function listDrafts(token) {
  const response = await api.get('/api/drafts', token);

  if (!response.success) {
    throw new Error(response.error || 'Failed to list drafts');
  }

  return response.drafts;
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId, token) {
  const response = await api.delete(`/api/drafts/${draftId}`, token);

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete draft');
  }

  return response;
}