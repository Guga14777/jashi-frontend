// src/utils/request.js
// Thin fetch wrapper used by every src/services/*.api.js. All URL resolution
// goes through apiUrl() so dev (Vite proxy) and production (Vercel rewrite
// or cross-origin VITE_API_BASE) behave the same.

import { apiUrl } from '../lib/api-url.js';

async function http(method, endpoint, data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = apiUrl(endpoint);

  const res = await fetch(url, {
    method,
    headers,
    body: data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ? JSON.stringify(data)
      : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let body = null;
    try {
      body = await res.json();
      msg = body.error || body.message || msg;
      // When the backend classifies a DB/connection failure it also sends
      // `reason` + `detail`. Append them so users/ops can see the real cause
      // in the browser toast, not just the generic "Failed to login".
      if (body.detail && body.detail !== msg) msg = `${msg} — ${body.detail}`;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    err.reason = body?.reason || null;
    err.detail = body?.detail || null;
    err.code = body?.code || null;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

export const api = {
  get: (endpoint, token) => http('GET', endpoint, null, token),
  post: (endpoint, data, token) => http('POST', endpoint, data, token),
  put: (endpoint, data, token) => http('PUT', endpoint, data, token),
  patch: (endpoint, data, token) => http('PATCH', endpoint, data, token),
  delete: (endpoint, token) => http('DELETE', endpoint, null, token),
};

export default api;
