// ============================================================
// FILE: server/services/booking/booking.vehicle.service.cjs
// Vehicle validation and enrichment logic
// ============================================================

const prisma = require('../../db.cjs');
const { MIN_VEHICLES, MAX_VEHICLES } = require('./booking.constants.cjs');
const { safeParseJson } = require('./booking.helpers.cjs');

// Validate and clamp vehicles array (1-3)
// Handles nested vehicle structure from frontend portal context
const validateAndClampVehicles = (vehicles) => {
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return null;
  }
  
  const clampedVehicles = vehicles.slice(0, MAX_VEHICLES);
  
  if (clampedVehicles.length < MIN_VEHICLES) {
    return null;
  }
  
  return clampedVehicles.map((v, index) => {
    const veh = v.vehicle || v;
    
    console.log(`🚗 [VALIDATE] Vehicle ${index} raw:`, JSON.stringify(v).slice(0, 200));
    console.log(`🚗 [VALIDATE] Vehicle ${index} extracted:`, { year: veh.year, make: veh.make, model: veh.model });
    
    return {
      year: veh.year || v.vehicleYear || '',
      make: veh.make || v.vehicleMake || '',
      model: veh.model || v.vehicleModel || '',
      vin: (veh.vin || v.vin) ? (veh.vin || v.vin).toUpperCase().replace(/[^A-Z0-9]/g, '') : null,
      vehicleType: veh.vehicleType || veh.type || v.vehicleType || v.type || v.bodyType || 'sedan',
      operable: veh.operable || v.operable || 'yes',
      
      pickup: v.pickup || null,
      pickupAddress: v.pickupAddress || v.pickup?.address || null,
      pickupCity: v.pickupCity || v.pickup?.city || null,
      pickupState: v.pickupState || v.pickup?.state || null,
      pickupZip: v.pickupZip || v.pickup?.zip || null,
      pickupLocationType: v.pickupLocationType || v.pickup?.locationType || 'private',
      pickupContact: v.pickupContact || v.pickup?.contact || null,
      pickupNotes: v.pickupNotes || v.pickup?.notes || null,
      
      dropoff: v.dropoff || null,
      dropoffAddress: v.dropoffAddress || v.dropoff?.address || null,
      dropoffCity: v.dropoffCity || v.dropoff?.city || null,
      dropoffState: v.dropoffState || v.dropoff?.state || null,
      dropoffZip: v.dropoffZip || v.dropoff?.zip || null,
      dropoffLocationType: v.dropoffLocationType || v.dropoff?.locationType || 'private',
      dropoffContact: v.dropoffContact || v.dropoff?.contact || null,
      dropoffNotes: v.dropoffNotes || v.dropoff?.notes || null,
      
      timeWindow: v.timeWindow || null,
      pickupWindowStart: v.pickupWindowStart || v.timeWindow?.pickupStart || null,
      pickupWindowEnd: v.pickupWindowEnd || v.timeWindow?.pickupEnd || null,
      dropoffWindowStart: v.dropoffWindowStart || v.timeWindow?.dropoffStart || null,
      dropoffWindowEnd: v.dropoffWindowEnd || v.timeWindow?.dropoffEnd || null,
      
      docStatus: v.docStatus || null,
      pickupGatePassId: v.pickupGatePassId || null,
      dropoffGatePassId: v.dropoffGatePassId || null,
      
      vehicleIndex: index,
    };
  });
};

// Clamp vehiclesCount to valid range (1-3)
const clampVehiclesCount = (count) => {
  if (typeof count !== 'number' || isNaN(count)) {
    return 1;
  }
  return Math.max(MIN_VEHICLES, Math.min(MAX_VEHICLES, Math.floor(count)));
};

// Generate vehicles array from legacy single-vehicle data
const generateVehiclesFromLegacy = (booking) => {
  const vd = safeParseJson(booking.vehicleDetails);
  
  if (vd.vehicles && Array.isArray(vd.vehicles) && vd.vehicles.length > 0) {
    const flattenedVehicles = vd.vehicles.map((v, idx) => {
      const veh = v.vehicle || v;
      return {
        year: veh.year || '',
        make: veh.make || '',
        model: veh.model || '',
        vin: veh.vin || null,
        vehicleType: veh.vehicleType || veh.type || 'sedan',
        operable: veh.operable || 'yes',
        vehicleIndex: idx,
        pickup: v.pickup || null,
        dropoff: v.dropoff || null,
        pickupGatePassId: v.pickupGatePassId || null,
        dropoffGatePassId: v.dropoffGatePassId || null,
      };
    });
    
    return {
      vehicles: flattenedVehicles,
      vehiclesCount: flattenedVehicles.length,
      isMultiVehicle: flattenedVehicles.length > 1,
    };
  }
  
  const pickupData = safeParseJson(booking.pickup) || {};
  const dropoffData = safeParseJson(booking.dropoff) || {};
  
  const legacyVehicle = {
    year: vd.year || booking.vehicleYear || '',
    make: vd.make || booking.vehicleMake || '',
    model: vd.model || booking.vehicleModel || '',
    vin: vd.vin || booking.vin || null,
    vehicleType: vd.type || vd.bodyType || booking.vehicleType || 'sedan',
    operable: vd.operable || 'yes',
    
    pickup: pickupData,
    pickupAddress: pickupData.address || pickupData.street1 || null,
    pickupCity: pickupData.city || booking.fromCity || null,
    pickupState: pickupData.state || null,
    pickupZip: pickupData.zip || null,
    pickupLocationType: booking.pickupOriginType || pickupData.locationType || 'private',
    pickupContact: {
      firstName: booking.customerFirstName || pickupData.firstName || pickupData.contactFirstName || null,
      lastName: booking.customerLastName || pickupData.lastName || pickupData.contactLastName || null,
      phone: booking.customerPhone || pickupData.phone || pickupData.contactPhone || null,
    },
    pickupNotes: pickupData.notes || null,
    
    dropoff: dropoffData,
    dropoffAddress: dropoffData.address || dropoffData.street1 || null,
    dropoffCity: dropoffData.city || booking.toCity || null,
    dropoffState: dropoffData.state || null,
    dropoffZip: dropoffData.zip || null,
    dropoffLocationType: booking.dropoffDestinationType || dropoffData.locationType || 'private',
    dropoffContact: {
      firstName: booking.dropoffDealerFirstName || dropoffData.firstName || dropoffData.contactFirstName || null,
      lastName: booking.dropoffDealerLastName || dropoffData.lastName || dropoffData.contactLastName || null,
      phone: booking.dropoffDealerPhone || dropoffData.phone || dropoffData.contactPhone || null,
    },
    dropoffNotes: dropoffData.notes || null,
    
    pickupWindowStart: booking.pickupWindowStart || null,
    pickupWindowEnd: booking.pickupWindowEnd || null,
    dropoffWindowStart: booking.dropoffWindowStart || null,
    dropoffWindowEnd: booking.dropoffWindowEnd || null,
    
    pickupGatePassId: booking.pickupGatePassId || null,
    dropoffGatePassId: booking.dropoffGatePassId || null,
    
    vehicleIndex: 0,
  };
  
  return {
    vehicles: [legacyVehicle],
    vehiclesCount: 1,
    isMultiVehicle: false,
  };
};

// Check if booking is multi-vehicle
const isMultiVehicleBooking = (data) => {
  const vehicles = data.vehicles || [];
  if (vehicles.length > 1) return true;
  
  const vehiclesCount = data.vehiclesCount;
  if (typeof vehiclesCount === 'number' && vehiclesCount > 1) return true;
  
  const pickupStops = data.pickupConfig?.stops || [];
  const dropoffStops = data.dropoffConfig?.stops || [];
  if (pickupStops.length > 1 || dropoffStops.length > 1) return true;
  
  return false;
};

// Safely include multi-vehicle relations.
// The two findMany calls are independent and were previously awaited
// sequentially — a noticeable cost on a remote Postgres for every
// booking detail fetch and (worse) at the end of every booking create.
// Run them in parallel so both round trips overlap.
const safeIncludeMultiVehicle = async (bookingId) => {
  const settled = await Promise.allSettled([
    prisma.bookingVehicle.findMany({
      where: { bookingId },
      orderBy: { vehicleIndex: 'asc' },
      include: {
        pickupStop: true,
        dropoffStop: true,
        pickupGatePass: true,
        dropoffGatePass: true,
      },
    }),
    prisma.stop.findMany({
      where: { bookingId },
      orderBy: [{ stage: 'asc' }, { stopIndex: 'asc' }],
    }),
  ]);

  const bookingVehicles = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const stops = settled[1].status === 'fulfilled' ? settled[1].value : [];
  return { bookingVehicles, stops };
};

// Enrich booking with vehicles array for response.
// Fast path: when the booking row itself says single-vehicle and there is
// no multi-vehicle config, skip the BookingVehicle/Stop queries entirely
// — they will return empty for a fresh booking and were costing two
// round trips per create. The legacy generator can build the response
// from the data we already have in memory.
const enrichBookingWithVehicles = async (booking) => {
  const vd = safeParseJson(booking.vehicleDetails);
  const declaredCount = Number(booking.vehiclesCount || vd.vehiclesCount || 0);
  const isLikelySingle =
    !booking.multiVehicleConfig &&
    !vd.isMultiVehicle &&
    (declaredCount === 0 || declaredCount === 1);

  if (isLikelySingle) {
    if (vd.vehicles && Array.isArray(vd.vehicles) && vd.vehicles.length > 0) {
      const flattenedVehicles = vd.vehicles.map((v, idx) => {
        const veh = v.vehicle || v;
        return {
          year: veh.year || '',
          make: veh.make || '',
          model: veh.model || '',
          vin: veh.vin || null,
          vehicleType: veh.vehicleType || veh.type || 'sedan',
          operable: veh.operable || 'yes',
          vehicleIndex: idx,
          pickup: v.pickup || null,
          dropoff: v.dropoff || null,
        };
      });
      return {
        vehicles: flattenedVehicles,
        vehiclesCount: vd.vehiclesCount || flattenedVehicles.length,
        isMultiVehicle: false,
        bookingVehicles: [],
        stops: [],
      };
    }
    const legacyData = generateVehiclesFromLegacy(booking);
    return { ...legacyData, bookingVehicles: [], stops: [] };
  }

  // Pre-attach support: a list-path caller may have already batch-fetched
  // BookingVehicle rows (with pickupStop/dropoffStop relations) for every
  // booking on the page in a single round trip. When that's the case, skip
  // the per-row safeIncludeMultiVehicle() call to avoid a 2N round-trip N+1.
  // We treat `undefined` as "not provided, fetch" and any value (including [])
  // as "trust the caller" so legacy multi-vehicle bookings with no rows don't
  // sneak back into the per-row path.
  let bookingVehicles;
  let stops;
  if (booking.bookingVehicles !== undefined) {
    bookingVehicles = booking.bookingVehicles;

    if (booking.stops !== undefined) {
      stops = booking.stops;
    } else {
      // Derive a deduped, ordered stops array from each vehicle's
      // pickupStop/dropoffStop relations. Match the ordering produced by
      // safeIncludeMultiVehicle() (pickup stage first, then by stopIndex)
      // so downstream consumers see the same shape regardless of code path.
      const seen = new Set();
      const derived = [];
      for (const bv of bookingVehicles) {
        if (bv.pickupStop && !seen.has(bv.pickupStop.id)) {
          seen.add(bv.pickupStop.id);
          derived.push(bv.pickupStop);
        }
        if (bv.dropoffStop && !seen.has(bv.dropoffStop.id)) {
          seen.add(bv.dropoffStop.id);
          derived.push(bv.dropoffStop);
        }
      }
      derived.sort((a, b) => {
        const stageRank = (s) => (s.stage === 'pickup' ? 0 : 1);
        const sa = stageRank(a);
        const sb = stageRank(b);
        if (sa !== sb) return sa - sb;
        return (a.stopIndex ?? 0) - (b.stopIndex ?? 0);
      });
      stops = derived;
    }
  } else {
    ({ bookingVehicles, stops } = await safeIncludeMultiVehicle(booking.id));
  }

  // Priority 1: Use bookingVehicles from DB relations
  if (bookingVehicles && bookingVehicles.length > 0) {
    const vehiclesFromRelations = bookingVehicles.map((bv, idx) => ({
      year: bv.year || '',
      make: bv.make || '',
      model: bv.model || '',
      vin: bv.vin || null,
      vehicleType: bv.vehicleType || 'sedan',
      operable: bv.operable || 'yes',
      
      pickup: bv.pickupStop || null,
      pickupAddress: bv.pickupStop?.address || null,
      pickupCity: bv.pickupStop?.city || null,
      pickupState: bv.pickupStop?.state || null,
      pickupZip: bv.pickupStop?.zip || null,
      pickupLocationType: bv.pickupStop?.locationType || 'private',
      
      dropoff: bv.dropoffStop || null,
      dropoffAddress: bv.dropoffStop?.address || null,
      dropoffCity: bv.dropoffStop?.city || null,
      dropoffState: bv.dropoffStop?.state || null,
      dropoffZip: bv.dropoffStop?.zip || null,
      dropoffLocationType: bv.dropoffStop?.locationType || 'private',
      
      pickupGatePassId: bv.pickupGatePassId || null,
      dropoffGatePassId: bv.dropoffGatePassId || null,
      pickupGatePass: bv.pickupGatePass || null,
      dropoffGatePass: bv.dropoffGatePass || null,
      
      vehicleIndex: bv.vehicleIndex ?? idx,
    }));
    
    return {
      vehicles: vehiclesFromRelations,
      vehiclesCount: vehiclesFromRelations.length,
      isMultiVehicle: vehiclesFromRelations.length > 1,
      bookingVehicles,
      stops,
    };
  }
  
  // Priority 2: Use vehicles from vehicleDetails JSON
  if (vd.vehicles && Array.isArray(vd.vehicles) && vd.vehicles.length > 0) {
    const flattenedVehicles = vd.vehicles.map((v, idx) => {
      const veh = v.vehicle || v;
      return {
        year: veh.year || '',
        make: veh.make || '',
        model: veh.model || '',
        vin: veh.vin || null,
        vehicleType: veh.vehicleType || veh.type || 'sedan',
        operable: veh.operable || 'yes',
        vehicleIndex: idx,
        pickup: v.pickup || null,
        dropoff: v.dropoff || null,
      };
    });
    
    return {
      vehicles: flattenedVehicles,
      vehiclesCount: vd.vehiclesCount || flattenedVehicles.length,
      isMultiVehicle: vd.isMultiVehicle || flattenedVehicles.length > 1,
      bookingVehicles: [],
      stops,
    };
  }
  
  // Priority 3: Generate from legacy single-vehicle data
  const legacyData = generateVehiclesFromLegacy(booking);
  return {
    ...legacyData,
    bookingVehicles: [],
    stops,
  };
};

module.exports = {
  validateAndClampVehicles,
  clampVehiclesCount,
  generateVehiclesFromLegacy,
  isMultiVehicleBooking,
  safeIncludeMultiVehicle,
  enrichBookingWithVehicles,
};
