/**
 * Quotes Vehicle Service
 * Handles multi-vehicle data normalization and extraction
 */

const { clamp } = require('./quotes.helpers.cjs');
const { MIN_VEHICLES, MAX_VEHICLES } = require('./quotes.constants.cjs');

/**
 * Validate and normalize vehicles array
 * Ensures vehicles is an array with 1-3 items
 * @param {any} vehiclesInput - The vehicles input (could be array or legacy object)
 * @param {number|undefined} vehiclesCountInput - Optional vehiclesCount
 * @param {string|undefined} singleVehicle - Legacy single vehicle string
 * @param {string|undefined} vin - Legacy single VIN
 * @param {object|undefined} vehicleDetails - Legacy vehicleDetails object
 * @returns {object} - { vehiclesList: array, vehiclesCount: number, legacyData: object }
 */
function normalizeVehiclesData(vehiclesInput, vehiclesCountInput, singleVehicle, vin, vehicleDetails) {
  let vehiclesList = [];
  let legacyData = {};
  
  // Check if vehiclesInput is already an array (new format)
  if (Array.isArray(vehiclesInput)) {
    vehiclesList = vehiclesInput.slice(0, MAX_VEHICLES);
    if (vehiclesList.length === 0 && singleVehicle) {
      vehiclesList = [{
        vehicle: singleVehicle,
        vin: vin || vehicleDetails?.vin || null,
        vehicleDetails: vehicleDetails || null,
      }];
    }
  } else if (vehiclesInput && typeof vehiclesInput === 'object') {
    // Check if it's our stored format with vehiclesList
    if (Array.isArray(vehiclesInput.vehiclesList)) {
      vehiclesList = vehiclesInput.vehiclesList.slice(0, MAX_VEHICLES);
      legacyData = vehiclesInput.legacyData || {};
    } else {
      // Legacy format: { "2020 Toyota Camry": 1, vin: "..." }
      legacyData = { ...vehiclesInput };
      const legacyVin = vehiclesInput.vin || vin || vehicleDetails?.vin || null;
      
      // Find the vehicle name from the legacy object (key that's not 'vin')
      const vehicleName = Object.keys(vehiclesInput).find(k => k !== 'vin') || singleVehicle;
      
      if (vehicleName || singleVehicle) {
        vehiclesList = [{
          vehicle: vehicleName || singleVehicle,
          vin: legacyVin,
          vehicleDetails: vehicleDetails || null,
        }];
      }
    }
  } else if (singleVehicle) {
    // No vehicles input but we have legacy single vehicle
    vehiclesList = [{
      vehicle: singleVehicle,
      vin: vin || vehicleDetails?.vin || null,
      vehicleDetails: vehicleDetails || null,
    }];
    legacyData = { [singleVehicle]: 1 };
    if (vin || vehicleDetails?.vin) {
      legacyData.vin = vin || vehicleDetails?.vin;
    }
  }
  
  // Ensure at least 1 vehicle if we have any data
  if (vehiclesList.length === 0 && singleVehicle) {
    vehiclesList = [{
      vehicle: singleVehicle,
      vin: vin || vehicleDetails?.vin || null,
    }];
  }
  
  // Calculate vehiclesCount
  let vehiclesCount = vehiclesList.length;
  if (typeof vehiclesCountInput === 'number' && vehiclesCountInput >= MIN_VEHICLES && vehiclesCountInput <= MAX_VEHICLES) {
    vehiclesCount = clamp(vehiclesCountInput, MIN_VEHICLES, MAX_VEHICLES);
  } else if (typeof vehiclesCountInput === 'string') {
    const parsed = parseInt(vehiclesCountInput, 10);
    if (!isNaN(parsed) && parsed >= MIN_VEHICLES) {
      vehiclesCount = clamp(parsed, MIN_VEHICLES, MAX_VEHICLES);
    }
  }
  
  // Ensure vehiclesCount matches array length (use the larger of the two, clamped)
  vehiclesCount = clamp(Math.max(vehiclesCount, vehiclesList.length), MIN_VEHICLES, MAX_VEHICLES);
  
  return {
    vehiclesList,
    vehiclesCount,
    legacyData,
  };
}

/**
 * Build vehicles storage object for database
 * @param {array} vehiclesList - Array of vehicle objects
 * @param {number} vehiclesCount - Number of vehicles
 * @param {object} legacyData - Legacy data to preserve
 * @returns {object} - Object to store in vehicles JSON field
 */
function buildVehiclesStorageObject(vehiclesList, vehiclesCount, legacyData = {}) {
  return {
    vehiclesList: vehiclesList,
    vehiclesCount: vehiclesCount,
    legacyData: legacyData,
    // Also keep legacy format for backward compatibility
    ...legacyData,
  };
}

/**
 * Extract vehicles array and count from stored quote data
 * Handles both new format and legacy format
 * @param {object} quote - The quote object from database
 * @param {object|null} booking - The associated booking object if any
 * @returns {object} - { vehicles: array, vehiclesCount: number }
 */
function extractVehiclesFromQuote(quote, booking = null) {
  let vehiclesList = [];
  let vehiclesCount = MIN_VEHICLES;
  
  const storedVehicles = quote.vehicles;
  const bookingVehicleDetails = booking?.vehicleDetails;
  
  // Check if we have the new format stored
  if (storedVehicles && typeof storedVehicles === 'object') {
    if (Array.isArray(storedVehicles.vehiclesList) && storedVehicles.vehiclesList.length > 0) {
      vehiclesList = storedVehicles.vehiclesList;
      vehiclesCount = storedVehicles.vehiclesCount || vehiclesList.length;
    } else if (Array.isArray(storedVehicles)) {
      vehiclesList = storedVehicles;
      vehiclesCount = vehiclesList.length;
    } else {
      // Legacy format - build single vehicle entry
      const legacyVin = storedVehicles.vin || bookingVehicleDetails?.vin || null;
      const vehicleName = Object.keys(storedVehicles).find(k => 
        k !== 'vin' && k !== 'vehiclesList' && k !== 'vehiclesCount' && k !== 'legacyData'
      );
      
      if (vehicleName || quote.vehicle) {
        vehiclesList = [{
          vehicle: vehicleName || quote.vehicle,
          vin: legacyVin,
          vehicleDetails: bookingVehicleDetails || null,
        }];
      }
      vehiclesCount = MIN_VEHICLES;
    }
  } else if (quote.vehicle) {
    vehiclesList = [{
      vehicle: quote.vehicle,
      vin: bookingVehicleDetails?.vin || null,
      vehicleDetails: bookingVehicleDetails || null,
    }];
    vehiclesCount = MIN_VEHICLES;
  }
  
  // Merge booking vehicle details if available
  if (booking && bookingVehicleDetails && vehiclesList.length > 0) {
    if (!vehiclesList[0].vehicleDetails && bookingVehicleDetails) {
      vehiclesList[0].vehicleDetails = bookingVehicleDetails;
    }
    if (!vehiclesList[0].vin && bookingVehicleDetails.vin) {
      vehiclesList[0].vin = bookingVehicleDetails.vin;
    }
  }
  
  // Ensure at least 1 vehicle count
  vehiclesCount = Math.max(vehiclesCount, vehiclesList.length, MIN_VEHICLES);
  
  return {
    vehicles: vehiclesList,
    vehiclesCount: clamp(vehiclesCount, MIN_VEHICLES, MAX_VEHICLES),
  };
}

/**
 * Extract primary VIN from vehicles data (for backward compatibility)
 * @param {object} quote - The quote object
 * @param {object|null} booking - The associated booking
 * @returns {string|null} - The primary VIN or null
 */
function extractPrimaryVin(quote, booking = null) {
  // Try booking vehicleDetails first
  if (booking?.vehicleDetails?.vin) {
    return booking.vehicleDetails.vin;
  }
  
  // Try stored vehicles
  if (quote.vehicles) {
    if (Array.isArray(quote.vehicles.vehiclesList) && quote.vehicles.vehiclesList.length > 0) {
      return quote.vehicles.vehiclesList[0]?.vin || null;
    }
    if (quote.vehicles.vin) {
      return quote.vehicles.vin;
    }
  }
  
  return null;
}

module.exports = {
  normalizeVehiclesData,
  buildVehiclesStorageObject,
  extractVehiclesFromQuote,
  extractPrimaryVin,
};
