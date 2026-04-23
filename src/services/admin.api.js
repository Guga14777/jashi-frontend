// src/services/admin.api.js
// Thin client for the admin portal — server-side search/filter on the backend.
import { api } from '../utils/request';

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    if (Array.isArray(v)) {
      if (v.length) search.set(k, v.join(','));
    } else {
      search.set(k, String(v));
    }
  });
  const qs = search.toString();
  return qs ? '?' + qs : '';
}

export const AdminOrdersAPI = {
  /**
   * List orders with server-side search + filters.
   * filters: { q, status (string|array), from, to, customerId, carrierId, city, zip, paymentRef, page, limit }
   */
  list(filters, token) {
    return api.get('/api/admin/orders' + buildQuery(filters), token);
  },
  getOne(id, token) {
    return api.get(`/api/admin/orders/${id}`, token);
  },
  getBolUrl(orderNumber) {
    return `/api/admin/orders/${orderNumber}/bol`;
  },

  // --- admin god-mode actions (writes to AccountEvent audit log) ---
  updateStatus(id, { status, note }, token) {
    return api.patch(`/api/admin/orders/${id}/status`, { status, note }, token);
  },
  assignCarrier(id, { carrierId, note }, token) {
    return api.post(`/api/admin/orders/${id}/assign-carrier`, { carrierId, note }, token);
  },
  cancel(id, { reason, notes }, token) {
    return api.post(`/api/admin/orders/${id}/cancel`, { reason, notes }, token);
  },
  approveDetention(id, { amount, notes }, token) {
    return api.post(`/api/admin/orders/${id}/detention/approve`, { amount, notes }, token);
  },
  denyDetention(id, { notes }, token) {
    return api.post(`/api/admin/orders/${id}/detention/deny`, { notes }, token);
  },
  resolveCnp(id, { resolution, notes }, token) {
    return api.post(`/api/admin/orders/${id}/cnp/resolve`, { resolution, notes }, token);
  },
};

export const AdminUsersAPI = {
  list({ role = 'CUSTOMER', page = 1, limit = 200 } = {}, token) {
    return api.get(`/api/admin/users${buildQuery({ role, page, limit })}`, token);
  },
};

export const AdminStatsAPI = {
  get(token) {
    return api.get('/api/admin/stats', token);
  },
};

export const AdminActivityAPI = {
  list(filters, token) {
    return api.get('/api/admin/activity' + buildQuery(filters), token);
  },
};

export const AdminNotesAPI = {
  list(orderId, token) {
    return api.get(`/api/admin/orders/${orderId}/notes`, token);
  },
  create(orderId, body, token) {
    return api.post(`/api/admin/orders/${orderId}/notes`, { body }, token);
  },
  update(noteId, body, token) {
    return api.patch(`/api/admin/notes/${noteId}`, { body }, token);
  },
  remove(noteId, token) {
    return api.delete(`/api/admin/notes/${noteId}`, token);
  },
};

export const AdminSettingsAPI = {
  list(token) {
    return api.get('/api/admin/settings', token);
  },
  update(key, value, token) {
    return api.put(`/api/admin/settings/${encodeURIComponent(key)}`, { value }, token);
  },
};

export const AdminAutomationAPI = {
  // Force an alerts scan right now; returns { scanned, newlyFlagged }.
  runNow(token) {
    return api.post('/api/admin/automation/run-now', {}, token);
  },
};

export const AdminDocumentsAPI = {
  listByOrder(filters, token) {
    return api.get('/api/admin/documents/by-order' + buildQuery(filters), token);
  },
  getOrderDocuments(orderNumber, token) {
    return api.get(`/api/admin/documents/order/${orderNumber}`, token);
  },
};
