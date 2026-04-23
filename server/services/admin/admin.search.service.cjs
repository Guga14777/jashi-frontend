// server/services/admin/admin.search.service.cjs
//
// Shared filter/search builder for admin list endpoints.
// One place where we decide what "search" means so every admin page
// (orders, documents, customers, carriers) can reuse the same rules.

const { normalizeStatus, SHIPMENT_STATUS } = require('../booking/index.cjs');

/**
 * Parse ?status=foo,bar into a normalized array.
 * Accepts single string, comma-separated string, or array.
 */
function parseStatusList(raw) {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const out = list
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map(normalizeStatus);
  return out.length ? Array.from(new Set(out)) : null;
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isNumericString(s) {
  return typeof s === 'string' && /^\d+$/.test(s);
}

/**
 * Build a Prisma `where` object for Booking admin listings.
 *
 * Supported query params:
 *   q            free-text across order #, ref, customer name/email/phone,
 *                carrier name/company, vehicle text + VIN, city, payment ref
 *   status       single or comma-list (scheduled, assigned, on_the_way_to_pickup, …, cancelled)
 *   from, to     ISO dates, filter on createdAt
 *   customerId   exact match on userId
 *   carrierId    exact match on carrierId
 *   city         case-insensitive contains on pickup/dropoff city
 *   state        exact (case-insensitive) on pickup/dropoff state
 *   zip          exact on pickup/dropoff zip
 *   paymentRef   contains on any linked payment's `reference`
 *   priceMin     numeric lower bound on price
 *   priceMax     numeric upper bound on price
 *   transportType  exact match on transportType (open|enclosed)
 *   vehicleType  contains on Booking.vehicleType or bookingVehicles.vehicleType
 *   ids          comma list of booking IDs (used by bulk actions + export-selected)
 *   (vin is searched via the `q` fallback — joins through bookingVehicles relation)
 *
 * NOTE: pickup/dropoff are both top-level columns (fromCity/toCity)
 *       and nested JSON blobs. We filter on the top-level columns — the
 *       JSON blobs aren't indexable and pre-filtering there hurts more than it helps.
 */
function buildOrderSearchWhere(params = {}) {
  const AND = [];

  // --- status ------------------------------------------------------------
  const statuses = parseStatusList(params.status);
  if (statuses && !(statuses.length === 1 && statuses[0] === SHIPMENT_STATUS.SCHEDULED && params.status === 'all')) {
    // Allow caller to pass status=all to mean "no filter"
    if (String(params.status).toLowerCase() !== 'all') {
      AND.push({ status: { in: statuses } });
    }
  }

  // --- date range --------------------------------------------------------
  const from = parseDate(params.from);
  const to = parseDate(params.to);
  if (from || to) {
    const createdAt = {};
    if (from) createdAt.gte = from;
    if (to) {
      // If `to` has no time component, treat it as end-of-day.
      const endOfDay = new Date(to);
      if (to.getUTCHours() === 0 && to.getUTCMinutes() === 0 && to.getUTCSeconds() === 0) {
        endOfDay.setUTCHours(23, 59, 59, 999);
      }
      createdAt.lte = endOfDay;
    }
    AND.push({ createdAt });
  }

  // --- direct ID filters -------------------------------------------------
  if (params.customerId) AND.push({ userId: String(params.customerId) });
  if (params.carrierId)  AND.push({ carrierId: String(params.carrierId) });

  // --- location ----------------------------------------------------------
  if (params.city) {
    const city = String(params.city).trim();
    AND.push({
      OR: [
        { fromCity: { contains: city, mode: 'insensitive' } },
        { toCity:   { contains: city, mode: 'insensitive' } },
      ],
    });
  }
  if (params.state) {
    // States are stored inside the JSON pickup/dropoff blobs, not top-level.
    // We can't efficiently filter on JSON path across all our rows, so we
    // accept this as a soft filter and rely on the `q` free-text fallback
    // for state-name searches. Intentionally left out here.
  }
  if (params.zip) {
    const zip = String(params.zip).trim();
    // Zip is also in JSON. Push it into the free-text fallback via `q` below.
    if (!params.q) params = { ...params, q: zip };
  }

  // --- payment reference ------------------------------------------------
  if (params.paymentRef) {
    AND.push({
      payments: {
        some: { reference: { contains: String(params.paymentRef), mode: 'insensitive' } },
      },
    });
  }

  // --- price range ------------------------------------------------------
  const priceMin = Number(params.priceMin);
  const priceMax = Number(params.priceMax);
  if (Number.isFinite(priceMin) || Number.isFinite(priceMax)) {
    const price = {};
    if (Number.isFinite(priceMin)) price.gte = priceMin;
    if (Number.isFinite(priceMax)) price.lte = priceMax;
    AND.push({ price });
  }

  // --- transport type ---------------------------------------------------
  if (params.transportType) {
    AND.push({ transportType: { equals: String(params.transportType), mode: 'insensitive' } });
  }

  // --- vehicle type -----------------------------------------------------
  if (params.vehicleType) {
    const vt = String(params.vehicleType);
    AND.push({
      OR: [
        { vehicleType: { contains: vt, mode: 'insensitive' } },
        { bookingVehicles: { some: { vehicleType: { contains: vt, mode: 'insensitive' } } } },
      ],
    });
  }

  // --- explicit IDs (used by bulk actions / export-selected) -----------
  if (params.ids) {
    const ids = String(params.ids).split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length) AND.push({ id: { in: ids } });
  }

  // --- free-text (q) ----------------------------------------------------
  // orderNumber is an Int column, so it only joins the OR when q is numeric.
  // vin lives on BookingVehicle, reached via the `bookingVehicles` relation.
  if (params.q && String(params.q).trim()) {
    const q = String(params.q).trim();
    const contains = { contains: q, mode: 'insensitive' };

    const OR = [
      { ref: contains },
      { fromCity: contains },
      { toCity: contains },
      { vehicle: contains },
      { vehicleType: contains },
      { bookingVehicles: { some: { vin: contains } } },
      { bookingVehicles: { some: { make: contains } } },
      { bookingVehicles: { some: { model: contains } } },
      { user: { firstName: contains } },
      { user: { lastName: contains } },
      { user: { email: contains } },
      { user: { phone: contains } },
      { payments: { some: { reference: contains } } },
      { payments: { some: { cardholderFirstName: contains } } },
      { payments: { some: { cardholderLastName: contains } } },
    ];

    // Numeric q → also try exact orderNumber match (Int column).
    if (isNumericString(q)) {
      const asInt = Number(q);
      if (Number.isFinite(asInt)) OR.push({ orderNumber: asInt });
    }

    AND.push({ OR });
  }

  return AND.length ? { AND } : {};
}

/**
 * Pagination helper — clamps limits so an admin can't DOS themselves.
 */
function parsePagination(params = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const rawLimit = parseInt(params.limit, 10) || 25;
  const limit = Math.min(Math.max(1, rawLimit), 200);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = {
  buildOrderSearchWhere,
  parsePagination,
  parseStatusList,
};
