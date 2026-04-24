// src/utils/promote-pending-quote.js
//
// Shared logic for turning a sessionStorage-stored pending quote (captured
// by the public quote widget before auth) into a real DB-backed quote via
// POST /api/quotes. Used after both login AND signup so the flow doesn't
// silently lose the user's offer.
//
// The caller decides what to do with the result:
//   - on success → navigate to /shipper/offer?quoteId=<id>
//   - on failure → show a visible error; do NOT navigate to /shipper/offer
//     without a real quoteId.

import { apiUrl } from '../lib/api-url.js';

const STORAGE_KEY = 'pendingQuotePayload';
const RETURN_TO_KEY = 'authReturnTo';

// Client-side timeout for POST /api/quotes. Prevents the recovery/login
// spinner from hanging forever if Railway stalls. 20s is generous for a
// CREATE that normally returns in <500ms.
const QUOTE_CREATE_TIMEOUT_MS = 20_000;

// Module-level in-flight guard. If two React components race to promote
// the same sessionStorage payload (e.g. login form fires, portal recovery
// also starts before navigate() fires), the second caller awaits the first
// and gets the same result instead of double-posting.
let inflightPromise = null;

export function readPendingQuote() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingQuote() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // ignore
  }
}

function buildApiPayload(pending) {
  // Only forward the fields the server understands. Extras are harmless but
  // trimming makes Railway logs readable when a create fails.
  return {
    fromZip: pending.fromZip,
    toZip: pending.toZip,
    miles: pending.miles,
    durationHours: pending.durationHours ?? null,
    vehicle: pending.vehicle,
    vehicles: pending.vehicles,
    vehiclesCount: pending.vehicleCount ?? pending.vehiclesCount,
    transportType: pending.transportType,
    offer: pending.offer,
    likelihood: pending.likelihood,
    marketAvg: pending.marketAvg,
    recommendedMin: pending.recommendedMin,
    recommendedMax: pending.recommendedMax,
    source: pending.source || 'quote-widget',
  };
}

// Build /shipper/offer?quoteId=...&fromZip=...&... — keep URL params for a
// graceful reload experience, but the quoteId is the load-bearing one.
export function buildOfferUrl(quoteId, pending) {
  const params = new URLSearchParams();
  params.set('quoteId', quoteId);
  if (pending?.fromZip) params.set('fromZip', pending.fromZip);
  if (pending?.toZip) params.set('toZip', pending.toZip);
  if (pending?.miles != null) params.set('miles', String(pending.miles));
  if (pending?.offer != null) params.set('offer', String(pending.offer));
  if (pending?.transportType) params.set('transportType', pending.transportType);
  if (pending?.likelihood != null) params.set('likelihood', String(pending.likelihood));
  if (pending?.vehicle) params.set('vehicle', pending.vehicle);
  if (pending?.vehicleCount != null) params.set('vehicles', String(pending.vehicleCount));
  if (pending?.marketAvg != null) params.set('marketAvg', String(pending.marketAvg));
  if (pending?.recommendedMin != null) params.set('recommendedMin', String(pending.recommendedMin));
  if (pending?.recommendedMax != null) params.set('recommendedMax', String(pending.recommendedMax));
  return `/shipper/offer?${params.toString()}`;
}

// POST /api/quotes with an AbortController timeout. We don't go through
// utils/request.js because that wrapper has no timeout and we need this
// call specifically to never hang forever.
async function postQuoteWithTimeout(apiPayload, token, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl('/api/quotes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(apiPayload),
      signal: controller.signal,
    });

    // Parse body once, as JSON if content-type says so, else text.
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json')
      ? await res.json().catch(() => null)
      : null;

    if (!res.ok) {
      const msg = body?.error || body?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// Create the quote from either an explicit payload or the sessionStorage one.
// Returns { ok: true, quoteId, url } on success or { ok: false, error, raw }
// on failure. Does NOT clear storage on failure so the caller can retry.
// Concurrent callers with the same intent share one in-flight promise.
export async function promotePendingQuote({ token, payload } = {}) {
  if (inflightPromise) {
    // Another caller is already promoting — await their result instead of
    // duplicating the POST. Fine to share because all callers share the
    // same sessionStorage payload anyway.
    return inflightPromise;
  }

  const pending = payload || readPendingQuote();
  if (!pending) {
    return { ok: false, error: 'No pending quote found. Please start a new quote.' };
  }
  if (!token) {
    return { ok: false, error: 'You must be logged in to save a quote.' };
  }

  const run = async () => {
    try {
      const apiPayload = buildApiPayload(pending);
      const resp = await postQuoteWithTimeout(apiPayload, token, QUOTE_CREATE_TIMEOUT_MS);
      const quoteId = resp?.quote?.id || resp?.id;
      if (!quoteId) {
        return { ok: false, error: 'Quote creation returned no id.', raw: resp };
      }
      clearPendingQuote();
      sessionStorage.setItem('lastQuoteId', quoteId);
      return { ok: true, quoteId, url: buildOfferUrl(quoteId, pending) };
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      console.error('[promotePendingQuote] failed:', err);
      return {
        ok: false,
        error: isAbort
          ? 'Saving your quote is taking too long. Please try again.'
          : err?.message || 'Failed to save your quote.',
        status: err?.status,
        raw: err,
      };
    }
  };

  inflightPromise = run().finally(() => {
    inflightPromise = null;
  });
  return inflightPromise;
}
