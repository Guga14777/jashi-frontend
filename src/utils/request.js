// src/utils/request.js
const BASE_URL = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

async function http(method, endpoint, data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ? JSON.stringify(data)
      : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
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
