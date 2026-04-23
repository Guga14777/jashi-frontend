// ============================================================
// FILE: server/controllers/booking/booking.carrier.controller.cjs
// ⚠️ DEPRECATED: Re-exports from split controller files
// Import directly from individual controllers or from ./index.cjs
// ============================================================

const carrierLoads = require('./booking.carrier.loads.controller.cjs');
const carrierStatus = require('./booking.carrier.status.controller.cjs');
const carrierDetention = require('./booking.carrier.detention.controller.cjs');
const carrierExceptions = require('./booking.carrier.exceptions.controller.cjs');
const carrierDocuments = require('./booking.carrier.documents.controller.cjs');

module.exports = {
  // From booking.carrier.loads.controller.cjs
  getAvailableLoadsForCarrier: carrierLoads.getAvailableLoadsForCarrier,
  acceptLoadAsCarrier: carrierLoads.acceptLoadAsCarrier,
  
  // From booking.carrier.status.controller.cjs
  startTripToPickup: carrierStatus.startTripToPickup,
  markArrivedAtPickup: carrierStatus.markArrivedAtPickup,
  markLoadAsPickedUp: carrierStatus.markLoadAsPickedUp,
  markLoadAsDelivered: carrierStatus.markLoadAsDelivered,
  
  // From booking.carrier.detention.controller.cjs
  requestDetentionFee: carrierDetention.requestDetentionFee,
  getDetentionStatus: carrierDetention.getDetentionStatus,
  
  // From booking.carrier.exceptions.controller.cjs
  reportCouldNotPickup: carrierExceptions.reportCouldNotPickup,
  getCouldNotPickupReasons: carrierExceptions.getCouldNotPickupReasons,
  
  // From booking.carrier.documents.controller.cjs
  uploadPickupPhotos: carrierDocuments.uploadPickupPhotos,
  uploadDeliveryPhotos: carrierDocuments.uploadDeliveryPhotos,
  uploadProofOfDelivery: carrierDocuments.uploadProofOfDelivery,
  uploadDetentionProof: carrierDocuments.uploadDetentionProof,
  getLoadDocuments: carrierDocuments.getLoadDocuments,
};
