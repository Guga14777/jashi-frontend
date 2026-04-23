// ============================================================
// FILE: server/controllers/booking.controller.cjs
// Main booking controller - re-exports from split modules
// ✅ FIXED: All imports wrapped in try-catch for resilience
// ============================================================

// Helper to safely require a module
const safeRequire = (modulePath, moduleName) => {
  try {
    return require(modulePath);
  } catch (e) {
    console.warn(`⚠️ ${moduleName} failed to load:`, e.message);
    return {};
  }
};

// Helper to create a fallback handler
const notImplemented = (name) => async (req, res) => {
  console.warn(`⚠️ ${name} called but not implemented`);
  res.status(501).json({ error: `${name} not implemented` });
};

const fallbackSuccess = (name, data = {}) => async (req, res) => {
  console.warn(`⚠️ ${name} using fallback handler`);
  res.json({ success: true, ...data });
};

// ============================================================
// IMPORT ALL CONTROLLERS (with error handling)
// ============================================================
const coreController = safeRequire('./booking/booking.core.controller.cjs', 'booking.core.controller');
const detailController = safeRequire('./booking/booking.detail.controller.cjs', 'booking.detail.controller');
const cancelController = safeRequire('./booking/booking.cancel.controller.cjs', 'booking.cancel.controller');
const bolController = safeRequire('./booking/booking.bol.controller.cjs', 'booking.bol.controller');
const carrierLoadsController = safeRequire('./booking/booking.carrier.loads.controller.cjs', 'booking.carrier.loads.controller');
const carrierStatusController = safeRequire('./booking/booking.carrier.status.controller.cjs', 'booking.carrier.status.controller');
const carrierDetentionController = safeRequire('./booking/booking.carrier.detention.controller.cjs', 'booking.carrier.detention.controller');
const carrierDocumentsController = safeRequire('./booking/booking.carrier.documents.controller.cjs', 'booking.carrier.documents.controller');
const carrierExceptionsController = safeRequire('./booking/booking.carrier.exceptions.controller.cjs', 'booking.carrier.exceptions.controller');

// ============================================================
// RE-EXPORT ALL FUNCTIONS (with fallbacks)
// ============================================================

module.exports = {
  // ============================================================
  // CORE BOOKING (create, list, update)
  // ============================================================
  createBooking: coreController.createBooking || notImplemented('createBooking'),
  getBookings: coreController.getBookings || notImplemented('getBookings'),
  updateBooking: coreController.updateBooking || notImplemented('updateBooking'),
  
  // ============================================================
  // BOOKING DETAIL
  // ============================================================
  getBookingById: detailController.getBookingById || notImplemented('getBookingById'),
  
  // ============================================================
  // BOL (Bill of Lading)
  // ============================================================
  getBol: bolController.getBol || notImplemented('getBol'),
  getBolData: bolController.getBolInfo || notImplemented('getBolData'),  // Maps to getBolInfo
  getBolInfo: bolController.getBolInfo || notImplemented('getBolInfo'),
  downloadBol: bolController.getBol || notImplemented('downloadBol'),    // Alias for getBol
  regenerateBol: bolController.regenerateBol || notImplemented('regenerateBol'),
  
  // ============================================================
  // CANCELLATION
  // ============================================================
  cancelBooking: cancelController.cancelBooking || notImplemented('cancelBooking'),
  cancelBookingByCustomer: cancelController.cancelBooking || notImplemented('cancelBookingByCustomer'),
  cancelLoadByCarrier: cancelController.cancelLoadByCarrier || notImplemented('cancelLoadByCarrier'),
  getCancellationInfo: cancelController.getCancellationInfo || notImplemented('getCancellationInfo'),
  
  // ============================================================
  // CARRIER: Load Management
  // ============================================================
  getAvailableLoadsForCarrier: carrierLoadsController.getAvailableLoadsForCarrier || notImplemented('getAvailableLoadsForCarrier'),
  getCarrierLoads: carrierLoadsController.getCarrierLoads || notImplemented('getCarrierLoads'),
  getCarrierLoadById: carrierLoadsController.getCarrierLoadById || notImplemented('getCarrierLoadById'),
  acceptLoadAsCarrier: carrierLoadsController.acceptLoadAsCarrier || notImplemented('acceptLoadAsCarrier'),
  
  // ============================================================
  // CARRIER: Status Transitions (6-step flow)
  // ============================================================
  startTripToPickup: carrierStatusController.startTripToPickup || notImplemented('startTripToPickup'),
  markArrivedAtPickup: carrierStatusController.markArrivedAtPickup || notImplemented('markArrivedAtPickup'),
  markLoadAsPickedUp: carrierStatusController.markLoadAsPickedUp || notImplemented('markLoadAsPickedUp'),
  markLoadAsDelivered: carrierStatusController.markLoadAsDelivered || notImplemented('markLoadAsDelivered'),
  
  // ============================================================
  // CARRIER: Detention Fees
  // ============================================================
  requestDetentionFee: carrierDetentionController.requestDetentionFee || notImplemented('requestDetentionFee'),
  getDetentionStatus: carrierDetentionController.getDetentionStatus || notImplemented('getDetentionStatus'),
  requestWaitingFee: carrierDetentionController.requestDetentionFee || notImplemented('requestWaitingFee'),
  
  // ============================================================
  // CARRIER: Documents
  // ============================================================
  getLoadDocuments: carrierDocumentsController.getLoadDocuments || fallbackSuccess('getLoadDocuments', { documents: [], grouped: {} }),
  uploadPickupPhotos: carrierDocumentsController.uploadPickupPhotos || notImplemented('uploadPickupPhotos'),
  uploadDeliveryPhotos: carrierDocumentsController.uploadDeliveryPhotos || notImplemented('uploadDeliveryPhotos'),
  
  // ============================================================
  // CARRIER: Exceptions (could not pickup)
  // ============================================================
  reportCouldNotPickup: carrierExceptionsController.reportCouldNotPickup || notImplemented('reportCouldNotPickup'),
};
