// ============================================================
// FILE: server/controllers/booking/booking.core.controller.cjs
// Core booking operations: create, read, update
// ✅ FIXED: Properly extracts nested vehicle/location data from frontend
// ✅ FIXED: Date parsing preserves local date (no timezone shift)
// ============================================================

const prisma = require('../../db.cjs');
const { validateDeliveryDateTime } = require('../../services/booking/delivery-window.service.cjs');
const {
  SHIPMENT_STATUS,
  STATUS_LABELS,
  generateRef,
  generateOrderNumber,
  safeParseJson,
  extractVehicleFields,
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
  normalizeStatus,
  getStatusStep,
  validateAndClampVehicles,
  clampVehiclesCount,
  enrichBookingWithVehicles,
  linkQuoteDocumentsToBooking,
  isGatePassType,
} = require('../../services/booking/index.cjs');

// ============================================================
// ✅ FIXED: Parse date string as LOCAL date (not UTC)
// Handles "2026-01-19" without timezone shift
// ============================================================
const parseLocalDateString = (dateStr) => {
  if (!dateStr) return null;
  
  // If already a Date object
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  
  // Handle YYYY-MM-DD format (from HTML date inputs)
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    // Create date at NOON local time to avoid day boundary issues
    // This ensures the date stays correct regardless of timezone
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  
  // Handle ISO strings with time (e.g., "2026-01-19T12:00:00.000Z")
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  // Try standard parsing as fallback
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// ============================================================
// ✅ HELPER: Deep merge objects, preferring non-empty values
// ============================================================
const deepMergeNonEmpty = (...objects) => {
  const result = {};
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    for (const [key, value] of Object.entries(obj)) {
      // Skip empty strings, null, undefined
      if (value === '' || value === null || value === undefined) continue;
      // If both are objects, merge recursively
      if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
        result[key] = deepMergeNonEmpty(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

// ============================================================
// ✅ HELPER: Extract pickup data from multiple possible sources
// Priority: explicit pickup > vehicles[0].pickup > pickupConfig.stops[0]
// ============================================================
const extractPickupData = (data, validatedVehicles) => {
  const sources = [];
  
  // Source 1: Explicit pickup object (only if it has actual data)
  if (data.pickup && Object.keys(data.pickup).some(k => data.pickup[k])) {
    sources.push(data.pickup);
  }
  
  // Source 2: First vehicle's pickup (frontend nested structure)
  if (validatedVehicles?.[0]?.pickup) {
    sources.push(validatedVehicles[0].pickup);
  }
  
  // Source 3: Raw vehicles array (in case validateAndClampVehicles didn't process it)
  if (data.vehicles?.[0]?.pickup) {
    sources.push(data.vehicles[0].pickup);
  }
  
  // Source 4: pickupConfig stops
  if (data.pickupConfig?.stops?.[0]) {
    sources.push(data.pickupConfig.stops[0]);
  }
  
  // Source 5: Quote pickup data
  if (data.quote?.pickup) {
    sources.push(data.quote.pickup);
  }
  
  // Merge all sources, preferring non-empty values
  const merged = deepMergeNonEmpty(...sources);
  
  // Ensure required fields exist
  return {
    address: merged.address || merged.address1 || merged.street || '',
    address1: merged.address1 || merged.address || merged.street || '',
    city: merged.city || '',
    state: merged.state || '',
    zip: merged.zip || merged.zipCode || data.fromZip || data.quote?.fromZip || '',
    phone: merged.phone || merged.contactPhone || '',
    firstName: merged.firstName || merged.contactFirstName || '',
    lastName: merged.lastName || merged.contactLastName || '',
    locationType: merged.locationType || merged.originType || data.pickupOriginType || 'private',
    notes: merged.notes || '',
    ...merged,
  };
};

// ============================================================
// ✅ HELPER: Extract dropoff data from multiple possible sources
// ============================================================
const extractDropoffData = (data, validatedVehicles) => {
  const sources = [];
  
  // Source 1: Explicit dropoff object
  if (data.dropoff && Object.keys(data.dropoff).some(k => data.dropoff[k])) {
    sources.push(data.dropoff);
  }
  
  // Source 2: First vehicle's dropoff
  if (validatedVehicles?.[0]?.dropoff) {
    sources.push(validatedVehicles[0].dropoff);
  }
  
  // Source 3: Raw vehicles array
  if (data.vehicles?.[0]?.dropoff) {
    sources.push(data.vehicles[0].dropoff);
  }
  
  // Source 4: dropoffConfig stops
  if (data.dropoffConfig?.stops?.[0]) {
    sources.push(data.dropoffConfig.stops[0]);
  }
  
  // Source 5: Quote dropoff data
  if (data.quote?.dropoff) {
    sources.push(data.quote.dropoff);
  }
  
  const merged = deepMergeNonEmpty(...sources);
  
  return {
    address: merged.address || merged.address1 || merged.street || '',
    address1: merged.address1 || merged.address || merged.street || '',
    city: merged.city || '',
    state: merged.state || '',
    zip: merged.zip || merged.zipCode || data.toZip || data.quote?.toZip || '',
    phone: merged.phone || merged.contactPhone || '',
    firstName: merged.firstName || merged.contactFirstName || '',
    lastName: merged.lastName || merged.contactLastName || '',
    locationType: merged.locationType || merged.destinationType || data.dropoffDestinationType || 'private',
    notes: merged.notes || '',
    ...merged,
  };
};

// ============================================================
// ✅ HELPER: Extract vehicle details from nested structure
// Frontend sends: vehicles[0].vehicle.year
// This handles both flat and nested structures
// ============================================================
const extractVehicleDetailsFromData = (data, validatedVehicles, existingQuote) => {
  const sources = [];
  
  // Source 1: Explicit vehicleDetails
  if (data.vehicleDetails && typeof data.vehicleDetails === 'object') {
    sources.push(data.vehicleDetails);
  }
  
  // Source 2: First validated vehicle (might be flat or nested)
  if (validatedVehicles?.[0]) {
    const v = validatedVehicles[0];
    // Check if it's nested structure (vehicle.year) or flat (year)
    if (v.vehicle && typeof v.vehicle === 'object') {
      sources.push(v.vehicle); // Nested: vehicles[0].vehicle
    } else {
      sources.push(v); // Flat: vehicles[0]
    }
  }
  
  // Source 3: Raw vehicles array
  if (data.vehicles?.[0]) {
    const v = data.vehicles[0];
    if (v.vehicle && typeof v.vehicle === 'object') {
      sources.push(v.vehicle);
    } else if (v.year || v.make || v.model) {
      sources.push(v);
    }
  }
  
  // Source 4: Quote vehicleDetails
  if (data.quote?.vehicleDetails) {
    const qvd = typeof data.quote.vehicleDetails === 'string' 
      ? safeParseJson(data.quote.vehicleDetails) 
      : data.quote.vehicleDetails;
    if (qvd) sources.push(qvd);
  }
  
  // Source 5: Existing quote from DB
  if (existingQuote) {
    sources.push({
      vehicle: existingQuote.vehicle,
      transportType: existingQuote.transportType,
    });
  }
  
  const merged = deepMergeNonEmpty(...sources);
  
  return {
    year: merged.year || '',
    make: merged.make || '',
    model: merged.model || '',
    vin: merged.vin || null,
    type: merged.type || merged.vehicleType || merged.bodyType || 'sedan',
    operable: merged.operable || 'yes',
    condition: merged.condition || (merged.operable === 'no' ? 'inoperable' : 'operable'),
  };
};

// ============================================================
// ✅ HELPER: Build vehicles array from frontend data
// ============================================================
const buildVehiclesArray = (data, vehicleCount) => {
  const vehicles = [];
  const rawVehicles = data.vehicles || [];
  
  for (let i = 0; i < vehicleCount; i++) {
    const raw = rawVehicles[i] || {};
    
    // Extract vehicle info (handle nested vs flat)
    let vehicleInfo = {};
    if (raw.vehicle && typeof raw.vehicle === 'object') {
      vehicleInfo = raw.vehicle;
    } else if (raw.year || raw.make || raw.model) {
      vehicleInfo = raw;
    }
    
    vehicles.push({
      year: vehicleInfo.year || '',
      make: vehicleInfo.make || '',
      model: vehicleInfo.model || '',
      vin: vehicleInfo.vin || null,
      vehicleType: vehicleInfo.type || vehicleInfo.vehicleType || 'sedan',
      operable: vehicleInfo.operable || 'yes',
      // Include pickup/dropoff if they exist
      pickup: raw.pickup || null,
      dropoff: raw.dropoff || null,
    });
  }
  
  return vehicles;
};

// ============================================================
// ✅ HELPER: Extract date from multiple possible sources
// Uses parseLocalDateString to avoid timezone issues
// ============================================================
const extractPickupDate = (data) => {
  // Priority order for pickup date sources
  const sources = [
    data.pickupDate,
    data.scheduling?.pickupDate,
    data.vehicles?.[0]?.pickup?.timeWindow?.date,
    data.quote?.pickupDate,
  ];
  
  for (const source of sources) {
    if (source) {
      const parsed = parseLocalDateString(source);
      if (parsed) {
        console.log(`📅 [DATE] Parsed pickup date: "${source}" → ${parsed.toISOString()} (local: ${parsed.toLocaleDateString()})`);
        return parsed;
      }
    }
  }
  
  // Default: 3 days from now at noon
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  defaultDate.setHours(12, 0, 0, 0);
  return defaultDate;
};

const extractDropoffDate = (data) => {
  // Priority order for dropoff date sources
  const sources = [
    data.dropoffDate,
    data.scheduling?.dropoffDate,
    data.vehicles?.[0]?.dropoff?.timeWindow?.date,
    data.quote?.dropoffDate,
  ];
  
  for (const source of sources) {
    if (source) {
      const parsed = parseLocalDateString(source);
      if (parsed) {
        console.log(`📅 [DATE] Parsed dropoff date: "${source}" → ${parsed.toISOString()} (local: ${parsed.toLocaleDateString()})`);
        return parsed;
      }
    }
  }
  
  // Default: 7 days from now at noon
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  defaultDate.setHours(12, 0, 0, 0);
  return defaultDate;
};

// ============================================================
// CREATE BOOKING
// POST /api/bookings
// ============================================================
const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const data = req.body;

    console.log('📦 [BOOKING] Creating new booking for user:', userId);
    console.log('📦 [BOOKING] Incoming data keys:', Object.keys(data));
    
    // Debug: Log vehicle data structure
    if (data.vehicles) {
      console.log('📦 [BOOKING] vehicles array length:', data.vehicles.length);
      console.log('📦 [BOOKING] vehicles[0] keys:', data.vehicles[0] ? Object.keys(data.vehicles[0]) : 'none');
      if (data.vehicles[0]?.vehicle) {
        console.log('📦 [BOOKING] vehicles[0].vehicle:', data.vehicles[0].vehicle);
      }
      if (data.vehicles[0]?.pickup) {
        console.log('📦 [BOOKING] vehicles[0].pickup:', data.vehicles[0].pickup);
      }
      if (data.vehicles[0]?.pickup?.timeWindow) {
        console.log('📦 [BOOKING] vehicles[0].pickup.timeWindow:', data.vehicles[0].pickup.timeWindow);
      }
    }
    
    const incomingQuoteId = extractQuoteId(data);
    // Kick off the linked-quote fetch eagerly. We don't await here — the
    // fetch overlaps with the user fetch and all the synchronous data
    // shaping below, then we await it just before we need its values
    // when building bookingData.
    const existingQuotePromise = incomingQuoteId
      ? prisma.quote
          .findUnique({
            where: { id: incomingQuoteId },
            select: {
              vehicle: true,
              vehicles: true,
              transportType: true,
              miles: true,
              fromZip: true,
              toZip: true,
              offer: true,
              likelihood: true,
              marketAvg: true,
            },
          })
          .catch((quoteErr) => {
            console.warn('⚠️ [BOOKING] Could not fetch linked quote:', quoteErr.message);
            return null;
          })
      : Promise.resolve(null);

    // ✅ Server-side delivery datetime validation. Mirrors the frontend rule
    // so a client that bypasses the form cannot submit an impossible delivery.
    // Note: we don't read from existingQuote here — the frontend always sends
    // miles/durationHours when it's relevant, and we don't want to block this
    // sync validation on the in-flight quote fetch.
    {
      const sched = data.scheduling || {};
      const milesForCheck = Number(data.miles) || Number(sched.miles) || 0;
      const durationForCheck = Number(data.durationHours) || Number(sched.durationHours) || undefined;
      const pickupDateForCheck = data.pickupDate || sched.pickupDate;
      const dropoffDateForCheck = data.dropoffDate || sched.dropoffDate;

      if (pickupDateForCheck && dropoffDateForCheck) {
        const v = validateDeliveryDateTime({
          pickupDate: pickupDateForCheck,
          pickupCustomTo: sched.pickupCustomTo,
          pickupPreferredWindow: sched.pickupPreferredWindow,
          pickupWindowEnd: sched.pickupWindowEnd,
          miles: milesForCheck,
          durationHours: durationForCheck,
          dropoffDate: dropoffDateForCheck,
          dropoffCustomFrom: sched.dropoffCustomFrom,
          dropoffCustomTo: sched.dropoffCustomTo,
          dropoffPreferredWindow: sched.dropoffPreferredWindow,
          dropoffWindowStart: sched.dropoffWindowStart,
          dropoffWindowEnd: sched.dropoffWindowEnd,
        });
        if (!v.valid) {
          console.warn('⚠️ [BOOKING] Delivery datetime validation failed:', v.error);
          return res.status(400).json({
            error: 'Invalid delivery time',
            message: v.error,
            earliestDate: v.earliestDate,
            earliestStartMinutes: v.earliestStartMinutes,
          });
        }
      }
    }

    const ref = generateRef();
    // Run the order-number sequence read, the linked-quote fetch (already
    // started above), and the user lookup in parallel. None depends on
    // the others; they were previously serialized for no reason.
    const [orderNumber, existingQuote, user] = await Promise.all([
      generateOrderNumber(),
      existingQuotePromise,
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, phone: true },
      }),
    ]);
    if (existingQuote) {
      console.log('📦 [BOOKING] Linked quote:', existingQuote.vehicle, existingQuote.miles, 'mi');
    }
    const timeWindows = extractTimeWindowsFromScheduling(data.scheduling);
    const notesValue = extractNotesFromData(data);

    const pickupGatePassId = data.pickupGatePassId || extractGatePassId(data.auctionGatePass);
    const dropoffGatePassId = data.dropoffGatePassId || extractGatePassId(data.dropoffAuctionGatePass);

    // ✅ FIXED: Determine vehicle count
    let vehiclesCount = 1;
    let isMultiVehicle = false;
    
    if (data.vehicleCount && typeof data.vehicleCount === 'number') {
      vehiclesCount = clampVehiclesCount(data.vehicleCount);
    } else if (data.vehiclesCount && typeof data.vehiclesCount === 'number') {
      vehiclesCount = clampVehiclesCount(data.vehiclesCount);
    } else if (data.vehicles && Array.isArray(data.vehicles)) {
      vehiclesCount = clampVehiclesCount(data.vehicles.length);
    }
    
    isMultiVehicle = vehiclesCount > 1;
    console.log('📦 [BOOKING] Vehicle count:', vehiclesCount, 'isMultiVehicle:', isMultiVehicle);

    // ✅ FIXED: Build vehicles array handling nested structure
    const validatedVehicles = buildVehiclesArray(data, vehiclesCount);
    console.log('📦 [BOOKING] Validated vehicles:', JSON.stringify(validatedVehicles, null, 2));

    // VIN / serial-number validation — per-vehicle rules live in vin-rules.cjs.
    // The frontend already enforces this in the shipper flow; this is the
    // safety net for any client that bypasses the UI.
    const { validateVin: validateVehicleVin } = require('../../services/booking/vin-rules.cjs');
    for (let i = 0; i < validatedVehicles.length; i++) {
      const v = validatedVehicles[i];
      const check = validateVehicleVin(v.vin, v.vehicleType);
      if (!check.valid) {
        console.warn(`[BOOKING] Vehicle ${i + 1} VIN rejected: ${check.error}`);
        return res.status(400).json({
          error: 'Invalid VIN',
          message: check.error,
          vehicleIndex: i,
          vehicleType: v.vehicleType,
        });
      }
    }

    // ✅ FIXED: Extract pickup data from all sources
    const pickupData = extractPickupData(data, validatedVehicles);
    console.log('📦 [BOOKING] Extracted pickup:', JSON.stringify(pickupData, null, 2));
    
    // ✅ FIXED: Extract dropoff data from all sources
    const dropoffData = extractDropoffData(data, validatedVehicles);
    console.log('📦 [BOOKING] Extracted dropoff:', JSON.stringify(dropoffData, null, 2));

    // ✅ FIXED: Extract vehicle details from nested structure
    const vehicleDetails = extractVehicleDetailsFromData(data, validatedVehicles, existingQuote);
    console.log('📦 [BOOKING] Extracted vehicle details:', JSON.stringify(vehicleDetails, null, 2));

    const vin = extractVin(data) || vehicleDetails.vin || validatedVehicles?.[0]?.vin;
    if (vin && !vehicleDetails.vin) vehicleDetails.vin = vin;

    // Build vehicle string
    const vehicleString = data.vehicle || 
      [vehicleDetails.year, vehicleDetails.make, vehicleDetails.model].filter(Boolean).join(' ') || 
      existingQuote?.vehicle || 
      '';
    
    const vehicleType = vehicleDetails.type || data.vehicleType || '';

    // Payment status logic
    const isFullCardPayment = data.paymentMode === 'full_card_charge';
    const paymentStatus = isFullCardPayment ? 'PAID_IN_FULL' : 'COD';
    const paymentSource = isFullCardPayment ? 'CARD' : 'CASH';

    // ✅ FIXED: Store complete vehicle details including nested vehicles array
    const vehicleDetailsToStore = {
      ...vehicleDetails,
      vehicles: validatedVehicles,
      vehiclesCount,
      isMultiVehicle,
    };

    const multiVehicleConfig = isMultiVehicle ? {
      vehicleCount: vehiclesCount,
      sharePickup: data.pickupConfig?.shareLocation ?? true,
      shareDropoff: data.dropoffConfig?.shareLocation ?? true,
      pickupStopCount: data.pickupConfig?.stops?.length || 1,
      dropoffStopCount: data.dropoffConfig?.stops?.length || 1,
      vehicleAssignments: {
        pickup: data.pickupConfig?.vehicleAssignments || {},
        dropoff: data.dropoffConfig?.vehicleAssignments || {}
      }
    } : null;

    // ✅ FIXED: Derive fromCity/toCity from extracted pickup/dropoff
    const fromCity = data.fromCity || pickupData.city || '';
    const toCity = data.toCity || dropoffData.city || '';
    
    // ✅ FIXED: Derive origin/destination types
    const pickupOriginType = data.pickupOriginType || 
      pickupData.locationType || 
      pickupData.originType || 
      (data.vehicles?.[0]?.pickupOriginType) ||
      'private';
    
    const dropoffDestinationType = data.dropoffDestinationType || 
      dropoffData.locationType || 
      dropoffData.destinationType || 
      (data.vehicles?.[0]?.dropoffDestinationType) ||
      'private';

    console.log('📦 [BOOKING] Location types - pickup:', pickupOriginType, 'dropoff:', dropoffDestinationType);

    // ✅ FIXED: Parse dates using local timezone-aware function
    const pickupDate = extractPickupDate(data);
    const dropoffDate = extractDropoffDate(data);
    
    console.log('📅 [BOOKING] Final pickup date:', pickupDate.toISOString(), 'local:', pickupDate.toLocaleDateString());
    console.log('📅 [BOOKING] Final dropoff date:', dropoffDate.toISOString(), 'local:', dropoffDate.toLocaleDateString());

    const bookingData = {
      user: { connect: { id: userId } },
      userEmail: user?.email || data.userEmail || '',
      ref,
      orderNumber,
      status: SHIPMENT_STATUS.SCHEDULED,
      ...(incomingQuoteId && { quoteRelation: { connect: { id: incomingQuoteId } } }),
      fromCity,
      toCity,
      miles: data.miles || data.quote?.miles || existingQuote?.miles || 0,
      vehicle: vehicleString,
      vehicleType,
      vehicleDetails: vehicleDetailsToStore,
      transportType: data.transportType || existingQuote?.transportType || 'open',
      price: data.price || data.quote?.price || data.quote?.offer || 0,
      paymentMode: data.paymentMode || 'platform_fee_only',
      paymentStatus,
      paymentSource,
      carrierPayout: data.price || data.quote?.price || data.quote?.offer || 0,
      // ✅ FIXED: Use properly parsed dates
      pickupDate,
      dropoffDate,
      pickupWindowStart: timeWindows.pickupWindowStart,
      pickupWindowEnd: timeWindows.pickupWindowEnd,
      dropoffWindowStart: timeWindows.dropoffWindowStart,
      dropoffWindowEnd: timeWindows.dropoffWindowEnd,
      // ✅ FIXED: Store complete pickup/dropoff objects
      pickup: pickupData,
      dropoff: dropoffData,
      scheduling: data.scheduling || {},
      quote: data.quote || {},
      // ✅ FIXED: Store location types
      pickupOriginType,
      dropoffDestinationType,
      customerFirstName: data.customerFirstName || pickupData.firstName || pickupData.contactFirstName || user?.firstName || '',
      customerLastName: data.customerLastName || pickupData.lastName || pickupData.contactLastName || user?.lastName || '',
      customerPhone: data.customerPhone || pickupData.phone || pickupData.contactPhone || user?.phone || '',
      notes: notesValue,
      customerInstructions: notesValue,
      instructions: notesValue,
      // Pickup-step-specific instructions — separate column so carriers can
      // read pickup access details without digging through the general notes.
      pickupInstructions:
        data.pickupInstructions ||
        data.scheduling?.pickupInstructions ||
        null,
      multiVehicleConfig,
      vehiclesCount,
      ...(pickupGatePassId && { pickupGatePass: { connect: { id: pickupGatePassId } } }),
      ...(dropoffGatePassId && { dropoffGatePass: { connect: { id: dropoffGatePassId } } }),
    };

    console.log('📦 [BOOKING] Creating with data:', {
      fromCity: bookingData.fromCity,
      toCity: bookingData.toCity,
      pickup: bookingData.pickup,
      dropoff: bookingData.dropoff,
      vehicleDetails: bookingData.vehicleDetails,
      pickupOriginType: bookingData.pickupOriginType,
      dropoffDestinationType: bookingData.dropoffDestinationType,
      pickupDate: bookingData.pickupDate,
      dropoffDate: bookingData.dropoffDate,
    });

    const booking = await prisma.booking.create({
      data: bookingData,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        pickupGatePass: true,
        dropoffGatePass: true,
      },
    });

    console.log('✅ [BOOKING] Created:', { 
      id: booking.id, 
      orderNumber: booking.orderNumber, 
      status: booking.status,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      pickupDate: booking.pickupDate,
    });

    // Enrich vehicle data in parallel with the side-effect work below.
    // The customer redirect to /dashboard only needs the booking row +
    // enriched vehicles; document linking, payment row creation, quote
    // status, and notifications are all background concerns that should
    // not stall the HTTP response.
    const enrichedVehicleDataPromise = enrichBookingWithVehicles(booking);

    // Fire-and-forget: link uploaded quote documents to the new booking.
    // Errors are already swallowed inside the helper, so the unhandled
    // rejection guard is just defense-in-depth.
    if (incomingQuoteId) {
      Promise.resolve(linkQuoteDocumentsToBooking(incomingQuoteId, booking.id))
        .catch((err) => console.error('⚠️ [DOCUMENTS] link async failed:', err?.message));
    }

    // Fire-and-forget: payment row. We don't block the redirect on this
    // because the row is only used by reconciliation/reporting; the user
    // sees the booking in their dashboard regardless.
    if (data.cardNumber || data.cardFirstName || data.cardLastName) {
      (async () => {
        try {
          const payment = await prisma.paymentTransaction.create({
            data: {
              userId,
              bookingId: booking.id,
              amount: parseFloat(data.totalAmount || data.platformFee || 0),
              currency: 'USD',
              status: 'pending',
              paymentMethod: data.paymentMode === 'full_card_charge' ? 'card_full' : 'card_fee_only',
              cardLast4: getCardLast4(data.cardNumber),
              cardBrand: detectCardBrand(data.cardNumber),
              cardholderFirstName: data.cardFirstName || null,
              cardholderLastName: data.cardLastName || null,
              paidAt: null,
              metadata: {
                paymentMode: data.paymentMode,
                platformFee: data.platformFee,
                totalAmount: data.totalAmount,
                offerAmount: data.price,
                quoteId: incomingQuoteId,
              },
            },
          });
          const reference = generatePaymentReference(orderNumber, payment.id);
          await prisma.paymentTransaction.update({ where: { id: payment.id }, data: { reference } });
        } catch (paymentError) {
          console.error('⚠️ [PAYMENT] Failed to create payment record:', paymentError.message);
        }
      })();
    }

    // Fire-and-forget: mark the source quote as booked. Failure is
    // recoverable and shouldn't block the redirect.
    if (booking.quoteId) {
      prisma.quote
        .update({ where: { id: booking.quoteId }, data: { status: 'booked' } })
        .catch(() => {});
    }

    // Fire-and-forget: order-created notification. Notifications can be
    // slow (email + DB write fanout) and the dashboard refresh used to
    // visibly stall behind this. The user is already navigating away.
    try {
      const notify = require('../../services/notifications.service.cjs');
      Promise.resolve(notify.orderCreated({ ...booking, userId }))
        .catch((err) => console.error('Notify (order created) failed:', err?.message));
    } catch (notifError) {
      console.error('Notify (order created) require failed:', notifError.message);
    }

    const enrichedVehicleData = await enrichedVehicleDataPromise;
    const responseBooking = { ...booking, ...enrichedVehicleData };

    res.status(201).json({ success: true, message: 'Booking created successfully', booking: responseBooking });

  } catch (error) {
    console.error('❌ [BOOKING] Create error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
};

// ============================================================
// GET BOOKINGS
// GET /api/bookings
// ============================================================
const getBookings = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = typeof req.userEmail === 'string' ? req.userEmail.trim() : '';
    const { page = 1, limit = 10, status, search, statusFilter } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Ownership: userId (FK) OR userEmail (denormalized). The email branch
    // rescues legacy rows whose userId no longer matches (DB restore, user
    // re-registration, pre-migration imports). User.email is unique, so this
    // cannot leak another user's data.
    const ownerFilter = userEmail
      ? { OR: [{ userId }, { userEmail: { equals: userEmail, mode: 'insensitive' } }] }
      : { userId };

    // Use an AND array so search (which sets its own OR) cannot clobber
    // ownership. Any additional filter below pushes into where.AND.
    const where = { AND: [ownerFilter, ...(status ? [{ status }] : [])] };

    // Map the customer-facing status bucket onto the DB column values.
    // "Assigned" covers every post-assignment, pre-delivery state so the
    // bucket matches the tile the customer sees in the table.
    if (typeof statusFilter === 'string' && statusFilter.trim()) {
      const bucket = statusFilter.trim().toLowerCase();
      // Each bucket lists EVERY DB value that maps into it — including legacy
      // aliases ("waiting", "pending", "accepted", "in_transit", …) that some
      // older rows still carry. Without these aliases the Prisma `status IN`
      // filter silently drops legacy rows from the Open filter.
      const SCHEDULED_ALIASES  = ['scheduled', 'waiting', 'pending', 'booked', 'new'];
      const ASSIGNED_ALIASES   = ['assigned', 'accepted', 'carrier_assigned', 'carrier_accepted'];
      const EN_ROUTE_ALIASES   = ['on_the_way_to_pickup', 'on_the_way', 'en_route', 'enroute', 'driving', 'dispatched', 'in_transit_to_pickup'];
      const AT_PICKUP_ALIASES  = ['arrived_at_pickup', 'arrived', 'at_pickup', 'waiting_at_pickup'];
      const PICKED_UP_ALIASES  = ['picked_up', 'pickedup', 'in_transit', 'loaded', 'pickup_complete'];
      const DELIVERED_ALIASES  = ['delivered', 'completed', 'done'];
      const CANCELLED_ALIASES  = ['cancelled', 'canceled'];

      const bucketMap = {
        // Customer-facing buckets (used by the Orders dropdown).
        open: [
          ...SCHEDULED_ALIASES,
          ...ASSIGNED_ALIASES,
          ...EN_ROUTE_ALIASES,
          ...AT_PICKUP_ALIASES,
          ...PICKED_UP_ALIASES,
        ],
        delivered: DELIVERED_ALIASES,
        cancelled: CANCELLED_ALIASES,

        // Legacy buckets kept for admin panel / other callers.
        waiting:   SCHEDULED_ALIASES,
        assigned:  [...ASSIGNED_ALIASES, ...EN_ROUTE_ALIASES, ...AT_PICKUP_ALIASES, ...PICKED_UP_ALIASES],
        picked_up: PICKED_UP_ALIASES,
      };
      const dbStatuses = bucketMap[bucket];
      if (dbStatuses && dbStatuses.length > 0) {
        where.AND.push({ status: { in: dbStatuses } });
      }
    }

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      const q = searchTerm;
      // Display-label → DB-status aliases (what customers see vs what we store)
      const statusAliases = {
        waiting: ['scheduled'],
        accepted: ['assigned'],
        'in transit': ['picked_up', 'on_the_way_to_pickup', 'arrived_at_pickup'],
      };
      const aliasMatches = statusAliases[q.toLowerCase()] || [];

      const or = [
        { ref: { contains: q, mode: 'insensitive' } },
        { fromCity: { contains: q, mode: 'insensitive' } },
        { toCity: { contains: q, mode: 'insensitive' } },
        { vehicle: { contains: q, mode: 'insensitive' } },
        { vehicleType: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
        { pickup: { path: ['zip'], string_contains: q } },
        { dropoff: { path: ['zip'], string_contains: q } },
        ...aliasMatches.map((s) => ({ status: s })),
      ];

      // Accept "1137" and zero-padded "0122" alike — strip leading zeros
      // before comparing so the integer match still works. Keeps the booking
      // search in sync with quote search (see quotes.read.controller.cjs).
      if (/^\d+$/.test(q)) {
        const asInt = parseInt(q, 10);
        if (!Number.isNaN(asInt)) {
          or.push({ orderNumber: { equals: asInt } });
        }
      }

      where.AND.push({ OR: or });
    }

    console.log('[BOOKINGS LIST]', { userId, userEmail, statusFilter, searchTerm, page: pageNum, limit: limitNum });

    // Both queries are read-only and need no transactional consistency. Running
    // them via Promise.all parallelizes them across the connection pool, saving
    // one round-trip vs. prisma.$transaction([...]) which serializes inside a
    // BEGIN/COMMIT.
    //
    // Gate-pass document objects are intentionally NOT included on the list
    // response. The dashboard list view doesn't render them; the LoadDetailsModal
    // re-fetches the full booking via GET /api/bookings/:id on open, which still
    // includes pickupGatePass/dropoffGatePass/podDocument/documents. The scalar
    // foreign-key columns (pickupGatePassId, dropoffGatePassId) remain on the
    // row so any caller that only needs presence can keep working.
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where, skip, take: limitNum, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          quoteRelation: { select: { likelihood: true, marketAvg: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    // Batch-fetch carriers and multi-vehicle rows for ALL bookings on this page
    // in two parallel round trips. The bookingVehicle include pulls each
    // vehicle's pickupStop/dropoffStop, so we no longer need a separate
    // prisma.stop.findMany — enrichBookingWithVehicles derives the deduped
    // stops array from those relations. Per-vehicle pickup/dropoff gate-pass
    // documents are also dropped here for the same reason as the outer query:
    // the modal's re-fetch repopulates them.
    //
    // Trade-off: orphan/legacy Stop rows that aren't referenced by any
    // BookingVehicle won't appear in the list response. They never show in
    // the dashboard table anyway; the modal re-fetch (which calls
    // enrichBookingWithVehicles without pre-attached arrays) still picks
    // them up via the legacy Stop.findMany fallback inside the service.
    const bookingIds = bookings.map(b => b.id);
    const carrierIds = [...new Set(bookings.filter(b => b.carrierId).map(b => b.carrierId))];

    const [carriers, allBookingVehicles] = await Promise.all([
      carrierIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: carrierIds } },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true },
          })
        : Promise.resolve([]),
      bookingIds.length > 0
        ? prisma.bookingVehicle.findMany({
            where: { bookingId: { in: bookingIds } },
            include: {
              pickupStop: true,
              dropoffStop: true,
            },
            orderBy: { vehicleIndex: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const carriersMap = {};
    carriers.forEach(c => { carriersMap[c.id] = buildCarrierInfoForCustomer(c); });

    const bookingVehiclesByBookingId = new Map();
    for (const bv of allBookingVehicles) {
      const arr = bookingVehiclesByBookingId.get(bv.bookingId);
      if (arr) arr.push(bv);
      else bookingVehiclesByBookingId.set(bv.bookingId, [bv]);
    }

    // Pre-attach an array (possibly empty) for every booking on this page.
    // enrichBookingWithVehicles uses `=== undefined` to decide whether to hit
    // the DB, so passing [] deliberately suppresses the per-row fetch on legacy
    // bookings that have no BookingVehicle rows (avoids a hidden N+1).
    // For multi-vehicle bookings we let the service derive `stops` from each
    // vehicle's pickupStop/dropoffStop relations. For legacy bookings (empty
    // bookingVehicles) we also pre-attach `stops: []` to suppress the fallback
    // prisma.stop.findMany — legacy rows pre-date the Stop table, so the query
    // would always return zero rows anyway.
    const transformedBookings = await Promise.all(bookings.map(async (booking) => {
      const pickupData = booking.pickup || {};
      const dropoffData = booking.dropoff || {};
      const vehicleFields = extractVehicleFields(booking.vehicleDetails);
      const normalizedStatus = normalizeStatus(booking.status);
      const statusStep = getStatusStep(normalizedStatus);
      const bvsForBooking = bookingVehiclesByBookingId.get(booking.id) || [];
      const enrichedVehicleData = await enrichBookingWithVehicles({
        ...booking,
        bookingVehicles: bvsForBooking,
        ...(bvsForBooking.length === 0 ? { stops: [] } : {}),
      });

      return {
        ...booking,
        status: normalizedStatus,
        statusStep,
        statusLabel: STATUS_LABELS[normalizedStatus],
        carrier: booking.carrierId ? carriersMap[booking.carrierId] || null : null,
        origin: [pickupData.city, pickupData.state].filter(Boolean).join(', ') || booking.fromCity,
        destination: [dropoffData.city, dropoffData.state].filter(Boolean).join(', ') || booking.toCity,
        hasPickupGatePass: !!booking.pickupGatePassId,
        hasDropoffGatePass: !!booking.dropoffGatePassId,
        ...vehicleFields,
        likelihood: booking.quoteRelation?.likelihood || null,
        marketAvg: booking.quoteRelation?.marketAvg || null,
        ...enrichedVehicleData,
        isCancelled: normalizedStatus === SHIPMENT_STATUS.CANCELLED,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        assignedAt: booking.assignedAt,
        onTheWayAt: booking.onTheWayAt,
        pickedUpAt: booking.pickedUpAt || booking.pickupAt,
        deliveredAt: booking.deliveredAt,
      };
    }));

    console.log(`[BOOKINGS LIST] Found ${bookings.length}/${total} for userId=${userId} userEmail=${userEmail}`);

    res.json({ success: true, bookings: transformedBookings, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('❌ [BOOKING] Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
};

// ============================================================
// UPDATE BOOKING
// PUT /api/bookings/:id
// ============================================================
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    console.log('📝 [BOOKING] Updating booking:', id);

    // Fetch existing booking
    const existing = await prisma.booking.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check ownership (unless admin)
    if (existing.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    // Don't allow updates to delivered/cancelled bookings
    const normalizedStatus = normalizeStatus(existing.status);
    if (normalizedStatus === SHIPMENT_STATUS.DELIVERED) {
      return res.status(400).json({ error: 'Cannot update delivered booking' });
    }
    if (normalizedStatus === SHIPMENT_STATUS.CANCELLED) {
      return res.status(400).json({ error: 'Cannot update cancelled booking' });
    }

    // Build update data - only allow safe fields
    const allowedFields = [
      'notes', 'customerInstructions', 'instructions', 'pickupInstructions',
      'pickupDate', 'dropoffDate',
      'pickupWindowStart', 'pickupWindowEnd',
      'dropoffWindowStart', 'dropoffWindowEnd',
      'customerFirstName', 'customerLastName', 'customerPhone',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // ✅ FIXED: Handle date fields using local date parsing
    if (updateData.pickupDate) {
      updateData.pickupDate = parseLocalDateString(updateData.pickupDate);
    }
    if (updateData.dropoffDate) {
      updateData.dropoffDate = parseLocalDateString(updateData.dropoffDate);
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        pickupGatePass: true,
        dropoffGatePass: true,
      },
    });

    console.log('[BOOKING] Updated:', { id: booking.id, orderNumber: booking.orderNumber });

    // If a carrier is already on this load, tell them the customer changed
    // something. Pre-assignment edits don't need a notification.
    try {
      const notify = require('../../services/notifications.service.cjs');
      await notify.orderEditedByCustomer(booking, Object.keys(updateData));
    } catch (e) {
      console.error('Notify (booking edit) failed:', e.message);
    }

    const enrichedVehicleData = await enrichBookingWithVehicles(booking);
    const responseBooking = { ...booking, ...enrichedVehicleData };

    res.json({ success: true, message: 'Booking updated successfully', booking: responseBooking });

  } catch (error) {
    console.error('❌ [BOOKING] Update error:', error);
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  updateBooking,
};
