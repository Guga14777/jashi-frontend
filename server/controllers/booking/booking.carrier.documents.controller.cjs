// ============================================================
// FILE: server/controllers/booking/booking.carrier.documents.controller.cjs
// Carrier document operations (photos, POD, etc.)
// ============================================================

const prisma = require('../../db.cjs');

// ============================================================
// GET /api/carrier/loads/:id/documents
// ============================================================
const getLoadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify carrier owns this load
    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or access denied' });
    }

    // Get all documents for this booking
    const documents = await prisma.document.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Group by type
    const grouped = {
      pickupPhotos: documents.filter(d => d.type === 'pickup_photo'),
      deliveryPhotos: documents.filter(d => d.type === 'delivery_photo'),
      pod: documents.find(d => d.type === 'pod') || null,
      gatePass: documents.filter(d => d.type === 'gate_pass'),
      other: documents.filter(d => !['pickup_photo', 'delivery_photo', 'pod', 'gate_pass'].includes(d.type)),
    };

    res.json({
      success: true,
      documents,
      grouped,
    });
  } catch (error) {
    console.error('❌ [GET LOAD DOCUMENTS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/photos/pickup
// ============================================================
const uploadPickupPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { documentIds = [] } = req.body;
    
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or access denied' });
    }

    if (documentIds.length > 0) {
      await prisma.document.updateMany({
        where: {
          id: { in: documentIds },
          userId: carrierId,
        },
        data: {
          bookingId: id,
          type: 'pickup_photo',
        },
      });
    }

    res.json({
      success: true,
      message: `${documentIds.length} pickup photo(s) linked`,
      photosAdded: documentIds.length,
    });
  } catch (error) {
    console.error('❌ [UPLOAD PICKUP PHOTOS] Error:', error);
    res.status(500).json({ error: 'Failed to upload photos', details: error.message });
  }
};

// ============================================================
// POST /api/carrier/loads/:id/photos/delivery
// ============================================================
const uploadDeliveryPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const carrierId = req.userId;
    const { documentIds = [], podDocumentId = null } = req.body;
    
    if (!carrierId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, carrierId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Load not found or access denied' });
    }

    if (documentIds.length > 0) {
      await prisma.document.updateMany({
        where: {
          id: { in: documentIds },
          userId: carrierId,
        },
        data: {
          bookingId: id,
          type: 'delivery_photo',
        },
      });
    }

    if (podDocumentId) {
      await prisma.document.update({
        where: { id: podDocumentId },
        data: {
          bookingId: id,
          type: 'pod',
        },
      });
    }

    res.json({
      success: true,
      message: `${documentIds.length} delivery photo(s) linked`,
      photosAdded: documentIds.length,
      podLinked: !!podDocumentId,
    });
  } catch (error) {
    console.error('❌ [UPLOAD DELIVERY PHOTOS] Error:', error);
    res.status(500).json({ error: 'Failed to upload photos', details: error.message });
  }
};

module.exports = {
  getLoadDocuments,
  uploadPickupPhotos,
  uploadDeliveryPhotos,
};
