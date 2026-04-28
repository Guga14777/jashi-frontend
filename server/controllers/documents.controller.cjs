// server/controllers/documents.controller.cjs
// ✅ UPDATED: Multi-vehicle gate pass support with vehicle index and stage
// ✅ Enhanced: Per-vehicle document filtering and validation
// ✅ FIXED: Response format to match frontend expectations
// ✅ FIXED: User ID extraction from auth middleware
// ✅ ADDED: downloadDocument endpoint for direct file streaming

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// All shipment document storage now flows through Supabase via the shared
// storage service. Railway's container disk is ephemeral, so the legacy
// `uploads/` folder is read-only — used only to serve any pre-migration
// files that happen to still exist for back-compat with old Document rows.
const storageService = require('../services/storage.service.cjs');

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Probe a Document row's possible on-disk locations and return the first
// one that exists, or null. Older rows wrote `fileUrl: /uploads/<file>`
// while the multer config in server.cjs has always saved into the
// `documents/` subdir — so both the bare and subdir form must be checked.
// Used by both the streaming download endpoint and the URL endpoint so
// they cannot disagree about where a file lives.
function resolveLocalFilePath(document) {
  if (!document) return null;
  const candidates = [];
  const raw = document.filePath;
  if (raw) {
    candidates.push(path.isAbsolute(raw) ? raw : path.join(LOCAL_UPLOAD_DIR, raw.replace(/^\/+/, '')));
    candidates.push(path.join(LOCAL_UPLOAD_DIR, path.basename(raw)));
  }
  if (document.fileName) {
    candidates.push(path.join(LOCAL_UPLOAD_DIR, 'documents', document.fileName));
    candidates.push(path.join(LOCAL_UPLOAD_DIR, document.fileName));
  }
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Map an absolute on-disk path under LOCAL_UPLOAD_DIR to the public URL
// the static mount serves it under: `/api/uploads/...`. Returns null if
// the path is outside LOCAL_UPLOAD_DIR (defensive — should not happen).
function localPathToPublicUrl(absolutePath) {
  if (!absolutePath) return null;
  const rel = path.relative(LOCAL_UPLOAD_DIR, absolutePath);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return `/api/uploads/${rel.split(path.sep).join('/')}`;
}

/**
 * Parse and validate vehicleIndex from request
 * Accepts from both req.body and req.query, with body taking precedence
 * Clamps value to valid range 0-2
 * @param {object} req - Express request object
 * @returns {number|null} - Validated vehicleIndex or null
 */
function parseVehicleIndex(req) {
  // Check body first, then query (body takes precedence)
  const rawValue = req.body?.vehicleIndex ?? req.query?.vehicleIndex;
  
  // If not provided, return null for backward compatibility
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  
  // Parse to integer
  const parsed = parseInt(rawValue, 10);
  
  // If not a valid number, return null
  if (isNaN(parsed)) {
    return null;
  }
  
  // Clamp to valid range 0-2
  return Math.max(0, Math.min(2, parsed));
}

/**
 * Parse vehicleIndex from query params for filtering
 * @param {object} query - Express query object
 * @returns {number|null} - Validated vehicleIndex or null
 */
function parseVehicleIndexFilter(query) {
  const rawValue = query?.vehicleIndex;
  
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  
  const parsed = parseInt(rawValue, 10);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  // Clamp to valid range 0-2
  return Math.max(0, Math.min(2, parsed));
}

/**
 * Push an upload to Supabase Storage.
 *
 * Accepts a multer file object whose body lives in `buffer` (memoryStorage)
 * and returns the persistence shape that gets written onto a Document row:
 *   { fileUrl, filePath, storageType }
 *
 * `filePath` is the bucket key, used later by `getDocumentUrl` and
 * `downloadDocument` to mint signed URLs.
 *
 * Throws (statusCode 503) if Supabase env vars are not set, so a
 * misconfigured deploy fails loudly instead of writing files into a
 * filesystem that Railway will wipe on the next restart.
 */
async function uploadToStorage(multerFile) {
  if (!multerFile) {
    const err = new Error('uploadToStorage: missing file');
    err.statusCode = 400;
    throw err;
  }

  // multer.memoryStorage gives us `buffer`; defensively read from disk
  // if a legacy diskStorage instance is still wired somewhere.
  let buffer = multerFile.buffer;
  if (!buffer && multerFile.path) {
    buffer = fs.readFileSync(multerFile.path);
    try { fs.unlinkSync(multerFile.path); } catch { /* best effort */ }
  }

  return storageService.uploadBuffer({
    buffer,
    originalName: multerFile.originalname,
    mimeType: multerFile.mimetype,
    prefix: 'documents',
  });
}

/**
 * Upload a document
 * POST /api/documents/upload
 * 
 * Supports per-vehicle documents via vehicleIndex (0-2)
 * vehicleIndex can be provided in req.body or req.query
 */
async function uploadDocument(req, res) {
  try {
    // ✅ FIX: Support both req.user.id and req.userId (normalized by auth middleware)
    const userId = req.user?.id || req.user?.userId || req.userId;
    
    console.log('📤 [UPLOAD] User check:', { 
      'req.user': req.user, 
      'req.userId': req.userId,
      'resolved userId': userId 
    });
    
    if (!userId) {
      console.error('❌ [UPLOAD] No userId found in request');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'No user ID found in token'
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const {
      type = 'other',
      bookingId,
      quoteId,
      draftId,
      stage,
      locationIndex,
      stopId,
      bookingVehicleId
    } = req.body;

    // Parse and validate vehicleIndex from body or query
    const vehicleIndex = parseVehicleIndex(req);

    console.log('📤 [UPLOAD] Processing upload:', {
      userId,
      type,
      bookingId,
      quoteId,
      vehicleIndex,
      stage,
      fileName: req.file.originalname
    });

    // Stream straight from the multer memory buffer to Supabase Storage —
    // never touches the Railway filesystem.
    const storageResult = await uploadToStorage(req.file);

    // Create document record with all multi-vehicle fields. `fileName` is
    // the bucket key's basename so download/url endpoints can resolve it
    // even if `filePath` is ever lost.
    const supabaseFileName = path.basename(storageResult.filePath);
    const document = await prisma.document.create({
      data: {
        userId,
        bookingId: bookingId || null,
        quoteId: quoteId || null,
        type,
        fileName: supabaseFileName,
        originalName: req.file.originalname,
        fileUrl: storageResult.fileUrl,
        filePath: storageResult.filePath,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        storageType: storageResult.storageType,
        // ✅ Multi-vehicle fields (supported by schema)
        vehicleIndex: vehicleIndex,
        stage: stage || null, // 'pickup' | 'dropoff'
        locationIndex: locationIndex !== undefined ? parseInt(locationIndex) : null,
        stopId: stopId || null,
        bookingVehicleId: bookingVehicleId || null
      }
    });

    console.log('✅ [UPLOAD] Document created:', document.id);

    // If this is a gate pass and we have a booking, link it to the booking vehicle
    // Gate passes are per-vehicle, so we need vehicleIndex to properly link
    if (type === 'gate_pass' && bookingId && vehicleIndex !== null) {
      try {
        // Find the booking vehicle
        const bookingVehicle = await prisma.bookingVehicle.findFirst({
          where: {
            bookingId,
            vehicleIndex: vehicleIndex
          }
        });

        if (bookingVehicle) {
          // Update the booking vehicle with the gate pass reference
          const updateField = stage === 'pickup' ? 'pickupGatePassId' : 'dropoffGatePassId';
          await prisma.bookingVehicle.update({
            where: { id: bookingVehicle.id },
            data: { [updateField]: document.id }
          });
          console.log(`✅ [UPLOAD] Linked gate pass to booking vehicle: ${bookingVehicle.id}`);
        }
      } catch (linkError) {
        console.warn('⚠️ [UPLOAD] Could not link gate pass to booking vehicle:', linkError.message);
        // Don't fail the upload if linking fails
      }
    }

    // ✅ FIX: Return document wrapped in 'document' property to match frontend expectations
    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        fileUrl: document.fileUrl,
        type: document.type,
        vehicleIndex: document.vehicleIndex,
        stage: document.stage,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Document upload error:', error);
    // Surface STORAGE_NOT_CONFIGURED as 503 so an unconfigured Railway
    // deploy returns a clear "service unavailable" instead of a generic
    // 500 — the operator needs to know to set SUPABASE_* env vars.
    const status = error?.statusCode || 500;
    res.status(status).json({
      success: false,
      error: status === 503 ? 'Storage not configured' : 'Failed to upload document',
      message: error.message
    });
  }
}

/**
 * Get documents for a booking
 * GET /api/documents/booking/:bookingId
 * 
 * Optional query params:
 * - vehicleIndex: Filter documents for a specific vehicle (0-2)
 */
async function getBookingDocuments(req, res) {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    // Parse optional vehicleIndex filter
    const vehicleIndexFilter = parseVehicleIndexFilter(req.query);

    // Verify access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, carrierId: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const isOwner = booking.userId === userId;
    const isCarrier = booking.carrierId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isCarrier && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Build where clause with optional vehicleIndex filter
    const whereClause = { bookingId };
    if (vehicleIndexFilter !== null) {
      whereClause.vehicleIndex = vehicleIndexFilter;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: [
        { vehicleIndex: 'asc' },
        { stage: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Group documents by type and vehicle
    const grouped = {
      gatePasses: {
        pickup: {},
        dropoff: {}
      },
      bol: null,
      pod: null,
      photos: [],
      other: []
    };

    documents.forEach(doc => {
      if (doc.type === 'gate_pass' || doc.type === 'PICKUP_GATEPASS' || doc.type === 'DROPOFF_GATEPASS') {
        const stage = doc.stage || (doc.type === 'PICKUP_GATEPASS' ? 'pickup' : 'dropoff');
        // Use vehicleIndex from doc, default to 0 for backward compatibility
        const vehicleIdx = doc.vehicleIndex ?? 0;
        grouped.gatePasses[stage][vehicleIdx] = doc;
      } else if (doc.type === 'bol' || doc.type === 'BOL') {
        grouped.bol = doc;
      } else if (doc.type === 'pod' || doc.type === 'POD') {
        grouped.pod = doc;
      } else if (doc.type.toLowerCase().includes('photo')) {
        grouped.photos.push(doc);
      } else {
        grouped.other.push(doc);
      }
    });

    res.json({
      success: true,
      documents,
      grouped,
      total: documents.length,
      // Include filter info in response for debugging/clarity
      filter: vehicleIndexFilter !== null ? { vehicleIndex: vehicleIndexFilter } : null
    });

  } catch (error) {
    console.error('Error fetching booking documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
}

/**
 * Get documents for a quote
 * GET /api/documents/quote/:quoteId
 * 
 * Optional query params:
 * - vehicleIndex: Filter documents for a specific vehicle (0-2)
 */
async function getQuoteDocuments(req, res) {
  try {
    const { quoteId } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    // Parse optional vehicleIndex filter
    const vehicleIndexFilter = parseVehicleIndexFilter(req.query);

    // Verify access
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { userId: true }
    });

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    const isOwner = quote.userId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Build where clause with optional vehicleIndex filter
    const whereClause = { quoteId };
    if (vehicleIndexFilter !== null) {
      whereClause.vehicleIndex = vehicleIndexFilter;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: [
        { vehicleIndex: 'asc' },
        { stage: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Group documents by type and vehicle
    const grouped = {
      gatePasses: {
        pickup: {},
        dropoff: {}
      },
      other: []
    };

    documents.forEach(doc => {
      if (doc.type === 'gate_pass' || doc.type === 'PICKUP_GATEPASS' || doc.type === 'DROPOFF_GATEPASS') {
        const stage = doc.stage || (doc.type === 'PICKUP_GATEPASS' ? 'pickup' : 'dropoff');
        const vehicleIdx = doc.vehicleIndex ?? 0;
        grouped.gatePasses[stage][vehicleIdx] = doc;
      } else {
        grouped.other.push(doc);
      }
    });

    res.json({
      success: true,
      documents,
      grouped,
      total: documents.length,
      filter: vehicleIndexFilter !== null ? { vehicleIndex: vehicleIndexFilter } : null
    });

  } catch (error) {
    console.error('Error fetching quote documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
}

/**
 * Get documents for a draft
 * GET /api/documents/draft/:draftId
 * 
 * Optional query params:
 * - vehicleIndex: Filter documents for a specific vehicle (0-2)
 */
async function getDraftDocuments(req, res) {
  try {
    const { draftId } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;

    // Parse optional vehicleIndex filter
    const vehicleIndexFilter = parseVehicleIndexFilter(req.query);

    // Build where clause
    const whereClause = { userId };
    
    if (vehicleIndexFilter !== null) {
      whereClause.vehicleIndex = vehicleIndexFilter;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: [
        { vehicleIndex: 'asc' },
        { stage: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Group documents by type and vehicle
    const grouped = {
      gatePasses: {
        pickup: {},
        dropoff: {}
      },
      other: []
    };

    documents.forEach(doc => {
      if (doc.type === 'gate_pass' || doc.type === 'PICKUP_GATEPASS' || doc.type === 'DROPOFF_GATEPASS') {
        const stage = doc.stage || (doc.type === 'PICKUP_GATEPASS' ? 'pickup' : 'dropoff');
        const vehicleIdx = doc.vehicleIndex ?? 0;
        grouped.gatePasses[stage][vehicleIdx] = doc;
      } else {
        grouped.other.push(doc);
      }
    });

    res.json({
      success: true,
      documents,
      grouped,
      total: documents.length,
      filter: vehicleIndexFilter !== null ? { vehicleIndex: vehicleIndexFilter } : null
    });

  } catch (error) {
    console.error('Error fetching draft documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
}

/**
 * Get gate passes for a specific vehicle
 * GET /api/documents/booking/:bookingId/vehicle/:vehicleIndex/gate-passes
 */
async function getVehicleGatePasses(req, res) {
  try {
    const { bookingId, vehicleIndex } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;

    // Validate vehicleIndex
    const parsedVehicleIndex = parseInt(vehicleIndex, 10);
    if (isNaN(parsedVehicleIndex) || parsedVehicleIndex < 0 || parsedVehicleIndex > 2) {
      return res.status(400).json({ success: false, error: 'Invalid vehicleIndex. Must be 0, 1, or 2.' });
    }

    // Verify access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, carrierId: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.userId !== userId && booking.carrierId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const gatePasses = await prisma.document.findMany({
      where: {
        bookingId,
        vehicleIndex: parsedVehicleIndex,
        OR: [
          { type: 'gate_pass' },
          { type: 'PICKUP_GATEPASS' },
          { type: 'DROPOFF_GATEPASS' }
        ]
      },
      orderBy: { stage: 'asc' }
    });

    res.json({
      success: true,
      vehicleIndex: parsedVehicleIndex,
      pickup: gatePasses.find(gp => gp.stage === 'pickup' || gp.type === 'PICKUP_GATEPASS') || null,
      dropoff: gatePasses.find(gp => gp.stage === 'dropoff' || gp.type === 'DROPOFF_GATEPASS') || null
    });

  } catch (error) {
    console.error('Error fetching vehicle gate passes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gate passes',
      message: error.message
    });
  }
}

/**
 * Get all gate passes for a booking, grouped by vehicle
 * GET /api/documents/booking/:bookingId/gate-passes
 */
async function getAllGatePasses(req, res) {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    // Verify access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, carrierId: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const isOwner = booking.userId === userId;
    const isCarrier = booking.carrierId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isCarrier && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const gatePasses = await prisma.document.findMany({
      where: {
        bookingId,
        OR: [
          { type: 'gate_pass' },
          { type: 'PICKUP_GATEPASS' },
          { type: 'DROPOFF_GATEPASS' }
        ]
      },
      orderBy: [
        { vehicleIndex: 'asc' },
        { stage: 'asc' }
      ]
    });

    // Group by vehicle index
    const byVehicle = {};
    gatePasses.forEach(gp => {
      const idx = gp.vehicleIndex ?? 0;
      if (!byVehicle[idx]) {
        byVehicle[idx] = { pickup: null, dropoff: null };
      }
      const stage = gp.stage || (gp.type === 'PICKUP_GATEPASS' ? 'pickup' : 'dropoff');
      if (stage === 'pickup') {
        byVehicle[idx].pickup = gp;
      } else if (stage === 'dropoff') {
        byVehicle[idx].dropoff = gp;
      }
    });

    res.json({
      success: true,
      gatePasses,
      byVehicle,
      total: gatePasses.length
    });

  } catch (error) {
    console.error('Error fetching all gate passes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gate passes',
      message: error.message
    });
  }
}

/**
 * Get a single document
 * GET /api/documents/:id
 */
async function getDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        booking: {
          select: { userId: true, carrierId: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check authorization
    const isOwner = document.userId === userId;
    const isBookingOwner = document.booking?.userId === userId;
    const isCarrier = document.booking?.carrierId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isBookingOwner && !isCarrier && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Ensure vehicleIndex is included in response
    res.json({
      success: true,
      document: {
        ...document,
        vehicleIndex: document.vehicleIndex ?? null
      }
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document',
      message: error.message
    });
  }
}

/**
 * Download a document (stream file directly)
 * GET /api/documents/:id/download
 */
async function downloadDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        booking: {
          select: { userId: true, carrierId: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check authorization
    const isOwner = document.userId === userId;
    const isBookingOwner = document.booking?.userId === userId;
    const isCarrier = document.booking?.carrierId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isBookingOwner && !isCarrier && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Supabase: redirect to a signed URL whose Content-Disposition forces
    // the original filename, so the browser saves "carfax.pdf" instead of
    // the bucket key like "documents/1764-abcd.pdf".
    if (document.storageType === 'supabase' && storageService.isConfigured()) {
      const downloadAs =
        document.originalName || document.fileName || 'download';
      const signedUrl = await storageService.createSignedUrl({
        filePath: document.filePath,
        expiresIn: 3600,
        downloadAs,
      });
      return res.redirect(signedUrl);
    }

    // Local storage - resolve the on-disk location and stream the file.
    // resolveLocalFilePath() probes every legacy and current path shape so
    // this endpoint and getDocumentUrl agree about where a file lives.
    const filePath = resolveLocalFilePath(document);

    console.log('📥 [DOWNLOAD] Attempting to serve file:', {
      documentId: id,
      originalFilePath: document.filePath,
      resolvedFilePath: filePath,
      exists: !!filePath
    });

    if (!filePath) {
      console.error('❌ [DOWNLOAD] File not found for document:', id);
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        debug: { filePath: document.filePath, fileUrl: document.fileUrl, fileName: document.fileName }
      });
    }

    // Set headers for download
    const contentType = document.mimeType || 'application/octet-stream';
    const fileName = document.originalName || document.fileName || 'download';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('❌ [DOWNLOAD] Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file' });
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ [DOWNLOAD] Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document',
      message: error.message
    });
  }
}

/**
 * Get document download URL
 * GET /api/documents/:id/url
 */
async function getDocumentUrl(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        booking: {
          select: { userId: true, carrierId: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check authorization
    const isOwner = document.userId === userId;
    const isBookingOwner = document.booking?.userId === userId;
    const isCarrier = document.booking?.carrierId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isBookingOwner && !isCarrier && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Supabase: signed URL good for 1 hour. No `downloadAs` here — the
    // modal uses this URL with window.open() to preview inline; the
    // download icon goes through /api/documents/:id/download which
    // does set the original filename via Content-Disposition.
    if (document.storageType === 'supabase' && storageService.isConfigured()) {
      const signedUrl = await storageService.createSignedUrl({
        filePath: document.filePath,
        expiresIn: 3600,
      });
      return res.json({
        success: true,
        url: signedUrl,
        vehicleIndex: document.vehicleIndex ?? null,
      });
    }

    // Local storage: don't trust whatever shape the DB happens to hold
    // (legacy rows wrote `/uploads/<file>` without the `documents/` subdir
    // and that path 404s under the static mount). Resolve the file on
    // disk and derive the public URL from where it actually lives.
    const resolved = resolveLocalFilePath(document);
    if (!resolved) {
      console.error('❌ [URL] Local file not found for document:', document.id);
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        debug: { fileUrl: document.fileUrl, filePath: document.filePath, fileName: document.fileName }
      });
    }

    res.json({
      success: true,
      url: localPathToPublicUrl(resolved),
      vehicleIndex: document.vehicleIndex ?? null
    });

  } catch (error) {
    console.error('Error getting document URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get document URL',
      message: error.message
    });
  }
}

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId || req.userId;
    const userRoles = req.user?.roles || req.userRoles || '';

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Only owner or admin can delete
    const isOwner = document.userId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // If this is a gate pass linked to a booking vehicle, unlink it first
    if ((document.type === 'gate_pass' || document.type === 'PICKUP_GATEPASS' || document.type === 'DROPOFF_GATEPASS') 
        && document.bookingId && document.vehicleIndex !== null) {
      try {
        const bookingVehicle = await prisma.bookingVehicle.findFirst({
          where: {
            bookingId: document.bookingId,
            vehicleIndex: document.vehicleIndex
          }
        });

        if (bookingVehicle) {
          const updateData = {};
          const stage = document.stage || (document.type === 'PICKUP_GATEPASS' ? 'pickup' : 'dropoff');
          if (stage === 'pickup' && bookingVehicle.pickupGatePassId === document.id) {
            updateData.pickupGatePassId = null;
          }
          if (stage === 'dropoff' && bookingVehicle.dropoffGatePassId === document.id) {
            updateData.dropoffGatePassId = null;
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.bookingVehicle.update({
              where: { id: bookingVehicle.id },
              data: updateData
            });
          }
        }
      } catch (unlinkError) {
        console.warn('⚠️ Could not unlink gate pass from booking vehicle:', unlinkError.message);
      }
    }

    // Delete from storage
    if (document.storageType === 'supabase' && storageService.isConfigured()) {
      try {
        await storageService.removeObject(document.filePath);
      } catch (storageError) {
        console.warn('⚠️ Could not delete from Supabase storage:', storageError.message);
      }
    } else if (document.storageType === 'local' && document.filePath) {
      try {
        if (fs.existsSync(document.filePath)) {
          fs.unlinkSync(document.filePath);
        }
      } catch (e) {
        console.warn('⚠️ Could not delete local file:', e.message);
      }
    }

    // Delete database record
    await prisma.document.delete({
      where: { id }
    });

    res.json({ 
      success: true,
      deletedVehicleIndex: document.vehicleIndex ?? null
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      message: error.message
    });
  }
}

/**
 * Get user's documents with optional filters
 * GET /api/documents
 * 
 * Query params:
 * - type: Filter by document type
 * - vehicleIndex: Filter by vehicle index (0-2)
 * - bookingId: Filter by booking
 * - quoteId: Filter by quote
 */
async function getUserDocuments(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, bookingId, quoteId } = req.query;
    const vehicleIndexFilter = parseVehicleIndexFilter(req.query);

    // Build where clause
    const whereClause = { userId };
    
    if (type) {
      whereClause.type = type;
    }
    if (bookingId) {
      whereClause.bookingId = bookingId;
    }
    if (quoteId) {
      whereClause.quoteId = quoteId;
    }
    if (vehicleIndexFilter !== null) {
      whereClause.vehicleIndex = vehicleIndexFilter;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: [
        { vehicleIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      documents,
      total: documents.length,
      filters: {
        type: type || null,
        bookingId: bookingId || null,
        quoteId: quoteId || null,
        vehicleIndex: vehicleIndexFilter
      }
    });

  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
}

// Multer middleware lives in server.cjs (memoryStorage). Only controller
// functions are exported here.
module.exports = {
  uploadDocument,
  getBookingDocuments,
  getQuoteDocuments,
  getDraftDocuments,
  getVehicleGatePasses,
  getAllGatePasses,
  getDocument,
  getDocumentUrl,
  downloadDocument,  // ✅ NEW: Added download endpoint
  deleteDocument,
  getUserDocuments
};
