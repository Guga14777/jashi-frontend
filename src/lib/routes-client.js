// src/lib/routes-client.js
import { apiUrl } from './api-url.js';

export async function fetchDrivingMilesByZip(originZip, destZip, signal) {
  if (!originZip || !destZip) throw new Error('Both origin and destination ZIPs are required');

  const url = apiUrl(
    `/api/distance?from=${encodeURIComponent(originZip)}&to=${encodeURIComponent(destZip)}`
  );

  const resp = await fetch(url, { signal, method: 'GET' });
  const body = await resp.json().catch(() => ({}));

  if (!resp.ok || body?.success === false) {
    const errMsg = String(body?.error || body?.message || `HTTP ${resp.status}`);
    if (resp.status === 422 || /INVALID_ZIP/i.test(errMsg)) {
      throw new Error('Invalid or unsupported ZIP code. Please check and try again.');
    }
    throw new Error(errMsg);
  }

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
