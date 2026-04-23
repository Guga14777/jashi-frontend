// src/lib/api-url.js
// Single source of truth for the API origin. Reads either env var name so
// legacy call sites that used VITE_API_URL and newer ones that use
// VITE_API_BASE both work — you only need to set ONE in Vercel.
//
//   Dev       : both env vars empty → API_BASE = '' → relative /api/* paths
//               are proxied by vite.config.js to http://localhost:5182
//   Production: VITE_API_BASE=https://api.jashilogistics.com (recommended)
//               → apiUrl('/api/x') → 'https://api.jashilogistics.com/api/x'

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE = String(
  env.VITE_API_BASE || env.VITE_API_URL || ''
).replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
