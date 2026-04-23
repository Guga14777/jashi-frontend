// src/lib/api-url.js
//
// Single source of truth for the API origin. All fetch / api layers import
// apiUrl() from here so there is exactly one place to change if the
// deployment topology changes.
//
// Three supported modes:
//
//   1. LOCAL DEV
//      VITE_API_BASE unset, `npm run dev` running.
//      apiUrl('/api/x') -> '/api/x'
//      Vite proxies /api → http://localhost:5182 (see vite.config.js).
//
//   2. PRODUCTION (recommended) — Vercel rewrite to Railway
//      VITE_API_BASE unset in Vercel.
//      apiUrl('/api/x') -> '/api/x'
//      vercel.json rewrites /api/:path* → https://<railway>/api/:path*
//      This keeps the browser on the same origin — no CORS, no preflight.
//
//   3. PRODUCTION (alternative) — direct cross-origin call
//      VITE_API_BASE=https://<railway-host>
//      apiUrl('/api/x') -> 'https://<railway-host>/api/x'
//      Backend must include the frontend domain in ALLOWED_ORIGINS.
//
// Legacy VITE_API_URL is still honoured so older call sites don't break.

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE = String(
  env.VITE_API_BASE || env.VITE_API_URL || ''
).replace(/\/+$/, '');

export const IS_DEV = !!env.DEV;

export function apiUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${rel}`;
}

// One-time startup log so prod issues are easy to diagnose from the console.
if (typeof window !== 'undefined' && !window.__API_BASE_LOGGED__) {
  window.__API_BASE_LOGGED__ = true;
  const mode = API_BASE
    ? `cross-origin → ${API_BASE}`
    : IS_DEV
      ? 'relative (Vite proxy → localhost:5182)'
      : 'relative (Vercel rewrite → Railway backend)';
  // eslint-disable-next-line no-console
  console.info('[api-url] mode:', mode);
}
