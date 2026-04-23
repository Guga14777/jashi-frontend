// ============================================================
// FILE: server/controllers/admin-documents.controller.cjs
// ✅ UPDATED: Admin endpoints for documents grouped by order
// ✅ NEW: Includes BOL documents in the response
// ✅ NEW: Group documents by order with detail view
// ✅ NEW: On-demand BOL generation for admin
// ============================================================

const prisma = global.prisma;

// Import BOL service for on-demand generation
const bolService = require('../services/bol.service.cjs');

// Document type labels for display
const DOC_TYPE_LABELS = {
  bol: 'Bill of Lading',
  gate_pass: 'Gate Pass',
  pickup_photo: 'Pickup Photo',
  delivery_photo: 'Delivery Photo',
  pod: 'Proof of Delivery',
  invoice: 'Invoice',
  contract: 'Contract',
  OTHER: 'Other',
};

// Document type sort order (for grouping display)
const DOC_TYPE_ORDER = ['bol', 'gate_pass', 'pickup_photo', 'delivery_photo', 'pod', 'invoice', 'contract', 'OTHER'];

/**
 * Who uploaded a document? We tag each doc with a source so the admin UI
 * can distinguish customer-uploaded paperwork from carrier field photos
 * from system-generated artifacts like BOL PDFs.
 *
 * Strategy:
 *  1. The type itself is authoritative when unambiguous (bol → system,
 *     pickup_photo/delivery_photo/pod → carrier, gate_pass → customer).
 *  2. Otherwise we fall back to the uploader's role. For multi-role users
 *     (e.g. a seeded test admin), CARRIER wins over CUSTOMER since the
 *     act of uploading is a field operation.
 *  3. 'admin' covers docs uploaded by a user whose only role is ADMIN.
 */
function deriveDocumentSource(doc) {
  const t = String(doc.type || '').toLowerCase();

  if (t === 'bol') return 'system';
  if (['pickup_photo', 'delivery_photo', 'pod', 'detention_proof', 'could_not_pickup_proof'].includes(t)) {
    return 'carrier';
  }
  if (['gate_pass', 'pickup_gatepass', 'dropoff_gatepass'].includes(t)) {
    return 'customer';
  }

  const roles = String(doc.user?.roles || '').toUpperCase();
  if (roles.includes('CARRIER')) return 'carrier';
  if (roles.includes('ADMIN') && !roles.includes('CUSTOMER')) return 'admin';
  if (roles.includes('CUSTOMER')) return 'customer';
  return 'unknown';
}

const SOURCE_LABELS = {
  customer: 'Customer',
  carrier: 'Carrier',
  admin: 'Admin',
  system: 'System',
  unknown: 'Unknown',
};

/**
 * GET /api/admin/documents
 * Returns all documents with user (customer) information
 * Legacy endpoint - still works for backward compatibility
 */
exports.listAllDocuments = async (req, res) => {
  try {
    const userId = req.userId;

    const { page = 1, limit = 100, type, storageType } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (storageType && storageType !== 'all') {
      where.storageType = storageType;
    }

    // Fetch documents with user info
    const [documents, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          booking: {
            select: {
              id: true,
              ref: true,
              orderNumber: true,
              status: true,
            },
          },
          quote: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    console.log(`📄 Admin fetched ${documents.length} documents`);

    res.json({
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('❌ Admin list documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
};

/**
 * GET /api/admin/documents/by-order
 * ✅ NEW: Returns documents grouped by order (one row per order)
 * Query params: page, limit, search
 */
exports.listDocumentsByOrder = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    console.log('📄 [ADMIN] Fetching documents grouped by order...');

    // First, get all bookings that have documents
    const bookingsWithDocsWhere = {
      documents: {
        some: {}, // Has at least one document
      },
    };

    // Add search filter if provided
    if (search) {
      bookingsWithDocsWhere.OR = [
        { orderNumber: !isNaN(parseInt(search)) ? parseInt(search) : undefined },
        { ref: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { customerFirstName: { contains: search, mode: 'insensitive' } },
        { customerLastName: { contains: search, mode: 'insensitive' } },
      ].filter(condition => {
        // Remove undefined orderNumber condition if search is not a number
        if (condition.orderNumber === undefined) return false;
        return true;
      });
      
      // If search is a number, also search by order number
      if (!isNaN(parseInt(search))) {
        bookingsWithDocsWhere.OR = [
          { orderNumber: parseInt(search) },
          { ref: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    // Get total count of bookings with documents
    const totalBookings = await prisma.booking.count({
      where: bookingsWithDocsWhere,
    });

    // Get bookings with document counts and latest document date
    const bookingsWithDocs = await prisma.booking.findMany({
      where: bookingsWithDocsWhere,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ref: true,
        orderNumber: true,
        status: true,
        fromCity: true,
        toCity: true,
        vehicle: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        documents: {
          select: {
            id: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Transform the data to include document counts by type
    const orders = bookingsWithDocs.map(booking => {
      const docs = booking.documents || [];
      
      // Count documents by type
      const docCountsByType = {};
      let lastDocAt = null;
      
      docs.forEach(doc => {
        const type = doc.type || 'OTHER';
        docCountsByType[type] = (docCountsByType[type] || 0) + 1;
        
        // Track latest document date
        if (!lastDocAt || new Date(doc.createdAt) > new Date(lastDocAt)) {
          lastDocAt = doc.createdAt;
        }
      });

      // Get customer name (prefer booking fields, fallback to user)
      const customerName = [
        booking.customerFirstName || booking.user?.firstName,
        booking.customerLastName || booking.user?.lastName,
      ].filter(Boolean).join(' ') || 'Unknown';

      return {
        orderId: booking.orderNumber,
        bookingId: booking.id,
        ref: booking.ref,
        status: booking.status,
        route: `${booking.fromCity || ''} → ${booking.toCity || ''}`.trim() || '—',
        vehicle: booking.vehicle || '—',
        customer: {
          id: booking.user?.id,
          name: customerName,
          email: booking.user?.email || '',
          phone: booking.customerPhone || booking.user?.phone || '',
        },
        docsCount: docs.length,
        docCountsByType,
        lastDocAt,
        createdAt: booking.createdAt,
        // Include document type summary for display
        docTypeSummary: Object.entries(docCountsByType)
          .sort((a, b) => DOC_TYPE_ORDER.indexOf(a[0]) - DOC_TYPE_ORDER.indexOf(b[0]))
          .map(([type, count]) => ({
            type,
            label: DOC_TYPE_LABELS[type] || type,
            count,
          })),
      };
    });

    console.log(`✅ [ADMIN] Found ${orders.length} orders with documents (total: ${totalBookings})`);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalBookings,
        totalPages: Math.ceil(totalBookings / limitNum),
      },
    });

  } catch (error) {
    console.error('❌ Admin list documents by order error:', error);
    res.status(500).json({ error: 'Failed to list documents by order' });
  }
};

/**
 * GET /api/admin/documents/order/:orderNumber
 * ✅ NEW: Returns all documents for a specific order, grouped by type
 */
exports.getOrderDocuments = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const orderNum = parseInt(orderNumber);

    if (isNaN(orderNum)) {
      return res.status(400).json({ error: 'Invalid order number' });
    }

    console.log(`📄 [ADMIN] Fetching documents for order #${orderNum}...`);

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: { orderNumber: orderNum },
      select: {
        id: true,
        ref: true,
        orderNumber: true,
        status: true,
        fromCity: true,
        toCity: true,
        vehicle: true,
        vehicleType: true,
        transportType: true,
        price: true,
        miles: true,
        pickupDate: true,
        dropoffDate: true,
        createdAt: true,
        userId: true,
        carrierId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        pickup: true,
        dropoff: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get all documents for this booking
    const documents = await prisma.document.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
          },
        },
      },
    });

    // Group documents by type
    const groupedDocs = {};
    DOC_TYPE_ORDER.forEach(type => {
      groupedDocs[type] = [];
    });

    documents.forEach(doc => {
      const type = doc.type || 'OTHER';
      if (!groupedDocs[type]) {
        groupedDocs[type] = [];
      }
      
      // Get uploader name + source (customer|carrier|admin|system)
      const uploaderName = doc.user
        ? [doc.user.firstName, doc.user.lastName].filter(Boolean).join(' ') || doc.user.email
        : 'Unknown';
      const source = deriveDocumentSource(doc);

      groupedDocs[type].push({
        id: doc.id,
        type: doc.type,
        typeLabel: DOC_TYPE_LABELS[doc.type] || doc.type,
        source,
        sourceLabel: SOURCE_LABELS[source] || source,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileUrl: doc.fileUrl,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        storageType: doc.storageType || 'local',
        createdAt: doc.createdAt,
        uploadedBy: {
          id: doc.user?.id,
          name: uploaderName,
          email: doc.user?.email,
        },
      });
    });

    // Remove empty groups and convert to array format
    const documentGroups = DOC_TYPE_ORDER
      .filter(type => groupedDocs[type] && groupedDocs[type].length > 0)
      .map(type => ({
        type,
        label: DOC_TYPE_LABELS[type] || type,
        documents: groupedDocs[type],
        count: groupedDocs[type].length,
      }));

    // Add any other types that weren't in the predefined order
    Object.keys(groupedDocs).forEach(type => {
      if (!DOC_TYPE_ORDER.includes(type) && groupedDocs[type].length > 0) {
        documentGroups.push({
          type,
          label: DOC_TYPE_LABELS[type] || type,
          documents: groupedDocs[type],
          count: groupedDocs[type].length,
        });
      }
    });

    // Get customer name
    const customerName = [
      booking.customerFirstName || booking.user?.firstName,
      booking.customerLastName || booking.user?.lastName,
    ].filter(Boolean).join(' ') || 'Unknown';

    // ✅ Check if BOL exists
    const hasBol = documents.some(doc => doc.type === 'bol');

    console.log(`✅ [ADMIN] Found ${documents.length} documents for order #${orderNum} (hasBol: ${hasBol})`);

    res.json({
      order: {
        orderId: booking.orderNumber,
        bookingId: booking.id,
        ref: booking.ref,
        status: booking.status,
        route: {
          from: booking.fromCity || '',
          to: booking.toCity || '',
          display: `${booking.fromCity || ''} → ${booking.toCity || ''}`.trim() || '—',
        },
        vehicle: booking.vehicle || '—',
        vehicleType: booking.vehicleType,
        transportType: booking.transportType,
        price: booking.price,
        miles: booking.miles,
        pickupDate: booking.pickupDate,
        dropoffDate: booking.dropoffDate,
        createdAt: booking.createdAt,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
      },
      customer: {
        id: booking.user?.id,
        name: customerName,
        firstName: booking.customerFirstName || booking.user?.firstName,
        lastName: booking.customerLastName || booking.user?.lastName,
        email: booking.user?.email || '',
        phone: booking.customerPhone || booking.user?.phone || '',
      },
      documentGroups,
      totalDocuments: documents.length,
      hasBol, // ✅ Tell frontend if BOL exists
      allDocuments: documents.map(doc => {
        const source = deriveDocumentSource(doc);
        return {
          id: doc.id,
          type: doc.type,
          typeLabel: DOC_TYPE_LABELS[doc.type] || doc.type,
          source,
          sourceLabel: SOURCE_LABELS[source] || source,
          fileName: doc.fileName,
          originalName: doc.originalName,
          fileUrl: doc.fileUrl,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          storageType: doc.storageType || 'local',
          createdAt: doc.createdAt,
        };
      }),
    });

  } catch (error) {
    console.error('❌ Admin get order documents error:', error);
    res.status(500).json({ error: 'Failed to get order documents' });
  }
};

/**
 * GET /api/admin/orders/:orderNumber/bol
 * ✅ NEW: Generate and download BOL on-demand for admin
 * If BOL exists in DB, returns existing file
 * If BOL doesn't exist, generates it on-the-fly
 */
exports.getOrderBol = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const adminUserId = req.userId;
    const orderNum = parseInt(orderNumber);

    if (isNaN(orderNum)) {
      return res.status(400).json({ error: 'Invalid order number' });
    }

    console.log(`📄 [ADMIN BOL] Generating/fetching BOL for order #${orderNum}...`);

    // 1. Find the booking with all necessary data
    const booking = await prisma.booking.findFirst({
      where: { orderNumber: orderNum },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        quoteRelation: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 2. Check if carrier is assigned - fetch carrier info if so
    let carrier = null;
    if (booking.carrierId) {
      carrier = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          mcNumber: true,
          dotNumber: true,
        },
      });
    }

    // 3. Prepare booking object with carrier data for BOL generation
    const bookingWithCarrier = {
      ...booking,
      carrier,
    };

    // 4. Check if BOL already exists
    const existingBol = await bolService.getExistingBolDocument(booking.id);

    let pdfBuffer;
    
    if (existingBol && existingBol.filePath) {
      console.log(`📄 [ADMIN BOL] Found existing BOL document: ${existingBol.id}`);
      
      // Try to download from storage
      pdfBuffer = await bolService.downloadStoredBol(existingBol.filePath);
      
      if (!pdfBuffer) {
        console.log(`⚠️ [ADMIN BOL] Could not download stored BOL, regenerating...`);
        // Regenerate if download failed
        pdfBuffer = await bolService.generateBolPdf(bookingWithCarrier);
      }
    } else {
      console.log(`📄 [ADMIN BOL] No existing BOL, generating new one...`);
      
      // Generate new BOL and optionally store it
      const result = await bolService.generateAndStoreBol(bookingWithCarrier, adminUserId);
      pdfBuffer = result.pdfBuffer;
      
      if (result.stored) {
        console.log(`✅ [ADMIN BOL] BOL generated and stored: ${result.document?.id}`);
      } else {
        console.log(`✅ [ADMIN BOL] BOL generated (not stored)`);
      }
    }

    // 5. Send PDF response
    const fileName = `BOL-${orderNum}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

    console.log(`✅ [ADMIN BOL] BOL sent for order #${orderNum}`);

  } catch (error) {
    console.error('❌ Admin get order BOL error:', error);
    res.status(500).json({ error: 'Failed to generate BOL' });
  }
};

/**
 * GET /api/admin/documents/:id
 * Get single document with full details
 */
exports.getDocumentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        booking: {
          select: {
            id: true,
            ref: true,
            orderNumber: true,
            status: true,
            fromCity: true,
            toCity: true,
            vehicle: true,
          },
        },
        quote: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            fromZip: true,
            toZip: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ 
      document: {
        ...document,
        typeLabel: DOC_TYPE_LABELS[document.type] || document.type,
      }
    });

  } catch (error) {
    console.error('❌ Get document details error:', error);
    res.status(500).json({ error: 'Failed to get document details' });
  }
};

/**
 * DELETE /api/admin/documents/:id
 * Admin delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Supabase storage if it's stored there
    if (document.storageType === 'supabase' && document.filePath) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase.storage.from('documents').remove([document.filePath]);
          console.log(`🗑️ Deleted from Supabase: ${document.filePath}`);
        }
      } catch (storageError) {
        console.error('⚠️ Failed to delete from storage:', storageError.message);
      }
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    });

    console.log(`🗑️ Admin deleted document: ${id}`);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('❌ Admin delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

/**
 * GET /api/admin/documents/stats
 * ✅ NEW: Get document statistics for admin dashboard
 */
exports.getDocumentStats = async (req, res) => {
  try {
    // Get total counts by type
    const typeCounts = await prisma.document.groupBy({
      by: ['type'],
      _count: true,
    });

    // Get total counts by storage type
    const storageCounts = await prisma.document.groupBy({
      by: ['storageType'],
      _count: true,
    });

    // Get total document count
    const totalDocuments = await prisma.document.count();

    // Get total orders with documents
    const ordersWithDocs = await prisma.booking.count({
      where: {
        documents: {
          some: {},
        },
      },
    });

    // Format type counts
    const byType = {};
    typeCounts.forEach(tc => {
      byType[tc.type || 'OTHER'] = tc._count;
    });

    // Format storage counts
    const byStorage = {};
    storageCounts.forEach(sc => {
      byStorage[sc.storageType || 'local'] = sc._count;
    });

    res.json({
      totalDocuments,
      ordersWithDocuments: ordersWithDocs,
      byType,
      byStorage,
      typeLabels: DOC_TYPE_LABELS,
    });

  } catch (error) {
    console.error('❌ Get document stats error:', error);
    res.status(500).json({ error: 'Failed to get document stats' });
  }
};
