/**
 * Draft Controller - PostgreSQL Version
 * Handles draft quotes/bookings
 * Supports multi-vehicle bookings (1-3 vehicles)
 */

const prisma = require('../db.cjs');

// Helper to ensure valid JSON objects
const sanitizeJson = (data) => {
  if (!data || typeof data !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.error('JSON sanitization error:', err);
    return {};
  }
};

// Helper to convert empty objects or invalid values to null for string fields
const sanitizeStringField = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && Object.keys(value).length === 0) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return typeof value === 'string' ? value : String(value);
};

// ============================================================
// MULTI-VEHICLE HELPERS
// ============================================================

/**
 * Normalize vehiclesCount to be within valid range (1-3)
 * Always returns a number between 1 and 3
 * @param {any} n - The vehiclesCount value to normalize
 * @returns {number} - A number between 1 and 3
 */
const normalizeVehiclesCount = (n) => {
  if (n === undefined || n === null) return 1;
  const num = parseInt(n, 10);
  if (isNaN(num) || num < 1) return 1;
  if (num > 3) return 3;
  return num;
};

/**
 * Normalize vehicles array to ensure it's valid and within length 1-3
 * @param {any} arr - The vehicles array to normalize
 * @param {number} targetCount - Optional target count to pad/trim to
 * @returns {Array} - A valid array of length 1-3 (never null)
 */
const normalizeVehiclesArray = (arr, targetCount = null) => {
  let vehicles = [];
  
  // If arr is a valid array, use it as base
  if (arr && Array.isArray(arr) && arr.length > 0) {
    vehicles = arr.map((vehicle, index) => {
      if (!vehicle || typeof vehicle !== 'object') {
        return { index };
      }
      return sanitizeJson({ ...vehicle, index });
    });
  }
  
  // Determine target length
  const count = targetCount !== null 
    ? normalizeVehiclesCount(targetCount)
    : Math.max(1, Math.min(3, vehicles.length || 1));
  
  // Pad array if needed (add empty vehicle slots)
  while (vehicles.length < count) {
    vehicles.push({ index: vehicles.length });
  }
  
  // Trim array if needed (clamp to max 3 and to target count)
  vehicles = vehicles.slice(0, count);
  
  // Re-index to ensure indices are correct
  vehicles = vehicles.map((v, i) => ({ ...v, index: i }));
  
  return vehicles;
};

/**
 * Convert legacy single-vehicle draft fields to a vehicles array
 * This ensures backward compatibility when reading old drafts
 * @param {Object} draft - The draft record from the database
 * @returns {Array} - A vehicles array of length 1
 */
const legacyToVehicles = (draft) => {
  if (!draft) return [{ index: 0 }];
  
  const vehicle = {
    index: 0,
    // Vehicle details from vehicleDetails JSON
    vehicleDetails: draft.vehicleDetails || {},
    // Pickup info
    pickup: draft.pickup || {},
    pickupOriginType: draft.pickupOriginType || null,
    dealerFirstName: draft.dealerFirstName || null,
    dealerLastName: draft.dealerLastName || null,
    dealerPhone: draft.dealerPhone || null,
    auctionGatePass: draft.auctionGatePass || null,
    auctionName: draft.auctionName || null,
    auctionBuyerNumber: draft.auctionBuyerNumber || null,
    privateFirstName: draft.privateFirstName || null,
    privateLastName: draft.privateLastName || null,
    privatePhone: draft.privatePhone || null,
    pickupGatePassId: draft.pickupGatePassId || null,
    // Dropoff info
    dropoff: draft.dropoff || {},
    dropoffDestinationType: draft.dropoffDestinationType || null,
    dropoffDealerFirstName: draft.dropoffDealerFirstName || null,
    dropoffDealerLastName: draft.dropoffDealerLastName || null,
    dropoffDealerPhone: draft.dropoffDealerPhone || null,
    dropoffAuctionGatePass: draft.dropoffAuctionGatePass || null,
    dropoffAuctionName: draft.dropoffAuctionName || null,
    dropoffAuctionBuyerNumber: draft.dropoffAuctionBuyerNumber || null,
    dropoffPrivateFirstName: draft.dropoffPrivateFirstName || null,
    dropoffPrivateLastName: draft.dropoffPrivateLastName || null,
    dropoffPrivatePhone: draft.dropoffPrivatePhone || null,
    dropoffGatePassId: draft.dropoffGatePassId || null,
    // Scheduling
    scheduling: draft.scheduling || {},
  };
  
  return [vehicle];
};

/**
 * Normalize a draft response to always include vehicles array and vehiclesCount
 * @param {Object} draft - The draft record from the database
 * @returns {Object} - The draft with normalized vehicles data
 */
const normalizeDraftResponse = (draft) => {
  if (!draft) return draft;
  
  const normalized = { ...draft };
  
  // Check if draft has a valid vehicles array stored
  const hasValidVehiclesArray = draft.vehicles && 
    Array.isArray(draft.vehicles) && 
    draft.vehicles.length > 0;
  
  // Check if draft has stored vehiclesCount
  const storedVehiclesCount = draft.vehiclesCount 
    ? normalizeVehiclesCount(draft.vehiclesCount) 
    : null;
  
  if (hasValidVehiclesArray) {
    // Use stored vehicles array
    normalized.vehicles = draft.vehicles;
    // vehiclesCount should match array length, but use stored count if it's larger
    // (handles case where user set count but hasn't filled all vehicle data yet)
    normalized.vehiclesCount = storedVehiclesCount 
      ? Math.max(draft.vehicles.length, storedVehiclesCount)
      : draft.vehicles.length;
    
    // Pad vehicles array if vehiclesCount is larger
    if (normalized.vehiclesCount > normalized.vehicles.length) {
      normalized.vehicles = normalizeVehiclesArray(normalized.vehicles, normalized.vehiclesCount);
    }
  } else if (storedVehiclesCount && storedVehiclesCount > 1) {
    // Has vehiclesCount but no vehicles array - create padded array from legacy
    const legacyVehicle = legacyToVehicles(draft)[0];
    normalized.vehicles = [legacyVehicle];
    // Pad to match vehiclesCount
    while (normalized.vehicles.length < storedVehiclesCount) {
      normalized.vehicles.push({ index: normalized.vehicles.length });
    }
    normalized.vehiclesCount = storedVehiclesCount;
  } else {
    // Pure legacy draft - generate vehicles array from legacy fields
    normalized.vehicles = legacyToVehicles(draft);
    normalized.vehiclesCount = 1;
  }
  
  return normalized;
};

/**
 * Compute final vehiclesCount and vehicles array from request body
 * Handles both multi-vehicle and legacy formats
 * @param {Object} body - The request body
 * @param {Object} existingDraft - Optional existing draft for merging
 * @returns {Object} - { vehiclesCount, vehicles, vehicleDetails }
 */
const computeVehiclesData = (body, existingDraft = null) => {
  const { vehicles, vehiclesCount, vehicleDetails } = body;
  
  // Determine the target vehiclesCount
  let targetCount = normalizeVehiclesCount(vehiclesCount);
  
  // Check if vehicles is an array (multi-vehicle mode)
  const isMultiVehicleMode = Array.isArray(vehicles);
  
  let finalVehicles = null;
  let finalVehicleDetails = {};
  
  if (isMultiVehicleMode) {
    // Multi-vehicle mode: use vehicles array
    // If vehiclesCount is explicitly set and larger, pad the array
    if (vehiclesCount !== undefined) {
      targetCount = normalizeVehiclesCount(vehiclesCount);
    } else {
      // Use array length if no explicit count
      targetCount = Math.max(1, Math.min(3, vehicles.length));
    }
    
    finalVehicles = normalizeVehiclesArray(vehicles, targetCount);
    targetCount = finalVehicles.length; // Ensure sync
    
    console.log('🚗 Multi-vehicle mode:', { 
      inputLength: vehicles.length, 
      targetCount, 
      finalLength: finalVehicles.length 
    });
  } else if (vehiclesCount !== undefined && vehiclesCount > 1) {
    // vehiclesCount > 1 but no vehicles array - initialize empty slots
    targetCount = normalizeVehiclesCount(vehiclesCount);
    
    // Start with existing vehicles if available, or legacy data
    let baseVehicles = [];
    if (existingDraft && existingDraft.vehicles && Array.isArray(existingDraft.vehicles)) {
      baseVehicles = existingDraft.vehicles;
    }
    
    finalVehicles = normalizeVehiclesArray(baseVehicles, targetCount);
    
    console.log('🚗 Multi-vehicle init mode:', { 
      targetCount, 
      existingLength: baseVehicles.length,
      finalLength: finalVehicles.length 
    });
  } else if (vehicles && typeof vehicles === 'object' && !Array.isArray(vehicles)) {
    // Legacy: vehicles is an object (single vehicle details)
    finalVehicleDetails = sanitizeJson(vehicles);
    targetCount = 1;
    console.log('🚗 Legacy single-vehicle mode (vehicles object)');
  } else if (vehicleDetails && Object.keys(vehicleDetails).length > 0) {
    // Legacy: vehicleDetails provided
    finalVehicleDetails = sanitizeJson(vehicleDetails);
    targetCount = normalizeVehiclesCount(vehiclesCount) || 1;
    console.log('🚗 Legacy single-vehicle mode (vehicleDetails)');
  } else {
    // No vehicle data provided - preserve existing or default
    targetCount = normalizeVehiclesCount(vehiclesCount);
    if (existingDraft && existingDraft.vehicles && Array.isArray(existingDraft.vehicles)) {
      finalVehicles = normalizeVehiclesArray(existingDraft.vehicles, targetCount);
    } else if (targetCount > 1) {
      // Initialize empty vehicles array for multi-vehicle
      finalVehicles = normalizeVehiclesArray([], targetCount);
    }
    console.log('🚗 No vehicle data, using existing or default:', { targetCount });
  }
  
  return {
    vehiclesCount: targetCount,
    vehicles: finalVehicles,
    vehicleDetails: finalVehicleDetails
  };
};

// Helper to sanitize updates for Prisma - maps frontend fields to schema fields
const sanitizeUpdates = (updates, existingDraft = null) => {
  const sanitized = {};
  
  // Handle multi-vehicle data
  const vehicleData = computeVehiclesData(updates, existingDraft);
  sanitized.vehiclesCount = vehicleData.vehiclesCount;
  
  if (vehicleData.vehicles) {
    sanitized.vehicles = vehicleData.vehicles;
  }
  
  if (Object.keys(vehicleData.vehicleDetails).length > 0) {
    sanitized.vehicleDetails = vehicleData.vehicleDetails;
  }
  
  // JSON fields (legacy single-vehicle support)
  if (updates.quote !== undefined) sanitized.quote = sanitizeJson(updates.quote);
  if (updates.pickup !== undefined) sanitized.pickup = sanitizeJson(updates.pickup);
  if (updates.dropoff !== undefined) sanitized.dropoff = sanitizeJson(updates.dropoff);
  if (updates.vehicleDetails !== undefined && !vehicleData.vehicles) {
    sanitized.vehicleDetails = sanitizeJson(updates.vehicleDetails);
  }
  if (updates.scheduling !== undefined) sanitized.scheduling = sanitizeJson(updates.scheduling);
  
  // String fields
  if (updates.instructions !== undefined) sanitized.instructions = sanitizeStringField(updates.instructions);
  if (updates.pickupOriginType !== undefined) sanitized.pickupOriginType = sanitizeStringField(updates.pickupOriginType);
  if (updates.dropoffDestinationType !== undefined) sanitized.dropoffDestinationType = sanitizeStringField(updates.dropoffDestinationType);
  
  // Pickup contact fields
  if (updates.dealerFirstName !== undefined) sanitized.dealerFirstName = sanitizeStringField(updates.dealerFirstName);
  if (updates.dealerLastName !== undefined) sanitized.dealerLastName = sanitizeStringField(updates.dealerLastName);
  if (updates.dealerPhone !== undefined) sanitized.dealerPhone = sanitizeStringField(updates.dealerPhone);
  if (updates.auctionGatePass !== undefined) sanitized.auctionGatePass = sanitizeStringField(updates.auctionGatePass);
  if (updates.auctionName !== undefined) sanitized.auctionName = sanitizeStringField(updates.auctionName);
  if (updates.auctionBuyerNumber !== undefined) sanitized.auctionBuyerNumber = sanitizeStringField(updates.auctionBuyerNumber);
  if (updates.privateFirstName !== undefined) sanitized.privateFirstName = sanitizeStringField(updates.privateFirstName);
  if (updates.privateLastName !== undefined) sanitized.privateLastName = sanitizeStringField(updates.privateLastName);
  if (updates.privatePhone !== undefined) sanitized.privatePhone = sanitizeStringField(updates.privatePhone);
  if (updates.pickupGatePassId !== undefined) sanitized.pickupGatePassId = sanitizeStringField(updates.pickupGatePassId);
  
  // Dropoff contact fields
  if (updates.dropoffDealerFirstName !== undefined) sanitized.dropoffDealerFirstName = sanitizeStringField(updates.dropoffDealerFirstName);
  if (updates.dropoffDealerLastName !== undefined) sanitized.dropoffDealerLastName = sanitizeStringField(updates.dropoffDealerLastName);
  if (updates.dropoffDealerPhone !== undefined) sanitized.dropoffDealerPhone = sanitizeStringField(updates.dropoffDealerPhone);
  if (updates.dropoffAuctionGatePass !== undefined) sanitized.dropoffAuctionGatePass = sanitizeStringField(updates.dropoffAuctionGatePass);
  if (updates.dropoffAuctionName !== undefined) sanitized.dropoffAuctionName = sanitizeStringField(updates.dropoffAuctionName);
  if (updates.dropoffAuctionBuyerNumber !== undefined) sanitized.dropoffAuctionBuyerNumber = sanitizeStringField(updates.dropoffAuctionBuyerNumber);
  if (updates.dropoffPrivateFirstName !== undefined) sanitized.dropoffPrivateFirstName = sanitizeStringField(updates.dropoffPrivateFirstName);
  if (updates.dropoffPrivateLastName !== undefined) sanitized.dropoffPrivateLastName = sanitizeStringField(updates.dropoffPrivateLastName);
  if (updates.dropoffPrivatePhone !== undefined) sanitized.dropoffPrivatePhone = sanitizeStringField(updates.dropoffPrivatePhone);
  if (updates.dropoffGatePassId !== undefined) sanitized.dropoffGatePassId = sanitizeStringField(updates.dropoffGatePassId);
  
  // Status
  if (updates.status !== undefined) sanitized.status = sanitizeStringField(updates.status);
  
  return sanitized;
};

/**
 * Create or update draft
 * POST /api/drafts
 */
exports.createDraft = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.user?.email || req.userEmail;
    
    console.log('📝 Draft creation attempt:', { userId, userEmail, hasBody: !!req.body });
    
    // Validate userId
    if (!userId) {
      console.error('❌ No userId found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate userEmail - REQUIRED by schema
    if (!userEmail) {
      console.error('❌ No userEmail found in request');
      return res.status(400).json({ error: 'User email is required' });
    }

    const { 
      id,  // If provided, update existing draft
      quote = {},
      pickup = {},
      dropoff = {},
      vehicleDetails = {},
      vehicles,  // Frontend might send this as array (multi-vehicle) or object (legacy)
      vehiclesCount,  // Number of vehicles (1-3)
      scheduling = {},
      instructions,
      pickupOriginType,
      dropoffDestinationType,
      ...additionalFields
    } = req.body;

    console.log('📦 Draft data received:', {
      hasId: !!id,
      hasQuote: !!quote,
      hasPickup: !!pickup,
      hasDropoff: !!dropoff,
      hasVehicles: !!vehicles,
      isVehiclesArray: Array.isArray(vehicles),
      vehiclesCount,
      userId,
      userEmail
    });

    if (id) {
      // Update existing draft - first fetch it for merging
      console.log('🔄 Updating existing draft:', id);
      
      const existingDraft = await prisma.draft.findFirst({
        where: { id, userId },
      });
      
      if (!existingDraft) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      // Compute vehicle data with existing draft context
      const vehicleData = computeVehiclesData(req.body, existingDraft);
      
      const updateData = {
        quote: sanitizeJson(quote),
        pickup: sanitizeJson(pickup),
        dropoff: sanitizeJson(dropoff),
        scheduling: sanitizeJson(scheduling),
        instructions: sanitizeStringField(instructions),
        pickupOriginType: sanitizeStringField(pickupOriginType),
        dropoffDestinationType: sanitizeStringField(dropoffDestinationType),
        dealerFirstName: sanitizeStringField(additionalFields.dealerFirstName),
        dealerLastName: sanitizeStringField(additionalFields.dealerLastName),
        dealerPhone: sanitizeStringField(additionalFields.dealerPhone),
        auctionGatePass: sanitizeStringField(additionalFields.auctionGatePass),
        auctionName: sanitizeStringField(additionalFields.auctionName),
        auctionBuyerNumber: sanitizeStringField(additionalFields.auctionBuyerNumber),
        privateFirstName: sanitizeStringField(additionalFields.privateFirstName),
        privateLastName: sanitizeStringField(additionalFields.privateLastName),
        privatePhone: sanitizeStringField(additionalFields.privatePhone),
        pickupGatePassId: sanitizeStringField(additionalFields.pickupGatePassId),
        dropoffDealerFirstName: sanitizeStringField(additionalFields.dropoffDealerFirstName),
        dropoffDealerLastName: sanitizeStringField(additionalFields.dropoffDealerLastName),
        dropoffDealerPhone: sanitizeStringField(additionalFields.dropoffDealerPhone),
        dropoffAuctionGatePass: sanitizeStringField(additionalFields.dropoffAuctionGatePass),
        dropoffAuctionName: sanitizeStringField(additionalFields.dropoffAuctionName),
        dropoffAuctionBuyerNumber: sanitizeStringField(additionalFields.dropoffAuctionBuyerNumber),
        dropoffPrivateFirstName: sanitizeStringField(additionalFields.dropoffPrivateFirstName),
        dropoffPrivateLastName: sanitizeStringField(additionalFields.dropoffPrivateLastName),
        dropoffPrivatePhone: sanitizeStringField(additionalFields.dropoffPrivatePhone),
        dropoffGatePassId: sanitizeStringField(additionalFields.dropoffGatePassId),
        vehiclesCount: vehicleData.vehiclesCount,
      };

      // Add vehicles array if available
      if (vehicleData.vehicles) {
        updateData.vehicles = vehicleData.vehicles;
      }
      
      // Add vehicleDetails if available (legacy support)
      if (Object.keys(vehicleData.vehicleDetails).length > 0) {
        updateData.vehicleDetails = vehicleData.vehicleDetails;
      } else {
        updateData.vehicleDetails = sanitizeJson(vehicleDetails);
      }
      
      console.log('📝 Update data:', {
        vehiclesCount: updateData.vehiclesCount,
        hasVehiclesArray: !!updateData.vehicles,
        vehiclesArrayLength: updateData.vehicles ? updateData.vehicles.length : 0
      });
      
      const draft = await prisma.draft.update({
        where: { id },
        data: updateData,
      });

      console.log('✅ Draft updated:', draft.id);

      // Normalize response to always include vehicles array
      const normalizedDraft = normalizeDraftResponse(draft);

      return res.json({
        success: true,
        message: 'Draft updated successfully',
        draft: normalizedDraft,
      });
    }

    // Create new draft
    console.log('🆕 Creating new draft for userId:', userId);
    
    // Compute vehicle data for new draft
    const vehicleData = computeVehiclesData(req.body, null);
    
    const draftData = {
      userId,
      userEmail,
      quote: sanitizeJson(quote),
      pickup: sanitizeJson(pickup),
      dropoff: sanitizeJson(dropoff),
      vehicleDetails: Object.keys(vehicleData.vehicleDetails).length > 0 
        ? vehicleData.vehicleDetails 
        : sanitizeJson(vehicleDetails),
      scheduling: sanitizeJson(scheduling),
      instructions: sanitizeStringField(instructions),
      pickupOriginType: sanitizeStringField(pickupOriginType),
      dropoffDestinationType: sanitizeStringField(dropoffDestinationType),
      status: 'draft',
      dealerFirstName: sanitizeStringField(additionalFields.dealerFirstName),
      dealerLastName: sanitizeStringField(additionalFields.dealerLastName),
      dealerPhone: sanitizeStringField(additionalFields.dealerPhone),
      auctionGatePass: sanitizeStringField(additionalFields.auctionGatePass),
      auctionName: sanitizeStringField(additionalFields.auctionName),
      auctionBuyerNumber: sanitizeStringField(additionalFields.auctionBuyerNumber),
      privateFirstName: sanitizeStringField(additionalFields.privateFirstName),
      privateLastName: sanitizeStringField(additionalFields.privateLastName),
      privatePhone: sanitizeStringField(additionalFields.privatePhone),
      pickupGatePassId: sanitizeStringField(additionalFields.pickupGatePassId),
      dropoffDealerFirstName: sanitizeStringField(additionalFields.dropoffDealerFirstName),
      dropoffDealerLastName: sanitizeStringField(additionalFields.dropoffDealerLastName),
      dropoffDealerPhone: sanitizeStringField(additionalFields.dropoffDealerPhone),
      dropoffAuctionGatePass: sanitizeStringField(additionalFields.dropoffAuctionGatePass),
      dropoffAuctionName: sanitizeStringField(additionalFields.dropoffAuctionName),
      dropoffAuctionBuyerNumber: sanitizeStringField(additionalFields.dropoffAuctionBuyerNumber),
      dropoffPrivateFirstName: sanitizeStringField(additionalFields.dropoffPrivateFirstName),
      dropoffPrivateLastName: sanitizeStringField(additionalFields.dropoffPrivateLastName),
      dropoffPrivatePhone: sanitizeStringField(additionalFields.dropoffPrivatePhone),
      dropoffGatePassId: sanitizeStringField(additionalFields.dropoffGatePassId),
      vehiclesCount: vehicleData.vehiclesCount,
    };

    // Add vehicles array if available
    if (vehicleData.vehicles) {
      draftData.vehicles = vehicleData.vehicles;
    }

    console.log('🚀 Creating draft with data:', {
      userId: draftData.userId,
      userEmail: draftData.userEmail,
      hasQuote: Object.keys(draftData.quote).length > 0,
      hasPickup: Object.keys(draftData.pickup).length > 0,
      hasDropoff: Object.keys(draftData.dropoff).length > 0,
      vehiclesCount: draftData.vehiclesCount,
      hasVehiclesArray: !!draftData.vehicles,
      vehiclesArrayLength: draftData.vehicles ? draftData.vehicles.length : 0
    });

    const draft = await prisma.draft.create({
      data: draftData,
    });

    console.log('✅ Draft created successfully:', draft.id);

    // Normalize response to always include vehicles array
    const normalizedDraft = normalizeDraftResponse(draft);

    res.status(201).json({
      success: true,
      message: 'Draft saved successfully',
      draft: normalizedDraft,
    });

  } catch (error) {
    console.error('❌ Save draft error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to save draft';
    let statusCode = 500;

    if (error.code === 'P2002') {
      errorMessage = 'Duplicate draft entry';
      statusCode = 409;
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid user reference';
      statusCode = 400;
    } else if (error.code === 'P2025') {
      errorMessage = 'Draft not found';
      statusCode = 404;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all drafts for user
 * GET /api/drafts
 */
exports.listMyDrafts = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [drafts, total] = await prisma.$transaction([
      prisma.draft.findMany({
        where: { userId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.draft.count({ where: { userId } }),
    ]);

    // Normalize all drafts to include vehicles array and vehiclesCount
    const normalizedDrafts = drafts.map(normalizeDraftResponse);

    res.json({
      success: true,
      drafts: normalizedDrafts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
};

/**
 * Get single draft
 * GET /api/drafts/:id
 */
exports.getDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Normalize draft to include vehicles array and vehiclesCount
    const normalizedDraft = normalizeDraftResponse(draft);
    
    console.log('📖 Draft fetched:', {
      id: draft.id,
      storedVehiclesCount: draft.vehiclesCount,
      storedVehiclesLength: draft.vehicles ? draft.vehicles.length : 0,
      returnedVehiclesCount: normalizedDraft.vehiclesCount,
      returnedVehiclesLength: normalizedDraft.vehicles.length
    });

    res.json({ success: true, draft: normalizedDraft });

  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
};

/**
 * Update draft (PUT/PATCH)
 * PUT /api/drafts/:id
 * PATCH /api/drafts/:id
 */
exports.updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    console.log('📝 Update draft:', id, 'fields:', Object.keys(updates));
    console.log('📝 vehiclesCount in request:', updates.vehiclesCount);
    console.log('📝 vehicles in request:', Array.isArray(updates.vehicles) ? `array[${updates.vehicles.length}]` : typeof updates.vehicles);

    const draft = await prisma.draft.findFirst({
      where: { id, userId },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Sanitize updates with existing draft context for proper merging
    const sanitizedUpdates = sanitizeUpdates(updates, draft);

    console.log('📝 Sanitized updates:', {
      keys: Object.keys(sanitizedUpdates),
      vehiclesCount: sanitizedUpdates.vehiclesCount,
      hasVehicles: !!sanitizedUpdates.vehicles,
      vehiclesLength: sanitizedUpdates.vehicles ? sanitizedUpdates.vehicles.length : 0
    });

    const updatedDraft = await prisma.draft.update({
      where: { id },
      data: sanitizedUpdates,
    });

    // Normalize response to include vehicles array and vehiclesCount
    const normalizedDraft = normalizeDraftResponse(updatedDraft);

    res.json({
      success: true,
      message: 'Draft updated successfully',
      draft: normalizedDraft,
    });

  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
};

/**
 * Delete draft
 * DELETE /api/drafts/:id
 */
exports.deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const draft = await prisma.draft.findFirst({
      where: { id, userId },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    await prisma.draft.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Draft deleted successfully' });

  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
};

module.exports = exports;
