// ============================================================
// FILE: server/routes/carrier.routes.cjs
// Carrier-specific routes
// ✅ UPDATED: Added carrier cancel endpoint
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.cjs');

// Import carrier controllers
const {
  getAvailableLoadsForCarrier,
  getCarrierLoads,
  getCarrierLoadById,
  acceptLoadAsCarrier,
} = require('../controllers/booking/booking.carrier.loads.controller.cjs');

const {
  startTrip,
  markArrivedAtPickup,
  markPickedUp,
  markDelivered,
} = require('../controllers/booking/booking.carrier.status.controller.cjs');

const {
  requestDetentionFee,
  approveDetentionFee,
  getDetentionStatus,
} = require('../controllers/booking/booking.carrier.detention.controller.cjs');

const {
  reportCouldNotPickup,
} = require('../controllers/booking/booking.carrier.exceptions.controller.cjs');

const {
  getLoadDocuments,
  uploadPickupPhotos,
  uploadDeliveryPhotos,
} = require('../controllers/booking/booking.carrier.documents.controller.cjs');

const {
  cancelLoadAsCarrier,
} = require('../controllers/booking/booking.cancel.controller.cjs');

// ============================================================
// LOAD LISTING & ACCEPTANCE
// ============================================================

// Get available loads (not yet assigned)
router.get('/available-loads', authenticateToken, getAvailableLoadsForCarrier);

// Get carrier's assigned loads
router.get('/my-loads', authenticateToken, getCarrierLoads);

// Get single load details
router.get('/loads/:id', authenticateToken, getCarrierLoadById);

// Accept a load
router.post('/loads/:id/accept', authenticateToken, acceptLoadAsCarrier);

// ✅ NEW: Cancel a load (carrier)
router.post('/loads/:id/cancel', authenticateToken, cancelLoadAsCarrier);

// ============================================================
// STATUS TRANSITIONS
// ============================================================

// Start trip (Assigned -> On The Way)
router.post('/loads/:id/start-trip', authenticateToken, startTrip);

// Mark arrived at pickup (On The Way -> Arrived)
router.post('/loads/:id/arrived-at-pickup', authenticateToken, markArrivedAtPickup);

// Mark picked up (Arrived -> Picked Up)
router.post('/loads/:id/pickup', authenticateToken, markPickedUp);

// Mark delivered (Picked Up -> Delivered)
router.post('/loads/:id/deliver', authenticateToken, markDelivered);

// ============================================================
// DETENTION / WAITING FEE
// ============================================================

// Request waiting/detention fee
router.post('/loads/:id/request-waiting-fee', authenticateToken, requestDetentionFee);

// Get detention status
router.get('/loads/:id/detention-status', authenticateToken, getDetentionStatus);

// Approve detention fee (admin only - moved to admin routes typically)
// router.post('/loads/:id/approve-detention', authenticateToken, approveDetentionFee);

// ============================================================
// EXCEPTIONS
// ============================================================

// Report could not pickup
router.post('/loads/:id/could-not-pickup', authenticateToken, reportCouldNotPickup);

// ============================================================
// DOCUMENTS
// ============================================================

// Get load documents
router.get('/loads/:id/documents', authenticateToken, getLoadDocuments);

// Upload pickup photos
router.post('/loads/:id/photos/pickup', authenticateToken, uploadPickupPhotos);

// Upload delivery photos
router.post('/loads/:id/photos/delivery', authenticateToken, uploadDeliveryPhotos);

module.exports = router;
