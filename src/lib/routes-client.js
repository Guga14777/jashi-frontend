// src/lib/routes-client.js
import { apiUrl } from './api-url.js';

// Attach a machine-readable `code` so the UI can translate the server error
// into a localized, user-friendly message without string-matching.
function makeDistanceError(message, code, raw) {
  const err = new Error(message);
  err.code = code;
  if (raw) err.raw = raw;
  return err;
}

export async function fetchDrivingMilesByZip(originZip, destZip, signal) {
  if (!originZip || !destZip) throw new Error('Both origin and destination ZIPs are required');

  const url = apiUrl(
    `/api/distance?from=${encodeURIComponent(originZip)}&to=${encodeURIComponent(destZip)}`
  );

  const resp = await fetch(url, { signal, method: 'GET' });
  const body = await resp.json().catch(() => ({}));

  if (!resp.ok || body?.success === false) {
    const serverMsg = String(body?.error || body?.message || `HTTP ${resp.status}`);
    const combined = `${serverMsg} ${body?.status || ''}`.toLowerCase();

    if (resp.status === 422 || /invalid_zip/i.test(combined)) {
      throw makeDistanceError('Invalid or unsupported ZIP code. Please check and try again.', 'INVALID_ZIP', serverMsg);
    }
    if (/not configured|api key is missing/i.test(combined)) {
      throw makeDistanceError(serverMsg, 'SERVICE_NOT_CONFIGURED', serverMsg);
    }
    if (/request_denied/.test(combined)) {
      throw makeDistanceError(serverMsg, 'REQUEST_DENIED', serverMsg);
    }
    if (/over_query_limit/.test(combined)) {
      throw makeDistanceError(serverMsg, 'OVER_QUERY_LIMIT', serverMsg);
    }
    if (/zero_results|not_found/.test(combined)) {
      throw makeDistanceError(serverMsg, 'NO_ROUTE', serverMsg);
    }
    throw makeDistanceError(serverMsg, resp.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN', serverMsg);
  }

  const miles = Number(body?.distance?.miles ?? body?.miles);
  if (!Number.isFinite(miles) || miles <= 0) {
    throw makeDistanceError('Invalid distance returned from API', 'BAD_RESPONSE');
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
