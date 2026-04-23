/**
 * Quotes Transform Service
 * Transforms quote data for API responses
 */

// Import directly from source files to avoid circular dependency
const {
  extractVehiclesFromQuote,
  extractPrimaryVin,
} = require('./quotes.vehicle.service.cjs');

const {
  buildPricingBreakdown,
} = require('./quotes.pricing.service.cjs');

const {
  mergeDocuments,
  extractTimeWindows,
  formatGatePass,
} = require('./quotes.repository.service.cjs');

const {
  CARRIER_ACCEPTED_STATUSES,
} = require('./quotes.constants.cjs');

/**
 * Transform quote for list response
 * @param {object} quote - Raw quote from database
 * @returns {object} - Transformed quote for API response
 */
function transformQuoteForList(quote) {
  const booking = quote.bookings && quote.bookings.length > 0 ? quote.bookings[0] : null;
  const documents = mergeDocuments(quote.documents, booking?.documents);
  const timeWindows = extractTimeWindows(booking);
  const pricing = buildPricingBreakdown(quote.offer);
  
  const { bookings: _bookings, documents: _quoteDocuments, ...quoteWithoutNested } = quote;
  
  // Determine if carrier has accepted
  const carrierAccepted = booking && (
    booking.carrierId != null ||
    CARRIER_ACCEPTED_STATUSES.includes(booking.status)
  );
  
  const displayStatus = carrierAccepted ? 'accepted' : 'waiting';
  const { vehicles: vehiclesList, vehiclesCount } = extractVehiclesFromQuote(quote, booking);
  const vin = extractPrimaryVin(quote, booking);
  
  return {
    ...quoteWithoutNested,
    ...pricing,
    orderNumber: booking?.orderNumber || quote.orderNumber,
    bookingId: booking?.id || null,
    bookingRef: booking?.ref || null,
    bookingOrderNumber: booking?.orderNumber || null,
    bookingStatus: booking?.status || null,
    hasBooking: !!booking,
    carrierAccepted,
    displayStatus,
    documents,
    customerFirstName: booking?.customerFirstName || quote.user?.firstName || '',
    customerLastName: booking?.customerLastName || quote.user?.lastName || '',
    customerPhone: booking?.customerPhone || quote.user?.phone || '',
    vin,
    vehicles: vehiclesList,
    vehiclesCount,
    vehicleCondition: booking?.vehicleDetails?.operable || null,
    vehicleDetails: booking?.vehicleDetails || null,
    ...timeWindows,
    ...(booking && getBookingFields(booking, quote)),
  };
}

/**
 * Transform quote for detail response
 * @param {object} quote - Raw quote from database
 * @returns {object} - Transformed quote for API response
 */
function transformQuoteForDetail(quote) {
  const booking = quote.bookings && quote.bookings.length > 0 ? quote.bookings[0] : null;
  const documents = mergeDocuments(quote.documents, booking?.documents);
  const timeWindows = extractTimeWindows(booking);
  const pricing = buildPricingBreakdown(quote.offer);
  
  const pickupGatePass = formatGatePass(booking?.pickupGatePass);
  const dropoffGatePass = formatGatePass(booking?.dropoffGatePass);

  const { bookings: _bookings, documents: _quoteDocuments, ...quoteWithoutNested } = quote;

  const carrierAccepted = booking && (
    booking.carrierId != null ||
    CARRIER_ACCEPTED_STATUSES.includes(booking.status)
  );
  
  const displayStatus = carrierAccepted ? 'accepted' : 'waiting';
  const { vehicles: vehiclesList, vehiclesCount } = extractVehiclesFromQuote(quote, booking);
  const vin = extractPrimaryVin(quote, booking);

  const pickupAddressData = booking?.pickup || {};
  const dropoffAddressData = booking?.dropoff || {};

  return {
    ...quoteWithoutNested,
    offer: quote.offer,
    ...pricing,
    orderNumber: booking?.orderNumber || quote.orderNumber,
    bookingId: booking?.id || null,
    bookingRef: booking?.ref || null,
    bookingOrderNumber: booking?.orderNumber || null,
    bookingStatus: booking?.status || null,
    hasBooking: !!booking,
    carrierAccepted,
    displayStatus,
    documents,
    pickupGatePass,
    dropoffGatePass,
    hasPickupGatePass: !!pickupGatePass,
    hasDropoffGatePass: !!dropoffGatePass,
    hasGatePass: !!(pickupGatePass || dropoffGatePass),
    customerFirstName: booking?.customerFirstName || quote.user?.firstName || '',
    customerLastName: booking?.customerLastName || quote.user?.lastName || '',
    customerPhone: booking?.customerPhone || quote.user?.phone || '',
    customerEmail: quote.userEmail || quote.user?.email || '',
    vin,
    vehicles: vehiclesList,
    vehiclesCount,
    vehicleCondition: booking?.vehicleDetails?.operable || null,
    vehicleDetails: booking?.vehicleDetails || null,
    ...timeWindows,
    ...(booking && {
      pickup: buildAddressObject(pickupAddressData, booking.pickupOriginType, 'originType'),
      pickupAddress: buildAddressObject(pickupAddressData, booking.pickupOriginType, 'originType'),
      dropoff: buildAddressObject(dropoffAddressData, booking.dropoffDestinationType, 'destinationType'),
      dropoffAddress: buildAddressObject(dropoffAddressData, booking.dropoffDestinationType, 'destinationType'),
      ...getBookingFields(booking, quote),
      scheduling: {
        ...(booking.scheduling || {}),
        pickupDate: booking.pickupDate,
        dropoffDate: booking.dropoffDate,
        ...timeWindows,
      },
    }),
  };
}

/**
 * Build address object for response
 * @param {object} addressData - Raw address data
 * @param {string} typeValue - Type value (originType or destinationType)
 * @param {string} typeKey - Type key name
 * @returns {object} - Formatted address object
 */
function buildAddressObject(addressData, typeValue, typeKey) {
  return {
    street1: addressData.street1 || addressData.address || addressData.street || '',
    street2: addressData.street2 || '',
    city: addressData.city || '',
    state: addressData.state || '',
    zip: addressData.zip || addressData.zipCode || '',
    phone: addressData.phone || '',
    firstName: addressData.firstName || '',
    lastName: addressData.lastName || '',
    notes: addressData.notes || '',
    [typeKey]: addressData[typeKey] || typeValue || '',
    raw: addressData,
  };
}

/**
 * Get booking-related fields for response
 * @param {object} booking - Booking object
 * @param {object} quote - Quote object
 * @returns {object} - Booking fields
 */
function getBookingFields(booking, quote) {
  return {
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    pickupDate: booking.pickupDate || quote.pickupDate,
    dropoffDate: booking.dropoffDate,
    pickupOriginType: booking.pickupOriginType,
    dropoffDestinationType: booking.dropoffDestinationType,
    privateFirstName: booking.privateFirstName,
    privateLastName: booking.privateLastName,
    privatePhone: booking.privatePhone,
    dealerFirstName: booking.dealerFirstName,
    dealerLastName: booking.dealerLastName,
    dealerPhone: booking.dealerPhone,
    auctionName: booking.auctionName,
    dropoffPrivateFirstName: booking.dropoffPrivateFirstName,
    dropoffPrivateLastName: booking.dropoffPrivateLastName,
    dropoffPrivatePhone: booking.dropoffPrivatePhone,
    dropoffDealerFirstName: booking.dropoffDealerFirstName,
    dropoffDealerLastName: booking.dropoffDealerLastName,
    dropoffDealerPhone: booking.dropoffDealerPhone,
    dropoffAuctionName: booking.dropoffAuctionName,
    customerInstructions: booking.customerInstructions,
    notes: booking.notes || quote.notes,
    instructions: booking.instructions,
    scheduling: booking.scheduling,
  };
}

module.exports = {
  transformQuoteForList,
  transformQuoteForDetail,
  buildAddressObject,
  getBookingFields,
};
