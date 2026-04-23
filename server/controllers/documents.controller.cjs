// server/controllers/documents.controller.cjs
// ✅ UPDATED: Multi-vehicle gate pass support with vehicle index and stage
// ✅ Enhanced: Per-vehicle document filtering and validation
// ✅ FIXED: Response format to match frontend expectations
// ✅ FIXED: User ID extraction from auth middleware
// ✅ ADDED: downloadDocument endpoint for direct file streaming

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Initialize Supabase client for cloud storage
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || 'documents';
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure local upload directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOCAL_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, GIF, WebP'));
    }
  }
});

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
 * Upload document to Supabase (or local fallback)
 */
async function uploadToStorage(filePath, fileName, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);

  if (supabase) {
    // Upload to Supabase
    const storagePath = `documents/${Date.now()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    // Delete local file after successful upload
    fs.unlinkSync(filePath);

    return {
      fileUrl: urlData.publicUrl,
      filePath: storagePath,
      storageType: 'supabase'
    };
  } else {
    // Local storage fallback
    return {
      fileUrl: `/uploads/${path.basename(filePath)}`,
      filePath: filePath,
      storageType: 'local'
    };
  }
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

    // Upload to storage
    const storageResult = await uploadToStorage(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    // Create document record with all multi-vehicle fields
    const document = await prisma.document.create({
      data: {
        userId,
        bookingId: bookingId || null,
        quoteId: quoteId || null,
        type,
        fileName: req.file.filename,
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
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
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

    // If Supabase storage, redirect to signed URL
    if (document.storageType === 'supabase' && supabase) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.filePath, 3600);

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return res.redirect(data.signedUrl);
    }

    // Local storage - stream the file
    // Handle both absolute paths and relative paths
    let filePath = document.filePath;
    
    // If filePath is relative (doesn't start with /), resolve it
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(LOCAL_UPLOAD_DIR, path.basename(filePath));
    }
    
    // Fallback to fileName if filePath doesn't exist
    if (!filePath || !fs.existsSync(filePath)) {
      filePath = path.join(LOCAL_UPLOAD_DIR, 'documents', document.fileName);
    }
    
    // Final fallback without documents subdirectory
    if (!fs.existsSync(filePath)) {
      filePath = path.join(LOCAL_UPLOAD_DIR, document.fileName);
    }

    console.log('📥 [DOWNLOAD] Attempting to serve file:', {
      documentId: id,
      originalFilePath: document.filePath,
      resolvedFilePath: filePath,
      exists: fs.existsSync(filePath)
    });

    if (!fs.existsSync(filePath)) {
      console.error('❌ [DOWNLOAD] File not found:', filePath);
      return res.status(404).json({ 
        success: false, 
        error: 'File not found on disk',
        debug: { filePath, originalPath: document.filePath }
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

    // If using Supabase, generate a signed URL for private files
    if (document.storageType === 'supabase' && supabase) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.filePath, 3600); // 1 hour expiry

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return res.json({ 
        success: true,
        url: data.signedUrl,
        vehicleIndex: document.vehicleIndex ?? null
      });
    }

    res.json({ 
      success: true,
      url: document.fileUrl,
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
    if (document.storageType === 'supabase' && supabase) {
      try {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([document.filePath]);
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

// Export multer middleware and controller functions
module.exports = {
  upload: upload.single('file'),
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
