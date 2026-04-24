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

import { api } from './request.js';

const STORAGE_KEY = 'pendingQuotePayload';
const RETURN_TO_KEY = 'authReturnTo';

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

// Create the quote from either an explicit payload or the sessionStorage one.
// Returns { ok: true, quoteId, url } on success or { ok: false, error, raw }
// on failure. Does NOT clear storage on failure so the caller can retry.
export async function promotePendingQuote({ token, payload } = {}) {
  const pending = payload || readPendingQuote();
  if (!pending) {
    return { ok: false, error: 'No pending quote found. Please start a new quote.' };
  }
  if (!token) {
    return { ok: false, error: 'You must be logged in to save a quote.' };
  }

  try {
    const apiPayload = buildApiPayload(pending);
    const resp = await api.post('/api/quotes', apiPayload, token);
    const quoteId = resp?.quote?.id || resp?.id;
    if (!quoteId) {
      return { ok: false, error: 'Quote creation returned no id.', raw: resp };
    }
    clearPendingQuote();
    sessionStorage.setItem('lastQuoteId', quoteId);
    return { ok: true, quoteId, url: buildOfferUrl(quoteId, pending) };
  } catch (err) {
    console.error('[promotePendingQuote] failed:', err);
    return {
      ok: false,
      error: err?.message || 'Failed to save your quote.',
      status: err?.status,
      raw: err,
    };
  }
}
