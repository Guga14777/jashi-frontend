// ============================================================
// FILE: server/controllers/booking/booking.bol.controller.cjs
// Bill of Lading operations
// ============================================================

const prisma = require('../../db.cjs');
const { 
  generateBolPdf, 
  generateAndStoreBol, 
  getExistingBolDocument, 
  downloadStoredBol 
} = require('../../services/bol.service.cjs');

// ============================================================
// GET BOL PDF
// GET /api/bookings/:id/bol
// ============================================================
const getBol = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const forceRegenerate = req.query.regenerate === 'true';

    console.log('📄 [BOL] Request for BOL PDF:', { bookingId: id, forceRegenerate });

    const booking = await prisma.booking.findFirst({
      where: { id, OR: [{ userId }, { carrierId: userId }] },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true } },
        pickupGatePass: true, 
        dropoffGatePass: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    // Check for existing stored BOL
    if (!forceRegenerate) {
      const existingBolDoc = await getExistingBolDocument(id);
      
      if (existingBolDoc && existingBolDoc.filePath) {
        const storedPdfBuffer = await downloadStoredBol(existingBolDoc.filePath);
        
        if (storedPdfBuffer) {
          console.log('✅ [BOL] Serving stored BOL from Supabase');
          
          const filename = existingBolDoc.fileName || `BOL-${booking.orderNumber || booking.id.slice(-6)}.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', storedPdfBuffer.length);
          res.setHeader('X-BOL-Source', 'stored');
          res.setHeader('X-BOL-Document-Id', existingBolDoc.id);
          return res.send(storedPdfBuffer);
        }
      }
    }

    // Fetch carrier data if assigned
    let carrierData = null;
    if (booking.carrierId) {
      carrierData = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true, mcNumber: true, dotNumber: true },
      });
    }

    const bookingWithCarrier = { ...booking, carrier: carrierData };

    // Generate and store new BOL
    console.log('📄 [BOL] Generating new BOL PDF...');
    
    const { pdfBuffer, document: bolDocument, stored, error } = await generateAndStoreBol(
      bookingWithCarrier, 
      userId
    );

    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to generate BOL PDF' });
    }

    const filename = `BOL-${booking.orderNumber || booking.id.slice(-6)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-BOL-Source', stored ? 'generated-and-stored' : 'generated-only');
    if (bolDocument) {
      res.setHeader('X-BOL-Document-Id', bolDocument.id);
    }
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ [BOL] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate BOL PDF', details: error.message });
  }
};

// ============================================================
// GET BOL INFO (without downloading)
// GET /api/bookings/:id/bol/info
// ============================================================
const getBolInfo = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id, OR: [{ userId }, { carrierId: userId }] },
      select: { id: true, orderNumber: true, status: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    const bolDocument = await getExistingBolDocument(id);

    if (!bolDocument) {
      return res.json({
        success: true,
        exists: false,
        message: 'No BOL has been generated yet for this booking',
        booking: { id: booking.id, orderNumber: booking.orderNumber },
      });
    }

    res.json({
      success: true,
      exists: true,
      document: {
        id: bolDocument.id,
        fileName: bolDocument.fileName,
        fileUrl: bolDocument.fileUrl,
        createdAt: bolDocument.createdAt,
        fileSize: bolDocument.fileSize,
        storageType: bolDocument.storageType,
      },
      booking: { id: booking.id, orderNumber: booking.orderNumber },
    });

  } catch (error) {
    console.error('❌ [BOL] Get BOL info error:', error);
    res.status(500).json({ error: 'Failed to get BOL info', details: error.message });
  }
};

// ============================================================
// REGENERATE BOL (force new generation)
// POST /api/bookings/:id/bol/regenerate
// ============================================================
const regenerateBol = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    console.log('🔄 [BOL] Force regenerating BOL for booking:', id);

    const booking = await prisma.booking.findFirst({
      where: { id, OR: [{ userId }, { carrierId: userId }] },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true } },
        pickupGatePass: true,
        dropoffGatePass: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    let carrierData = null;
    if (booking.carrierId) {
      carrierData = await prisma.user.findUnique({
        where: { id: booking.carrierId },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, companyName: true, mcNumber: true, dotNumber: true },
      });
    }

    const bookingWithCarrier = { ...booking, carrier: carrierData };

    const { pdfBuffer, document: bolDocument, stored, error } = await generateAndStoreBol(
      bookingWithCarrier,
      userId
    );

    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to regenerate BOL PDF' });
    }

    res.json({
      success: true,
      message: 'BOL regenerated successfully',
      stored,
      document: bolDocument ? {
        id: bolDocument.id,
        fileName: bolDocument.fileName,
        fileUrl: bolDocument.fileUrl,
        createdAt: bolDocument.createdAt,
      } : null,
    });

  } catch (error) {
    console.error('❌ [BOL] Regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate BOL', details: error.message });
  }
};

module.exports = {
  getBol,
  getBolInfo,
  regenerateBol,
};
