// ============================================================
// FILE: server/services/booking/index.cjs
// Booking service exports and shared helpers
// ✅ FIXED: Complete exports for all required functions
// ============================================================

const prisma = require('../../db.cjs');

// ============================================================
// SHIPMENT STATUS CONSTANTS (6-step flow)
// ============================================================
const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  ON_THE_WAY_TO_PICKUP: 'on_the_way_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'On the Way',
  [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'Arrived at Pickup',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
  [SHIPMENT_STATUS.CANCELLED]: 'Cancelled',
};

const STATUS_ORDER = [
  SHIPMENT_STATUS.SCHEDULED,       // 0
  SHIPMENT_STATUS.ASSIGNED,        // 1
  SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, // 2
  SHIPMENT_STATUS.ARRIVED_AT_PICKUP,    // 3
  SHIPMENT_STATUS.PICKED_UP,       // 4
  SHIPMENT_STATUS.DELIVERED,       // 5
];

// ============================================================
// STATUS HELPERS
// ============================================================

/**
 * Normalize status to standard format
 */
const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  
  const s = String(status).toLowerCase().trim().replace(/[_\s-]+/g, '_');
  
  // Handle various formats
  const statusMap = {
    'scheduled': SHIPMENT_STATUS.SCHEDULED,
    'pending': SHIPMENT_STATUS.SCHEDULED,
    'waiting': SHIPMENT_STATUS.SCHEDULED,
    'assigned': SHIPMENT_STATUS.ASSIGNED,
    'accepted': SHIPMENT_STATUS.ASSIGNED,
    'carrier_assigned': SHIPMENT_STATUS.ASSIGNED,
    'on_the_way': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'on_the_way_to_pickup': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'in_transit_to_pickup': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'enroute': SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    'arrived': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'arrived_at_pickup': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'at_pickup': SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
    'picked_up': SHIPMENT_STATUS.PICKED_UP,
    'in_transit': SHIPMENT_STATUS.PICKED_UP,
    'delivered': SHIPMENT_STATUS.DELIVERED,
    'completed': SHIPMENT_STATUS.DELIVERED,
    'cancelled': SHIPMENT_STATUS.CANCELLED,
    'canceled': SHIPMENT_STATUS.CANCELLED,
  };
  
  return statusMap[s] || SHIPMENT_STATUS.SCHEDULED;
};

/**
 * Get status step number (0-5)
 */
const getStatusStep = (status) => {
  const normalized = normalizeStatus(status);
  const index = STATUS_ORDER.indexOf(normalized);
  return index >= 0 ? index : 0;
};

/**
 * Validate status transition
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const current = normalizeStatus(currentStatus);
  const target = normalizeStatus(newStatus);
  
  // Define valid transitions
  const validTransitions = {
    [SHIPMENT_STATUS.SCHEDULED]: [SHIPMENT_STATUS.ASSIGNED, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ASSIGNED]: [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: [SHIPMENT_STATUS.ARRIVED_AT_PICKUP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: [SHIPMENT_STATUS.PICKED_UP, SHIPMENT_STATUS.CANCELLED],
    [SHIPMENT_STATUS.PICKED_UP]: [SHIPMENT_STATUS.DELIVERED],
    [SHIPMENT_STATUS.DELIVERED]: [],
    [SHIPMENT_STATUS.CANCELLED]: [],
  };
  
  const allowed = validTransitions[current] || [];
  
  if (allowed.includes(target)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Cannot transition from '${current}' to '${target}'. Allowed: ${allowed.join(', ') || 'none'}`,
  };
};

/**
 * Get allowed statuses for pickup action
 */
const getPickupAllowedStatuses = () => [
  SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
];

/**
 * Get allowed statuses for delivery action
 */
const getDeliveryAllowedStatuses = () => [
  SHIPMENT_STATUS.PICKED_UP,
];

// ============================================================
// JSON HELPERS
// ============================================================

/**
 * Safely parse JSON
 */
const safeParseJson = (val) => {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  return {};
};

// ============================================================
// VEHICLE HELPERS
// ============================================================

/**
 * Extract vehicle fields from vehicleDetails JSON
 */
const extractVehicleFields = (vehicleDetails) => {
  const vd = safeParseJson(vehicleDetails);
  const firstVehicle = vd.vehicles?.[0] || {};
  const nestedVehicle = firstVehicle.vehicle || {};
  
  // Try to parse from vehicle string
  let fromString = { year: '', make: '', model: '' };
  const vehicleStr = vd.vehicle || '';
  if (vehicleStr && typeof vehicleStr === 'string') {
    const parts = vehicleStr.split(' ').filter(Boolean);
    if (parts.length >= 1 && /^\d{4}$/.test(parts[0])) {
      fromString.year = parts[0];
      if (parts.length >= 2) fromString.make = parts[1];
      if (parts.length >= 3) fromString.model = parts.slice(2).join(' ');
    }
  }
  
  // Determine condition
  const operable = vd.operable || firstVehicle.operable || nestedVehicle.operable;
  let condition = '';
  if (operable) {
    const val = String(operable).toLowerCase();
    if (['yes', 'true', 'operable', '1'].includes(val)) condition = 'Operable';
    else if (['no', 'false', 'inoperable', '0'].includes(val)) condition = 'Inoperable';
  }
  
  return {
    vehicleYear: vd.year || firstVehicle.year || nestedVehicle.year || fromString.year || '',
    vehicleMake: vd.make || firstVehicle.make || nestedVehicle.make || fromString.make || '',
    vehicleModel: vd.model || firstVehicle.model || nestedVehicle.model || fromString.model || '',
    vehicleType: vd.type || firstVehicle.type || firstVehicle.vehicleType || nestedVehicle.type || '',
    vehicleCondition: condition || vd.condition || '',
    vin: vd.vin || firstVehicle.vin || nestedVehicle.vin || '',
  };
};

/**
 * Validate and clamp vehicles array (max 3)
 */
const validateAndClampVehicles = (vehicles) => {
  if (!vehicles || !Array.isArray(vehicles)) return null;
  return vehicles.slice(0, 3);
};

/**
 * Clamp vehicle count to 1-3
 */
const clampVehiclesCount = (count) => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num < 1) return 1;
  if (num > 3) return 3;
  return num;
};

// ============================================================
// LOCATION TYPE HELPERS
// ============================================================

/**
 * Format location type for display
 */
const formatLocationType = (type) => {
  if (!type) return null;
  const typeStr = String(type).toLowerCase().trim();
  
  const typeMap = {
    'auction': 'Auction',
    'dealership': 'Dealership',
    'dealer': 'Dealership',
    'private': 'Private',
    'residential': 'Private',
    'business': 'Business',
    'terminal': 'Terminal',
    'port': 'Port',
  };
  
  for (const [key, label] of Object.entries(typeMap)) {
    if (typeStr.includes(key)) return label;
  }
  
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ============================================================
// CARRIER HELPERS
// ============================================================

/**
 * Fetch carrier info for customer view (limited fields)
 */
const fetchCarrierForCustomer = async (carrierId) => {
  if (!carrierId) return null;
  
  const carrier = await prisma.user.findUnique({
    where: { id: carrierId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phone: true,
      email: true,
    },
  });
  
  if (!carrier) return null;
  
  const fullName = [carrier.firstName, carrier.lastName].filter(Boolean).join(' ');
  
  return {
    id: carrier.id,
    name: carrier.companyName || fullName || 'Assigned Carrier',
    phone: carrier.phone || '',
    email: carrier.email || '',
  };
};

/**
 * Build carrier info object for customer view
 */
const buildCarrierInfoForCustomer = (carrier) => {
  if (!carrier) return null;
  
  const fullName = [carrier.firstName, carrier.lastName].filter(Boolean).join(' ');
  
  return {
    id: carrier.id,
    name: carrier.companyName || fullName || 'Assigned Carrier',
    companyName: carrier.companyName || null,
    firstName: carrier.firstName || '',
    lastName: carrier.lastName || '',
    phone: carrier.phone || '',
    email: carrier.email || '',
  };
};

// ============================================================
// DOCUMENT HELPERS
// ============================================================

/**
 * Check if document type is gate pass
 */
const isGatePassType = (type) => {
  if (!type) return false;
  const t = String(type).toLowerCase();
  return t.includes('gate') || t.includes('pass');
};

/**
 * Fetch all documents for a booking (including quote documents)
 */
const fetchBookingDocuments = async (bookingId, quoteId) => {
  const conditions = [];
  if (bookingId) conditions.push({ bookingId });
  if (quoteId) conditions.push({ quoteId });
  
  if (conditions.length === 0) return [];
  
  return prisma.document.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Extract gate passes from documents and booking relations
 */
const getGatePasses = (documents, booking) => {
  const gatePassDocs = [];
  let pickupGatePass = null;
  let dropoffGatePass = null;
  
  // From booking relations
  if (booking?.pickupGatePass) {
    pickupGatePass = { ...booking.pickupGatePass, gatePassType: 'pickup' };
    gatePassDocs.push(pickupGatePass);
  }
  
  if (booking?.dropoffGatePass) {
    dropoffGatePass = { ...booking.dropoffGatePass, gatePassType: 'dropoff' };
    gatePassDocs.push(dropoffGatePass);
  }
  
  // From documents array
  if (documents && Array.isArray(documents)) {
    documents.forEach(doc => {
      if (isGatePassType(doc.type)) {
        if (!gatePassDocs.some(g => g.id === doc.id)) {
          let gatePassType = 'unknown';
          if (doc.type?.toLowerCase().includes('pickup') || doc.stage === 'pickup') {
            gatePassType = 'pickup';
            if (!pickupGatePass) pickupGatePass = { ...doc, gatePassType };
          } else if (doc.type?.toLowerCase().includes('dropoff') || doc.type?.toLowerCase().includes('drop') || doc.stage === 'dropoff') {
            gatePassType = 'dropoff';
            if (!dropoffGatePass) dropoffGatePass = { ...doc, gatePassType };
          }
          gatePassDocs.push({ ...doc, gatePassType });
        }
      }
    });
  }
  
  return { pickupGatePass, dropoffGatePass, gatePassDocs };
};

/**
 * Link photos to booking
 */
const linkPhotosToBooking = async (documentIds, bookingId, carrierId, type) => {
  if (!documentIds || documentIds.length === 0) return;
  
  await prisma.document.updateMany({
    where: {
      id: { in: documentIds },
      userId: carrierId,
    },
    data: {
      bookingId,
      type,
    },
  });
};

/**
 * Link documents from quote to new booking
 */
const linkQuoteDocumentsToBooking = async (quoteId, bookingId) => {
  if (!quoteId || !bookingId) return;
  
  try {
    // Find all documents linked to the quote
    const quoteDocs = await prisma.document.findMany({
      where: { quoteId },
    });
    
    if (quoteDocs.length === 0) return;
    
    // Update documents to also link to booking
    await prisma.document.updateMany({
      where: { quoteId },
      data: { bookingId },
    });
    
    console.log(`📎 Linked ${quoteDocs.length} documents from quote ${quoteId} to booking ${bookingId}`);
  } catch (error) {
    console.warn('⚠️ Failed to link quote documents to booking:', error.message);
  }
};

// ============================================================
// MULTI-VEHICLE HELPERS
// ============================================================

/**
 * Enrich booking with multi-vehicle data
 */
const enrichBookingWithVehicles = async (booking) => {
  if (!booking) return { vehicles: [], bookingVehicles: [], stops: [], vehiclesCount: 1, isMultiVehicle: false };
  
  // Check if already has booking vehicles
  let bookingVehicles = booking.bookingVehicles || [];
  let stops = booking.stops || [];
  
  // If not pre-loaded, fetch them
  if (bookingVehicles.length === 0 && booking.id) {
    try {
      bookingVehicles = await prisma.bookingVehicle.findMany({
        where: { bookingId: booking.id },
        include: {
          pickupStop: true,
          dropoffStop: true,
          pickupGatePass: true,
          dropoffGatePass: true,
        },
        orderBy: { vehicleIndex: 'asc' },
      });
    } catch (e) {
      bookingVehicles = [];
    }
  }
  
  if (stops.length === 0 && booking.id) {
    try {
      stops = await prisma.stop.findMany({
        where: { bookingId: booking.id },
        orderBy: { stopIndex: 'asc' },
      });
    } catch (e) {
      stops = [];
    }
  }
  
  // Determine vehicle count
  const vd = safeParseJson(booking.vehicleDetails);
  const vehiclesCount = booking.vehiclesCount || vd.vehiclesCount || bookingVehicles.length || 1;
  const isMultiVehicle = vehiclesCount > 1 || bookingVehicles.length > 1;
  
  // Build vehicles array from booking vehicles or vehicleDetails
  let vehicles = [];
  if (bookingVehicles.length > 0) {
    vehicles = bookingVehicles.map((bv, i) => ({
      id: bv.id,
      vehicleIndex: bv.vehicleIndex ?? i,
      year: bv.year || '',
      make: bv.make || '',
      model: bv.model || '',
      type: bv.vehicleType || '',
      vin: bv.vin || '',
      operable: bv.operable || 'yes',
      pickupStop: bv.pickupStop,
      dropoffStop: bv.dropoffStop,
      pickupGatePass: bv.pickupGatePass,
      dropoffGatePass: bv.dropoffGatePass,
    }));
  } else if (vd.vehicles && Array.isArray(vd.vehicles)) {
    vehicles = vd.vehicles.map((v, i) => {
      const vi = v.vehicle || v;
      return {
        vehicleIndex: v.vehicleIndex ?? i,
        year: vi.year || '',
        make: vi.make || '',
        model: vi.model || '',
        type: vi.type || vi.vehicleType || '',
        vin: vi.vin || '',
        operable: vi.operable || 'yes',
        pickupStop: v.pickup || null,
        dropoffStop: v.dropoff || null,
      };
    });
  }
  
  return {
    vehicles,
    bookingVehicles,
    stops,
    pickupStops: stops.filter(s => s.stage === 'pickup'),
    dropoffStops: stops.filter(s => s.stage === 'dropoff'),
    vehiclesCount,
    isMultiVehicle,
  };
};

// ============================================================
// PAYOUT HELPERS
// ============================================================

/**
 * Calculate total payout including detention fee
 */
const calculateTotalPayout = (booking) => {
  const basePrice = booking.price || 0;
  const detentionFee = booking.detentionApprovedAt ? (booking.detentionAmount || 50) : 0;
  return basePrice + detentionFee;
};

// ============================================================
// REFERENCE/ID GENERATION HELPERS
// ============================================================

/**
 * Generate unique booking reference (e.g., "BK-ABC123")
 */
const generateRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BK-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate sequential order number
 */
const generateOrderNumber = async () => {
  // Get highest existing order number
  const lastBooking = await prisma.booking.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  
  const lastNumber = lastBooking?.orderNumber || 100000;
  return lastNumber + 1;
};

/**
 * Generate payment reference
 */
const generatePaymentReference = (orderNumber, paymentId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `PAY-${orderNumber}-${timestamp}`;
};

// ============================================================
// EXTRACTION HELPERS
// ============================================================

/**
 * Extract VIN from various data sources
 */
const extractVin = (data) => {
  if (data.vin) return data.vin;
  if (data.vehicleDetails?.vin) return data.vehicleDetails.vin;
  if (data.vehicles?.[0]?.vin) return data.vehicles[0].vin;
  if (data.vehicles?.[0]?.vehicle?.vin) return data.vehicles[0].vehicle.vin;
  return null;
};

/**
 * Extract time windows from scheduling object
 */
const extractTimeWindowsFromScheduling = (scheduling) => {
  if (!scheduling) return {};
  
  return {
    pickupWindowStart: scheduling.pickupWindowStart || scheduling.pickupTimeStart || null,
    pickupWindowEnd: scheduling.pickupWindowEnd || scheduling.pickupTimeEnd || null,
    dropoffWindowStart: scheduling.dropoffWindowStart || scheduling.dropoffTimeStart || null,
    dropoffWindowEnd: scheduling.dropoffWindowEnd || scheduling.dropoffTimeEnd || null,
  };
};

/**
 * Extract notes from various data sources
 */
const extractNotesFromData = (data) => {
  return data.notes || 
         data.customerInstructions || 
         data.instructions || 
         data.specialInstructions ||
         data.vehicles?.[0]?.pickup?.notes ||
         '';
};

/**
 * Extract gate pass ID from document or ID
 */
const extractGatePassId = (gatePass) => {
  if (!gatePass) return null;
  if (typeof gatePass === 'string') return gatePass;
  if (gatePass.id) return gatePass.id;
  return null;
};

/**
 * Extract quote ID from various data sources
 */
const extractQuoteId = (data) => {
  return data.quoteId || 
         data.quote?.id || 
         data.quoteRelationId ||
         null;
};

// ============================================================
// PAYMENT/CARD HELPERS
// ============================================================

/**
 * Detect card brand from card number
 */
const detectCardBrand = (cardNumber) => {
  if (!cardNumber) return null;
  const num = String(cardNumber).replace(/\D/g, '');
  
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6(?:011|5)/.test(num)) return 'discover';
  
  return 'unknown';
};

/**
 * Get last 4 digits of card number
 */
const getCardLast4 = (cardNumber) => {
  if (!cardNumber) return null;
  const num = String(cardNumber).replace(/\D/g, '');
  return num.slice(-4) || null;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Status constants
  SHIPMENT_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  
  // Status helpers
  normalizeStatus,
  getStatusStep,
  validateStatusTransition,
  getPickupAllowedStatuses,
  getDeliveryAllowedStatuses,
  
  // JSON helpers
  safeParseJson,
  
  // Vehicle helpers
  extractVehicleFields,
  validateAndClampVehicles,
  clampVehiclesCount,
  
  // Location helpers
  formatLocationType,
  
  // Carrier helpers
  fetchCarrierForCustomer,
  buildCarrierInfoForCustomer,
  
  // Document helpers
  isGatePassType,
  fetchBookingDocuments,
  getGatePasses,
  linkPhotosToBooking,
  linkQuoteDocumentsToBooking,
  
  // Multi-vehicle helpers
  enrichBookingWithVehicles,
  
  // Payout helpers
  calculateTotalPayout,
  
  // Reference/ID generation
  generateRef,
  generateOrderNumber,
  generatePaymentReference,
  
  // Extraction helpers
  extractVin,
  extractTimeWindowsFromScheduling,
  extractNotesFromData,
  extractGatePassId,
  extractQuoteId,
  
  // Payment/Card helpers
  detectCardBrand,
  getCardLast4,
};
// ============================================================
// FILE: server/services/booking/index.cjs
// Consolidated exports for booking services
// ============================================================

// Constants
const constants = require('./booking.constants.cjs');

// Status service
const statusService = require('./booking.status.service.cjs');

// Vehicle service
const vehicleService = require('./booking.vehicle.service.cjs');

// Fees service
const feesService = require('./booking.fees.service.cjs');

// Documents service
const documentsService = require('./booking.documents.service.cjs');

// Helpers
const helpers = require('./booking.helpers.cjs');

// ✅ NEW: Authorization service
const authorizationService = require('./booking.authorization.service.cjs');

module.exports = {
  // Constants
  ...constants,
  
  // Status
  ...statusService,
  
  // Vehicles
  ...vehicleService,
  
  // Fees
  ...feesService,
  
  // Documents
  ...documentsService,
  
  // Helpers
  ...helpers,
  
  // ✅ NEW: Authorization
  ...authorizationService,
};
