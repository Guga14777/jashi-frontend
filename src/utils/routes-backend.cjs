// src/utils/routes-backend.cjs

// Polyfill fetch for Node < 18 (lazy-loads node-fetch if needed)
let _fetch = global.fetch;
if (typeof _fetch !== 'function') {
  _fetch = (...args) => import('node-fetch').then(m => m.default(...args));
}
const fetch = (...args) => _fetch(...args);

const KEY = process.env.ROUTES_API_KEY;

// Basic ZIP validation
function assertZip(z) {
  const s = String(z || '').trim();
  if (!/^\d{5}$/.test(s)) throw new Error('ZIPs must be 5 digits');
  return s;
}

// Strict ZIP geocode; throws INVALID_ZIP if Google can’t match the postal_code exactly
async function geocodeZip(zip) {
  if (!KEY) throw new Error('Missing ROUTES_API_KEY in .env');

  const strictUrl =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?components=${encodeURIComponent(`postal_code:${zip}|country:US`)}&result_type=postal_code&region=us&key=${KEY}`;

  const r1 = await fetch(strictUrl);
  if (!r1.ok) throw new Error(`Geocode HTTP ${r1.status}`);
  const j1 = await r1.json();

  if (j1.status === 'OK' && j1.results?.length) {
    const comp = j1.results[0].address_components.find(c => c.types.includes('postal_code'));
    if (comp?.short_name === String(zip)) {
      const { lat, lng } = j1.results[0].geometry.location;
      return `${lat},${lng}`;
    }
  }

  // Controlled fallback: ensure postal_code still equals the exact ZIP we asked for
  const addrUrl =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(`${zip}, USA`)}&region=us&key=${KEY}`;

  const r2 = await fetch(addrUrl);
  if (!r2.ok) throw new Error(`Geocode HTTP ${r2.status}`);
  const j2 = await r2.json();

  if (j2.status === 'OK' && j2.results?.length) {
    const comp = j2.results[0].address_components.find(c => c.types.includes('postal_code'));
    if (comp?.short_name === String(zip)) {
      const { lat, lng } = j2.results[0].geometry.location;
      return `${lat},${lng}`;
    }
  }

  const err = new Error(`INVALID_ZIP: ${zip}`);
  err.code = 'INVALID_ZIP';
  throw err;
}

// Distance Matrix call
async function distanceMatrix(originLatLng, destLatLng) {
  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${encodeURIComponent(originLatLng)}` +
    `&destinations=${encodeURIComponent(destLatLng)}` +
    `&mode=driving&units=imperial&key=${KEY}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Distance Matrix HTTP ${r.status}`);
  const j = await r.json();

  if (j.status !== 'OK') {
    const msg = j.error_message ? ` - ${j.error_message}` : '';
    throw new Error(`Distance Matrix failed: ${j.status}${msg}`);
  }

  const el = j?.rows?.[0]?.elements?.[0];
  if (!el) throw new Error('Distance Matrix response malformed');

  if (el.status === 'ZERO_RESULTS') return { miles: 0, text: '0 mi' };
  if (el.status !== 'OK') throw new Error(`Distance Matrix route error: ${el.status}`);

  const meters = el.distance?.value;
  if (!meters) throw new Error('No distance data in response');

  const miles = Math.round(meters * 0.000621371 * 10) / 10;
  return { miles, text: `${miles} mi` };
}

// Public API
async function getDistanceByZip(originZip, destZip) {
  const oz = assertZip(originZip);
  const dz = assertZip(destZip);
  if (oz === dz) return { miles: 0, text: '0 mi', source: 'google-distance-matrix' };

  const [oLL, dLL] = await Promise.all([geocodeZip(oz), geocodeZip(dz)]);
  const { miles, text } = await distanceMatrix(oLL, dLL);
  return { miles, text, source: 'google-distance-matrix' };
}

module.exports = { getDistanceByZip };
