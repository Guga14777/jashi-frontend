// ============================================================
// SERVER.CJS - Main Express Server with Prisma
// ✅ UPDATED: Added pickup and deliver routes for carriers
// ✅ UPDATED: Added BOL PDF download route
// ✅ UPDATED: Added grouped-by-order admin document routes
// ✅ UPDATED: Added carrier payout routes
// ✅ UPDATED: Added carrier insurance/COI routes
// ✅ UPDATED: Added cancel routes for customer and carrier
// ✅ UPDATED: Added start-trip route for 5-step status flow
// ✅ UPDATED: Added arrived-at-pickup route for 6-step status flow
// ✅ FIXED: Added time routes for server-side time validation
// ============================================================

// ---------------------------------------------------------------------------
// Startup telemetry — these lines print FIRST, before any require that could
// throw. If the server fails to come up on Railway / Render / Fly, the
// deploy log shows exactly how far boot got.
// ---------------------------------------------------------------------------
console.log(`[boot] node=${process.version} cwd=${process.cwd()}`);
console.log(
  `[boot] NODE_ENV=${process.env.NODE_ENV || '(unset)'} PORT=${process.env.PORT || '(unset→5182)'} HOST=${process.env.HOST || '(unset→0.0.0.0 in prod)'}`
);
console.log(
  `[boot] DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'MISSING'} JWT_SECRET=${process.env.JWT_SECRET ? 'set' : 'MISSING'}`
);

process.on('uncaughtException', (err) => {
  console.error('[boot] FATAL uncaughtException:', err && err.stack ? err.stack : err);
  // Don't exit — let the healthcheck fail loudly rather than silently.
});
process.on('unhandledRejection', (reason) => {
  console.error('[boot] unhandledRejection:', reason && reason.stack ? reason.stack : reason);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ============================================================
// DATABASE CONNECTION
// ============================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'production'
      ? ['warn', 'error']
      : ['query', 'info', 'warn', 'error'],
});

prisma.$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => console.error('❌ Database connection failed:', err));

global.prisma = prisma;

// ============================================================
// CONTROLLERS
// ============================================================
const authController = require('./server/controllers/auth.controller.cjs');
const authRecoveryController = require('./server/controllers/auth.recovery.controller.cjs');
const quotesController = require('./server/controllers/quotes.controller.cjs');
const bookingController = require('./server/controllers/booking.controller.cjs');
const draftController = require('./server/controllers/draft.controller.cjs');
const addressController = require('./server/controllers/address.controller.cjs');
const notificationsController = require('./server/controllers/notifications.controller.cjs');
const accountEventsController = require('./server/controllers/account-events.controller.cjs');
const customerStatsController = require('./server/controllers/customer.stats.controller.cjs');
const paymentsController = require('./server/controllers/payments.controller.cjs');
const routesController = require('./server/controllers/routes.controller.cjs');
const documentsController = require('./server/controllers/documents.controller.cjs');
const adminDocumentsController = require('./server/controllers/admin-documents.controller.cjs');
const adminOrdersController = require('./server/controllers/admin-orders.controller.cjs');
const adminActionsController = require('./server/controllers/admin/admin.actions.controller.cjs');
const adminExportController = require('./server/controllers/admin/admin.export.controller.cjs');
const adminBulkController = require('./server/controllers/admin/admin.bulk.controller.cjs');
const adminNotesController = require('./server/controllers/admin/admin.notes.controller.cjs');
const adminSettingsController = require('./server/controllers/admin/admin.settings.controller.cjs');
const adminAutomation = require('./server/services/admin/admin.automation.service.cjs');
const { requireAdminTier } = require('./server/middleware/admin-role.cjs');

// ✅ FIXED: Import carrier loads controller for available-loads endpoint
const carrierLoadsController = require('./server/controllers/booking/booking.carrier.loads.controller.cjs');

// ============================================================
// ROUTES
// ============================================================
const timeRoutes = require('./server/routes/time.routes.cjs');

// ============================================================
// MIDDLEWARE
// ============================================================
const authMiddleware = require('./server/middleware/auth.cjs');
const requireAdmin = require('./server/middleware/require-admin.cjs');

// ============================================================
// EXPRESS APP SETUP
// ============================================================
const app = express();
const PORT = process.env.PORT || 5182;
// In production always bind 0.0.0.0 so Railway/Render/Fly proxies can
// reach the process. `localhost` binding in a Linux container is a common
// "application failed to respond" footgun. HOST env is only honored in
// non-production (dev / test).
const HOST =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : (process.env.HOST || '0.0.0.0');
// Behind Railway / Heroku / Vercel-style proxies, req.ip and secure cookies
// must trust the X-Forwarded-For chain.
app.set('trust proxy', 1);

// ============================================================
// MULTER CONFIGURATION
// ============================================================
const uploadsDir = path.join(__dirname, 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = require('crypto').randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${randomStr}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  cb(null, allowedTypes.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

global.uploadsDir = uploadsDir;

// ============================================================
// MIDDLEWARE CONFIGURATION
// ============================================================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOriginsRaw = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:5177', 'http://localhost:5173'];

// ALLOWED_ORIGINS=* acts as a wildcard (useful while bringing up staging).
const allowAnyOrigin = allowedOriginsRaw.includes('*');

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin / curl / server-to-server requests have no Origin header.
    if (!origin) return callback(null, true);
    if (allowAnyOrigin) return callback(null, true);
    if (allowedOriginsRaw.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error(`CORS not allowed: ${origin}`), false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// ROLE-BASED MIDDLEWARE HELPERS
// ============================================================

/**
 * Middleware to check if user is a carrier
 */
const requireCarrier = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { roles: true }
    });
    
    if (!user || !user.roles.includes('CARRIER')) {
      return res.status(403).json({ error: 'Carrier access required' });
    }
    
    next();
  } catch (error) {
    console.error('requireCarrier error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// ============================================================
// API ROUTES
// ============================================================

// ============================================================
// ADMIN PREFIX GUARD
// Every /api/admin/* request passes through authMiddleware + requireAdmin
// BEFORE reaching any route handler. This is the single enforcement point
// for admin authorization — do not rely on per-route middleware here.
// Any new admin route added below is automatically protected.
// ============================================================
app.use('/api/admin', authMiddleware, requireAdmin);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ FIXED: Time routes for server-side time validation
app.use('/api/time', timeRoutes);

// Distance/Routes
app.get('/api/distance', routesController.getDistance);

// Auth routes (public)
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.post('/api/auth/reset-password', authController.resetPassword);
app.post('/api/auth/verify-otp', authController.verifyOTP);
app.post('/api/auth/reactivate', authController.reactivateAccount);

// Account recovery (forgot-password OTP flow) — uses PasswordReset table
app.post('/api/auth/recovery/request', authRecoveryController.requestCode);
app.post('/api/auth/recovery/verify', authRecoveryController.verifyCode);
app.post('/api/auth/recovery/reset-password', authRecoveryController.resetPassword);
app.post('/api/auth/recovery/resend', authRecoveryController.resendCode);

// ✅ Link-based password reset (email with URL token) — used by the
// /forgot-password and /reset-password pages. Works for both customer and
// carrier roles because User auth is role-agnostic.
app.post('/api/auth/recovery/request-link', authRecoveryController.requestLink);
app.post('/api/auth/recovery/reset-with-token', authRecoveryController.resetWithToken);
app.get('/api/auth/recovery/verify-link', authRecoveryController.verifyLink);

// Auth routes (protected)
app.get('/api/auth/me', authMiddleware, authController.getMe);
app.put('/api/auth/profile', authMiddleware, authController.updateProfile);
app.put('/api/auth/password', authMiddleware, authController.changePassword);
app.post('/api/auth/deactivate', authMiddleware, authController.deactivateAccount);
app.delete('/api/auth/delete', authMiddleware, authController.deleteAccount);

// Quote routes
app.post('/api/quotes', authMiddleware, quotesController.createQuote);
app.get('/api/quotes', authMiddleware, quotesController.getQuotes);
app.get('/api/quotes/:id', authMiddleware, quotesController.getQuoteById);
app.put('/api/quotes/:id', authMiddleware, quotesController.updateQuote);
app.delete('/api/quotes/:id', authMiddleware, quotesController.deleteQuote);

// ============================================================
// BOOKING ROUTES
// ✅ IMPORTANT: BOL route must come BEFORE /:identifier to avoid conflicts
// ============================================================
app.post('/api/bookings', authMiddleware, bookingController.createBooking);
app.get('/api/bookings', authMiddleware, bookingController.getBookings);

// ✅ NEW: BOL PDF download route (must come before :identifier)
app.get('/api/bookings/:id/bol', authMiddleware, bookingController.getBol);
app.get('/api/bookings/:id/bol-data', authMiddleware, bookingController.getBolData);

// Regular booking routes
app.get('/api/bookings/:identifier', authMiddleware, bookingController.getBookingById);
app.put('/api/bookings/:id', authMiddleware, bookingController.updateBooking);
app.delete('/api/bookings/:id', authMiddleware, bookingController.cancelBooking);

// ✅ NEW: Customer cancel route with reason/notes
app.post('/api/bookings/:id/cancel', authMiddleware, bookingController.cancelBooking);

app.get('/api/bookings/ref/:ref', authMiddleware, bookingController.getBookingById);

// Draft routes
app.post('/api/drafts', authMiddleware, draftController.createDraft);
app.get('/api/drafts', authMiddleware, draftController.listMyDrafts);
app.get('/api/drafts/:id', authMiddleware, draftController.getDraft);
app.put('/api/drafts/:id', authMiddleware, draftController.updateDraft);
app.patch('/api/drafts/:id', authMiddleware, draftController.updateDraft);
app.delete('/api/drafts/:id', authMiddleware, draftController.deleteDraft);

// Address routes
app.post('/api/addresses', authMiddleware, addressController.createAddress);
app.get('/api/addresses', authMiddleware, addressController.listMyAddresses);
app.get('/api/addresses/:id', authMiddleware, addressController.getAddress);
app.put('/api/addresses/:id', authMiddleware, addressController.updateAddress);
app.delete('/api/addresses/:id', authMiddleware, addressController.deleteAddress);
app.post('/api/addresses/:id/set-default', authMiddleware, addressController.setDefaultAddress);

// ============================================================
// NOTIFICATION ROUTES
// ✅ IMPORTANT: Order matters! Put specific routes BEFORE parameterized routes
// ============================================================
// List all notifications
app.get('/api/customer/notifications', authMiddleware, notificationsController.getNotifications);
// Unified + carrier aliases — same handlers, handler filters by req.userId.
app.get('/api/notifications', authMiddleware, notificationsController.getNotifications);
app.get('/api/notifications/unread-count', authMiddleware, notificationsController.getUnreadCount);
app.get('/api/carrier/notifications', authMiddleware, notificationsController.getNotifications);
app.get('/api/carrier/notifications/unread-count', authMiddleware, notificationsController.getUnreadCount);
app.put('/api/carrier/notifications/read-all', authMiddleware, notificationsController.markAllAsRead);
app.patch('/api/carrier/notifications/mark-all-read', authMiddleware, notificationsController.markAllAsRead);
app.delete('/api/carrier/notifications/clear-read', authMiddleware, notificationsController.clearReadNotifications);
app.get('/api/carrier/notifications/:id', authMiddleware, notificationsController.getNotificationById);
app.put('/api/carrier/notifications/:id/read', authMiddleware, notificationsController.markAsRead);
app.patch('/api/carrier/notifications/:id/read', authMiddleware, notificationsController.markAsRead);
app.delete('/api/carrier/notifications/:id', authMiddleware, notificationsController.deleteNotification);

// Mark ALL as read (must come BEFORE /:id routes)
app.put('/api/customer/notifications/read-all', authMiddleware, notificationsController.markAllAsRead);
app.patch('/api/customer/notifications/mark-all-read', authMiddleware, notificationsController.markAllAsRead);

// Clear all read notifications (must come BEFORE /:id routes)
app.delete('/api/customer/notifications/clear-read', authMiddleware, notificationsController.clearReadNotifications);

// Single notification by ID routes (must come AFTER specific routes)
app.get('/api/customer/notifications/:id', authMiddleware, notificationsController.getNotificationById);
app.put('/api/customer/notifications/:id/read', authMiddleware, notificationsController.markAsRead);
app.patch('/api/customer/notifications/:id/read', authMiddleware, notificationsController.markAsRead);
app.delete('/api/customer/notifications/:id', authMiddleware, notificationsController.deleteNotification);

// Account events routes
app.get('/api/account-events', authMiddleware, accountEventsController.listMyEvents);
app.post('/api/account-events', authMiddleware, accountEventsController.createEvent);

// ============================================================
// CUSTOMER DASHBOARD STATS
// Whole-account aggregates — independent of Orders table pagination.
// ============================================================
app.get('/api/customer/dashboard-stats', authMiddleware, customerStatsController.getCustomerDashboardStats);

// ============================================================
// PAYMENT ROUTES - CUSTOMER
// ============================================================
// Legacy payment routes
app.post('/api/payments/create-intent', authMiddleware, paymentsController.createPaymentIntent);
app.post('/api/payments/confirm', authMiddleware, paymentsController.confirmPayment);
app.get('/api/payments/transactions', authMiddleware, paymentsController.listTransactions);

// Customer dashboard payments
app.get('/api/dashboard/payments', authMiddleware, paymentsController.getCustomerPayments);
app.get('/api/dashboard/payments/:id', authMiddleware, paymentsController.getPaymentById);

// Shipper portal payments
app.post('/api/shipper/payments', authMiddleware, paymentsController.createPayment);

// Payment status update
app.patch('/api/payments/:id/status', authMiddleware, paymentsController.updatePaymentStatus);

// ============================================================
// ✅ CARRIER PAYOUT ROUTES
// ============================================================
// Get carrier's own payouts
// NOTE: Using authMiddleware only (removed requireCarrier to simplify)
app.get('/api/carrier/payouts', authMiddleware, paymentsController.getCarrierPayouts);
app.get('/api/carrier/payouts/:id', authMiddleware, paymentsController.getCarrierPayoutById);

// ============================================================
// ✅ ADMIN PAYOUT ROUTES
// Auth + admin role enforced by the /api/admin prefix guard above.
// ============================================================
app.post('/api/admin/payouts', requireAdminTier('ops'), paymentsController.createCarrierPayout);
app.patch('/api/admin/payouts/:id/status', requireAdminTier('ops'), paymentsController.updateCarrierPayoutStatus);

// ============================================================
// DOCUMENT ROUTES
// ============================================================
app.post('/api/documents/upload', authMiddleware, upload.single('file'), documentsController.uploadDocument);
app.get('/api/documents/:id', authMiddleware, documentsController.getDocument);
app.delete('/api/documents/:id', authMiddleware, documentsController.deleteDocument);

// TODO: Implement these functions in documents.controller.cjs
// app.get('/api/documents/:id/download', authMiddleware, documentsController.downloadDocument);
// app.get('/api/documents', authMiddleware, documentsController.listMyDocuments);
// app.get('/api/bookings/:bookingId/documents', authMiddleware, documentsController.listBookingDocuments);
// app.get('/api/quotes/:quoteId/documents', authMiddleware, documentsController.listQuoteDocuments);

// ============================================================
// ADMIN ROUTES
// Auth + admin role enforced by the /api/admin prefix guard mounted above.
// Do NOT add authMiddleware/requireAdmin per route — the prefix guard owns it.
// ============================================================

// Admin Documents — specific routes MUST come BEFORE /:id routes
app.get('/api/admin/documents/by-order', adminDocumentsController.listDocumentsByOrder);
app.get('/api/admin/documents/order/:orderNumber', adminDocumentsController.getOrderDocuments);
app.get('/api/admin/documents/stats', adminDocumentsController.getDocumentStats);

// Generic /:id must come LAST
app.get('/api/admin/documents', adminDocumentsController.listAllDocuments);
app.get('/api/admin/documents/:id', adminDocumentsController.getDocumentDetails);
app.delete('/api/admin/documents/:id', requireAdminTier('ops'), adminDocumentsController.deleteDocument);

// Orders
app.get('/api/admin/orders', adminOrdersController.listAllOrders);

// Admin BOL download — specific route MUST come BEFORE the generic /:id route
app.get('/api/admin/orders/:orderNumber/bol', adminDocumentsController.getOrderBol);

// Admin ops on a specific order (status, carrier, cancel, detention, CNP).
// These specific routes MUST come BEFORE the generic /:id GET below.
// All writes require ADMIN_OPS or higher; ADMIN_SUPPORT is read-only.
app.patch('/api/admin/orders/:id/status', requireAdminTier('ops'), adminActionsController.updateOrderStatus);
app.post('/api/admin/orders/:id/assign-carrier', requireAdminTier('ops'), adminActionsController.assignCarrier);
app.post('/api/admin/orders/:id/cancel', requireAdminTier('ops'), adminActionsController.cancelOrder);
app.post('/api/admin/orders/:id/detention/approve', requireAdminTier('ops'), adminActionsController.approveDetention);
app.post('/api/admin/orders/:id/detention/deny', requireAdminTier('ops'), adminActionsController.denyDetention);
app.post('/api/admin/orders/:id/cnp/resolve', requireAdminTier('ops'), adminActionsController.resolveCouldNotPickup);

app.get('/api/admin/orders/:id', adminOrdersController.getOrderDetails);

// Quotes
app.get('/api/admin/quotes', adminOrdersController.listAllQuotes);

// Users (Customers & Carriers)
app.get('/api/admin/users', adminOrdersController.listAllUsers);

// Stats
app.get('/api/admin/stats', adminOrdersController.getAdminStats);

// Activity log (AccountEvent audit trail)
app.get('/api/admin/activity', adminOrdersController.listActivity);

// Export + bulk
app.get('/api/admin/orders/export/csv', adminExportController.exportOrdersCsv);
app.post('/api/admin/bulk/status', requireAdminTier('ops'), adminBulkController.bulkUpdateStatus);

// Admin internal notes (visible only to ADMIN; writes require ops+)
app.get('/api/admin/orders/:id/notes', adminNotesController.listNotes);
app.post('/api/admin/orders/:id/notes', requireAdminTier('ops'), adminNotesController.createNote);
app.patch('/api/admin/notes/:noteId', requireAdminTier('ops'), adminNotesController.updateNote);
app.delete('/api/admin/notes/:noteId', requireAdminTier('ops'), adminNotesController.deleteNote);

// Platform settings — reads for any admin, writes require ADMIN_SUPER.
app.get('/api/admin/settings', adminSettingsController.listSettings);
app.put('/api/admin/settings/:key', requireAdminTier('super'), adminSettingsController.updateSetting);

// Manual automation trigger — for admins who want to force a scan without
// waiting for the next scheduled tick. Requires ops+ (writes notifications).
app.post('/api/admin/automation/run-now', requireAdminTier('ops'), async (req, res) => {
  try {
    const result = await adminAutomation.runOnce({ verbose: false });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[admin-automation] manual run failed:', err);
    res.status(500).json({ error: err.message || 'Automation run failed' });
  }
});

// ============================================================
// CARRIER API ROUTES
// ✅ UPDATED: Added arrived-at-pickup route for 6-step status flow
// ✅ FIXED: Using carrierLoadsController for available-loads endpoint
// ============================================================
app.get('/api/carrier/available-loads', authMiddleware, carrierLoadsController.getAvailableLoadsForCarrier);
app.get('/api/carrier/my-loads', authMiddleware, carrierLoadsController.getCarrierLoads);
app.get('/api/carrier/loads/:id', authMiddleware, carrierLoadsController.getCarrierLoadById);
app.post('/api/carrier/loads/:id/accept', authMiddleware, carrierLoadsController.acceptLoadAsCarrier);

// ✅ Start trip to pickup (6-step status flow: assigned → on_the_way_to_pickup)
app.post('/api/carrier/loads/:id/start-trip', authMiddleware, bookingController.startTripToPickup);

// ✅ NEW: Mark arrived at pickup (6-step status flow: on_the_way_to_pickup → arrived_at_pickup)
app.post('/api/carrier/loads/:id/arrived-at-pickup', authMiddleware, bookingController.markArrivedAtPickup);

// ✅ Pickup and Delivery routes for carriers
app.post('/api/carrier/loads/:id/pickup', authMiddleware, bookingController.markLoadAsPickedUp);
app.post('/api/carrier/loads/:id/deliver', authMiddleware, bookingController.markLoadAsDelivered);

// ✅ Carrier cancel route
app.post('/api/carrier/loads/:id/cancel', authMiddleware, bookingController.cancelLoadByCarrier);

// ✅ Get load documents for carriers
app.get('/api/carrier/loads/:id/documents', authMiddleware, bookingController.getLoadDocuments);

// TODO: Implement these functions in documents.controller.cjs
// ✅ NEW: Carrier Insurance/COI routes
// app.get('/api/carrier/insurance', authMiddleware, documentsController.getCarrierInsurance);
// app.post('/api/carrier/insurance', authMiddleware, documentsController.saveCarrierInsurance);
// app.delete('/api/carrier/insurance', authMiddleware, documentsController.deleteCarrierInsurance);

// ============================================================
// STATIC FILES (production)
// ============================================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ============================================================
// SERVER STARTUP
// ============================================================
const server = app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Vehicle Shipping Platform API Server');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://${HOST}:${PORT}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log('='.repeat(60) + '\n');

  // Opt-in automation scan. Default OFF so dev restarts don't page anyone.
  // Enable with ADMIN_AUTOMATION_ENABLED=true in your .env (prod/staging).
  if (String(process.env.ADMIN_AUTOMATION_ENABLED || '').toLowerCase() === 'true') {
    adminAutomation.start({ verbose: true });
  } else {
    console.log('[admin-automation] disabled (set ADMIN_AUTOMATION_ENABLED=true to enable scheduled scans)');
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
