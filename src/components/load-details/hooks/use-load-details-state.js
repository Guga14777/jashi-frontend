// ============================================================
// FILE: src/components/load-details/hooks/use-load-details-state.js
// Main state hook for load details modal
// ✅ FIXED: Proper data extraction for Route/Vehicle (Issue 4)
// ✅ FIXED: Time window fields extraction (Issue 5)
// ✅ FIXED: Correct action button logic based on status (Issue 6)
// ✅ FIXED: Added pickupState extraction for timezone calculations
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  extractPickup,
  extractDropoff,
  extractTimeWindows,
  extractNotes,
  extractDates,
  extractVehicle,
  extractCustomer,
  extractCarrier,
  extractLocationTypes,
  extractGatePasses,
  isMultiVehicleBooking,
  getVehicleCount,
  extractMultiVehicleData,
  extractScheduledPickupDate,
} from '../utils/extractors';
import {
  SHIPMENT_STATUS,
  normalizeStatus,
  getStatusStep,
} from '../utils/status-map';
import { calculateWaitTimerStart } from './use-detention-timer.js';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../lib/api-url.js';

/**
 * ✅ FIXED: Helper to safely parse JSON that might already be an object
 */
const safeJson = (val) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
};

/**
 * ✅ FIXED: Extract "from" location string with proper fallbacks
 */
const extractFromLocation = (data) => {
  if (!data) return '—';
  
  // Try pickup object first
  const pickup = safeJson(data.pickup);
  if (pickup.city && pickup.state) {
    return `${pickup.city}, ${pickup.state}`;
  }
  if (pickup.city) return pickup.city;
  
  // Try direct fields
  if (data.fromCity && data.fromState) {
    return `${data.fromCity}, ${data.fromState}`;
  }
  if (data.fromCity) return data.fromCity;
  
  // Try origin field (from backend)
  if (data.origin) return data.origin;
  
  // Try fromZip as last resort
  if (data.fromZip) return data.fromZip;
  if (pickup.zip) return pickup.zip;
  
  return '—';
};

/**
 * ✅ FIXED: Extract "to" location string with proper fallbacks
 */
const extractToLocation = (data) => {
  if (!data) return '—';
  
  // Try dropoff object first
  const dropoff = safeJson(data.dropoff);
  if (dropoff.city && dropoff.state) {
    return `${dropoff.city}, ${dropoff.state}`;
  }
  if (dropoff.city) return dropoff.city;
  
  // Try direct fields
  if (data.toCity && data.toState) {
    return `${data.toCity}, ${data.toState}`;
  }
  if (data.toCity) return data.toCity;
  
  // Try destination field (from backend)
  if (data.destination) return data.destination;
  
  // Try toZip as last resort
  if (data.toZip) return data.toZip;
  if (dropoff.zip) return dropoff.zip;
  
  return '—';
};

/**
 * ✅ FIXED: Extract miles with proper fallbacks
 */
const extractMiles = (data) => {
  if (!data) return 0;
  
  // Direct miles field
  if (typeof data.miles === 'number' && data.miles > 0) return data.miles;
  
  // Try routeMiles
  if (typeof data.routeMiles === 'number' && data.routeMiles > 0) return data.routeMiles;
  
  // Try distance
  if (typeof data.distance === 'number' && data.distance > 0) return data.distance;
  
  // Try from quote
  const quote = safeJson(data.quote);
  if (typeof quote.miles === 'number' && quote.miles > 0) return quote.miles;
  if (typeof quote.distance === 'number' && quote.distance > 0) return quote.distance;
  
  // Parse string values
  if (typeof data.miles === 'string') {
    const parsed = parseInt(data.miles, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  
  return 0;
};

/**
 * ✅ NEW: Extract pickup state code for timezone calculations
 * Tries multiple data sources to find the 2-letter state code
 */
const extractPickupState = (data) => {
  if (!data) return null;
  
  // Try direct pickupState field
  if (data.pickupState && typeof data.pickupState === 'string') {
    const state = data.pickupState.trim().toUpperCase();
    if (state.length === 2) return state;
  }
  
  // Try pickup object
  const pickup = safeJson(data.pickup);
  if (pickup.state && typeof pickup.state === 'string') {
    const state = pickup.state.trim().toUpperCase();
    if (state.length === 2) return state;
  }
  
  // Try fromState field
  if (data.fromState && typeof data.fromState === 'string') {
    const state = data.fromState.trim().toUpperCase();
    if (state.length === 2) return state;
  }
  
  // Try to extract from origin string (e.g., "Los Angeles, CA")
  if (data.origin && typeof data.origin === 'string') {
    const match = data.origin.match(/,\s*([A-Za-z]{2})$/);
    if (match) return match[1].toUpperCase();
  }
  
  // Try to extract from from location string
  const fromLocation = extractFromLocation(data);
  if (fromLocation && fromLocation !== '—') {
    const match = fromLocation.match(/,\s*([A-Za-z]{2})$/);
    if (match) return match[1].toUpperCase();
  }
  
  console.warn('⚠️ [extractPickupState] Could not find pickup state in:', {
    pickupState: data.pickupState,
    pickup: pickup,
    fromState: data.fromState,
    origin: data.origin,
  });
  
  return null;
};

/**
 * Main hook for load details state management
 */
export const useLoadDetailsState = ({
  open,
  load,
  type = 'booking',
  portal = 'shipper',
  isPreviewOnly = false,
}) => {
  // Local copy of load data that can be updated
  const [fullLoad, setFullLoad] = useState(null);
  const [loading, setLoading] = useState(false);

  // Merge incoming load with fullLoad (fullLoad takes precedence for updates)
  const L = useMemo(() => {
    return fullLoad || load || {};
  }, [fullLoad, load]);

  // Update local load state
  const updateLoad = useCallback((updates) => {
    setFullLoad(prev => ({
      ...(prev || load || {}),
      ...updates,
    }));
  }, [load]);

  // Fetch full booking details if needed
  useEffect(() => {
    if (!open || !load?.id || isPreviewOnly) return;
    
    // Skip fetch if we already have full data
    if (fullLoad?.id === load.id && fullLoad._fullyLoaded) return;

    const fetchFullDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const endpoint = portal === 'carrier' 
          ? `${API_BASE}/api/carrier/loads/${load.id}`
          : `${API_BASE}/api/bookings/${load.id}`;
        
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          const booking = data.booking || data.load || data;
          setFullLoad({ ...booking, _fullyLoaded: true });
        }
      } catch (err) {
        console.error('Failed to fetch full load details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
  }, [open, load?.id, portal, isPreviewOnly, fullLoad?.id, fullLoad?._fullyLoaded]);

  // =====================================================
  // DERIVED VALUES
  // =====================================================
  
  const isCarrier = portal === 'carrier';
  const isCustomer = portal === 'shipper' || portal === 'customer';
  const isQuote = type === 'quote';

  // Status
  const status = useMemo(() => normalizeStatus(L.status), [L.status]);
  const statusStep = useMemo(() => getStatusStep(status), [status]);
  const statusDisplay = useMemo(() => {
    const labels = {
      [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
      [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
      [SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP]: 'On the Way',
      [SHIPMENT_STATUS.ARRIVED_AT_PICKUP]: 'At Pickup',
      [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
      [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
      [SHIPMENT_STATUS.CANCELLED]: 'Cancelled',
    };
    return labels[status] || status || 'Unknown';
  }, [status]);

  // Status flags
  const isDelivered = status === SHIPMENT_STATUS.DELIVERED;
  const isCancelled = status === SHIPMENT_STATUS.CANCELLED;
  const isOnTheWay = status === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP;
  const isArrivedAtPickup = status === SHIPMENT_STATUS.ARRIVED_AT_PICKUP;
  const isPickedUp = status === SHIPMENT_STATUS.PICKED_UP;
  const isAssigned = status === SHIPMENT_STATUS.ASSIGNED;

  // =====================================================
  // ✅ FIXED: ACTION PERMISSIONS (Issue 6)
  // Only show the NEXT action based on current status
  // =====================================================
  
  const canStartTrip = useMemo(() => {
    if (!isCarrier || isPreviewOnly || isCancelled) return false;
    // Can only start trip when status is ASSIGNED
    return status === SHIPMENT_STATUS.ASSIGNED;
  }, [isCarrier, isPreviewOnly, isCancelled, status]);

  const canMarkArrived = useMemo(() => {
    if (!isCarrier || isPreviewOnly || isCancelled) return false;
    // Can only mark arrived when status is ON_THE_WAY_TO_PICKUP
    return status === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP;
  }, [isCarrier, isPreviewOnly, isCancelled, status]);

  const canMarkPickup = useMemo(() => {
    if (!isCarrier || isPreviewOnly || isCancelled) return false;
    // Can only mark pickup when status is ARRIVED_AT_PICKUP
    return status === SHIPMENT_STATUS.ARRIVED_AT_PICKUP;
  }, [isCarrier, isPreviewOnly, isCancelled, status]);

  const canMarkDelivery = useMemo(() => {
    if (!isCarrier || isPreviewOnly || isCancelled) return false;
    // Can only mark delivery when status is PICKED_UP
    return status === SHIPMENT_STATUS.PICKED_UP;
  }, [isCarrier, isPreviewOnly, isCancelled, status]);

  const canCancel = useMemo(() => {
    if (isPreviewOnly || isCancelled || isDelivered) return false;
    // Carrier drop rules differ from customer cancel rules.
    // Carriers can drop their assigned load up through ARRIVED_AT_PICKUP.
    // Customers can cancel only before the carrier physically arrives at pickup.
    const cancellableStatuses = isCarrier
      ? [
          SHIPMENT_STATUS.ASSIGNED,
          SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
          SHIPMENT_STATUS.ARRIVED_AT_PICKUP,
        ]
      : [
          SHIPMENT_STATUS.SCHEDULED,
          SHIPMENT_STATUS.ASSIGNED,
          SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
        ];
    return cancellableStatuses.includes(status);
  }, [isCarrier, isPreviewOnly, isCancelled, isDelivered, status]);

  // Customer-only edit window — matches the customer cancel window for a
  // consistent mental model ("if I can cancel, I can still edit").
  const canEdit = useMemo(() => {
    if (isPreviewOnly || isCancelled || isDelivered || isCarrier) return false;
    const editableStatuses = [
      SHIPMENT_STATUS.SCHEDULED,
      SHIPMENT_STATUS.ASSIGNED,
      SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,
    ];
    return editableStatuses.includes(status);
  }, [isCarrier, isPreviewOnly, isCancelled, isDelivered, status]);

  // =====================================================
  // ✅ FIXED: ROUTE DATA EXTRACTION (Issue 4)
  // =====================================================
  
  const from = useMemo(() => extractFromLocation(L), [L]);
  const to = useMemo(() => extractToLocation(L), [L]);
  const miles = useMemo(() => extractMiles(L), [L]);
  
  // Price per mile calculation
  const price = L.price || L.offer || 0;
  const pricePerMile = useMemo(() => {
    if (!miles || miles === 0) return 0;
    return (price / miles).toFixed(2);
  }, [price, miles]);

  // =====================================================
  // ✅ FIXED: VEHICLE DATA EXTRACTION (Issue 4)
  // =====================================================
  
  const vehicle = useMemo(() => {
    const extracted = extractVehicle(L);
    
    // Additional fallbacks from direct fields
    return {
      year: extracted.year || L.vehicleYear || '',
      make: extracted.make || L.vehicleMake || '',
      model: extracted.model || L.vehicleModel || '',
      type: extracted.type || L.vehicleType || '',
      condition: extracted.condition || L.vehicleCondition || '',
      vin: extracted.vin || L.vin || '',
    };
  }, [L]);

  const transport = useMemo(() => {
    const transportType = L.transportType || 'open';
    return transportType.charAt(0).toUpperCase() + transportType.slice(1);
  }, [L.transportType]);

  // =====================================================
  // ✅ FIXED: TIME WINDOWS (Issue 5)
  // =====================================================
  
  const timeWindows = useMemo(() => extractTimeWindows(L), [L]);
  const times = useMemo(() => ({
    pickup: timeWindows.pickup,
    dropoff: timeWindows.dropoff,
  }), [timeWindows]);

  // Raw time window values for carrier actions
  const pickupWindowStart = timeWindows.pickupWindowStart;
  const pickupWindowEnd = timeWindows.pickupWindowEnd;

  // =====================================================
  // DATES
  // =====================================================
  
  const dates = useMemo(() => extractDates(L), [L]);
  const scheduledPickupDate = useMemo(() => {
    return L.scheduledPickupDate || L.pickupDate || dates.pickup || null;
  }, [L.scheduledPickupDate, L.pickupDate, dates.pickup]);

  // =====================================================
  // LOCATION DATA
  // =====================================================
  
  const pickup = useMemo(() => extractPickup(L), [L]);
  const dropoff = useMemo(() => extractDropoff(L), [L]);
  const locationTypes = useMemo(() => extractLocationTypes(L), [L]);
  const notes = useMemo(() => extractNotes(L), [L]);

  // =====================================================
  // ✅ NEW: PICKUP STATE FOR TIMEZONE CALCULATIONS
  // =====================================================
  
  const pickupState = useMemo(() => {
    // First try the extracted pickup object
    if (pickup?.state) {
      const state = pickup.state.trim().toUpperCase();
      if (state.length === 2) {
        console.log('✅ [pickupState] Found from pickup object:', state);
        return state;
      }
    }
    
    // Fall back to comprehensive extraction
    const extracted = extractPickupState(L);
    if (extracted) {
      console.log('✅ [pickupState] Found from extractPickupState:', extracted);
    } else {
      console.warn('⚠️ [pickupState] NOT FOUND - timezone calculations will use browser local time!');
    }
    return extracted;
  }, [L, pickup?.state]);

  // =====================================================
  // CUSTOMER/CARRIER INFO
  // =====================================================
  
  const customer = useMemo(() => extractCustomer(L), [L]);
  const carrier = useMemo(() => extractCarrier(L), [L]);

  // Show customer info to carriers
  const showCustomer = isCarrier && customer.name !== '—';
  // Show carrier info to customers when assigned
  const showCarrier = isCustomer && carrier && !isQuote && statusStep >= 1;

  // =====================================================
  // MULTI-VEHICLE DATA
  // =====================================================
  
  const isMultiVehicle = useMemo(() => isMultiVehicleBooking(L), [L]);
  const vehicleCount = useMemo(() => getVehicleCount(L), [L]);
  const multiVehicleData = useMemo(() => extractMultiVehicleData(L), [L]);

  // =====================================================
  // GATE PASSES & DOCUMENTS
  // =====================================================
  
  const gatePasses = useMemo(() => extractGatePasses(L), [L]);
  const showGatePass = useMemo(() => {
    const pickupType = L.pickupOriginType || locationTypes.pickup || '';
    const dropoffType = L.dropoffDestinationType || locationTypes.dropoff || '';
    const hasAuction = 
      pickupType.toLowerCase().includes('auction') ||
      dropoffType.toLowerCase().includes('auction');
    return hasAuction || gatePasses.length > 0;
  }, [L.pickupOriginType, L.dropoffDestinationType, locationTypes, gatePasses]);

  // Photos and documents (for carriers)
  const pickupPhotos = useMemo(() => {
    if (!L.documents) return [];
    return L.documents.filter(d => d.type === 'pickup_photo');
  }, [L.documents]);

  const deliveryPhotos = useMemo(() => {
    if (!L.documents) return [];
    return L.documents.filter(d => d.type === 'delivery_photo');
  }, [L.documents]);

  const podDocument = L.podDocument || null;
  const hasDocuments = pickupPhotos.length > 0 || deliveryPhotos.length > 0 || !!podDocument;

  // =====================================================
  // ORDER INFO
  // =====================================================
  
  const orderNum = L.orderNumber || L.ref?.slice(-6) || L.id?.slice(-6) || '—';
  const likelihood = L.likelihood || L.quoteRelation?.likelihood || null;
  const marketAvg = L.marketAvg || L.quoteRelation?.marketAvg || null;

  // =====================================================
  // UI FLAGS
  // =====================================================
  
  const hasNotes = notes.general || notes.pickup || notes.dropoff;
  const showBolButton = !isQuote && statusStep >= 1;
  const showBolButtonForQuote = isQuote && L.status === 'accepted';
  const showProgressBar = !isQuote || statusStep > 0;

  // =====================================================
  // DETENTION/WAITING FEE DATA
  // Effective timer start = max(arrival, pickup window start).
  // See src/components/load-details/hooks/use-detention-timer.js.
  // =====================================================

  const waitTimerStartAt = useMemo(() => {
    const start = calculateWaitTimerStart({
      arrivedAtPickupAt: L.arrivedAtPickupAt,
      waitTimerStartAt: L.waitTimerStartAt,
      pickupDate: L.pickupDate,
      pickupWindowStart: L.pickupWindowStart,
    });
    return start ? start.toISOString() : null;
  }, [L.arrivedAtPickupAt, L.waitTimerStartAt, L.pickupDate, L.pickupWindowStart]);

  const waitFeeAmount = L.detentionAmount || L.waitFeeAmount || 50;
  const waitFeeRequestedAt = L.detentionRequestedAt || L.waitFeeRequestedAt || null;

  // =====================================================
  // CANCELLATION DATA
  // =====================================================
  
  const cancelledBy = L.cancelledBy || null;

  // =====================================================
  // DEBUG: Log timezone-critical values
  // =====================================================
  if (import.meta.env.DEV && isCarrier && canMarkArrived) {
    console.log('🔧 [useLoadDetailsState] Timezone-critical values:', {
      scheduledPickupDate,
      pickupWindowStart,
      pickupWindowEnd,
      pickupState,
      pickupObject: pickup,
      rawL: {
        pickupState: L.pickupState,
        fromState: L.fromState,
        pickup: L.pickup,
        origin: L.origin,
      },
    });
  }

  return {
    // Core data
    L,
    fullLoad,
    loading,
    updateLoad,
    
    // Portal/type flags
    isCarrier,
    isQuote,
    isCustomer,
    
    // Extracted entities
    customer,
    carrier,
    vehicle,
    
    // Time and dates
    times,
    dates,
    
    // Notes
    notes,
    
    // Location types
    locationTypes,
    
    // Gate passes
    gatePasses,
    
    // Multi-vehicle
    isMultiVehicle,
    multiVehicleData,
    vehicleCount,
    
    // Status
    status,
    statusDisplay,
    isDelivered,
    isCancelled,
    isOnTheWay,
    isArrivedAtPickup,
    
    // Order info
    orderNum,
    price,
    likelihood,
    marketAvg,
    miles,
    pricePerMile,
    
    // Route
    from,
    to,
    transport,
    
    // Locations
    pickup,
    dropoff,
    
    // ✅ FIXED: Action permissions (Issue 6)
    canStartTrip,
    canMarkArrived,
    canMarkPickup,
    canMarkDelivery,
    canCancel,
    canEdit,
    cancelledBy,
    
    // UI flags
    showCustomer,
    showCarrier,
    hasNotes,
    showGatePass,
    showBolButton,
    showBolButtonForQuote,
    showProgressBar,
    
    // Documents
    pickupPhotos,
    deliveryPhotos,
    podDocument,
    hasDocuments,
    
    // Detention
    waitTimerStartAt,
    waitFeeAmount,
    waitFeeRequestedAt,
    
    // ✅ FIXED: Time window for carrier actions (Issue 5)
    scheduledPickupDate,
    pickupWindowStart,
    pickupWindowEnd,
    
    // ✅ NEW: Pickup state for timezone calculations
    pickupState,
  };
};

export default useLoadDetailsState;