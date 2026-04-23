// ============================================================
// FILE: server/services/booking/booking.helpers.cjs
// Shared helper functions for booking operations
// ============================================================

const prisma = require('../../db.cjs');

/**
 * Safely parse JSON string, returns empty object on failure
 * @param {string|Object} value - JSON string or object
 * @returns {Object} Parsed object or empty object
 */
const safeParseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

/**
 * Parse a human time string ("8:00 AM", "09:30", "9:30 pm") to {hours, minutes}.
 * Returns null if the input is unparseable.
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridian = m[3] ? m[3].toLowerCase() : null;
  if (meridian === 'pm' && hours !== 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

/**
 * Combine a calendar date with a time-of-day string. Returns a Date or null.
 * Uses the server's local interpretation of the date — sufficient for MVP.
 */
const combineDateAndTime = (date, timeStr) => {
  if (!date || !timeStr) return null;
  const parsed = parseTimeString(timeStr);
  if (!parsed) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
};

/**
 * The effective start of the waiting-fee timer.
 *
 * New rule (2026): the timer starts at the LATER of
 *   1. the carrier's verified arrival time (arrivedAtPickupAt), and
 *   2. the pickup window start selected by the customer.
 *
 * So a carrier who arrives at 7 AM for an 8–10 AM window does not start
 * accruing waiting time until 8 AM. A carrier who arrives inside the window
 * (say 8:30) starts accruing at 8:30.
 *
 * Returns null if the carrier hasn't arrived yet.
 */
const computeEffectiveWaitStart = (booking) => {
  if (!booking || !booking.arrivedAtPickupAt) return null;
  const arrived = new Date(booking.arrivedAtPickupAt);
  if (isNaN(arrived.getTime())) return null;

  const windowStart = combineDateAndTime(booking.pickupDate, booking.pickupWindowStart);
  if (!windowStart || isNaN(windowStart.getTime())) return arrived;

  return arrived.getTime() >= windowStart.getTime() ? arrived : windowStart;
};

/**
 * Minutes elapsed since the effective waiting-fee start. Accepts either a
 * full booking (preferred — applies the window rule) or a raw start time
 * (legacy callers).
 */
const calculateWaitingMinutes = (input) => {
  let startMs = null;
  if (input && typeof input === 'object' && 'arrivedAtPickupAt' in input) {
    const start = computeEffectiveWaitStart(input);
    startMs = start ? start.getTime() : null;
  } else if (input) {
    const t = new Date(input).getTime();
    if (!isNaN(t)) startMs = t;
  }
  if (startMs == null) return 0;
  const diffMs = Date.now() - startMs;
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
};

/**
 * Format a booking reference
 * @param {string} prefix - Prefix (e.g., 'BK')
 * @param {number} orderNumber - Order number
 * @returns {string} Formatted reference
 */
const formatBookingRef = (prefix, orderNumber) => {
  return `${prefix}-${String(orderNumber).padStart(6, '0')}`;
};

/**
 * Calculate distance-based price per mile
 * @param {number} price - Total price
 * @param {number} miles - Total miles
 * @returns {number} Price per mile
 */
const calculatePricePerMile = (price, miles) => {
  if (!price || !miles || miles === 0) return 0;
  return price / miles;
};

/**
 * Link photo documents to a booking
 * @param {string[]} documentIds - Array of document IDs
 * @param {string} bookingId - Booking ID
 * @param {string} carrierId - Carrier ID
 * @param {string} photoType - Type of photo ('pickup_photo' or 'delivery_photo')
 */
const linkPhotosToBooking = async (documentIds, bookingId, carrierId, photoType) => {
  if (!documentIds || documentIds.length === 0) return;
  
  await prisma.document.updateMany({
    where: {
      id: { in: documentIds },
      userId: carrierId,
    },
    data: {
      bookingId,
      type: photoType,
    },
  });
};

/**
 * Generate a unique reference string
 * @param {string} prefix - Prefix for the reference
 * @returns {string} Unique reference
 */
const generateReference = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

/**
 * Generate a booking reference (REF-XXXXXX format)
 * @returns {string} Unique booking reference
 */
const generateRef = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${timestamp}${random}`;
};

/**
 * Generate a sequential order number
 * @returns {Promise<number>} Next order number
 */
const generateOrderNumber = async () => {
  try {
    const lastBooking = await prisma.booking.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    return (lastBooking?.orderNumber || 100000) + 1;
  } catch (error) {
    // Fallback to timestamp-based number
    return Math.floor(Date.now() / 1000) % 1000000 + 100000;
  }
};

/**
 * Extract VIN from various data structures
 * @param {Object} data - Booking data
 * @returns {string|null} VIN or null
 */
const extractVin = (data) => {
  if (!data) return null;
  
  // Direct VIN field
  if (data.vin) return data.vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // From vehicleDetails
  if (data.vehicleDetails?.vin) {
    return data.vehicleDetails.vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  
  // From vehicles array
  if (data.vehicles?.[0]?.vin) {
    return data.vehicles[0].vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  
  // From quote
  if (data.quote?.vehicleDetails?.vin) {
    return data.quote.vehicleDetails.vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  
  return null;
};

/**
 * Extract time windows from scheduling data
 * @param {Object} scheduling - Scheduling object
 * @returns {Object} Time window fields
 */
const extractTimeWindowsFromScheduling = (scheduling) => {
  if (!scheduling) {
    return {
      pickupWindowStart: null,
      pickupWindowEnd: null,
      dropoffWindowStart: null,
      dropoffWindowEnd: null,
    };
  }
  
  return {
    pickupWindowStart: scheduling.pickupWindowStart || scheduling.pickupTimeStart || null,
    pickupWindowEnd: scheduling.pickupWindowEnd || scheduling.pickupTimeEnd || null,
    dropoffWindowStart: scheduling.dropoffWindowStart || scheduling.dropoffTimeStart || null,
    dropoffWindowEnd: scheduling.dropoffWindowEnd || scheduling.dropoffTimeEnd || null,
  };
};

/**
 * Extract notes from various data structures
 * @param {Object} data - Booking data
 * @returns {string} Notes string
 */
const extractNotesFromData = (data) => {
  if (!data) return '';
  
  // Direct notes field
  if (data.notes) return data.notes;
  
  // From customerInstructions
  if (data.customerInstructions) return data.customerInstructions;
  
  // From instructions
  if (data.instructions) return data.instructions;
  
  // From pickup/dropoff
  const pickupNotes = data.pickup?.notes || data.pickup?.specialInstructions || '';
  const dropoffNotes = data.dropoff?.notes || data.dropoff?.specialInstructions || '';
  
  return [pickupNotes, dropoffNotes].filter(Boolean).join(' | ') || '';
};

/**
 * Extract gate pass ID from various formats
 * @param {string|Object} gatePass - Gate pass data
 * @returns {string|null} Gate pass ID
 */
const extractGatePassId = (gatePass) => {
  if (!gatePass) return null;
  
  // If it's already an ID string
  if (typeof gatePass === 'string') {
    return gatePass.length > 10 ? gatePass : null;
  }
  
  // If it's an object with id
  if (gatePass.id) return gatePass.id;
  
  // If it's an object with documentId
  if (gatePass.documentId) return gatePass.documentId;
  
  return null;
};

/**
 * Extract quote ID from various data structures
 * @param {Object} data - Booking data
 * @returns {string|null} Quote ID
 */
const extractQuoteId = (data) => {
  if (!data) return null;
  
  // Direct quoteId
  if (data.quoteId) return data.quoteId;
  
  // From quote object
  if (data.quote?.id) return data.quote.id;
  
  // From quoteRelation
  if (data.quoteRelation?.id) return data.quoteRelation.id;
  
  return null;
};

/**
 * Detect card brand from card number
 * @param {string} cardNumber - Card number
 * @returns {string} Card brand
 */
const detectCardBrand = (cardNumber) => {
  if (!cardNumber) return 'unknown';
  
  const num = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6(?:011|5)/.test(num)) return 'discover';
  if (/^35(?:2[89]|[3-8])/.test(num)) return 'jcb';
  if (/^3(?:0[0-5]|[68])/.test(num)) return 'diners';
  
  return 'unknown';
};

/**
 * Get last 4 digits of card number
 * @param {string} cardNumber - Card number
 * @returns {string|null} Last 4 digits
 */
const getCardLast4 = (cardNumber) => {
  if (!cardNumber) return null;
  
  const num = cardNumber.replace(/\D/g, '');
  if (num.length < 4) return null;
  
  return num.slice(-4);
};

/**
 * Generate payment reference
 * @param {number} orderNumber - Order number
 * @param {string} paymentId - Payment ID
 * @returns {string} Payment reference
 */
const generatePaymentReference = (orderNumber, paymentId) => {
  const shortId = paymentId ? paymentId.slice(-6).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${orderNumber}-${shortId}`;
};

/**
 * Format location type for display
 * @param {string} locationType - Location type
 * @returns {string} Formatted location type
 */
const formatLocationType = (locationType) => {
  if (!locationType) return 'Private';
  
  const typeMap = {
    'private': 'Private Residence',
    'business': 'Business',
    'dealership': 'Dealership',
    'auction': 'Auction',
    'port': 'Port',
    'terminal': 'Terminal',
    'storage': 'Storage Facility',
  };
  
  return typeMap[locationType.toLowerCase()] || locationType;
};

/**
 * Fetch carrier info for customer view (privacy-safe)
 * @param {string} carrierId - Carrier ID
 * @returns {Promise<Object|null>} Carrier info or null
 */
const fetchCarrierForCustomer = async (carrierId) => {
  if (!carrierId) return null;
  
  try {
    const carrier = await prisma.user.findUnique({
      where: { id: carrierId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
      },
    });
    
    return carrier ? buildCarrierInfoForCustomer(carrier) : null;
  } catch (error) {
    console.error('⚠️ Failed to fetch carrier:', error.message);
    return null;
  }
};

/**
 * Build privacy-safe carrier info for customer
 * @param {Object} carrier - Carrier user object
 * @returns {Object} Privacy-safe carrier info
 */
const buildCarrierInfoForCustomer = (carrier) => {
  if (!carrier) return null;
  
  return {
    id: carrier.id,
    companyName: carrier.companyName || null,
    displayName: carrier.companyName || 
      [carrier.firstName, carrier.lastName].filter(Boolean).join(' ') || 
      'Assigned Carrier',
    // Only include contact info if company, otherwise mask
    phone: carrier.companyName ? carrier.phone : null,
    email: carrier.companyName ? carrier.email : null,
  };
};

/**
 * Extract vehicle fields from vehicleDetails JSON
 * @param {Object|string} vehicleDetails - Vehicle details object or JSON string
 * @returns {Object} Extracted vehicle fields
 */
const extractVehicleFields = (vehicleDetails) => {
  if (!vehicleDetails) return {};
  
  let details = vehicleDetails;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      return {};
    }
  }
  
  // Handle array format (multi-vehicle)
  if (Array.isArray(details)) {
    details = details[0] || {};
  }
  
  // Handle nested vehicles array
  if (details.vehicles && Array.isArray(details.vehicles)) {
    const firstVehicle = details.vehicles[0]?.vehicle || details.vehicles[0] || {};
    return {
      vehicleYear: firstVehicle.year || details.year || null,
      vehicleMake: firstVehicle.make || details.make || null,
      vehicleModel: firstVehicle.model || details.model || null,
      vehicleVin: firstVehicle.vin || details.vin || null,
      vehicleOperable: firstVehicle.operable ?? details.operable ?? 'yes',
    };
  }
  
  return {
    vehicleYear: details.year || details.vehicleYear || null,
    vehicleMake: details.make || details.vehicleMake || null,
    vehicleModel: details.model || details.vehicleModel || null,
    vehicleVin: details.vin || details.vehicleVin || null,
    vehicleOperable: details.operable ?? details.vehicleOperable ?? 'yes',
  };
};

/**
 * Get display name for a carrier
 * @param {Object} carrier - Carrier user object
 * @returns {string} Display name
 */
const getCarrierDisplayName = (carrier) => {
  if (!carrier) return 'Carrier';
  
  if (carrier.companyName) {
    return carrier.companyName;
  }
  
  const firstName = carrier.firstName || '';
  const lastName = carrier.lastName || '';
  
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  
  return 'Carrier';
};

/**
 * Get standard Prisma include for booking queries
 * @returns {Object} Prisma include object
 */
const getStandardBookingInclude = () => ({
  quoteRelation: {
    select: {
      id: true,
      likelihood: true,
      marketAvg: true,
      recommendedMin: true,
      recommendedMax: true,
    },
  },
  pickupAddress: true,
  dropoffAddress: true,
  pickupGatePass: true,
  dropoffGatePass: true,
});

/**
 * Get extended Prisma include for booking queries (with documents)
 * @returns {Object} Prisma include object
 */
const getExtendedBookingInclude = () => ({
  ...getStandardBookingInclude(),
  documents: true,
  bookingVehicles: {
    include: {
      pickupGatePass: true,
      dropoffGatePass: true,
    },
  },
  stops: true,
});

module.exports = {
  safeParseJson,
  calculateWaitingMinutes,
  computeEffectiveWaitStart,
  parseTimeString,
  combineDateAndTime,
  formatBookingRef,
  calculatePricePerMile,
  linkPhotosToBooking,
  generateReference,
  extractVehicleFields,
  getCarrierDisplayName,
  getStandardBookingInclude,
  getExtendedBookingInclude,
  // NEW EXPORTS - these were missing and causing the 500 error
  generateRef,
  generateOrderNumber,
  extractVin,
  extractTimeWindowsFromScheduling,
  extractNotesFromData,
  extractGatePassId,
  extractQuoteId,
  detectCardBrand,
  getCardLast4,
  generatePaymentReference,
  formatLocationType,
  fetchCarrierForCustomer,
  buildCarrierInfoForCustomer,
};
