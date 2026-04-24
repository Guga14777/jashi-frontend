// ============================================================
// FILE: src/pages/shipper-portal/index.jsx
// ✅ FIXED: Proper quote data loading from backend
// ✅ FIXED: localStorage persistence for draft data
// ✅ FIXED: Loading state until data is actually available
// ✅ ADDED: getVehicleEntry helper for pickup/dropoff sections
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Outlet,
  useSearchParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../../store/auth-context.jsx';
import * as quotesApi from '../../services/quotes.api.js';
import * as bookingApi from '../../services/booking.api.js';
import StepsNav from '../../components/booking/steps-nav.jsx';
import {
  promotePendingQuote,
  readPendingQuote,
} from '../../utils/promote-pending-quote.js';
import './shipper-portal.css';

/* ───────────────────────────────────────────────────────────
   Portal Context
─────────────────────────────────────────────────────────────*/
const PortalContext = createContext(null);
export const usePortal = () => useContext(PortalContext);

/* ───────────────────────────────────────────────────────────
   Steps for navigation
─────────────────────────────────────────────────────────────*/
const STEP_LABELS = ['Offer', 'Pickup', 'Drop-off', 'Vehicle', 'Confirm', 'Payment'];

/* ───────────────────────────────────────────────────────────
   Helper: Clamp number between min and max
─────────────────────────────────────────────────────────────*/
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ───────────────────────────────────────────────────────────
   Helper: Create empty vehicle entry
─────────────────────────────────────────────────────────────*/
const createEmptyVehicleEntry = (vehicleType = '') => ({
  pickup: { address: '', city: '', state: '', zip: '' },
  dropoff: { address: '', city: '', state: '', zip: '' },
  vehicle: { year: '', make: '', model: '', type: vehicleType, operable: 'yes', vin: '' },
  documents: { pickupGatePassId: null, dropoffGatePassId: null },
  pickupOriginType: '',
  pickupDealerInfo: { firstName: '', lastName: '', phone: '' },
  pickupAuctionInfo: { name: '', buyerNumber: '', gatePass: null },
  pickupPrivateInfo: { firstName: '', lastName: '', phone: '' },
  dropoffDestinationType: '',
  dropoffDealerInfo: { firstName: '', lastName: '', phone: '' },
  dropoffAuctionInfo: { name: '', buyerNumber: '', gatePass: null },
  dropoffPrivateInfo: { firstName: '', lastName: '', phone: '' },
});

/* ───────────────────────────────────────────────────────────
   Helper: Derive vehicle count from vehicle string
─────────────────────────────────────────────────────────────*/
const deriveCountFromVehicleString = (vehicleString) => {
  if (!vehicleString || typeof vehicleString !== 'string') return 0;
  
  const parts = vehicleString.split(',').map(s => s.trim()).filter(Boolean);
  
  return parts.reduce((sum, part) => {
    const match = part.match(/[×x](\d+)$/i);
    if (match) {
      return sum + parseInt(match[1], 10);
    }
    return sum + 1;
  }, 0);
};

/* ───────────────────────────────────────────────────────────
   Helper: Parse vehicle count from URL
─────────────────────────────────────────────────────────────*/
const parseVehicleCountFromURL = (searchString) => {
  const params = new URLSearchParams(searchString);
  
  const vehiclesParam = params.get('vehicles');
  const vehicleCountParam = params.get('vehicleCount');
  const vehicleStringParam = params.get('vehicle');
  
  // 1. Try explicit vehicles/vehicleCount param
  const explicitParam = vehiclesParam || vehicleCountParam;
  if (explicitParam) {
    const parsed = Number(explicitParam);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
      if (vehicleStringParam) {
        const derivedFromString = deriveCountFromVehicleString(vehicleStringParam);
        if (derivedFromString > 0 && derivedFromString !== parsed) {
          const clamped = clamp(derivedFromString, 1, 3);
          return { count: clamped, specified: true, source: 'vehicle-string' };
        }
      }
      const clamped = clamp(parsed, 1, 3);
      return { count: clamped, specified: true, source: 'url-param' };
    }
  }
  
  // 2. Derive from vehicle string
  if (vehicleStringParam) {
    const derivedCount = deriveCountFromVehicleString(vehicleStringParam);
    if (derivedCount > 0) {
      const clamped = clamp(derivedCount, 1, 3);
      return { count: clamped, specified: true, source: 'vehicle-string' };
    }
  }
  
  return { count: 1, specified: false, source: 'default' };
};

/* ───────────────────────────────────────────────────────────
   Helper: Normalize vehicles array
─────────────────────────────────────────────────────────────*/
const normalizeVehiclesArray = (existingVehicles, targetCount, defaults = {}) => {
  const result = [];
  
  for (let i = 0; i < targetCount; i++) {
    if (existingVehicles[i]) {
      result.push({
        ...createEmptyVehicleEntry(),
        ...existingVehicles[i],
        pickup: { ...createEmptyVehicleEntry().pickup, ...existingVehicles[i]?.pickup, ...defaults.pickup },
        dropoff: { ...createEmptyVehicleEntry().dropoff, ...existingVehicles[i]?.dropoff, ...defaults.dropoff },
        vehicle: { ...createEmptyVehicleEntry().vehicle, ...existingVehicles[i]?.vehicle, ...defaults.vehicle },
        documents: { ...createEmptyVehicleEntry().documents, ...existingVehicles[i]?.documents },
        pickupDealerInfo: { ...createEmptyVehicleEntry().pickupDealerInfo, ...existingVehicles[i]?.pickupDealerInfo },
        pickupAuctionInfo: { ...createEmptyVehicleEntry().pickupAuctionInfo, ...existingVehicles[i]?.pickupAuctionInfo },
        pickupPrivateInfo: { ...createEmptyVehicleEntry().pickupPrivateInfo, ...existingVehicles[i]?.pickupPrivateInfo },
        dropoffDealerInfo: { ...createEmptyVehicleEntry().dropoffDealerInfo, ...existingVehicles[i]?.dropoffDealerInfo },
        dropoffAuctionInfo: { ...createEmptyVehicleEntry().dropoffAuctionInfo, ...existingVehicles[i]?.dropoffAuctionInfo },
        dropoffPrivateInfo: { ...createEmptyVehicleEntry().dropoffPrivateInfo, ...existingVehicles[i]?.dropoffPrivateInfo },
      });
    } else {
      const newEntry = createEmptyVehicleEntry(defaults.vehicle?.type || '');
      if (defaults.pickup) newEntry.pickup = { ...newEntry.pickup, ...defaults.pickup };
      if (defaults.dropoff) newEntry.dropoff = { ...newEntry.dropoff, ...defaults.dropoff };
      result.push(newEntry);
    }
  }
  
  return result;
};

/* ───────────────────────────────────────────────────────────
   localStorage helpers for draft persistence
─────────────────────────────────────────────────────────────*/
const DRAFT_STORAGE_PREFIX = 'shipper_draft_';

const saveDraftToLocalStorage = (quoteId, data) => {
  if (!quoteId) return;
  try {
    const key = `${DRAFT_STORAGE_PREFIX}${quoteId}`;
    localStorage.setItem(key, JSON.stringify({
      ...data,
      _savedAt: Date.now(),
    }));
    console.log('💾 [STORAGE] Draft saved to localStorage');
  } catch (err) {
    console.warn('⚠️ [STORAGE] Failed to save draft to localStorage:', err);
  }
};

const loadDraftFromLocalStorage = (quoteId) => {
  if (!quoteId) return null;
  try {
    const key = `${DRAFT_STORAGE_PREFIX}${quoteId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      // Check if data is less than 24 hours old
      if (data._savedAt && Date.now() - data._savedAt < 24 * 60 * 60 * 1000) {
        console.log('📦 [STORAGE] Loaded draft from localStorage');
        return data;
      }
    }
  } catch (err) {
    console.warn('⚠️ [STORAGE] Failed to load draft from localStorage:', err);
  }
  return null;
};

const clearDraftFromLocalStorage = (quoteId) => {
  if (!quoteId) return;
  try {
    const key = `${DRAFT_STORAGE_PREFIX}${quoteId}`;
    localStorage.removeItem(key);
    console.log('🗑️ [STORAGE] Draft cleared from localStorage');
  } catch (err) {
    console.warn('⚠️ [STORAGE] Failed to clear draft from localStorage:', err);
  }
};

/* ───────────────────────────────────────────────────────────
   Main Component
─────────────────────────────────────────────────────────────*/
export default function ShipperPortal() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get IDs from URL
  const urlQuoteId = searchParams.get('quoteId');
  const urlDraftId = searchParams.get('draftId');

  // Parse vehicle count from URL
  const urlVehicleInfo = useMemo(() => {
    return parseVehicleCountFromURL(location.search);
  }, [location.search]);
  
  const initialVehicleCount = urlVehicleInfo.count;

  // ✅ INSTANT: Read quote data from URL params immediately
  const initialQuoteData = useMemo(() => {
    const params = new URLSearchParams(location.search);
    
    const fromZip = params.get('fromZip') || '';
    const toZip = params.get('toZip') || '';
    const miles = params.get('miles') ? parseFloat(params.get('miles')) : 0;
    const offer = params.get('offer') ? parseFloat(params.get('offer')) : 0;
    const vehicle = params.get('vehicle') || '';
    const transportType = params.get('transportType') || 'open';
    const likelihood = params.get('likelihood') ? parseFloat(params.get('likelihood')) : 0;
    const marketAvg = params.get('marketAvg') ? parseFloat(params.get('marketAvg')) : 0;
    const recommendedMin = params.get('recommendedMin') ? parseFloat(params.get('recommendedMin')) : 0;
    const recommendedMax = params.get('recommendedMax') ? parseFloat(params.get('recommendedMax')) : 0;

    console.log('🚀 [INSTANT] Reading from URL:', { fromZip, toZip, miles, offer, vehicle });

    return {
      id: urlQuoteId,
      fromZip,
      toZip,
      miles,
      distance: miles,
      routeMiles: miles,
      offer,
      vehicle,
      vehicleType: vehicle,
      vehicleCount: initialVehicleCount,
      transportType,
      likelihood,
      marketAvg,
      recommendedMin,
      recommendedMax,
      pickup: { zip: fromZip },
      dropoff: { zip: toZip },
    };
  }, [location.search, urlQuoteId, initialVehicleCount]);

  // ✅ Core state - INSTANT initialization from URL
  const [vehicleCount, setVehicleCountState] = useState(initialVehicleCount);
  const lastSyncedUrlCount = useRef(initialVehicleCount);

  const [quoteId, setQuoteId] = useState(urlQuoteId);
  const [quoteData, setQuoteData] = useState(initialQuoteData); // ✅ INSTANT from URL
  const [draftId, setDraftId] = useState(urlDraftId);
  const [isLoading, setIsLoading] = useState(false); // ✅ FALSE - we have URL data instantly
  const [isDataLoaded, setIsDataLoaded] = useState(true); // ✅ TRUE - URL data is loaded
  const [error, setError] = useState(null);

  // ✅ Refs to track initialization
  const initStarted = useRef(false);
  const draftApplied = useRef(false);

  // Multi-vehicle state - ✅ INSTANT with URL zip codes
  const [vehicles, setVehicles] = useState(() => {
    const params = new URLSearchParams(location.search);
    const fromZip = params.get('fromZip') || '';
    const toZip = params.get('toZip') || '';
    
    return Array.from({ length: initialVehicleCount }, () => ({
      ...createEmptyVehicleEntry(),
      pickup: { address: '', city: '', state: '', zip: fromZip },
      dropoff: { address: '', city: '', state: '', zip: toZip },
    }));
  });

  // Scheduling
  const [scheduling, setScheduling] = useState({
    pickupDate: '',
    pickupPreferredWindow: '',
    pickupCustomFrom: '',
    pickupCustomTo: '',
    dropoffDate: '',
    dropoffPreferredWindow: '',
    dropoffCustomFrom: '',
    dropoffCustomTo: '',
    flexibility: 'exact',
  });

  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentDetails, setPaymentDetails] = useState({});
  // ✅ INSTANT from URL
  const [acceptedPrice, setAcceptedPrice] = useState(() => {
    const params = new URLSearchParams(location.search);
    const offer = params.get('offer');
    return offer ? parseFloat(offer) : null;
  });
  const [priceBreakdown, setPriceBreakdown] = useState(null);

  /* ─────────────────────────────────────────────────────────
     Safe setter for vehicleCount
  ───────────────────────────────────────────────────────────*/
  const setVehicleCount = useCallback((newCount) => {
    const clamped = clamp(newCount, 1, 3);
    console.log(`🚗 [SET COUNT] setVehicleCount: requested=${newCount}, clamped=${clamped}`);
    setVehicleCountState(clamped);
    lastSyncedUrlCount.current = clamped;
    return clamped;
  }, []);

  /* ─────────────────────────────────────────────────────────
     Ensure vehicles array matches vehicleCount
  ───────────────────────────────────────────────────────────*/
  useEffect(() => {
    setVehicles(prev => {
      if (prev.length === vehicleCount) return prev;
      console.log(`🚗 [SYNC] Resizing vehicles array: ${prev.length} → ${vehicleCount}`);
      return normalizeVehiclesArray(prev, vehicleCount);
    });
  }, [vehicleCount]);

  /* ─────────────────────────────────────────────────────────
     Update URL when vehicleCount changes
  ───────────────────────────────────────────────────────────*/
  useEffect(() => {
    const currentUrlCount = Number(searchParams.get('vehicles')) || 1;
    if (currentUrlCount !== vehicleCount && isDataLoaded) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('vehicles', String(vehicleCount));
      setSearchParams(newParams, { replace: true });
    }
  }, [vehicleCount, searchParams, setSearchParams, isDataLoaded]);

  /* ─────────────────────────────────────────────────────────
     Apply draft/loaded data to state
  ───────────────────────────────────────────────────────────*/
  const applyLoadedData = useCallback((data, source = 'unknown') => {
    console.log(`📦 [APPLY] Applying data from ${source}:`, data);
    
    if (!data) return;

    // Apply vehicleCount
    let targetCount = vehicleCount;
    if (data.vehicleCount || data.vehiclesCount) {
      targetCount = clamp(data.vehicleCount || data.vehiclesCount, 1, 3);
      if (targetCount !== vehicleCount) {
        setVehicleCount(targetCount);
      }
    }

    // Apply vehicles array
    if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
      const normalizedVehicles = normalizeVehiclesArray(data.vehicles, targetCount);
      setVehicles(normalizedVehicles);
      console.log(`📦 [APPLY] Set vehicles array with ${normalizedVehicles.length} entries`);
    }

    // Apply scheduling
    if (data.scheduling) {
      setScheduling(prev => ({ ...prev, ...data.scheduling }));
    }

    // Apply other fields
    if (data.instructions || data.notes || data.customerInstructions) {
      setInstructions(data.instructions || data.notes || data.customerInstructions);
    }
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
    if (data.paymentDetails) setPaymentDetails(data.paymentDetails);
    if (data.acceptedPrice) setAcceptedPrice(data.acceptedPrice);
    if (data.priceBreakdown) setPriceBreakdown(data.priceBreakdown);

    draftApplied.current = true;
  }, [vehicleCount, setVehicleCount]);

  /* ─────────────────────────────────────────────────────────
     ✅ BACKGROUND: Load/create draft (doesn't block UI)
     UI is already showing URL data, this just handles drafts
  ───────────────────────────────────────────────────────────*/
  // Track whether a recovery promotion is in flight, so we don't render the
  // "No quote ID provided" dead end while the recovery is running.
  const [isRecoveringQuote, setIsRecoveringQuote] = useState(false);
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    if (urlQuoteId) return;

    // Recovery path: quote widget stored a pending payload in sessionStorage
    // before the user signed in. Now that we have a token, promote it into a
    // real quote and replace the URL with the real quoteId — rather than
    // showing the old "No quote ID provided" error.
    if (recoveryAttempted.current) return;
    const pending = readPendingQuote();
    if (!pending) {
      setError(
        "We couldn't find your quote. Please start a new quote from the homepage."
      );
      return;
    }
    if (!token) {
      // Wait for auth to finish hydrating; this effect re-runs when token arrives.
      return;
    }

    recoveryAttempted.current = true;
    setIsRecoveringQuote(true);
    setError(null);
    (async () => {
      const promotion = await promotePendingQuote({ token, payload: pending });
      setIsRecoveringQuote(false);
      if (promotion.ok) {
        // Replace the URL so all downstream logic (draft creation, DB fetches)
        // sees the real quoteId. history.replaceState avoids a full remount.
        navigate(promotion.url, { replace: true });
      } else {
        setError(
          promotion.error ||
            "We couldn't save your quote. Please try again from the homepage."
        );
      }
    })();
  }, [urlQuoteId, token, navigate]);

  useEffect(() => {
    if (!urlQuoteId) {
      // Error/recovery is handled by the recovery effect above.
      return;
    }

    // Prevent multiple initialization
    if (initStarted.current) return;
    initStarted.current = true;

    console.log('🔄 [BACKGROUND] Starting draft handling...', { urlQuoteId, urlDraftId, hasToken: !!token });

    // First, try to load from localStorage
    const cachedDraft = loadDraftFromLocalStorage(urlQuoteId);
    if (cachedDraft && !draftApplied.current) {
      console.log('📦 [BACKGROUND] Found cached draft in localStorage');
      applyLoadedData(cachedDraft, 'localStorage');
    }

    // If no token, we still have URL data - just can't load/create draft yet
    if (!token) {
      console.log('⏳ [BACKGROUND] No token yet, will retry when available');
      return;
    }

    const handleDrafts = async () => {
      try {
        // Try to enhance quoteData from database (background)
        try {
          const quote = await quotesApi.getQuoteById(urlQuoteId, token);
          if (quote) {
            console.log('✅ [BACKGROUND] Quote from DB:', quote);
            // Only update fields that are missing from URL
            setQuoteData(prev => ({
              ...prev,
              // Keep URL values, fill in missing ones from DB
              fromZip: prev.fromZip || quote.fromZip || '',
              toZip: prev.toZip || quote.toZip || '',
              miles: prev.miles || quote.miles || quote.distance || 0,
              // ✅ Pull durationHours from DB so the dropoff page can use the
              // duration-based delivery floor instead of mileage tiers.
              durationHours: prev.durationHours ?? quote.durationHours ?? null,
              offer: prev.offer || quote.offer || 0,
              vehicle: prev.vehicle || quote.vehicle || '',
              transportType: prev.transportType || quote.transportType || 'open',
              likelihood: prev.likelihood || quote.likelihood || 0,
              marketAvg: prev.marketAvg || quote.marketAvg || 0,
              recommendedMin: prev.recommendedMin || quote.recommendedMin || 0,
              recommendedMax: prev.recommendedMax || quote.recommendedMax || 0,
            }));
          }
        } catch (err) {
          console.warn('⚠️ [BACKGROUND] Could not fetch quote:', err.message);
        }

        // Load or create draft
        if (urlDraftId) {
          try {
            const draft = await bookingApi.getDraft(urlDraftId, token);
            if (draft && !draftApplied.current) {
              console.log('✅ [BACKGROUND] Draft loaded:', draft);
              applyLoadedData(draft, 'database');
            }
          } catch (err) {
            console.warn('⚠️ [BACKGROUND] Could not load draft:', err.message);
          }
        } else {
          // Create new draft
          try {
            const newDraft = await bookingApi.createDraft({
              quoteId: urlQuoteId,
              pickup: { zip: initialQuoteData.fromZip },
              dropoff: { zip: initialQuoteData.toZip },
              vehicleCount: vehicleCount,
            }, token);
            
            const createdDraftId = newDraft?.id || newDraft?.draft?.id || newDraft?.draftId;
            if (createdDraftId) {
              setDraftId(createdDraftId);
              const newParams = new URLSearchParams(searchParams);
              newParams.set('draftId', createdDraftId);
              navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
              console.log('✅ [BACKGROUND] Draft created:', createdDraftId);
            }
          } catch (err) {
            console.warn('⚠️ [BACKGROUND] Could not create draft:', err.message);
          }
        }
      } catch (err) {
        console.error('❌ [BACKGROUND] Error:', err);
      }
    };

    handleDrafts();
  }, [urlQuoteId, urlDraftId, token, initialQuoteData, vehicleCount, searchParams, navigate, location.pathname, applyLoadedData]);

  /* ─────────────────────────────────────────────────────────
     ✅ Retry draft handling when token becomes available
  ───────────────────────────────────────────────────────────*/
  useEffect(() => {
    if (token && !draftId && urlQuoteId && initStarted.current) {
      console.log('🔄 [TOKEN] Token now available, retrying draft creation...');
      initStarted.current = false; // Allow re-run
    }
  }, [token, draftId, urlQuoteId]);

  /* ─────────────────────────────────────────────────────────
     ✅ Auto-save to localStorage on state changes (debounced)
  ───────────────────────────────────────────────────────────*/
  const saveTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (!quoteId || !isDataLoaded) return;

    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraftToLocalStorage(quoteId, {
        quoteData,
        vehicles,
        vehicleCount,
        scheduling,
        instructions,
        paymentMethod,
        paymentDetails,
        acceptedPrice,
        priceBreakdown,
      });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [quoteId, quoteData, vehicles, vehicleCount, scheduling, instructions, paymentMethod, paymentDetails, acceptedPrice, priceBreakdown, isDataLoaded]);

  /* ─────────────────────────────────────────────────────────
     Helper functions for updating vehicles array
  ───────────────────────────────────────────────────────────*/
  const updateVehicle = useCallback((index, patch) => {
    setVehicles(prev => prev.map((v, i) => i === index ? { ...v, ...patch } : v));
  }, []);

  const updatePickup = useCallback((index, patch) => {
    setVehicles(prev => prev.map((v, i) => 
      i === index ? { ...v, pickup: { ...v.pickup, ...patch } } : v
    ));
  }, []);

  const updateDropoff = useCallback((index, patch) => {
    setVehicles(prev => prev.map((v, i) => 
      i === index ? { ...v, dropoff: { ...v.dropoff, ...patch } } : v
    ));
  }, []);

  const updateVehicleInfo = useCallback((index, patch) => {
    setVehicles(prev => prev.map((v, i) => 
      i === index ? { ...v, vehicle: { ...v.vehicle, ...patch } } : v
    ));
  }, []);

  const updateVehicleDocuments = useCallback((index, patch) => {
    setVehicles(prev => prev.map((v, i) => 
      i === index ? { ...v, documents: { ...v.documents, ...patch } } : v
    ));
  }, []);

  const updatePickupOrigin = useCallback((index, originType, infoType, patch) => {
    setVehicles(prev => prev.map((v, i) => {
      if (i !== index) return v;
      const updated = { ...v, pickupOriginType: originType };
      if (infoType && patch) {
        updated[infoType] = { ...v[infoType], ...patch };
      }
      return updated;
    }));
  }, []);

  const updateDropoffDestination = useCallback((index, destType, infoType, patch) => {
    setVehicles(prev => prev.map((v, i) => {
      if (i !== index) return v;
      const updated = { ...v, dropoffDestinationType: destType };
      if (infoType && patch) {
        updated[infoType] = { ...v[infoType], ...patch };
      }
      return updated;
    }));
  }, []);

  const updateAllPickups = useCallback((patch) => {
    setVehicles(prev => prev.map(v => ({ ...v, pickup: { ...v.pickup, ...patch } })));
  }, []);

  const updateAllDropoffs = useCallback((patch) => {
    setVehicles(prev => prev.map(v => ({ ...v, dropoff: { ...v.dropoff, ...patch } })));
  }, []);

  // ✅ NEW: Helper to get vehicle entry by index (used by pickup-details, dropoff-details)
  const getVehicleEntry = useCallback((index) => {
    return vehicles[index] || createEmptyVehicleEntry();
  }, [vehicles]);

  /* ─────────────────────────────────────────────────────────
     BACKWARD COMPATIBILITY: Derived values from vehicles[0]
  ───────────────────────────────────────────────────────────*/
  const pickup = useMemo(() => vehicles[0]?.pickup || { address: '', city: '', state: '', zip: '' }, [vehicles]);
  const dropoff = useMemo(() => vehicles[0]?.dropoff || { address: '', city: '', state: '', zip: '' }, [vehicles]);
  
  const setPickup = useCallback((value) => {
    if (typeof value === 'function') {
      setVehicles(prev => {
        const newPickup = value(prev[0]?.pickup || {});
        return prev.map((v, i) => i === 0 ? { ...v, pickup: newPickup } : v);
      });
    } else {
      updatePickup(0, value);
    }
  }, [updatePickup]);

  const setDropoff = useCallback((value) => {
    if (typeof value === 'function') {
      setVehicles(prev => {
        const newDropoff = value(prev[0]?.dropoff || {});
        return prev.map((v, i) => i === 0 ? { ...v, dropoff: newDropoff } : v);
      });
    } else {
      updateDropoff(0, value);
    }
  }, [updateDropoff]);

  // Legacy pickup origin fields
  const pickupOriginType = vehicles[0]?.pickupOriginType || '';
  const dealerFirstName = vehicles[0]?.pickupDealerInfo?.firstName || '';
  const dealerLastName = vehicles[0]?.pickupDealerInfo?.lastName || '';
  const dealerPhone = vehicles[0]?.pickupDealerInfo?.phone || '';
  const auctionGatePass = vehicles[0]?.pickupAuctionInfo?.gatePass || null;
  const auctionName = vehicles[0]?.pickupAuctionInfo?.name || '';
  const auctionBuyerNumber = vehicles[0]?.pickupAuctionInfo?.buyerNumber || '';
  const privateFirstName = vehicles[0]?.pickupPrivateInfo?.firstName || '';
  const privateLastName = vehicles[0]?.pickupPrivateInfo?.lastName || '';
  const privatePhone = vehicles[0]?.pickupPrivateInfo?.phone || '';

  // Legacy dropoff destination fields
  const dropoffDestinationType = vehicles[0]?.dropoffDestinationType || '';
  const dropoffDealerFirstName = vehicles[0]?.dropoffDealerInfo?.firstName || '';
  const dropoffDealerLastName = vehicles[0]?.dropoffDealerInfo?.lastName || '';
  const dropoffDealerPhone = vehicles[0]?.dropoffDealerInfo?.phone || '';
  const dropoffAuctionGatePass = vehicles[0]?.dropoffAuctionInfo?.gatePass || null;
  const dropoffAuctionName = vehicles[0]?.dropoffAuctionInfo?.name || '';
  const dropoffAuctionBuyerNumber = vehicles[0]?.dropoffAuctionInfo?.buyerNumber || '';
  const dropoffPrivateFirstName = vehicles[0]?.dropoffPrivateInfo?.firstName || '';
  const dropoffPrivateLastName = vehicles[0]?.dropoffPrivateInfo?.lastName || '';
  const dropoffPrivatePhone = vehicles[0]?.dropoffPrivateInfo?.phone || '';

  // Legacy gate pass IDs
  const pickupGatePassId = vehicles[0]?.documents?.pickupGatePassId || null;
  const dropoffGatePassId = vehicles[0]?.documents?.dropoffGatePassId || null;

  // Legacy setters
  const setPickupOriginType = useCallback((val) => updateVehicle(0, { pickupOriginType: val }), [updateVehicle]);
  const setDealerFirstName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupDealerInfo: { ...v.pickupDealerInfo, firstName: val } } : v));
  }, []);
  const setDealerLastName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupDealerInfo: { ...v.pickupDealerInfo, lastName: val } } : v));
  }, []);
  const setDealerPhone = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupDealerInfo: { ...v.pickupDealerInfo, phone: val } } : v));
  }, []);
  const setAuctionGatePass = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupAuctionInfo: { ...v.pickupAuctionInfo, gatePass: val } } : v));
  }, []);
  const setAuctionName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupAuctionInfo: { ...v.pickupAuctionInfo, name: val } } : v));
  }, []);
  const setAuctionBuyerNumber = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupAuctionInfo: { ...v.pickupAuctionInfo, buyerNumber: val } } : v));
  }, []);
  const setPrivateFirstName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupPrivateInfo: { ...v.pickupPrivateInfo, firstName: val } } : v));
  }, []);
  const setPrivateLastName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupPrivateInfo: { ...v.pickupPrivateInfo, lastName: val } } : v));
  }, []);
  const setPrivatePhone = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, pickupPrivateInfo: { ...v.pickupPrivateInfo, phone: val } } : v));
  }, []);

  const setPickupGatePassId = useCallback((val) => updateVehicleDocuments(0, { pickupGatePassId: val }), [updateVehicleDocuments]);
  const setDropoffGatePassId = useCallback((val) => updateVehicleDocuments(0, { dropoffGatePassId: val }), [updateVehicleDocuments]);

  const setDropoffDestinationType = useCallback((val) => updateVehicle(0, { dropoffDestinationType: val }), [updateVehicle]);
  const setDropoffDealerFirstName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffDealerInfo: { ...v.dropoffDealerInfo, firstName: val } } : v));
  }, []);
  const setDropoffDealerLastName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffDealerInfo: { ...v.dropoffDealerInfo, lastName: val } } : v));
  }, []);
  const setDropoffDealerPhone = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffDealerInfo: { ...v.dropoffDealerInfo, phone: val } } : v));
  }, []);
  const setDropoffAuctionGatePass = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffAuctionInfo: { ...v.dropoffAuctionInfo, gatePass: val } } : v));
  }, []);
  const setDropoffAuctionName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffAuctionInfo: { ...v.dropoffAuctionInfo, name: val } } : v));
  }, []);
  const setDropoffAuctionBuyerNumber = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffAuctionInfo: { ...v.dropoffAuctionInfo, buyerNumber: val } } : v));
  }, []);
  const setDropoffPrivateFirstName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffPrivateInfo: { ...v.dropoffPrivateInfo, firstName: val } } : v));
  }, []);
  const setDropoffPrivateLastName = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffPrivateInfo: { ...v.dropoffPrivateInfo, lastName: val } } : v));
  }, []);
  const setDropoffPrivatePhone = useCallback((val) => {
    setVehicles(prev => prev.map((v, i) => i === 0 ? { ...v, dropoffPrivateInfo: { ...v.dropoffPrivateInfo, phone: val } } : v));
  }, []);

  /* ─────────────────────────────────────────────────────────
     Navigation helper
  ───────────────────────────────────────────────────────────*/
  const goToStep = useCallback((stepPath, newDraftId = null) => {
    const params = new URLSearchParams();
    if (quoteId) params.set('quoteId', quoteId);
    const finalDraftId = newDraftId || draftId;
    if (finalDraftId) params.set('draftId', finalDraftId);
    params.set('vehicles', String(vehicleCount));
    
    // Preserve vehicle string param
    const vehicleString = searchParams.get('vehicle');
    if (vehicleString) params.set('vehicle', vehicleString);
    
    console.log('🚀 goToStep:', stepPath, 'vehicles:', vehicleCount);
    navigate(`/shipper/${stepPath}?${params.toString()}`);
  }, [quoteId, draftId, vehicleCount, navigate, searchParams]);

  /* ─────────────────────────────────────────────────────────
     Clear draft (on successful booking completion)
  ───────────────────────────────────────────────────────────*/
  const clearDraft = useCallback(() => {
    if (quoteId) {
      clearDraftFromLocalStorage(quoteId);
    }
  }, [quoteId]);

  /* ─────────────────────────────────────────────────────────
     Context value - ✅ ADDED getVehicleEntry
  ───────────────────────────────────────────────────────────*/
  const contextValue = useMemo(() => ({
    quoteId, quoteData, draftId, setDraftId, isLoading, isDataLoaded, error, goToStep, clearDraft,
    vehicleCount, setVehicleCount, vehicles, setVehicles,
    updateVehicle, updatePickup, updateDropoff, updateVehicleInfo, updateVehicleDocuments,
    updatePickupOrigin, updateDropoffDestination, updateAllPickups, updateAllDropoffs,
    getVehicleEntry, // ✅ NEW: Added for pickup/dropoff sections
    pickup, setPickup, dropoff, setDropoff, scheduling, setScheduling,
    instructions, setInstructions,
    pickupOriginType, setPickupOriginType,
    dealerFirstName, setDealerFirstName, dealerLastName, setDealerLastName, dealerPhone, setDealerPhone,
    auctionGatePass, setAuctionGatePass, auctionName, setAuctionName, auctionBuyerNumber, setAuctionBuyerNumber,
    privateFirstName, setPrivateFirstName, privateLastName, setPrivateLastName, privatePhone, setPrivatePhone,
    pickupGatePassId, setPickupGatePassId, dropoffGatePassId, setDropoffGatePassId,
    dropoffDestinationType, setDropoffDestinationType,
    dropoffDealerFirstName, setDropoffDealerFirstName, dropoffDealerLastName, setDropoffDealerLastName, dropoffDealerPhone, setDropoffDealerPhone,
    dropoffAuctionGatePass, setDropoffAuctionGatePass, dropoffAuctionName, setDropoffAuctionName, dropoffAuctionBuyerNumber, setDropoffAuctionBuyerNumber,
    dropoffPrivateFirstName, setDropoffPrivateFirstName, dropoffPrivateLastName, setDropoffPrivateLastName, dropoffPrivatePhone, setDropoffPrivatePhone,
    paymentMethod, setPaymentMethod, paymentDetails, setPaymentDetails,
    acceptedPrice, setAcceptedPrice, priceBreakdown, setPriceBreakdown,
  }), [
    quoteId, quoteData, draftId, isLoading, isDataLoaded, error, goToStep, clearDraft,
    vehicleCount, setVehicleCount, vehicles, getVehicleEntry,
    updateVehicle, updatePickup, updateDropoff, updateVehicleInfo, updateVehicleDocuments,
    updatePickupOrigin, updateDropoffDestination, updateAllPickups, updateAllDropoffs,
    pickup, setPickup, dropoff, setDropoff, scheduling,
    instructions, pickupOriginType, setPickupOriginType,
    dealerFirstName, setDealerFirstName, dealerLastName, setDealerLastName, dealerPhone, setDealerPhone,
    auctionGatePass, setAuctionGatePass, auctionName, setAuctionName, auctionBuyerNumber, setAuctionBuyerNumber,
    privateFirstName, setPrivateFirstName, privateLastName, setPrivateLastName, privatePhone, setPrivatePhone,
    pickupGatePassId, setPickupGatePassId, dropoffGatePassId, setDropoffGatePassId,
    dropoffDestinationType, setDropoffDestinationType,
    dropoffDealerFirstName, setDropoffDealerFirstName, dropoffDealerLastName, setDropoffDealerLastName, dropoffDealerPhone, setDropoffDealerPhone,
    dropoffAuctionGatePass, setDropoffAuctionGatePass, dropoffAuctionName, setDropoffAuctionName, dropoffAuctionBuyerNumber, setDropoffAuctionBuyerNumber,
    dropoffPrivateFirstName, setDropoffPrivateFirstName, dropoffPrivateLastName, setDropoffPrivateLastName, dropoffPrivatePhone, setDropoffPrivatePhone,
    paymentMethod, setPaymentMethod, paymentDetails, acceptedPrice, setAcceptedPrice, priceBreakdown, setPriceBreakdown,
  ]);

  /* ─────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────*/
  if (isLoading || isRecoveringQuote) {
    return (
      <div className="shipper-portal">
        <div className="sp-loading">
          <div className="sp-loading-spinner" />
          <p>{isRecoveringQuote ? 'Saving your quote…' : 'Loading booking portal...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shipper-portal">
        <div className="sp-error">
          <h2>Quote unavailable</h2>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={() => navigate('/#quote-widget')} className="btn-primary-portal">
              Start a new quote
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary-portal" style={{ background: 'transparent', border: '1px solid currentColor' }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalContext.Provider value={contextValue}>
      <div className="shipper-portal">
        <StepsNav steps={STEP_LABELS} />
        <div className="sp-body">
          <Outlet context={contextValue} />
        </div>
      </div>
    </PortalContext.Provider>
  );
}