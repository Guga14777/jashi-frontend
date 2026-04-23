// server/controllers/admin/admin.export.controller.cjs
// CSV export of admin-searchable orders. Reuses buildOrderSearchWhere so the
// filters on the page and the export always stay in lockstep.

const prisma = require('../../db.cjs');
const { buildOrderSearchWhere } = require('../../services/admin/admin.search.service.cjs');
const { normalizeStatus, STATUS_LABELS } = require('../../services/booking/index.cjs');

// RFC 4180-ish CSV escaping. Wrap in quotes when needed; double any internal quotes.
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvLine(cells) {
  return cells.map(csvCell).join(',') + '\n';
}

const COLUMNS = [
  { key: 'orderNumber',  label: 'Order #' },
  { key: 'ref',          label: 'Reference' },
  { key: 'status',       label: 'Status' },
  { key: 'createdAt',    label: 'Created' },
  { key: 'customer',     label: 'Customer' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerPhone', label: 'Customer Phone' },
  { key: 'carrier',      label: 'Carrier' },
  { key: 'carrierEmail', label: 'Carrier Email' },
  { key: 'origin',       label: 'Origin' },
  { key: 'destination',  label: 'Destination' },
  { key: 'miles',        label: 'Miles' },
  { key: 'vehicle',      label: 'Vehicle' },
  { key: 'vin',          label: 'VIN' },
  { key: 'transportType', label: 'Transport' },
  { key: 'price',        label: 'Price' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'paymentRef',   label: 'Payment Ref' },
];

exports.exportOrdersCsv = async (req, res) => {
  try {
    const where = buildOrderSearchWhere(req.query);
    // Cap export size to prevent an admin from accidentally pulling 10M rows.
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 5000), 10000);

    const bookings = await prisma.booking.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        bookingVehicles: { select: { year: true, make: true, model: true, vin: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, reference: true, amount: true },
        },
      },
    });

    // Carrier info needs a second round (carrierId not in include since it's a User
    // relation via carrierId without a relation name on Booking — matches the pattern
    // used in admin-orders.controller).
    const carrierIds = [...new Set(bookings.map((b) => b.carrierId).filter(Boolean))];
    const carriersById = new Map();
    if (carrierIds.length) {
      const carriers = await prisma.user.findMany({
        where: { id: { in: carrierIds } },
        select: { id: true, firstName: true, lastName: true, email: true, companyName: true },
      });
      carriers.forEach((c) => carriersById.set(c.id, c));
    }

    // Build the CSV
    const lines = [];
    lines.push(csvLine(COLUMNS.map((c) => c.label)));

    for (const b of bookings) {
      const vehicle = b.bookingVehicles?.[0];
      const carrier = b.carrierId ? carriersById.get(b.carrierId) : null;
      const pickup = b.pickup || {};
      const dropoff = b.dropoff || {};
      const payment = b.payments?.[0] || null;

      const row = {
        orderNumber: b.orderNumber,
        ref: b.ref,
        status: STATUS_LABELS[normalizeStatus(b.status)] || b.status,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : '',
        customer: [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ') || '',
        customerEmail: b.user?.email || '',
        customerPhone: b.user?.phone || '',
        carrier: carrier ? (carrier.companyName || `${carrier.firstName || ''} ${carrier.lastName || ''}`.trim()) : '',
        carrierEmail: carrier?.email || '',
        origin: [b.fromCity || pickup.city, pickup.state, pickup.zip].filter(Boolean).join(', '),
        destination: [b.toCity || dropoff.city, dropoff.state, dropoff.zip].filter(Boolean).join(', '),
        miles: b.miles ?? '',
        vehicle: vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : (b.vehicle || ''),
        vin: vehicle?.vin || '',
        transportType: b.transportType || '',
        price: b.price ?? '',
        paymentStatus: payment?.status || 'unpaid',
        paymentRef: payment?.reference || '',
      };

      lines.push(csvLine(COLUMNS.map((c) => row[c.key])));
    }

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join(''));
  } catch (err) {
    console.error('[admin-export] orders CSV error:', err);
    res.status(500).json({ error: 'Failed to export orders' });
  }
};
