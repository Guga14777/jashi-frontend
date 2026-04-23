// ============================================================
// FILE: src/utils/booking-transformers.js
// ✅ FIXED: Includes carrierAccepted and displayStatus
// ✅ FIXED: Includes vehicleCondition extraction
// ✅ FIXED: Includes customerEmail from multiple sources
// ============================================================

/**
 * Transform a booking from the API format to the format expected by modals
 */
export function transformBookingToLoad(booking) {
  if (!booking) return null;

  const quoteData = booking.quote || {};
  const schedulingData = booking.scheduling || {};
  const pickupData = booking.pickup || booking.pickupAddress || {};
  const dropoffData = booking.dropoff || booking.dropoffAddress || {};
  
  // Extract time windows from multiple possible sources
  const pickupWindowStart = booking.pickupWindowStart || 
                            schedulingData.pickupWindowStart || 
                            schedulingData.pickupTimeStart ||
                            schedulingData.pickupCustomFrom || 
                            null;
  const pickupWindowEnd = booking.pickupWindowEnd || 
                          schedulingData.pickupWindowEnd || 
                          schedulingData.pickupTimeEnd ||
                          schedulingData.pickupCustomTo || 
                          null;
  const dropoffWindowStart = booking.dropoffWindowStart || 
                             schedulingData.dropoffWindowStart || 
                             schedulingData.dropoffTimeStart ||
                             schedulingData.dropoffCustomFrom || 
                             null;
  const dropoffWindowEnd = booking.dropoffWindowEnd || 
                           schedulingData.dropoffWindowEnd || 
                           schedulingData.dropoffTimeEnd ||
                           schedulingData.dropoffCustomTo || 
                           null;
  const pickupPreferredWindow = booking.pickupPreferredWindow || 
                                schedulingData.pickupPreferredWindow || 
                                null;
  const dropoffPreferredWindow = booking.dropoffPreferredWindow || 
                                 schedulingData.dropoffPreferredWindow || 
                                 null;

  // Extract dates from multiple sources
  const pickupDate = booking.pickupDate || schedulingData.pickupDate || quoteData.pickupDate || null;
  const dropoffDate = booking.dropoffDate || schedulingData.dropoffDate || quoteData.dropoffDate || null;

  // Extract notes from multiple sources
  const notes = booking.notes || 
                booking.customerInstructions || 
                booking.instructions ||
                schedulingData.notes ||
                schedulingData.instructions ||
                quoteData.notes ||
                '';
  
  const pickupNotes = pickupData.notes || 
                      pickupData.instructions ||
                      booking.pickupNotes ||
                      schedulingData.pickupNotes ||
                      '';
  
  const dropoffNotes = dropoffData.notes || 
                       dropoffData.instructions ||
                       booking.dropoffNotes ||
                       schedulingData.dropoffNotes ||
                       '';

  // ⭐ KEY FIX: Determine if carrier has accepted
  const carrierAccepted = !!(
    booking.carrierId ||
    booking.carrierAccepted ||
    ['assigned', 'in_transit', 'delivered', 'picked_up', 'dispatched'].includes((booking.status || '').toLowerCase())
  );

  // ⭐ KEY FIX: Display status based on carrier acceptance
  const displayStatus = carrierAccepted ? 'accepted' : 'waiting';

  // ⭐ KEY FIX: Extract vehicle condition
  const vehicleCondition = (() => {
    const vd = booking.vehicleDetails || {};
    if (vd.operable === 'yes') return 'Operable';
    if (vd.operable === 'no') return 'Inoperable';
    if (booking.vehicleCondition) return booking.vehicleCondition;
    return null;
  })();

  // ⭐ KEY FIX: Extract customer email from multiple sources
  const customerEmail = booking.customerEmail ||  // Direct field from backend
                        booking.userEmail ||       // Stored on booking
                        booking.user?.email ||     // From user relation
                        pickupData.email ||        // From pickup address
                        '';

  const formatAddress = (addressObj) => {
    if (!addressObj) return null;
    
    return {
      street: addressObj.street1 || addressObj.street || addressObj.address || '',
      street1: addressObj.street1 || addressObj.street || addressObj.address || '',
      street2: addressObj.street2 || '',
      city: addressObj.city || '',
      state: addressObj.state || '',
      zip: addressObj.zip || '',
      contact: {
        name: addressObj.contactName || addressObj.contact?.name || '',
        phone: addressObj.contactPhone || addressObj.phone || addressObj.contact?.phone || '',
        email: addressObj.contactEmail || addressObj.email || addressObj.contact?.email || '',
        canText: addressObj.canText || addressObj.contact?.canText || false,
      },
      notes: addressObj.notes || addressObj.instructions || '',
    };
  };

  return {
    // Core IDs
    id: booking.id,
    ref: booking.ref,
    orderNumber: booking.orderNumber,
    
    // Customer info - ✅ FIXED: Include email
    customerFirstName: booking.customerFirstName || booking.user?.firstName || '',
    customerLastName: booking.customerLastName || booking.user?.lastName || '',
    customerPhone: booking.customerPhone || booking.user?.phone || '',
    customerEmail, // ✅ FIXED: Now properly extracted
    
    // Route info
    fromCity: booking.fromCity || quoteData.fromZip || '',
    toCity: booking.toCity || quoteData.toZip || '',
    miles: booking.miles || quoteData.miles || 0,
    
    // Vehicle info
    vehicle: booking.vehicle || quoteData.vehicle || 'Vehicle',
    vehicleType: booking.vehicleType || '',
    vehicleDetails: booking.vehicleDetails || {},
    vehicleCondition, // ⭐ FIXED
    
    // Pricing
    price: booking.price || quoteData.offer || 0,
    likelihood: quoteData.likelihood || booking.likelihood || 0,
    marketAvg: quoteData.marketAvg || booking.marketAvg || 0,
    
    // Transport
    transportType: booking.transportType || quoteData.transportType || 'open',
    
    // Schedule
    pickupDate,
    dropoffDate,
    status: booking.status || 'waiting',
    
    // ⭐ KEY FIX: Carrier acceptance status
    carrierId: booking.carrierId || null,
    carrierAccepted,
    displayStatus,
    
    // Time windows at top level
    pickupWindowStart,
    pickupWindowEnd,
    dropoffWindowStart,
    dropoffWindowEnd,
    pickupPreferredWindow,
    dropoffPreferredWindow,
    
    // Addresses with notes
    pickup: formatAddress(pickupData),
    dropoff: formatAddress(dropoffData),
    pickupAddress: formatAddress(pickupData),
    dropoffAddress: formatAddress(dropoffData),
    
    // Origin/destination types
    pickupOriginType: booking.pickupOriginType,
    dropoffDestinationType: booking.dropoffDestinationType,
    
    // Dealer info (pickup)
    dealerFirstName: booking.dealerFirstName,
    dealerLastName: booking.dealerLastName,
    dealerPhone: booking.dealerPhone,
    
    // Auction info (pickup)
    auctionName: booking.auctionName,
    auctionBuyerNumber: booking.auctionBuyerNumber,
    auctionGatePass: booking.auctionGatePass,
    
    // Private info (pickup)
    privateFirstName: booking.privateFirstName,
    privateLastName: booking.privateLastName,
    privatePhone: booking.privatePhone,
    
    // Dealer info (dropoff)
    dropoffDealerFirstName: booking.dropoffDealerFirstName,
    dropoffDealerLastName: booking.dropoffDealerLastName,
    dropoffDealerPhone: booking.dropoffDealerPhone,
    
    // Auction info (dropoff)
    dropoffAuctionName: booking.dropoffAuctionName,
    dropoffAuctionBuyerNumber: booking.dropoffAuctionBuyerNumber,
    dropoffAuctionGatePass: booking.dropoffAuctionGatePass,
    
    // Private info (dropoff)
    dropoffPrivateFirstName: booking.dropoffPrivateFirstName,
    dropoffPrivateLastName: booking.dropoffPrivateLastName,
    dropoffPrivatePhone: booking.dropoffPrivatePhone,
    
    // Notes - all levels
    notes,
    customerInstructions: booking.customerInstructions || '',
    instructions: booking.instructions || '',
    pickupNotes,
    dropoffNotes,
    
    // Enhanced scheduling with time windows and notes
    scheduling: {
      ...schedulingData,
      pickupDate,
      dropoffDate,
      pickupWindowStart,
      pickupWindowEnd,
      dropoffWindowStart,
      dropoffWindowEnd,
      pickupPreferredWindow,
      dropoffPreferredWindow,
      pickupNotes,
      dropoffNotes,
      notes,
    },
    
    // Gate pass documents
    pickupGatePass: booking.pickupGatePass || null,
    dropoffGatePass: booking.dropoffGatePass || null,
    hasPickupGatePass: !!booking.pickupGatePass,
    hasDropoffGatePass: !!booking.dropoffGatePass,
    
    // User relation (for backward compatibility)
    user: booking.user || null,
    userEmail: booking.userEmail || booking.user?.email || '',
    
    // Original objects
    quote: quoteData,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

/**
 * Transform multiple bookings
 */
export function transformBookingsToLoads(bookings) {
  if (!Array.isArray(bookings)) return [];
  return bookings.map(transformBookingToLoad).filter(Boolean);
}

export default {
  transformBookingToLoad,
  transformBookingsToLoads,
};