/**
 * Quotes Repository Service
 * Prisma query configurations and database helpers
 */

// Standard user select fields
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
};

// Standard document select fields
const DOCUMENT_SELECT = {
  id: true,
  type: true,
  fileName: true,
  originalName: true,
  fileUrl: true,
  filePath: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
};

// Gate pass select fields
const GATE_PASS_SELECT = {
  id: true,
  fileName: true,
  originalName: true,
  fileUrl: true,
  filePath: true,
  mimeType: true,
  fileSize: true,
};

// Standard booking select fields for quote includes
const BOOKING_SELECT = {
  id: true,
  ref: true,
  orderNumber: true,
  status: true,
  carrierId: true,
  assignedAt: true,
  customerFirstName: true,
  customerLastName: true,
  customerPhone: true,
  pickup: true,
  dropoff: true,
  pickupDate: true,
  dropoffDate: true,
  vehicleDetails: true,
  pickupOriginType: true,
  dropoffDestinationType: true,
  privateFirstName: true,
  privateLastName: true,
  privatePhone: true,
  dealerFirstName: true,
  dealerLastName: true,
  dealerPhone: true,
  auctionName: true,
  dropoffPrivateFirstName: true,
  dropoffPrivateLastName: true,
  dropoffPrivatePhone: true,
  dropoffDealerFirstName: true,
  dropoffDealerLastName: true,
  dropoffDealerPhone: true,
  dropoffAuctionName: true,
  customerInstructions: true,
  notes: true,
  instructions: true,
  scheduling: true,
  pickupWindowStart: true,
  pickupWindowEnd: true,
  dropoffWindowStart: true,
  dropoffWindowEnd: true,
  createdAt: true,
};

/**
 * Get standard quote include for create/update operations
 */
function getBasicQuoteInclude() {
  return {
    user: { select: USER_SELECT },
    pickupAddress: true,
    dropoffAddress: true,
  };
}

/**
 * Get full quote include for list operations
 */
function getListQuoteInclude() {
  return {
    user: { select: USER_SELECT },
    pickupAddress: true,
    dropoffAddress: true,
    documents: {
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    },
    bookings: {
      select: {
        ...BOOKING_SELECT,
        documents: {
          select: DOCUMENT_SELECT,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  };
}

/**
 * Get full quote include for single quote operations (includes gate passes)
 */
function getDetailQuoteInclude() {
  return {
    user: { select: USER_SELECT },
    pickupAddress: true,
    dropoffAddress: true,
    documents: {
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    },
    bookings: {
      select: {
        ...BOOKING_SELECT,
        pickupGatePass: { select: GATE_PASS_SELECT },
        dropoffGatePass: { select: GATE_PASS_SELECT },
        documents: {
          select: DOCUMENT_SELECT,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  };
}

/**
 * Merge documents from quote and booking, removing duplicates
 * @param {array} quoteDocuments - Documents from quote
 * @param {array} bookingDocuments - Documents from booking
 * @returns {array} - Merged unique documents
 */
function mergeDocuments(quoteDocuments = [], bookingDocuments = []) {
  const allDocumentsMap = new Map();
  
  [...quoteDocuments, ...bookingDocuments].forEach(doc => {
    if (!allDocumentsMap.has(doc.id)) {
      allDocumentsMap.set(doc.id, {
        ...doc,
        fileUrl: doc.filePath || doc.fileUrl,
      });
    }
  });
  
  return Array.from(allDocumentsMap.values());
}

/**
 * Extract time windows from booking data
 * @param {object|null} booking - Booking object
 * @returns {object} - Time window fields
 */
function extractTimeWindows(booking) {
  if (!booking) {
    return {
      pickupWindowStart: null,
      pickupWindowEnd: null,
      dropoffWindowStart: null,
      dropoffWindowEnd: null,
    };
  }

  const schedulingData = booking.scheduling || {};
  
  return {
    pickupWindowStart: booking.pickupWindowStart || schedulingData.pickupWindowStart || schedulingData.pickupTimeStart || null,
    pickupWindowEnd: booking.pickupWindowEnd || schedulingData.pickupWindowEnd || schedulingData.pickupTimeEnd || null,
    dropoffWindowStart: booking.dropoffWindowStart || schedulingData.dropoffWindowStart || schedulingData.dropoffTimeStart || null,
    dropoffWindowEnd: booking.dropoffWindowEnd || schedulingData.dropoffWindowEnd || schedulingData.dropoffTimeEnd || null,
  };
}

/**
 * Format gate pass for response
 * @param {object|null} gatePass - Gate pass object
 * @returns {object|null} - Formatted gate pass
 */
function formatGatePass(gatePass) {
  if (!gatePass) return null;
  
  return {
    id: gatePass.id,
    fileName: gatePass.originalName || gatePass.fileName,
    originalName: gatePass.originalName,
    fileUrl: gatePass.filePath || gatePass.fileUrl,
    mimeType: gatePass.mimeType,
    fileSize: gatePass.fileSize,
  };
}

module.exports = {
  USER_SELECT,
  DOCUMENT_SELECT,
  GATE_PASS_SELECT,
  BOOKING_SELECT,
  getBasicQuoteInclude,
  getListQuoteInclude,
  getDetailQuoteInclude,
  mergeDocuments,
  extractTimeWindows,
  formatGatePass,
};
