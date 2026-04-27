// ============================================================
// FILE: src/components/load-details/utils/extractors.js
// Data extraction utilities for parsing load/booking data
// ✅ FIXED: Better fallbacks for route/vehicle extraction (Issue 4)
// ✅ FIXED: Handles all data shapes from backend
// ✅ FIXED: Includes schedule date/time extraction (Issue 5)
// ============================================================

/**
 * ✅ FIXED: Safely parse JSON that might already be an object
 */
export const safeJson = (val) => {
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

/**
 * Format location type to display string
 */
export const formatLocationType = (type) => {
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
  
  // Capitalize first letter if no match
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Convert any time value (24h "HH:MM", "h:mm AM/PM", or a numeric hour
 * like "8" or "14") to a "h:mm AM/PM" label. Returns the original string
 * if it can't be parsed so we don't accidentally lose information.
 */
const toAmPmLabel = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';

  // Already in AM/PM form — normalize spacing and case.
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    const h = parseInt(ampm[1], 10);
    const m = ampm[2];
    return `${h}:${m} ${ampm[3].toUpperCase()}`;
  }

  // 24-hour HH:MM
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1], 10);
    const m = m24[2];
    if (Number.isNaN(h)) return s;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }

  // Bare hour like "8" or "14"
  const bareHour = s.match(/^(\d{1,2})$/);
  if (bareHour) {
    let h = parseInt(bareHour[1], 10);
    if (Number.isNaN(h)) return s;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h} ${period}`;
  }

  return s;
};

/**
 * Format time window for display.
 *
 * Output is always "h:mm AM – h:mm PM" (en-dash, with AM/PM on both sides)
 * when both endpoints are known. We accept a wide range of inputs because
 * the booking pipeline stores windows as either:
 *   - preset IDs ("8-10", "10-12", … "16-18", "flexible")
 *   - 24-hour HH:MM strings stored on the booking row
 *   - already-formatted "h:mm AM/PM" strings
 *
 * Used in: shipment details modal, carrier load detail, admin orders,
 * and confirmation emails (when rendered server-side this helper is
 * mirrored — keep formats in sync).
 */
export const formatTimeWindow = (start, end, preferred) => {
  if (preferred) {
    if (typeof preferred === 'string' && preferred.toLowerCase() === 'flexible') {
      return 'Flexible';
    }
    if (typeof preferred === 'string' && preferred.includes('-')) {
      const [a, b] = preferred.split('-');
      const left = toAmPmLabel(a);
      const right = toAmPmLabel(b);
      if (left && right) return `${left} – ${right}`;
    }
    return preferred;
  }

  const left = toAmPmLabel(start);
  const right = toAmPmLabel(end);

  if (left && right) return `${left} – ${right}`;
  if (left) return `After ${left}`;
  if (right) return `Before ${right}`;

  return null;
};

/**
 * Check if document is a gate pass
 */
export const isGatePassDocument = (doc) => {
  if (!doc) return false;
  const type = (doc.type || '').toLowerCase();
  const name = (doc.originalName || doc.fileName || '').toLowerCase();
  
  return type.includes('gate') || 
         type.includes('pass') || 
         name.includes('gate') || 
         name.includes('pass');
};

/**
 * ✅ FIXED: Normalize address object to consistent shape
 */
export const normalizeAddress = (addressData, fallbacks = {}) => {
  const emptyAddress = {
    address: '',
    address1: '',
    address2: '',
    street: '',
    city: fallbacks.city || '',
    state: fallbacks.state || '',
    zip: fallbacks.zip || '',
    fullAddress: '',
    locationType: null,
    locationTypeLabel: null,
    contactFirstName: '',
    contactLastName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    auctionName: null,
    auctionBuyerNumber: null,
  };

  if (!addressData) {
    const parts = [fallbacks.city, fallbacks.state].filter(Boolean);
    emptyAddress.fullAddress = parts.join(', ') || '—';
    return emptyAddress;
  }

  const addr = safeJson(addressData);
  
  const city = addr.city || fallbacks.city || '';
  const state = addr.state || fallbacks.state || '';
  const zip = addr.zip || addr.zipCode || addr.postalCode || fallbacks.zip || '';
  const street = addr.address || addr.address1 || addr.street || addr.streetAddress || '';
  const street2 = addr.address2 || addr.apt || addr.suite || '';
  
  // Build full address string
  const parts = [];
  if (street) parts.push(street);
  if (street2) parts.push(street2);
  
  const cityStateZip = [];
  if (city) cityStateZip.push(city);
  if (state) cityStateZip.push(state);
  if (zip) cityStateZip.push(zip);
  
  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }
  
  const fullAddress = parts.length > 0 
    ? parts.join(', ') 
    : [city, state].filter(Boolean).join(', ') || '—';

  return {
    address: street,
    address1: street,
    address2: street2,
    street: street,
    city: city,
    state: state,
    zip: zip,
    fullAddress: fullAddress,
    locationType: addr.locationType || addr.originType || addr.destinationType || null,
    locationTypeLabel: formatLocationType(addr.locationType || addr.originType || addr.destinationType),
    contactFirstName: addr.contactFirstName || addr.firstName || '',
    contactLastName: addr.contactLastName || addr.lastName || '',
    contactName: [addr.contactFirstName || addr.firstName, addr.contactLastName || addr.lastName].filter(Boolean).join(' '),
    contactPhone: addr.contactPhone || addr.phone || '',
    contactEmail: addr.contactEmail || addr.email || '',
    notes: addr.notes || addr.instructions || addr.specialInstructions || '',
    auctionName: addr.auctionName || null,
    auctionBuyerNumber: addr.auctionBuyerNumber || null,
  };
};

/**
 * ✅ FIXED: Extract pickup address with all fallbacks
 */
export const extractPickup = (data) => {
  if (!data) return normalizeAddress(null);
  
  const pickupData = data.pickup || data.pickupAddress || {};
  
  return normalizeAddress(pickupData, {
    city: data.fromCity || data.origin?.split(',')[0]?.trim() || '',
    state: data.fromState || data.origin?.split(',')[1]?.trim() || '',
    zip: data.fromZip || '',
  });
};

/**
 * ✅ FIXED: Extract dropoff address with all fallbacks
 */
export const extractDropoff = (data) => {
  if (!data) return normalizeAddress(null);
  
  const dropoffData = data.dropoff || data.dropoffAddress || {};
  
  return normalizeAddress(dropoffData, {
    city: data.toCity || data.destination?.split(',')[0]?.trim() || '',
    state: data.toState || data.destination?.split(',')[1]?.trim() || '',
    zip: data.toZip || '',
  });
};

/**
 * ✅ FIXED: Extract time windows with raw values for validation
 */
export const extractTimeWindows = (data) => {
  if (!data) return { 
    pickup: null, 
    dropoff: null,
    pickupWindowStart: null,
    pickupWindowEnd: null,
    dropoffWindowStart: null,
    dropoffWindowEnd: null,
  };
  
  const s = safeJson(data.scheduling);
  const q = safeJson(data.quote?.scheduling || data.quote);
  const pickup = safeJson(data.pickup);
  const dropoff = safeJson(data.dropoff);
  
  // Extract raw window values from multiple sources
  const pickupWindowStart = data.pickupWindowStart || 
                            s.pickupTimeStart || s.pickupWindowStart || 
                            pickup.windowStart || pickup.timeWindowStart ||
                            q?.pickupTimeStart || null;
  const pickupWindowEnd = data.pickupWindowEnd || 
                          s.pickupTimeEnd || s.pickupWindowEnd || 
                          pickup.windowEnd || pickup.timeWindowEnd ||
                          q?.pickupTimeEnd || null;
  const dropoffWindowStart = data.dropoffWindowStart || 
                             s.dropoffTimeStart || s.dropoffWindowStart || 
                             dropoff.windowStart || dropoff.timeWindowStart ||
                             q?.dropoffTimeStart || null;
  const dropoffWindowEnd = data.dropoffWindowEnd || 
                           s.dropoffTimeEnd || s.dropoffWindowEnd || 
                           dropoff.windowEnd || dropoff.timeWindowEnd ||
                           q?.dropoffTimeEnd || null;
  
  // Extract preferred windows
  const pickupPreferred = data.pickupPreferredWindow || s.pickupPreferredWindow || q?.pickupPreferredWindow || null;
  const dropoffPreferred = data.dropoffPreferredWindow || s.dropoffPreferredWindow || q?.dropoffPreferredWindow || null;
  
  return {
    pickup: formatTimeWindow(pickupWindowStart, pickupWindowEnd, pickupPreferred),
    dropoff: formatTimeWindow(dropoffWindowStart, dropoffWindowEnd, dropoffPreferred),
    pickupWindowStart,
    pickupWindowEnd,
    dropoffWindowStart,
    dropoffWindowEnd,
    pickupPreferredWindow: pickupPreferred,
    dropoffPreferredWindow: dropoffPreferred,
  };
};

/**
 * Extract notes from load data
 */
export const extractNotes = (data) => {
  if (!data) return { general: '', pickup: '', dropoff: '' };
  
  const s = safeJson(data.scheduling);
  const pickup = safeJson(data.pickup);
  const dropoff = safeJson(data.dropoff);
  
  return {
    general: data.notes || data.customerInstructions || data.instructions || 
             s.notes || data.quote?.notes || '',
    pickup: pickup.notes || data.pickupNotes || s.pickupNotes || '',
    dropoff: dropoff.notes || data.dropoffNotes || s.dropoffNotes || '',
  };
};

/**
 * ✅ FIXED: Extract dates with multiple fallbacks
 */
export const extractDates = (data) => {
  if (!data) return { pickup: null, dropoff: null };
  
  const s = safeJson(data.scheduling);
  const q = safeJson(data.quote);
  
  return {
    pickup: data.pickupDate || data.scheduledPickupDate || s.pickupDate || q?.pickupDate || null,
    dropoff: data.dropoffDate || data.scheduledDropoffDate || s.dropoffDate || q?.dropoffDate || null,
  };
};

/**
 * ✅ FIXED: Extract vehicle info with comprehensive fallbacks
 */
export const extractVehicle = (data) => {
  const empty = { year: '', make: '', model: '', type: '', condition: '', vin: '' };
  if (!data) return empty;
  
  // Check if backend already normalized it
  if (data.normalizedVehicle) {
    return {
      year: data.normalizedVehicle.year || '',
      make: data.normalizedVehicle.make || '',
      model: data.normalizedVehicle.model || '',
      type: data.normalizedVehicle.type || data.vehicleType || '',
      condition: data.normalizedVehicle.condition || '',
      vin: data.normalizedVehicle.vin || '',
    };
  }
  
  // Parse vehicleDetails JSON
  const vd = safeJson(data.vehicleDetails);
  const qvd = safeJson(data.quote?.vehicleDetails);
  
  // Check multiple sources for vehicle data
  const vdVehicle = vd.vehicles?.[0] || {};
  const topVehicle = data.vehicles?.[0] || {};
  const bookingVehicle = data.bookingVehicles?.[0] || {};
  
  // Handle nested vehicle structure
  const nestedVehicle = topVehicle.vehicle || vdVehicle.vehicle || {};
  
  // Try to extract from vehicle string (e.g., "2020 Toyota Camry")
  let fromString = { year: '', make: '', model: '' };
  const vehicleStr = data.vehicle || vd.vehicle || '';
  if (vehicleStr && typeof vehicleStr === 'string') {
    const parts = vehicleStr.split(' ').filter(Boolean);
    if (parts.length >= 1 && /^\d{4}$/.test(parts[0])) {
      fromString.year = parts[0];
      if (parts.length >= 2) fromString.make = parts[1];
      if (parts.length >= 3) fromString.model = parts.slice(2).join(' ');
    }
  }
  
  // Determine condition from operable field
  const getCondition = () => {
    const operable = data.vehicleCondition || vd.operable || qvd.operable || 
                     vdVehicle.operable || topVehicle.operable || nestedVehicle.operable ||
                     bookingVehicle.operable;
    if (!operable) return '';
    const val = String(operable).toLowerCase();
    if (['yes', 'true', 'operable', '1'].includes(val)) return 'Operable';
    if (['no', 'false', 'inoperable', '0'].includes(val)) return 'Inoperable';
    return operable;
  };

  return {
    year: vd.year || qvd.year || vdVehicle.year || topVehicle.year || 
          nestedVehicle.year || bookingVehicle.year || data.vehicleYear || 
          fromString.year || '',
    make: vd.make || qvd.make || vdVehicle.make || topVehicle.make || 
          nestedVehicle.make || bookingVehicle.make || data.vehicleMake || 
          fromString.make || '',
    model: vd.model || qvd.model || vdVehicle.model || topVehicle.model || 
           nestedVehicle.model || bookingVehicle.model || data.vehicleModel || 
           fromString.model || '',
    type: vd.type || qvd.type || vdVehicle.type || vdVehicle.vehicleType || 
          topVehicle.type || topVehicle.vehicleType || nestedVehicle.type || 
          bookingVehicle.vehicleType || data.vehicleType || '',
    condition: getCondition() || vd.condition || data.vehicleCondition || '',
    vin: vd.vin || qvd.vin || vdVehicle.vin || topVehicle.vin || 
         nestedVehicle.vin || bookingVehicle.vin || data.vin || '',
  };
};

/**
 * Extract customer info from load data
 */
export const extractCustomer = (data) => {
  if (!data) return { name: '', phone: '', email: '' };
  
  const p = safeJson(data.pickup);
  const u = data.user || {};
  
  const first = data.customerFirstName || u.firstName || p.firstName || 
                p.contactFirstName || '';
  const last = data.customerLastName || u.lastName || p.lastName || 
               p.contactLastName || '';
  const email = data.customerEmail || data.userEmail || u.email || 
                p.email || p.contact?.email || '';
  
  return {
    name: [first, last].filter(Boolean).join(' ') || '—',
    phone: data.customerPhone || u.phone || p.phone || p.contactPhone || '',
    email: email,
  };
};

/**
 * Extract carrier info from load data
 */
export const extractCarrier = (data) => {
  if (!data?.carrier) return null;
  
  const c = data.carrier;
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
  
  return {
    name: c.companyName || c.displayName || fullName || 'Assigned Carrier',
    phone: c.phone || '',
    email: c.email || '',
  };
};

/**
 * ✅ FIXED: Extract location types with multiple fallbacks
 */
export const extractLocationTypes = (data) => {
  if (!data) return { pickup: null, dropoff: null };
  
  const pickup = safeJson(data.pickup);
  const dropoff = safeJson(data.dropoff);
  
  // Try multiple sources for pickup type
  const pickupType = data.pickupOriginTypeLabel || 
                     formatLocationType(data.pickupOriginType) || 
                     pickup.locationTypeLabel ||
                     formatLocationType(pickup.locationType) ||
                     formatLocationType(pickup.originType) ||
                     null;
  
  // Try multiple sources for dropoff type
  const dropoffType = data.dropoffDestinationTypeLabel || 
                      formatLocationType(data.dropoffDestinationType) || 
                      dropoff.locationTypeLabel ||
                      formatLocationType(dropoff.locationType) ||
                      formatLocationType(dropoff.destinationType) ||
                      null;
  
  return {
    pickup: pickupType,
    dropoff: dropoffType,
  };
};

/**
 * ✅ FIXED: Extract gate passes from multiple sources
 */
export const extractGatePasses = (data) => {
  if (!data) return [];
  
  const gatePasses = [];
  
  // From gatePassDocuments array (backend normalized)
  if (data.gatePassDocuments && Array.isArray(data.gatePassDocuments)) {
    gatePasses.push(...data.gatePassDocuments);
  }
  
  // From pickupGatePass relation
  if (data.pickupGatePass && !gatePasses.some(g => g.id === data.pickupGatePass.id)) {
    gatePasses.push({ ...data.pickupGatePass, gatePassType: 'pickup' });
  }
  
  // From dropoffGatePass relation
  if (data.dropoffGatePass && !gatePasses.some(g => g.id === data.dropoffGatePass.id)) {
    gatePasses.push({ ...data.dropoffGatePass, gatePassType: 'dropoff' });
  }
  
  // From documents array
  if (data.documents && Array.isArray(data.documents)) {
    const docsGatePasses = data.documents.filter(isGatePassDocument);
    docsGatePasses.forEach(gp => {
      if (!gatePasses.some(g => g.id === gp.id)) {
        let gatePassType = 'unknown';
        if (gp.type?.toLowerCase().includes('pickup') || gp.stage === 'pickup') {
          gatePassType = 'pickup';
        } else if (gp.type?.toLowerCase().includes('dropoff') || gp.type?.toLowerCase().includes('drop') || gp.stage === 'dropoff') {
          gatePassType = 'dropoff';
        }
        gatePasses.push({ ...gp, gatePassType });
      }
    });
  }
  
  return gatePasses;
};

/**
 * Check if booking has multiple vehicles
 */
export const isMultiVehicleBooking = (data) => {
  if (!data) return false;
  
  if (data.isMultiVehicle === true) return true;
  if (data.bookingVehicles && data.bookingVehicles.length > 1) return true;
  if (data.vehicleCount && data.vehicleCount > 1) return true;
  if (data.vehiclesCount && data.vehiclesCount > 1) return true;
  
  const vd = safeJson(data.vehicleDetails);
  if (vd.isMultiVehicle) return true;
  if (vd.vehiclesCount && vd.vehiclesCount > 1) return true;
  if (vd.vehicles && vd.vehicles.length > 1) return true;
  
  return false;
};

/**
 * Get vehicle count
 */
export const getVehicleCount = (data) => {
  if (!data) return 1;
  
  if (data.vehiclesCount && data.vehiclesCount > 0) return data.vehiclesCount;
  if (data.vehicleCount && data.vehicleCount > 0) return data.vehicleCount;
  if (data.bookingVehicles?.length > 0) return data.bookingVehicles.length;
  
  const vd = safeJson(data.vehicleDetails);
  if (vd.vehiclesCount && vd.vehiclesCount > 0) return vd.vehiclesCount;
  if (vd.vehicles?.length > 0) return vd.vehicles.length;
  
  return 1;
};

/**
 * Extract multi-vehicle data from load
 */
export const extractMultiVehicleData = (data) => {
  if (!data) return { vehicles: [], stops: [], pickupStops: [], dropoffStops: [] };
  
  const vehicles = data.bookingVehicles || [];
  const stops = data.stops || [];
  const pickupStops = data.pickupStops || stops.filter(s => s.stage === 'pickup');
  const dropoffStops = data.dropoffStops || stops.filter(s => s.stage === 'dropoff');
  
  // If no booking vehicles, try to build from vehicleDetails
  if (vehicles.length === 0) {
    const vd = safeJson(data.vehicleDetails);
    if (vd.vehicles && Array.isArray(vd.vehicles)) {
      return {
        vehicles: vd.vehicles.map((v, i) => {
          const vehicleInfo = v.vehicle || v;
          return {
            ...vehicleInfo,
            vehicleIndex: v.vehicleIndex ?? i,
            pickupStop: v.pickup || null,
            dropoffStop: v.dropoff || null,
          };
        }),
        stops,
        pickupStops,
        dropoffStops,
      };
    }
  }
  
  return { vehicles, stops, pickupStops, dropoffStops };
};

/**
 * Extract scheduled pickup date
 */
export const extractScheduledPickupDate = (data) => {
  if (!data) return null;
  
  return data.scheduledPickupDate || 
         data.pickupDate || 
         data.scheduling?.pickupDate ||
         data.quote?.pickupDate ||
         null;
};

export default {
  safeJson,
  formatLocationType,
  formatTimeWindow,
  isGatePassDocument,
  normalizeAddress,
  extractPickup,
  extractDropoff,
  extractTimeWindows,
  extractNotes,
  extractDates,
  extractVehicle,
  extractCustomer,
  extractCarrier,
  extractLocationTypes,
  extractGatePasses,
  isMultiVehicleBooking,
  getVehicleCount,
  extractMultiVehicleData,
  extractScheduledPickupDate,
};