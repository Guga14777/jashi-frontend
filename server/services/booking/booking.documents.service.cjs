// ============================================================
// FILE: server/services/booking/booking.documents.service.cjs
// Document handling and gate pass logic
// ============================================================

const prisma = require('../../db.cjs');
const { GATE_PASS_TYPES } = require('./booking.constants.cjs');

// Check if document type is a gate pass
const isGatePassType = (type) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === 'gate_pass' || 
         t === 'gatepass' || 
         t === 'pickup_gatepass' || 
         t === 'dropoff_gatepass' ||
         t.includes('gate');
};

// Fetch all documents for a booking (including quote documents)
const fetchBookingDocuments = async (bookingId, quoteId) => {
  const documentWhereConditions = [{ bookingId }];
  if (quoteId) {
    documentWhereConditions.push({ quoteId });
  }
  
  const documents = await prisma.document.findMany({
    where: { OR: documentWhereConditions },
    orderBy: { createdAt: 'desc' },
  });
  
  return documents;
};

// Get gate pass documents from a list of documents
const filterGatePassDocuments = (documents) => {
  return documents.filter(d => isGatePassType(d.type));
};

// Get pickup and dropoff gate passes
const getGatePasses = (documents, booking) => {
  const gatePassDocs = filterGatePassDocuments(documents);
  
  let pickupGatePass = booking?.pickupGatePass || null;
  let dropoffGatePass = booking?.dropoffGatePass || null;
  
  if (!pickupGatePass && gatePassDocs.length > 0) {
    pickupGatePass = gatePassDocs.find(d => d.type.toLowerCase().includes('pickup')) || gatePassDocs[0];
  }
  if (!dropoffGatePass && gatePassDocs.length > 1) {
    dropoffGatePass = gatePassDocs.find(d => d.type.toLowerCase().includes('dropoff')) || gatePassDocs[1];
  }
  
  return { pickupGatePass, dropoffGatePass, gatePassDocs };
};

// Link documents from quote to booking
const linkQuoteDocumentsToBooking = async (quoteId, bookingId) => {
  if (!quoteId) return { linked: 0, normalized: 0 };
  
  try {
    const quoteDocuments = await prisma.document.findMany({
      where: { quoteId, bookingId: null },
    });
    
    console.log(`📄 [DOCUMENTS] Found ${quoteDocuments.length} documents linked to quote ${quoteId}`);
    
    // Link all quote documents to the booking
    await prisma.document.updateMany({
      where: { quoteId, bookingId: null },
      data: { bookingId },
    });
    
    // Normalize gate pass document types
    let normalized = 0;
    for (const doc of quoteDocuments) {
      if (isGatePassType(doc.type) && doc.type !== 'gate_pass') {
        await prisma.document.update({
          where: { id: doc.id },
          data: { type: 'gate_pass', bookingId },
        });
        normalized++;
        console.log(`📄 [DOCUMENTS] Normalized document ${doc.id} type from '${doc.type}' to 'gate_pass'`);
      }
    }
    
    return { linked: quoteDocuments.length, normalized };
  } catch (error) {
    console.error('⚠️ [DOCUMENTS] Failed to link documents:', error.message);
    return { linked: 0, normalized: 0, error: error.message };
  }
};

// Link pickup/delivery photos to booking
const linkPhotosToBooking = async (documentIds, bookingId, carrierId, type) => {
  if (!documentIds || documentIds.length === 0) return 0;
  
  await prisma.document.updateMany({
    where: { id: { in: documentIds }, userId: carrierId },
    data: { bookingId, type },
  });
  
  console.log(`📷 [DOCUMENTS] Linked ${documentIds.length} ${type} photos to booking ${bookingId}`);
  return documentIds.length;
};

// Get categorized documents for a booking
const getCategorizedDocuments = (documents) => {
  return {
    pickupPhotos: documents.filter(d => d.type === 'pickup_photo'),
    deliveryPhotos: documents.filter(d => d.type === 'delivery_photo'),
    pod: documents.find(d => d.type === 'pod') || null,
    gatePasses: documents.filter(d => isGatePassType(d.type)),
    all: documents,
  };
};

// Create multi-vehicle stops
const createMultiVehicleStops = async (bookingId, stopsData, stage) => {
  const createdStops = [];
  
  for (let i = 0; i < stopsData.length; i++) {
    const stop = stopsData[i];
    try {
      const createdStop = await prisma.stop.create({
        data: {
          bookingId,
          stage,
          stopIndex: i,
          locationType: stop.locationType || 'dealership',
          address: stop.address || '',
          city: stop.city || '',
          state: stop.state || '',
          zip: stop.zip || '',
          contactFirstName: stop.contactFirstName || '',
          contactLastName: stop.contactLastName || '',
          contactPhone: stop.contactPhone || '',
          auctionName: stop.auctionName || null,
          auctionBuyerNumber: stop.auctionBuyerNumber || null,
          scheduledDate: stop.scheduledDate ? new Date(stop.scheduledDate) : null,
          windowStart: stop.windowStart || null,
          windowEnd: stop.windowEnd || null,
        }
      });
      createdStops.push(createdStop);
    } catch (stopErr) {
      console.warn(`⚠️ [DOCUMENTS] Could not create ${stage} stop ${i}:`, stopErr.message);
    }
  }
  
  return createdStops;
};

// Create booking vehicles with stop assignments
const createBookingVehicles = async (bookingId, vehicles, pickupStops, dropoffStops, pickupAssignments, dropoffAssignments) => {
  const created = [];
  
  for (let i = 0; i < vehicles.length; i++) {
    const vehicle = vehicles[i];
    const pickupStopIndex = pickupAssignments[i] ?? 0;
    const dropoffStopIndex = dropoffAssignments[i] ?? 0;
    
    try {
      const bv = await prisma.bookingVehicle.create({
        data: {
          bookingId,
          vehicleIndex: i,
          year: vehicle.year || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          vin: vehicle.vin || null,
          vehicleType: vehicle.vehicleType || vehicle.type || 'sedan',
          operable: vehicle.operable || 'yes',
          pickupStopId: pickupStops[pickupStopIndex]?.id || null,
          dropoffStopId: dropoffStops[dropoffStopIndex]?.id || null,
        }
      });
      created.push(bv);
    } catch (vehErr) {
      console.warn(`⚠️ [DOCUMENTS] Could not create booking vehicle ${i}:`, vehErr.message);
    }
  }
  
  return created;
};

module.exports = {
  isGatePassType,
  fetchBookingDocuments,
  filterGatePassDocuments,
  getGatePasses,
  linkQuoteDocumentsToBooking,
  linkPhotosToBooking,
  getCategorizedDocuments,
  createMultiVehicleStops,
  createBookingVehicles,
  GATE_PASS_TYPES,
};
