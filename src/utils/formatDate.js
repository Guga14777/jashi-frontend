// src/utils/formatDate.js
// Tiny helper for "PLACED" columns + "Posted Apr 27" labels in the
// shipper orders table and the carrier load cards. Wraps the canonical
// formatDate from src/utils/date.js so behavior matches the rest of
// the app (locale, missing-value handling).

import { formatDate } from './date.js';

/**
 * Renders "Apr 27, 2026" from an ISO timestamp.
 * Falls back to "—" when value is missing or unparseable.
 */
export const formatShortDate = (iso) => {
  if (!iso) return '—';
  const out = formatDate(iso);
  return out === 'Invalid Date' || out === 'N/A' ? '—' : out;
};

export default formatShortDate;
