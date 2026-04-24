/**
 * Quotes Create Controller
 * Handles quote creation and acceptance
 */

const prisma = require('../../db.cjs');
const {
  normalizeVehiclesData,
  buildVehiclesStorageObject,
  extractVehiclesFromQuote,
  extractPrimaryVin,
  buildPricingBreakdown,
  DEFAULT_SOURCE,
  QUOTE_STATUS,
} = require('../../services/quotes/index.cjs');

/**
 * Create new quote
 */
async function createQuote(req, res) {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🚀 [QUOTES] CREATE QUOTE REQUEST');
    console.log('═══════════════════════════════════════════════════════');
    
    const userId = req.userId;
    const userEmail = req.user?.email || req.userEmail;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
    
    const {
      fromZip,
      toZip,
      miles,
      durationHours,
      vehicle,
      vehicles,
      vehiclesCount,
      transportType,
      offer,
      customerOffer,
      likelihood,
      marketAvg,
      recommendedMin,
      recommendedMax,
      pickupDate,
      notes,
      source = DEFAULT_SOURCE,
      pickupAddressId,
      dropoffAddressId,
      vehicleDetails,
      vin,
    } = req.body;

    const finalOffer = parseFloat(customerOffer) || parseFloat(offer) || 0;

    // Validate required fields
    const hasVehicle = (Array.isArray(vehicles) && vehicles.length > 0) || 
                       (vehicles && typeof vehicles === 'object' && Object.keys(vehicles).length > 0) ||
                       vehicle;
    
    if (!fromZip || !toZip || !transportType || finalOffer === 0) {
      if (!hasVehicle) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['fromZip', 'toZip', 'vehicle or vehicles[]', 'transportType', 'offer or customerOffer']
        });
      }
    }

    // Normalize vehicles data for multi-vehicle support
    const { vehiclesList, vehiclesCount: normalizedCount, legacyData } = normalizeVehiclesData(
      vehicles,
      vehiclesCount,
      vehicle,
      vin,
      vehicleDetails
    );
    
    const vehiclesStorageData = buildVehiclesStorageObject(vehiclesList, normalizedCount, legacyData);
    
    // Extract primary vehicle name for backward compatibility
    const primaryVehicle = vehiclesList.length > 0 
      ? (vehiclesList[0].vehicle || vehiclesList[0].name || vehicle || '') 
      : (vehicle || '');

    console.log('📦 [QUOTES] Vehicles data:', {
      inputVehicles: vehicles,
      inputVehiclesCount: vehiclesCount,
      normalizedVehiclesList: vehiclesList,
      normalizedCount,
      primaryVehicle,
    });

    const quoteData = {
      userId,
      userEmail: userEmail || user?.email || '',
      role: req.user?.role || 'CUSTOMER',
      fromZip: String(fromZip),
      toZip: String(toZip),
      miles: parseInt(miles) || 0,
      durationHours: Number.isFinite(parseFloat(durationHours)) ? parseFloat(durationHours) : null,
      vehicle: String(primaryVehicle),
      vehicles: vehiclesStorageData,
      transportType: String(transportType),
      offer: finalOffer,
      likelihood: parseInt(likelihood) || 50,
      marketAvg: parseFloat(marketAvg) || 0,
      recommendedMin: parseFloat(recommendedMin) || 0,
      recommendedMax: parseFloat(recommendedMax) || 0,
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      notes: notes || null,
      status: QUOTE_STATUS.WAITING,
      source: source || DEFAULT_SOURCE,
      ...(pickupAddressId && { pickupAddress: { connect: { id: pickupAddressId } } }),
      ...(dropoffAddressId && { dropoffAddress: { connect: { id: dropoffAddressId } } }),
    };

    const quote = await prisma.quote.create({
      data: quoteData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    console.log('✅ Quote created:', quote.id, 'orderNumber:', quote.orderNumber, 'offer:', quote.offer, 'vehiclesCount:', normalizedCount);

    const pricing = buildPricingBreakdown(quote.offer);
    const { vehicles: responseVehicles, vehiclesCount: responseVehiclesCount } = extractVehiclesFromQuote(quote);
    const responseVin = extractPrimaryVin(quote);

    res.status(201).json({
      success: true,
      quote: {
        ...quote,
        ...pricing,
        vin: responseVin,
        vehicles: responseVehicles,
        vehiclesCount: responseVehiclesCount,
      },
    });

  } catch (error) {
    // Detailed diagnostic logging so Railway logs expose the exact failure
    // (Prisma validation/constraint, type coercion, etc.) instead of just a
    // stack trace without context.
    const bodyForLog = { ...(req.body || {}) };
    if (bodyForLog.notes && typeof bodyForLog.notes === 'string' && bodyForLog.notes.length > 200) {
      bodyForLog.notes = `${bodyForLog.notes.slice(0, 200)}…(truncated)`;
    }
    console.error('❌ [QUOTES] Create quote error:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
      userId: req.userId,
      userEmail: req.userEmail,
      body: bodyForLog,
    });
    if (error?.stack) console.error(error.stack);

    // Prisma validation errors carry a `code` like P2000/P2002/P2003/P2025 —
    // those indicate a data problem, not a server bug. Return 400 so the
    // client shows a useful message instead of a generic "temporarily down."
    const isPrismaValidation = typeof error?.code === 'string' && /^P2\d{3}$/.test(error.code);
    const status = isPrismaValidation ? 400 : 500;

    res.status(status).json({
      error: isPrismaValidation ? 'Invalid quote data' : 'Failed to create quote',
      code: error?.code || null,
      details: error?.message || String(error),
      meta: error?.meta || undefined,
    });
  }
}

/**
 * Accept/Book a quote
 */
async function acceptQuote(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const quote = await prisma.quote.findFirst({
      where: { id, userId }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Set status to 'booked' NOT 'accepted'
    // 'accepted' should only happen when carrier accepts
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: { status: QUOTE_STATUS.BOOKED },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    const pricing = buildPricingBreakdown(updatedQuote.offer);
    const { vehicles: responseVehicles, vehiclesCount: responseVehiclesCount } = extractVehiclesFromQuote(updatedQuote);
    const responseVin = extractPrimaryVin(updatedQuote);

    res.json({
      success: true,
      quote: {
        ...updatedQuote,
        ...pricing,
        vin: responseVin,
        vehicles: responseVehicles,
        vehiclesCount: responseVehiclesCount,
      },
    });

  } catch (error) {
    console.error('❌ Accept quote error:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
}

module.exports = {
  createQuote,
  acceptQuote,
};
