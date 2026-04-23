/**
 * Quotes Debug Controller
 * Debug and test helpers for development
 * 
 * Note: These endpoints should be disabled or protected in production
 */

const prisma = require('../../db.cjs');
const {
  extractVehiclesFromQuote,
  extractPrimaryVin,
} = require('../../services/quotes/index.cjs');

/**
 * Debug: Get raw quote data without transformation
 * GET /api/quotes/:id/debug (development only)
 */
async function getQuoteRaw(req, res) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }
    
    const { id } = req.params;
    const userId = req.userId;
    
    const quote = await prisma.quote.findFirst({
      where: { id, userId },
      include: {
        user: true,
        pickupAddress: true,
        dropoffAddress: true,
        documents: true,
        bookings: {
          include: {
            documents: true,
            pickupGatePass: true,
            dropoffGatePass: true,
          },
        },
      },
    });
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({
      success: true,
      raw: quote,
      extracted: {
        vehicles: extractVehiclesFromQuote(quote, quote.bookings?.[0]),
        primaryVin: extractPrimaryVin(quote, quote.bookings?.[0]),
      },
    });
    
  } catch (error) {
    console.error('❌ Debug get quote error:', error);
    res.status(500).json({ error: 'Debug operation failed', details: error.message });
  }
}

/**
 * Debug: Validate vehicles data structure
 * POST /api/quotes/debug/validate-vehicles (development only)
 */
async function validateVehiclesData(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }
    
    const { vehicles, vehiclesCount, vehicle, vin, vehicleDetails } = req.body;
    
    const {
      normalizeVehiclesData,
      buildVehiclesStorageObject,
    } = require('../../services/quotes/index.cjs');
    
    const { vehiclesList, vehiclesCount: normalizedCount, legacyData } = normalizeVehiclesData(
      vehicles,
      vehiclesCount,
      vehicle,
      vin,
      vehicleDetails
    );
    
    const storageObject = buildVehiclesStorageObject(vehiclesList, normalizedCount, legacyData);
    
    res.json({
      success: true,
      input: { vehicles, vehiclesCount, vehicle, vin, vehicleDetails },
      normalized: {
        vehiclesList,
        vehiclesCount: normalizedCount,
        legacyData,
      },
      storageObject,
    });
    
  } catch (error) {
    console.error('❌ Debug validate vehicles error:', error);
    res.status(500).json({ error: 'Validation failed', details: error.message });
  }
}

/**
 * Debug: Check quote-booking relationships
 * GET /api/quotes/:id/debug/relationships (development only)
 */
async function checkRelationships(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }
    
    const { id } = req.params;
    
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        bookings: {
          select: {
            id: true,
            ref: true,
            orderNumber: true,
            status: true,
            carrierId: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
          },
        },
      },
    });
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    const booking = quote.bookings?.[0];
    const hasCarrier = booking?.carrierId != null;
    const carrierStatuses = ['assigned', 'in_transit', 'delivered', 'picked_up'];
    const isCarrierAccepted = booking && (hasCarrier || carrierStatuses.includes(booking.status));
    
    res.json({
      success: true,
      quote: {
        id: quote.id,
        orderNumber: quote.orderNumber,
        status: quote.status,
      },
      booking: booking ? {
        id: booking.id,
        ref: booking.ref,
        orderNumber: booking.orderNumber,
        status: booking.status,
        carrierId: booking.carrierId,
      } : null,
      analysis: {
        hasBooking: !!booking,
        hasCarrier,
        isCarrierAccepted,
        documentCount: quote.documents?.length || 0,
        effectiveOrderNumber: booking?.orderNumber || quote.orderNumber,
      },
    });
    
  } catch (error) {
    console.error('❌ Debug check relationships error:', error);
    res.status(500).json({ error: 'Check failed', details: error.message });
  }
}

module.exports = {
  getQuoteRaw,
  validateVehiclesData,
  checkRelationships,
};
