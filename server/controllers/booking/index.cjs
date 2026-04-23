// ============================================================
// FILE: server/controllers/booking/index.cjs
// Barrel export for all booking controllers
// ✅ FIXED: Properly exports all controller functions
// ============================================================

// Core booking operations
const coreController = require('./booking.core.controller.cjs');
const detailController = require('./booking.detail.controller.cjs');
const cancelController = require('./booking.cancel.controller.cjs');
const bolController = require('./booking.bol.controller.cjs');

// Carrier operations (split files)
const carrierLoadsController = require('./booking.carrier.loads.controller.cjs');
const carrierStatusController = require('./booking.carrier.status.controller.cjs');
const carrierDetentionController = require('./booking.carrier.detention.controller.cjs');
const carrierExceptionsController = require('./booking.carrier.exceptions.controller.cjs');
const carrierDocumentsController = require('./booking.carrier.documents.controller.cjs');

// Services (re-export for convenience)
const bookingServices = require('../../services/booking/index.cjs');

module.exports = {
  // ============================================================
  // Core booking controllers
  // ============================================================
  ...coreController,
  
  // ============================================================
  // Booking detail
  // ============================================================
  ...detailController,
  
  // ============================================================
  // Cancellation
  // ============================================================
  ...cancelController,
  
  // ============================================================
  // BOL generation
  // ============================================================
  ...bolController,
  
  // ============================================================
  // Carrier: Load management
  // ============================================================
  ...carrierLoadsController,
  
  // ============================================================
  // Carrier: Status transitions
  // ============================================================
  ...carrierStatusController,
  
  // ============================================================
  // Carrier: Detention fees
  // ============================================================
  ...carrierDetentionController,
  
  // ============================================================
  // Carrier: Exceptions (could not pickup)
  // ============================================================
  ...carrierExceptionsController,
  
  // ============================================================
  // Carrier: Documents
  // ============================================================
  ...carrierDocumentsController,
  
  // ============================================================
  // Re-export services for convenience
  // ============================================================
  ...bookingServices,
};
