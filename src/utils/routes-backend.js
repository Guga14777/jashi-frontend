// CommonJS helper used by server.cjs
// Geocodes ZIP codes and calculates driving distance using Google Maps API

const fetch = require('node-fetch'); // Add this import

const KEY = process.env.ROUTES_API_KEY;

function assertZip(z) {
  const s = String(z || '').trim();
  if (!/^\d{5}$/.test(s)) throw new Error('ZIPs must be 5 digits');
  return s;
}

// ✅ FIX: force ZIP-only geocoding in the US and verify the returned ZIP matches
async function geocodeZip(zip) {
  if (!KEY) throw new Error('Missing ROUTES_API_KEY in .env');

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?components=${encodeURIComponent(`postal_code:${zip}|country:US`)}` +
    `&result_type=postal_code&region=us&key=${KEY}`;

  console.log(`[geocode] ZIP ${zip} → ${url.replace(KEY, 'KEY_HIDDEN')}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Geocode HTTP ${r.status}`);

  const j = await r.json();
  if (j.status !== 'OK' || !j.results?.length) {
    const msg = j.error_message ? ` - ${j.error_message}` : '';
    throw new Error(`Geocode failed: ${j.status}${msg}`);
  }

  // Ensure Google actually returned the same ZIP we asked for
  const comp = j.results[0].address_components.find(c => c.types.includes('postal_code'));
  if (!comp || comp.short_name !== String(zip)) {
    throw new Error(`Geocode mismatch for ZIP ${zip}`);
  }

  const { lat, lng } = j.results[0].geometry.location;
  console.log(`[geocode] ${zip} → ${lat},${lng}`);
  return `${lat},${lng}`;
}

async function distanceMatrix(originLatLng, destLatLng) {
  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${encodeURIComponent(originLatLng)}` +
    `&destinations=${encodeURIComponent(destLatLng)}` +
    `&mode=driving&units=imperial&key=${KEY}`;

  console.log(`[distance] Computing distance...`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Distance Matrix HTTP ${r.status}`);

  const j = await r.json();
  console.log(`[distance] Status: ${j.status}`);

  if (j.status !== 'OK') {
    const msg = j.error_message ? ` - ${j.error_message}` : '';
    throw new Error(`Distance Matrix failed: ${j.status}${msg}`);
  }

  const el = j?.rows?.[0]?.elements?.[0];
  if (!el) throw new Error('Distance Matrix response malformed');

  if (el.status === 'ZERO_RESULTS') {
    console.log(`[distance] Same location, returning 0 mi`);
    return { miles: 0, text: '0 mi' };
  }
  if (el.status !== 'OK') throw new Error(`Distance Matrix route error: ${el.status}`);

  const meters = el.distance?.value;
  if (!meters) throw new Error('No distance data in response');

  const miles = Math.round(meters * 0.000621371 * 10) / 10;
  console.log(`[distance] Result: ${miles} miles`);
  return { miles, text: `${miles} mi` };
}

async function getDistanceByZip(originZip, destZip) {
  try {
    const oz = assertZip(originZip);
    const dz = assertZip(destZip);

    if (oz === dz) {
      return { miles: 0, text: '0 mi', source: 'google-distance-matrix' };
    }

    console.log(`[getDistance] ${oz} → ${dz}`);
    const [oLL, dLL] = await Promise.all([geocodeZip(oz), geocodeZip(dz)]);
    const { miles, text } = await distanceMatrix(oLL, dLL);

    return { miles, text, source: 'google-distance-matrix' };
  } catch (err) {
    console.error(`[getDistance] Error: ${err.message}`);
    throw err;
  }
}

module.exports = { getDistanceByZip };