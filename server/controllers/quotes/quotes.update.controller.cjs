/**
 * Quotes Update Controller
 * Handles quote update and delete operations
 */

const prisma = require('../../db.cjs');
const {
  normalizeVehiclesData,
  buildVehiclesStorageObject,
  extractVehiclesFromQuote,
  extractPrimaryVin,
  buildPricingBreakdown,
} = require('../../services/quotes/index.cjs');

/**
 * Update quote
 */
async function updateQuote(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 [QUOTES] UPDATE QUOTE:', id);
    console.log('📦 [QUOTES] Update payload:', {
      hasVehicles: !!updates.vehicles,
      vehiclesIsArray: Array.isArray(updates.vehicles),
      vehiclesCount: updates.vehiclesCount,
      vehicleKeys: updates.vehicles ? (Array.isArray(updates.vehicles) ? updates.vehicles.length : Object.keys(updates.vehicles)) : null,
    });

    const quote = await prisma.quote.findFirst({
      where: { id, userId },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Handle multi-vehicle updates
    let vehiclesUpdateData = undefined;
    
    if (updates.vehicles !== undefined || updates.vehiclesCount !== undefined) {
      vehiclesUpdateData = processVehiclesUpdate(quote, updates);
      
      console.log('📦 [QUOTES] Vehicles update:', {
        existingCount: quote.vehicles?.vehiclesList?.length || 0,
        newCount: vehiclesUpdateData.vehiclesList?.length || 0,
      });
    } else if (updates.vin || updates.vehicleDetails?.vin) {
      // Handle VIN-only updates (backward compatibility)
      vehiclesUpdateData = processVinOnlyUpdate(quote, updates);
    }

    // Build the update object
    const { vehicles, vehiclesCount, vin, vehicleDetails, ...otherUpdates } = updates;
    
    const updateData = {
      ...otherUpdates,
      ...(vehiclesUpdateData !== undefined && { vehicles: vehiclesUpdateData }),
    };
    
    // Update primary vehicle field if provided
    if (updates.vehicle) {
      updateData.vehicle = updates.vehicle;
    } else if (vehiclesUpdateData?.vehiclesList?.[0]?.vehicle) {
      updateData.vehicle = vehiclesUpdateData.vehiclesList[0].vehicle;
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
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

    console.log('✅ [QUOTES] Quote updated:', {
      id: updatedQuote.id,
      vehiclesCount: responseVehiclesCount,
      vehiclesLength: responseVehicles?.length,
    });
    console.log('═══════════════════════════════════════════════════════');

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
    console.error('❌ Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
}

/**
 * Process vehicles array update
 */
function processVehiclesUpdate(quote, updates) {
  const existingVehiclesData = quote.vehicles || {};
  const existingVehiclesList = Array.isArray(existingVehiclesData.vehiclesList) 
    ? existingVehiclesData.vehiclesList 
    : [];
  
  const { vehiclesList, vehiclesCount: normalizedCount, legacyData } = normalizeVehiclesData(
    updates.vehicles,
    updates.vehiclesCount,
    updates.vehicle || quote.vehicle,
    updates.vin || updates.vehicleDetails?.vin,
    updates.vehicleDetails
  );
  
  return buildVehiclesStorageObject(
    vehiclesList.length > 0 ? vehiclesList : existingVehiclesList,
    normalizedCount || existingVehiclesList.length || 1,
    { ...existingVehiclesData.legacyData, ...legacyData }
  );
}

/**
 * Process VIN-only update (backward compatibility)
 */
function processVinOnlyUpdate(quote, updates) {
  const existingVehicles = quote.vehicles || {};
  const updatedVehicles = {
    ...existingVehicles,
    vin: updates.vin || updates.vehicleDetails?.vin,
  };
  
  // Also update the vehiclesList if it exists
  if (Array.isArray(existingVehicles.vehiclesList) && existingVehicles.vehiclesList.length > 0) {
    updatedVehicles.vehiclesList = existingVehicles.vehiclesList.map((v, i) => {
      if (i === 0) {
        return { ...v, vin: updates.vin || updates.vehicleDetails?.vin };
      }
      return v;
    });
  }
  
  return updatedVehicles;
}

/**
 * Delete quote
 */
async function deleteQuote(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const quote = await prisma.quote.findFirst({
      where: { id, userId },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await prisma.quote.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Quote deleted successfully' });

  } catch (error) {
    console.error('❌ Delete quote error:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
}

module.exports = {
  updateQuote,
  deleteQuote,
};
