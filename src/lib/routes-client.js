// src/lib/routes-client.js
const envBase = (import.meta.env?.VITE_API_BASE || '').trim().replace(/\/+$/, '');
const isDev = !!import.meta.env?.DEV;

let API_BASE = '';
if (envBase) {
  API_BASE = envBase;
} else if (!isDev) {
  API_BASE = '';
}

console.info('[routes-client] API_BASE:', API_BASE || '(relative /api via Vite proxy)');

export async function fetchDrivingMilesByZip(originZip, destZip, signal) {
  if (!originZip || !destZip) throw new Error('Both origin and destination ZIPs are required');

  const path = `/api/distance?from=${encodeURIComponent(originZip)}&to=${encodeURIComponent(destZip)}`;
  const url = API_BASE ? `${API_BASE}${path}` : path;

  const resp = await fetch(url, { signal, method: 'GET' });
  const body = await resp.json().catch(() => ({}));

  if (!resp.ok || body?.success === false) {
    const errMsg = String(body?.error || body?.message || `HTTP ${resp.status}`);
    if (resp.status === 422 || /INVALID_ZIP/i.test(errMsg)) {
      throw new Error('Invalid or unsupported ZIP code. Please check and try again.');
    }
    throw new Error(errMsg);
  }

  // ✅ FIXED: Extract miles from body.distance.miles (backend structure)
  const miles = Number(body?.distance?.miles ?? body?.miles);
  if (!Number.isFinite(miles) || miles <= 0) {
    throw new Error('Invalid distance returned from API');
  }

  return {
    miles,
    text: body?.distance?.text || `${miles} mi`,
    duration: body?.duration,
    origin: body?.origin,
    destination: body?.destination,
    source: 'google-distance-matrix'
  };
}