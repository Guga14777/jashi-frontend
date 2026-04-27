// ============================================================
// FILE: src/pages/shipper-portal/sections/pickup-details.jsx
// ✅ REDESIGNED: Origin-type-based scheduling
// - Auction/Dealership = Ready Date + Time Preference (flexible)
// - Private/Residential = Date + Time Window (strict)
// - Weekend blocking for auctions with opt-in confirmation
// - Appointment requirement badges for Copart/Manheim
// ✅ FIXED: TimeWindowPicker prop alignment (presetId / allowEarlyArrival),
//          preset ID format in lead-time validation, duplicate early-arrival
//          checkbox removed.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Info, Clock, Calendar, AlertTriangle, CheckCircle, HelpCircle, Building2 } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as quotesApi from '../../../services/quotes.api.js';
import TimeWindowPicker from '../../../components/booking/time-window-picker.jsx';
import FileUploader from '../../../components/ui/file-uploader.jsx';
import { getStateFromZip, isValidZipFormat, isContinentalUSZip } from '../../../utils/geo.js';
import {
  getTimezoneForState,
  getCurrentTimeMinutesInTimezone,
  getTodayInTimezone,
  formatMinutesToLabel,
  getTimezoneAbbreviation,
} from '../../../utils/timezone-utils.js';
import './pickup-details.css';
import '../../../components/ui/file-uploader.css';

// ✅ Continental US states only (48 contiguous states + DC)
const US_STATES = [
  'AL','AZ','AR','CA','CO','CT','DE','FL','GA','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY','DC'
];

const DEFAULT_PICKUP = {
  address: '',
  city: '',
  state: '',
  zip: ''
};

const DEFAULT_CONTACT = {
  firstName: '',
  lastName: '',
  phone: ''
};

// ✅ MINIMUM LEAD TIME: 2 hours for same-day pickups (residential only)
const MIN_LEAD_TIME_MINUTES = 120;

// ✅ Time preferences for auction/dealership (flexible scheduling)
const TIME_PREFERENCES = [
  { value: 'morning', label: 'Morning', sublabel: '8 AM – 12 PM' },
  { value: 'afternoon', label: 'Afternoon', sublabel: '12 PM – 5 PM' },
  { value: 'flexible', label: 'Flexible', sublabel: 'Any time during business hours' },
];

// ✅ Known auction facilities and their appointment requirements
const AUCTION_FACILITIES = {
  copart: {
    name: 'Copart',
    requiresAppointment: true,
    gatePassRequired: true,
    message: 'Appointment required. Gate pass must be uploaded before dispatch.',
    keywords: ['copart'],
  },
  manheim: {
    name: 'Manheim',
    requiresAppointment: false,
    gatePassRequired: true,
    message: 'No appointment required. Gate pass still needed for vehicle release.',
    keywords: ['manheim'],
  },
  iaai: {
    name: 'IAAI',
    requiresAppointment: true,
    gatePassRequired: true,
    message: 'Appointment typically required. Verify with your specific location.',
    keywords: ['iaai', 'insurance auto auctions'],
  },
  adesa: {
    name: 'ADESA',
    requiresAppointment: false,
    gatePassRequired: true,
    message: 'No appointment required for most locations.',
    keywords: ['adesa'],
  },
};

// ✅ Parse time string to minutes
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : '';

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// ✅ Check if origin type uses flexible scheduling (no strict windows)
function isFlexibleOriginType(originType) {
  return originType === 'auction' || originType === 'dealership';
}

// ✅ Detect auction facility from address or name
function detectAuctionFacility(address, auctionName) {
  const searchText = `${address || ''} ${auctionName || ''}`.toLowerCase();

  for (const [key, facility] of Object.entries(AUCTION_FACILITIES)) {
    if (facility.keywords.some(keyword => searchText.includes(keyword))) {
      return { key, ...facility };
    }
  }

  return null;
}

// ✅ Check if a date is a weekend
function isWeekend(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// ✅ Get next weekday from a date
function getNextWeekday(dateStr) {
  if (!dateStr) return dateStr;
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay();

  if (day === 0) { // Sunday -> Monday
    date.setDate(date.getDate() + 1);
  } else if (day === 6) { // Saturday -> Monday
    date.setDate(date.getDate() + 2);
  }

  return date.toISOString().split('T')[0];
}

export default function PickupDetails() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const {
    vehicles,
    vehicleCount,
    updatePickup,
    updateVehicle,
    updateVehicleDocuments,
    scheduling,
    setScheduling,
    draftId,
    quoteId,
    goToStep,
  } = usePortal();

  console.log('🚗 [PICKUP] vehicleCount from context:', vehicleCount);
  console.log('🚗 [PICKUP] vehicles array length:', vehicles?.length);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // ✅ Track ZIP lookup status per vehicle
  const [zipLookupStatus, setZipLookupStatus] = useState({});

  // ✅ Track gate pass save status per vehicle
  const [gatePassSaveStatus, setGatePassSaveStatus] = useState({});

  // ✅ Weekend confirmation state for auctions
  const [weekendConfirmed, setWeekendConfirmed] = useState(false);

  // ✅ Auction facility name input (for unknown facilities)
  const [auctionFacilityName, setAuctionFacilityName] = useState({});

  // ✅ Ref to track ongoing gate pass saves
  const gatePassSaveInProgress = useRef({});

  // ✅ Ref for latest vehicles state
  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  // ✅ Get the pickup state from the FIRST vehicle (for timezone calculation)
  const pickupState = useMemo(() => {
    const firstVehicle = vehicles[0];
    return firstVehicle?.pickup?.state || null;
  }, [vehicles]);

  // ✅ Determine timezone from pickup state
  const pickupTimezone = useMemo(() => {
    if (pickupState) {
      const tz = getTimezoneForState(pickupState);
      if (tz) {
        console.log(`🌍 [PICKUP] Using timezone for ${pickupState}: ${tz}`);
        return tz;
      }
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/New_York';
    }
  }, [pickupState]);

  // ✅ Get "today" in the PICKUP LOCATION's timezone
  const todayIso = useMemo(() => {
    return getTodayInTimezone(pickupTimezone);
  }, [pickupTimezone]);

  // ✅ Determine if ALL vehicles use flexible origin type
  const allVehiclesUseFlexibleOrigin = useMemo(() => {
    if (vehicleCount === 0) return false;
    return vehicles.slice(0, vehicleCount).every(v => isFlexibleOriginType(v?.pickupOriginType));
  }, [vehicles, vehicleCount]);

  // ✅ Determine if ANY vehicle is from auction
  const anyVehicleFromAuction = useMemo(() => {
    return vehicles.slice(0, vehicleCount).some(v => v?.pickupOriginType === 'auction');
  }, [vehicles, vehicleCount]);

  // ✅ Determine if we should show residential time windows
  const showResidentialTimeWindows = useMemo(() => {
    // Show strict time windows if ANY vehicle is residential
    return vehicles.slice(0, vehicleCount).some(v => v?.pickupOriginType === 'private');
  }, [vehicles, vehicleCount]);

  // ✅ Check if any origin type is selected
  const hasAnyOriginType = useMemo(() => {
    return vehicles.slice(0, vehicleCount).some(v => v?.pickupOriginType);
  }, [vehicles, vehicleCount]);

  // ✅ Detect auction facility for first auction vehicle
  const detectedFacility = useMemo(() => {
    const auctionVehicle = vehicles.slice(0, vehicleCount).find(v => v?.pickupOriginType === 'auction');
    if (!auctionVehicle) return null;

    const address = `${auctionVehicle.pickup?.address || ''} ${auctionVehicle.pickup?.city || ''}`;
    const facilityName = auctionFacilityName[0] || auctionVehicle.pickupAuctionInfo?.facilityName || '';

    return detectAuctionFacility(address, facilityName);
  }, [vehicles, vehicleCount, auctionFacilityName]);

  // ✅ Check if selected date is weekend and auction is selected
  const isWeekendSelected = useMemo(() => {
    return anyVehicleFromAuction && isWeekend(scheduling.pickupDate);
  }, [anyVehicleFromAuction, scheduling.pickupDate]);

  // ============================================================================
  // ✅ AUTO-DERIVE STATE FROM ZIP ON MOUNT AND WHEN ZIP CHANGES
  // ============================================================================
  useEffect(() => {
    vehicles.forEach((entry, index) => {
      const zip = entry?.pickup?.zip;
      const currentState = entry?.pickup?.state;

      if (zip && isValidZipFormat(zip)) {
        const derivedState = getStateFromZip(zip);

        if (derivedState && derivedState !== currentState) {
          console.log(`🗺️ [PICKUP] Auto-setting state for vehicle ${index + 1}: ${zip} → ${derivedState}`);
          updatePickup(index, { state: derivedState });
          setZipLookupStatus(prev => ({ ...prev, [index]: 'success' }));
        } else if (derivedState) {
          setZipLookupStatus(prev => ({ ...prev, [index]: 'success' }));
        } else if (!derivedState && zip.length === 5) {
          setZipLookupStatus(prev => ({ ...prev, [index]: 'unknown' }));
        }
      } else if (zip && zip.length < 5) {
        setZipLookupStatus(prev => ({ ...prev, [index]: 'incomplete' }));
      }
    });
  }, [vehicles, updatePickup]);

  // ============================================================================
  // Helper functions
  // ============================================================================

  const getVehicleEntry = useCallback((index) => {
    return vehicles[index] || {};
  }, [vehicles]);

  const getPickup = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickup || DEFAULT_PICKUP;
  }, [getVehicleEntry]);

  const getOriginType = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickupOriginType || '';
  }, [getVehicleEntry]);

  const getContactInfo = useCallback((index, originType) => {
    const entry = getVehicleEntry(index);
    if (originType === 'dealership') {
      return entry.pickupDealerInfo || DEFAULT_CONTACT;
    } else if (originType === 'private') {
      return entry.pickupPrivateInfo || DEFAULT_CONTACT;
    }
    return DEFAULT_CONTACT;
  }, [getVehicleEntry]);

  const getVehicleLabel = useCallback((index) => {
    const vehicleInfo = vehicles[index]?.vehicle || {};
    if (vehicleInfo.year && vehicleInfo.make && vehicleInfo.model) {
      return `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
    }
    return `Vehicle ${index + 1}`;
  }, [vehicles]);

  const getGatePass = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickupAuctionInfo?.gatePass || null;
  }, [getVehicleEntry]);

  // ============================================================================
  // Validation helpers
  // ============================================================================

  const validateLettersOnly = (value) => /^[a-zA-Z\s'-]*$/.test(value);
  const validateNumbersOnly = (value) => /^\d*$/.test(value);
  const validatePhoneNumber = (phone) => {
    const cleaned = (phone || '').replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return value;

    const parts = [match[1], match[2], match[3]].filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `(${parts[0]}) ${parts[1]}`;
    return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
  };

  const clearError = (key) => {
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handlePickupChange = (index, field) => (e) => {
    let value = e.target.value;

    if (field === 'city') {
      if (!validateLettersOnly(value)) return;
    } else if (field === 'zip') {
      if (!validateNumbersOnly(value)) return;
      if (value.length > 5) return;

      if (value.length === 5) {
        const derivedState = getStateFromZip(value);
        if (derivedState) {
          console.log(`🗺️ [PICKUP] ZIP changed, auto-setting state: ${value} → ${derivedState}`);
          updatePickup(index, { zip: value, state: derivedState });
          setZipLookupStatus(prev => ({ ...prev, [index]: 'success' }));
          clearError(`${index}_zip`);
          clearError(`${index}_state`);
          return;
        } else {
          console.log(`⚠️ [PICKUP] ZIP lookup failed for ${value}, clearing state`);
          updatePickup(index, { zip: value, state: '' });
          setZipLookupStatus(prev => ({ ...prev, [index]: 'unknown' }));
          return;
        }
      } else {
        setZipLookupStatus(prev => ({ ...prev, [index]: 'incomplete' }));
      }
    }

    updatePickup(index, { [field]: value });
    clearError(`${index}_${field}`);
  };

  const handleStateChange = (index) => (e) => {
    const value = e.target.value;
    updatePickup(index, { state: value });
    clearError(`${index}_state`);
  };

  const handleOriginTypeChange = (index) => (e) => {
    const value = e.target.value;
    updateVehicle(index, { pickupOriginType: value });

    // ✅ Clear scheduling fields when switching to/from flexible origin
    if (isFlexibleOriginType(value)) {
      // Switching to flexible - clear strict time windows
      setScheduling(prev => ({
        ...prev,
        pickupPreferredWindow: '',
        pickupCustomFrom: '',
        pickupCustomTo: '',
      }));
    } else {
      // Switching to residential - clear flexible preference
      setScheduling(prev => ({
        ...prev,
        pickupTimePreference: '',
      }));
    }

    // Reset weekend confirmation when changing origin type
    setWeekendConfirmed(false);

    const errorsToClear = [
      `${index}_pickupOriginType`,
      `${index}_dealerFirstName`,
      `${index}_dealerLastName`,
      `${index}_dealerPhone`,
      `${index}_auctionGatePass`,
      `${index}_privateFirstName`,
      `${index}_privateLastName`,
      `${index}_privatePhone`,
    ];
    setErrors((prev) => {
      const newErrors = { ...prev };
      errorsToClear.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const handleContactChange = (index, originType, field) => (e) => {
    let value = e.target.value;

    if (field === 'firstName' || field === 'lastName') {
      if (!validateLettersOnly(value)) return;
    } else if (field === 'phone') {
      value = formatPhoneNumber(value);
    }

    const infoKey = originType === 'dealership' ? 'pickupDealerInfo' : 'pickupPrivateInfo';
    const currentInfo = originType === 'dealership'
      ? getVehicleEntry(index).pickupDealerInfo || DEFAULT_CONTACT
      : getVehicleEntry(index).pickupPrivateInfo || DEFAULT_CONTACT;

    updateVehicle(index, {
      [infoKey]: { ...currentInfo, [field]: value }
    });

    const errorPrefix = originType === 'dealership' ? 'dealer' : 'private';
    clearError(`${index}_${errorPrefix}${field.charAt(0).toUpperCase() + field.slice(1)}`);
  };

  // ✅ Handle auction facility name change
  const handleAuctionFacilityNameChange = (index) => (e) => {
    const value = e.target.value;
    setAuctionFacilityName(prev => ({ ...prev, [index]: value }));

    // Also save to vehicle data
    const currentAuctionInfo = getVehicleEntry(index).pickupAuctionInfo || {};
    updateVehicle(index, {
      pickupAuctionInfo: { ...currentAuctionInfo, facilityName: value }
    });
  };

  // ✅ Gate pass upload handler
  const handleGatePassUpload = (index) => async (uploadedFiles) => {
    const fileInfo = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;

    if (!fileInfo) {
      console.error(`❌ Gate pass upload for Vehicle ${index + 1} returned no file info`);
      return;
    }

    console.log(`📁 Gate pass uploaded for Vehicle ${index + 1}:`, fileInfo);

    const gatePassMetadata = {
      id: fileInfo.id || fileInfo.documentId,
      url: fileInfo.url || fileInfo.downloadUrl,
      filename: fileInfo.filename || fileInfo.name || fileInfo.file?.name,
      contentType: fileInfo.contentType || fileInfo.type || fileInfo.file?.type,
      size: fileInfo.size || fileInfo.file?.size,
      uploadedAt: new Date().toISOString(),
    };

    const currentAuctionInfo = getVehicleEntry(index).pickupAuctionInfo || {};
    updateVehicle(index, {
      pickupAuctionInfo: { ...currentAuctionInfo, gatePass: gatePassMetadata }
    });

    if (gatePassMetadata.id) {
      updateVehicleDocuments(index, { pickupGatePassId: gatePassMetadata.id });
      console.log(`✅ Set pickupGatePassId for Vehicle ${index + 1} to:`, gatePassMetadata.id);
    }

    clearError(`${index}_auctionGatePass`);

    // Immediate backend save
    if (draftId && token) {
      if (gatePassSaveInProgress.current[index]) {
        console.log(`⏳ Gate pass save already in progress for Vehicle ${index + 1}, skipping duplicate`);
        return;
      }

      gatePassSaveInProgress.current[index] = true;
      setGatePassSaveStatus(prev => ({ ...prev, [index]: 'saving' }));

      try {
        const freshVehicles = vehiclesRef.current;
        const updatedVehicles = freshVehicles.map((v, i) => {
          if (i !== index) return v;
          return {
            ...v,
            pickupAuctionInfo: { ...(v.pickupAuctionInfo || {}), gatePass: gatePassMetadata },
            documents: { ...(v.documents || {}), pickupGatePassId: gatePassMetadata.id }
          };
        });

        await quotesApi.patchDraft(draftId, { vehicles: updatedVehicles }, token);
        console.log(`✅ [BACKEND] Gate pass saved to backend draft for Vehicle ${index + 1}`);

        setGatePassSaveStatus(prev => ({ ...prev, [index]: 'saved' }));
        setTimeout(() => {
          setGatePassSaveStatus(prev => ({ ...prev, [index]: 'idle' }));
        }, 3000);

      } catch (err) {
        console.warn(`⚠️ [BACKEND] Failed to save gate pass to backend:`, err.message);
        setGatePassSaveStatus(prev => ({ ...prev, [index]: 'error' }));
      } finally {
        gatePassSaveInProgress.current[index] = false;
      }
    }
  };

  const handleGatePassRemove = (index) => () => {
    console.log(`🗑️ Removing gate pass for Vehicle ${index + 1}`);

    const currentAuctionInfo = getVehicleEntry(index).pickupAuctionInfo || {};
    updateVehicle(index, {
      pickupAuctionInfo: { ...currentAuctionInfo, gatePass: null }
    });
    updateVehicleDocuments(index, { pickupGatePassId: null });
  };

  // ✅ Handle time preference change (for auction/dealership)
  const handleTimePreferenceChange = (preference) => {
    setScheduling({
      ...scheduling,
      pickupTimePreference: preference,
      // Clear strict time windows when using flexible preference
      pickupPreferredWindow: '',
      pickupCustomFrom: '',
      pickupCustomTo: '',
    });
    if (errors.pickupTime) setErrors((prev) => ({ ...prev, pickupTime: '' }));
  };

  // ✅ Handle date change with weekend validation for auctions
  const handleDateChange = (e) => {
    const value = e.target.value;
    setScheduling({ ...scheduling, pickupDate: value });

    // Reset weekend confirmation when date changes
    if (anyVehicleFromAuction && isWeekend(value)) {
      setWeekendConfirmed(false);
    }

    if (errors.pickupDate) setErrors((prev) => ({ ...prev, pickupDate: '' }));
  };

  // ✅ Handle weekend confirmation toggle
  const handleWeekendConfirmation = (e) => {
    setWeekendConfirmed(e.target.checked);
    if (e.target.checked && errors.weekendConfirmation) {
      setErrors((prev) => ({ ...prev, weekendConfirmation: '' }));
    }
  };

  // ✅ FIXED: Map TimeWindowPicker's output shape to our scheduling state
  //    Child emits: { date, presetId, customFrom, customTo, allowEarlyArrival, windowStart, windowEnd, ... }
  //    We store:    { pickupDate, pickupPreferredWindow, pickupCustomFrom, pickupCustomTo, pickupEarlyArrivalAllowed }
  const handlePickupScheduleChange = (newSchedule) => {
    setScheduling({
      ...scheduling,
      pickupDate: newSchedule.date || '',
      pickupPreferredWindow: newSchedule.presetId || '',
      pickupCustomFrom: newSchedule.customFrom || '',
      pickupCustomTo: newSchedule.customTo || '',
      pickupEarlyArrivalAllowed:
        newSchedule.allowEarlyArrival !== undefined
          ? newSchedule.allowEarlyArrival
          : scheduling.pickupEarlyArrivalAllowed,
      // Clear flexible preference when using strict windows
      pickupTimePreference: '',
    });

    if (errors.pickupDate) setErrors((prev) => ({ ...prev, pickupDate: '' }));
    if (errors.pickupTime) setErrors((prev) => ({ ...prev, pickupTime: '' }));
  };

  // ============================================================================
  // Validation and Continue
  // ============================================================================

  const handleContinue = async () => {
    const newErrors = {};

    // Validate each vehicle
    for (let i = 0; i < vehicleCount; i++) {
      const pickup = getPickup(i);
      const originType = getOriginType(i);
      const gatePass = getGatePass(i);

      if (!originType) {
        newErrors[`${i}_pickupOriginType`] = 'Please select where the vehicle is coming from';
      }

      if (originType === 'dealership') {
        const contact = getContactInfo(i, 'dealership');
        if (!contact.firstName?.trim()) newErrors[`${i}_dealerFirstName`] = 'Dealer first name is required';
        if (!contact.lastName?.trim()) newErrors[`${i}_dealerLastName`] = 'Dealer last name is required';
        if (!contact.phone?.trim()) {
          newErrors[`${i}_dealerPhone`] = 'Dealer phone number is required';
        } else if (!validatePhoneNumber(contact.phone)) {
          newErrors[`${i}_dealerPhone`] = 'Please enter a valid 10-digit phone number';
        }
      } else if (originType === 'auction') {
        if (!gatePass || !gatePass.id) {
          newErrors[`${i}_auctionGatePass`] = 'Please upload the auction gate pass to continue';
        }
      } else if (originType === 'private') {
        const contact = getContactInfo(i, 'private');
        if (!contact.firstName?.trim()) newErrors[`${i}_privateFirstName`] = 'First name is required';
        if (!contact.lastName?.trim()) newErrors[`${i}_privateLastName`] = 'Last name is required';
        if (!contact.phone?.trim()) {
          newErrors[`${i}_privatePhone`] = 'Phone number is required';
        } else if (!validatePhoneNumber(contact.phone)) {
          newErrors[`${i}_privatePhone`] = 'Please enter a valid 10-digit phone number';
        }
      }

      if (!pickup.address) newErrors[`${i}_address`] = 'Street address is required';
      if (!pickup.city) newErrors[`${i}_city`] = 'City is required';
      if (!pickup.zip) newErrors[`${i}_zip`] = 'ZIP code is required';
      else if (pickup.zip.length !== 5) newErrors[`${i}_zip`] = 'ZIP code must be 5 digits';

      if (!pickup.state) {
        if (pickup.zip && pickup.zip.length === 5) {
          newErrors[`${i}_state`] = 'Could not determine state from ZIP. Please select manually.';
        } else {
          newErrors[`${i}_state`] = 'State is required (enter ZIP to auto-fill)';
        }
      }

      // Block AK/HI
      if (pickup.state && ['AK', 'HI'].includes(pickup.state)) {
        newErrors[`${i}_zip`] = 'Sorry, we currently only ship within the continental United States (48 states + DC). Alaska and Hawaii are not available.';
      }

      if (pickup.zip && pickup.zip.length === 5 && !isContinentalUSZip(pickup.zip)) {
        const derivedState = getStateFromZip(pickup.zip);
        if (derivedState && ['AK', 'HI'].includes(derivedState)) {
          newErrors[`${i}_zip`] = 'Sorry, we currently only ship within the continental United States (48 states + DC). Alaska and Hawaii are not available.';
        }
      }
    }

    // ✅ Scheduling validation - depends on origin type
    if (!scheduling.pickupDate) {
      newErrors.pickupDate = 'Preferred date is required';
    }

    // ✅ Weekend validation for auctions
    if (anyVehicleFromAuction && isWeekend(scheduling.pickupDate) && !weekendConfirmed) {
      newErrors.weekendConfirmation = 'Please confirm the auction facility is open on weekends, or select a weekday.';
    }

    // ✅ Time validation based on origin type
    if (allVehiclesUseFlexibleOrigin) {
      // Auction/Dealership: Time preference is OPTIONAL - default to 'flexible' if not selected
      if (!scheduling.pickupTimePreference) {
        console.log('📝 No time preference selected for flexible origin, defaulting to flexible');
      }
    } else if (showResidentialTimeWindows) {
      // Residential: Require strict time windows
      const hasPresetTime = Boolean(scheduling.pickupPreferredWindow);
      const hasCustomTime = Boolean(scheduling.pickupCustomFrom && scheduling.pickupCustomTo);

      if (!hasPresetTime && !hasCustomTime) {
        newErrors.pickupTime = 'Please select a preferred time window or set a custom time range';
      }

      // ✅ Validate 2-hour minimum lead time for residential same-day pickups
      const isToday = scheduling.pickupDate === todayIso;
      if (isToday && !newErrors.pickupDate && !newErrors.pickupTime) {
        const currentTimeInPickupTz = getCurrentTimeMinutesInTimezone(pickupTimezone);
        const earliestAllowed = currentTimeInPickupTz + MIN_LEAD_TIME_MINUTES;
        const tzAbbr = getTimezoneAbbreviation(pickupTimezone);

        if (hasCustomTime) {
          const customFromMinutes = parseTimeToMinutes(scheduling.pickupCustomFrom);
          if (customFromMinutes < earliestAllowed) {
            newErrors.pickupTime = `For same-day pickup, please choose a time at least 2 hours from now. Earliest available: ${formatMinutesToLabel(earliestAllowed)} ${tzAbbr} (pickup location time)`;
          }
        } else if (hasPresetTime && scheduling.pickupPreferredWindow !== 'flexible') {
          // ✅ FIXED: preset IDs from TimeWindowPicker are '8-10', '10-12', etc. (not '8:00-10:00')
          const presetStartTimes = {
            '8-10': parseTimeToMinutes('8:00 AM'),
            '10-12': parseTimeToMinutes('10:00 AM'),
            '12-14': parseTimeToMinutes('12:00 PM'),
            '14-16': parseTimeToMinutes('2:00 PM'),
            '16-18': parseTimeToMinutes('4:00 PM'),
          };

          const presetStart = presetStartTimes[scheduling.pickupPreferredWindow];
          if (presetStart !== undefined && presetStart < earliestAllowed) {
            newErrors.pickupTime = `For same-day pickup, please choose a time at least 2 hours from now. Earliest available: ${formatMinutesToLabel(earliestAllowed)} ${tzAbbr} (pickup location time)`;
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorIndex = firstErrorKey.includes('_') ? parseInt(firstErrorKey.split('_')[0], 10) : 0;
      const element = document.getElementById(`pickup-section-${firstErrorIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // ✅ Build normalized pickup data for saving
    const normalizedPickup = {
      locationType: vehicles[0]?.pickupOriginType || '',
      ...(allVehiclesUseFlexibleOrigin ? {
        readyDate: scheduling.pickupDate,
        timePreference: scheduling.pickupTimePreference || 'flexible',
        weekendConfirmed: weekendConfirmed,
      } : {
        window: {
          date: scheduling.pickupDate,
          preferredWindow: scheduling.pickupPreferredWindow,
          customFrom: scheduling.pickupCustomFrom,
          customTo: scheduling.pickupCustomTo,
        },
        earlyArrivalAllowed: scheduling.pickupEarlyArrivalAllowed || false,
      }),
      appointmentRequirement: detectedFacility ? {
        facility: detectedFacility.name,
        requiresAppointment: detectedFacility.requiresAppointment,
        gatePassRequired: detectedFacility.gatePassRequired,
      } : null,
    };

    // Save to draft
    if (draftId) {
      setIsSaving(true);
      try {
        await quotesApi.patchDraft(
          draftId,
          {
            vehicles,
            vehicleCount,
            scheduling: {
              pickupDate: scheduling.pickupDate,
              pickupPreferredWindow: scheduling.pickupPreferredWindow,
              pickupCustomFrom: scheduling.pickupCustomFrom,
              pickupCustomTo: scheduling.pickupCustomTo,
              pickupTimePreference: scheduling.pickupTimePreference || (allVehiclesUseFlexibleOrigin ? 'flexible' : ''),
              pickupEarlyArrivalAllowed: scheduling.pickupEarlyArrivalAllowed || false,
              pickupWeekendConfirmed: weekendConfirmed,
              pickupInstructions: scheduling.pickupInstructions || '',
            },
            pickup: normalizedPickup,
          },
          token
        );
        console.log(`✅ Pickup details saved for ${vehicleCount} vehicle(s)`);
      } catch (err) {
        console.error('Failed to save:', err);
        alert('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    if (goToStep) {
      goToStep('dropoff');
    } else {
      navigate('../dropoff');
    }
  };

  // ============================================================================
  // ✅ Render appointment requirement badge
  // ============================================================================
  const renderAppointmentBadge = () => {
    if (!anyVehicleFromAuction) return null;

    if (detectedFacility) {
      return (
        <div className={`sp-appointment-badge ${detectedFacility.requiresAppointment ? 'sp-appointment-badge--required' : 'sp-appointment-badge--not-required'}`}>
          <div className="sp-appointment-badge-icon">
            {detectedFacility.requiresAppointment ? (
              <AlertTriangle size={18} />
            ) : (
              <CheckCircle size={18} />
            )}
          </div>
          <div className="sp-appointment-badge-content">
            <div className="sp-appointment-badge-title">
              {detectedFacility.name} Detected
            </div>
            <div className="sp-appointment-badge-message">
              {detectedFacility.message}
            </div>
          </div>
        </div>
      );
    }

    // Unknown facility
    return (
      <div className="sp-appointment-badge sp-appointment-badge--unknown">
        <div className="sp-appointment-badge-icon">
          <HelpCircle size={18} />
        </div>
        <div className="sp-appointment-badge-content">
          <div className="sp-appointment-badge-title">
            Appointment Status Unknown
          </div>
          <div className="sp-appointment-badge-message">
            If the carrier is turned away due to appointment requirements, there's no penalty.
            We'll coordinate with the facility and attempt pickup again at no extra cost.
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Render pickup section for a single vehicle
  // ============================================================================

  const renderVehiclePickup = (index) => {
    const pickup = getPickup(index);
    const originType = getOriginType(index);
    const vehicleLabel = getVehicleLabel(index);
    const gatePass = getGatePass(index);
    const zipStatus = zipLookupStatus[index];
    const saveStatus = gatePassSaveStatus[index] || 'idle';

    return (
      <div
        key={index}
        id={`pickup-section-${index}`}
        className="sp-vehicle-pickup-section"
        style={{ marginBottom: index < vehicleCount - 1 ? '2rem' : undefined }}
      >
        {vehicleCount > 1 && (
          <div className="sp-vehicle-header">
            <span className="sp-vehicle-header-number">
              Vehicle {index + 1}
            </span>
            {vehicleLabel !== `Vehicle ${index + 1}` && (
              <span className="sp-vehicle-header-name">
                — {vehicleLabel}
              </span>
            )}
          </div>
        )}

        {/* Vehicle Origin Type */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              {vehicleCount > 1
                ? `Where is Vehicle ${index + 1} coming from?`
                : 'Where is the vehicle coming from?'
              }
            </h4>
          </div>

          <div className="sp-form-group">
            <select
              className={`sp-select ${errors[`${index}_pickupOriginType`] ? 'sp-input--error' : ''}`}
              value={originType}
              onChange={handleOriginTypeChange(index)}
            >
              <option value="">Select origin type</option>
              <option value="dealership">Dealership</option>
              <option value="auction">Auction (Copart, Manheim, IAAI, etc.)</option>
              <option value="private">Private / Residential</option>
            </select>
            {errors[`${index}_pickupOriginType`] && (
              <span className="sp-error-text">{errors[`${index}_pickupOriginType`]}</span>
            )}
          </div>

          {/* Dealership Contact */}
          {originType === 'dealership' && (
            <div className="sp-form-grid" style={{ marginTop: '16px' }}>
              <div className="sp-form-group">
                <label className="sp-label">
                  Dealer First Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dealerFirstName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter first name"
                  value={getContactInfo(index, 'dealership').firstName || ''}
                  onChange={handleContactChange(index, 'dealership', 'firstName')}
                />
                {errors[`${index}_dealerFirstName`] && (
                  <span className="sp-error-text">{errors[`${index}_dealerFirstName`]}</span>
                )}
              </div>

              <div className="sp-form-group">
                <label className="sp-label">
                  Dealer Last Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dealerLastName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter last name"
                  value={getContactInfo(index, 'dealership').lastName || ''}
                  onChange={handleContactChange(index, 'dealership', 'lastName')}
                />
                {errors[`${index}_dealerLastName`] && (
                  <span className="sp-error-text">{errors[`${index}_dealerLastName`]}</span>
                )}
              </div>

              <div className="sp-form-group sp-form-group--full">
                <label className="sp-label">
                  Dealer Phone Number <span className="sp-required">*</span>
                </label>
                <input
                  type="tel"
                  className={`sp-input ${errors[`${index}_dealerPhone`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter phone number"
                  value={getContactInfo(index, 'dealership').phone || ''}
                  onChange={handleContactChange(index, 'dealership', 'phone')}
                  maxLength="14"
                />
                {errors[`${index}_dealerPhone`] && (
                  <span className="sp-error-text">{errors[`${index}_dealerPhone`]}</span>
                )}
              </div>
            </div>
          )}

          {/* Auction Section */}
          {originType === 'auction' && (
            <div style={{ marginTop: '16px' }}>
              {/* Auction Facility Name Input */}
              <div className="sp-form-group" style={{ marginBottom: '16px' }}>
                <label className="sp-label">
                  <Building2 size={14} />
                  Auction Facility Name
                </label>
                <input
                  type="text"
                  className="sp-input"
                  placeholder="e.g., Copart Atlanta, Manheim Georgia"
                  value={auctionFacilityName[index] || getVehicleEntry(index).pickupAuctionInfo?.facilityName || ''}
                  onChange={handleAuctionFacilityNameChange(index)}
                />
                <div className="sp-field-helper">
                  Enter the auction facility name to see appointment requirements
                </div>
              </div>

              {/* Appointment Badge */}
              {index === 0 && renderAppointmentBadge()}

              <h5 className="sp-subsection-title" style={{ marginTop: '20px' }}>
                Auction Gate Pass <span className="sp-required">*</span>
                {vehicleCount > 1 && (
                  <span style={{ fontWeight: 400, fontSize: '0.875rem', marginLeft: '8px' }}>
                    (for Vehicle {index + 1})
                  </span>
                )}
              </h5>

              {gatePass && gatePass.id ? (
                <div className="sp-uploaded-file">
                  <div className="sp-uploaded-file-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sp-uploaded-file-icon">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                      <div className="sp-uploaded-file-name">
                        {gatePass.filename || 'Gate Pass Uploaded'}
                      </div>
                      <div className="sp-uploaded-file-status">
                        <span>Uploaded successfully</span>
                        {saveStatus === 'saving' && (
                          <span className="sp-uploaded-file-syncing">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sp-spinner-icon">
                              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                            Syncing...
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className="sp-uploaded-file-synced">✓ Synced</span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="sp-uploaded-file-error">⚠ Sync pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sp-uploaded-file-actions">
                    {gatePass.url && (
                      <a
                        href={gatePass.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sp-btn sp-btn--small sp-btn--secondary"
                      >
                        View
                      </a>
                    )}
                    <button
                      type="button"
                      className="sp-btn sp-btn--small sp-btn--danger"
                      onClick={handleGatePassRemove(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <FileUploader
                  onUpload={handleGatePassUpload(index)}
                  onRemove={handleGatePassRemove(index)}
                  type="PICKUP_GATEPASS"
                  label="Upload gate pass"
                  hint="PDF, JPG, PNG • Max 10MB"
                  existingFile={null}
                  className={errors[`${index}_auctionGatePass`] ? 'file-uploader-has-error' : ''}
                  quoteId={quoteId}
                  multiple={false}
                  maxFiles={1}
                  vehicleIndex={index}
                  stage="pickup"
                  token={token}
                />
              )}

              <div className="sp-info-box" style={{ marginTop: '12px' }}>
                <Info size={16} />
                <p>
                  Your gate pass already includes the auction name, lot number, and buyer details.
                  Carriers need this document to access and release the vehicle from the auction facility.
                </p>
              </div>

              {errors[`${index}_auctionGatePass`] && (
                <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
                  {errors[`${index}_auctionGatePass`]}
                </span>
              )}
            </div>
          )}

          {/* Private Contact */}
          {originType === 'private' && (
            <div className="sp-form-grid" style={{ marginTop: '16px' }}>
              <div className="sp-form-group">
                <label className="sp-label">
                  First Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_privateFirstName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter first name"
                  value={getContactInfo(index, 'private').firstName || ''}
                  onChange={handleContactChange(index, 'private', 'firstName')}
                />
                {errors[`${index}_privateFirstName`] && (
                  <span className="sp-error-text">{errors[`${index}_privateFirstName`]}</span>
                )}
              </div>

              <div className="sp-form-group">
                <label className="sp-label">
                  Last Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_privateLastName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter last name"
                  value={getContactInfo(index, 'private').lastName || ''}
                  onChange={handleContactChange(index, 'private', 'lastName')}
                />
                {errors[`${index}_privateLastName`] && (
                  <span className="sp-error-text">{errors[`${index}_privateLastName`]}</span>
                )}
              </div>

              <div className="sp-form-group sp-form-group--full">
                <label className="sp-label">
                  Phone Number <span className="sp-required">*</span>
                </label>
                <input
                  type="tel"
                  className={`sp-input ${errors[`${index}_privatePhone`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter phone number"
                  value={getContactInfo(index, 'private').phone || ''}
                  onChange={handleContactChange(index, 'private', 'phone')}
                  maxLength="14"
                />
                {errors[`${index}_privatePhone`] && (
                  <span className="sp-error-text">{errors[`${index}_privatePhone`]}</span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Address Card */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              {vehicleCount > 1
                ? `Pickup Address for Vehicle ${index + 1}`
                : 'Pickup Address'
              }
            </h4>
          </div>

          <div className="sp-form-grid">
            <div className="sp-form-group sp-form-group--full">
              <label className="sp-label">
                Street Address <span className="sp-required">*</span>
              </label>
              <input
                type="text"
                className={`sp-input ${errors[`${index}_address`] ? 'sp-input--error' : ''}`}
                placeholder="Enter street address"
                value={pickup.address || ''}
                onChange={handlePickupChange(index, 'address')}
              />
              {errors[`${index}_address`] && (
                <span className="sp-error-text">{errors[`${index}_address`]}</span>
              )}
            </div>

            <div className="sp-form-group">
              <label className="sp-label">
                City <span className="sp-required">*</span>
              </label>
              <input
                type="text"
                className={`sp-input ${errors[`${index}_city`] ? 'sp-input--error' : ''}`}
                placeholder="Enter city"
                value={pickup.city || ''}
                onChange={handlePickupChange(index, 'city')}
              />
              {errors[`${index}_city`] && (
                <span className="sp-error-text">{errors[`${index}_city`]}</span>
              )}
            </div>

            <div className="sp-form-group">
              <label className="sp-label">
                ZIP Code <span className="sp-required">*</span>
              </label>
              <input
                type="text"
                className={`sp-input ${errors[`${index}_zip`] ? 'sp-input--error' : ''}`}
                placeholder="12345"
                value={pickup.zip || ''}
                onChange={handlePickupChange(index, 'zip')}
                maxLength="5"
                inputMode="numeric"
              />
              {zipStatus === 'success' && pickup.state && (
                <div className="sp-field-helper sp-field-helper--success">
                  ✓ State auto-filled: {pickup.state}
                </div>
              )}
              {zipStatus === 'unknown' && pickup.zip?.length === 5 && (
                <div className="sp-field-helper sp-field-helper--warning">
                  Could not determine state. Please select below.
                </div>
              )}
              {errors[`${index}_zip`] && (
                <span className="sp-error-text">{errors[`${index}_zip`]}</span>
              )}
            </div>

            <div className="sp-form-group sp-form-group--full">
              <label className="sp-label">
                State {zipStatus !== 'success' && <span className="sp-required">*</span>}
                {zipStatus === 'success' && (
                  <span className="sp-label-hint">
                    (auto-filled from ZIP)
                  </span>
                )}
              </label>
              <select
                className={`sp-select ${errors[`${index}_state`] ? 'sp-input--error' : ''} ${zipStatus === 'success' ? 'sp-input--derived' : ''}`}
                value={pickup.state || ''}
                onChange={handleStateChange(index)}
                disabled={zipStatus === 'success'}
              >
                <option value="">Select state</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              {errors[`${index}_state`] && (
                <span className="sp-error-text">{errors[`${index}_state`]}</span>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  };

  // ============================================================================
  // ✅ Render flexible time preference (for Auction/Dealership)
  // ============================================================================
  const renderFlexibleTimePreference = () => {
    const suggestedWeekday = isWeekendSelected ? getNextWeekday(scheduling.pickupDate) : null;

    return (
      <section className="sp-card">
        <div className="sp-card-header">
          <h4 className="sp-card-title">
            <Calendar size={18} className="sp-card-title-icon" />
            {vehicleCount > 1 ? 'Pickup Ready Date (for all vehicles)' : 'Pickup Ready Date'}
          </h4>
        </div>

        {/* Date Picker */}
        <div className="sp-form-group">
          <label className="sp-label">
            <Calendar size={14} />
            When will the vehicle be ready? <span className="sp-required">*</span>
          </label>
          <div
            className={`sp-date-input-wrap ${errors.pickupDate ? 'sp-date-input-wrap--error' : ''}`}
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input[type="date"]');
              if (!input) return;
              if (typeof input.showPicker === 'function') {
                try { input.showPicker(); return; } catch (_) {}
              }
              input.focus();
            }}
          >
            <input
              type="date"
              className={`sp-input ${errors.pickupDate ? 'sp-input--error' : ''}`}
              value={scheduling.pickupDate || ''}
              min={todayIso}
              onChange={handleDateChange}
            />
            <span className="sp-date-input-icon" aria-hidden="true">
              <Calendar size={18} />
            </span>
          </div>
          {errors.pickupDate && (
            <span className="sp-error-text">{errors.pickupDate}</span>
          )}
        </div>

        {/* ✅ Weekend Warning for Auctions */}
        {isWeekendSelected && (
          <div className="sp-weekend-warning">
            <div className="sp-weekend-warning-header">
              <AlertTriangle size={18} />
              <span>Weekend Selected</span>
            </div>
            <p className="sp-weekend-warning-text">
              Most auction facilities are closed on weekends. If you're sure this facility is open,
              please confirm below. Otherwise, we recommend selecting a weekday.
            </p>

            {suggestedWeekday && (
              <button
                type="button"
                className="sp-btn sp-btn--secondary sp-btn--small"
                onClick={() => setScheduling({ ...scheduling, pickupDate: suggestedWeekday })}
                style={{ marginBottom: '12px' }}
              >
                Switch to {new Date(suggestedWeekday + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </button>
            )}

            <label className="sp-weekend-checkbox-label">
              <input
                type="checkbox"
                checked={weekendConfirmed}
                onChange={handleWeekendConfirmation}
                className="sp-weekend-checkbox"
              />
              <span>
                I confirm this auction facility is open on {new Date(scheduling.pickupDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s
              </span>
            </label>

            {errors.weekendConfirmation && (
              <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
                {errors.weekendConfirmation}
              </span>
            )}
          </div>
        )}

        {/* ✅ Time Preference Selector (for Auction/Dealership) */}
        <div className="sp-form-group" style={{ marginTop: '24px' }}>
          <label className="sp-label">
            <Clock size={14} />
            Time Preference (Optional)
          </label>
          <p className="sp-card-subtitle" style={{ marginBottom: '16px' }}>
            This is a preference, not a strict appointment time. Carrier may arrive any time during business hours.
          </p>

          <div className="sp-time-preference-grid">
            {TIME_PREFERENCES.map((pref) => (
              <button
                key={pref.value}
                type="button"
                className={`sp-time-preference-btn ${
                  scheduling.pickupTimePreference === pref.value ? 'sp-time-preference-btn--active' : ''
                }`}
                onClick={() => handleTimePreferenceChange(pref.value)}
              >
                <span className="sp-time-preference-label">{pref.label}</span>
                <span className="sp-time-preference-sublabel">{pref.sublabel}</span>
              </button>
            ))}
          </div>

          {errors.pickupTime && (
            <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
              {errors.pickupTime}
            </span>
          )}
        </div>

        <div className="sp-info-box" style={{ marginTop: '16px' }}>
          <Info size={16} />
          <p>
            <strong>Flexible scheduling:</strong> Carriers will arrive during business hours on or after the ready date.
            Exact arrival times depend on facility operating hours, processing, and carrier route optimization.
          </p>
        </div>
      </section>
    );
  };

  // ============================================================================
  // ✅ Render strict time window picker (for Residential)
  //    FIXED: prop names aligned with TimeWindowPicker child.
  //    REMOVED: duplicate sp-early-arrival-toggle checkbox — the picker now
  //    owns allowEarlyArrival as its single source of truth.
  // ============================================================================
  const renderResidentialTimeWindow = () => {
    return (
      <>
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              <Clock size={18} className="sp-card-title-icon" />
              {vehicleCount > 1 ? 'Preferred Pickup Window (for all vehicles)' : 'Pickup Window'}
            </h4>
          </div>
          <TimeWindowPicker
            label=""
            value={{
              date: scheduling.pickupDate,
              presetId: scheduling.pickupPreferredWindow,
              customFrom: scheduling.pickupCustomFrom,
              customTo: scheduling.pickupCustomTo,
              allowEarlyArrival: scheduling.pickupEarlyArrivalAllowed || false,
            }}
            onChange={handlePickupScheduleChange}
            errors={{
              date: errors.pickupDate,
              time: errors.pickupTime,
            }}
            minDate={todayIso}
          />
        </section>

        <div className="sp-info-box">
          <Info size={16} />
          <p>
            <strong>Residential pickups use time windows for coordination.</strong> The carrier will arrive within your selected window.
            {scheduling.pickupEarlyArrivalAllowed && ' With early arrival enabled, they may arrive up to 2 hours early if it helps their route.'}
          </p>
        </div>
      </>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="sp-section sp-pickup-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <MapPin size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Pickup Details</h3>
          <p className="sp-step-description">
            {vehicleCount > 1
              ? `Provide pickup details for your ${vehicleCount} vehicles`
              : "Provide the address where we'll collect your vehicle"
            }
          </p>
        </div>
      </header>

      {/* Render pickup section for EACH vehicle */}
      {Array.from({ length: vehicleCount }).map((_, index) => renderVehiclePickup(index))}

      {/* ✅ Conditional Time Selection UI based on origin type */}
      {allVehiclesUseFlexibleOrigin ? (
        // All vehicles are auction/dealership - show flexible preference
        renderFlexibleTimePreference()
      ) : showResidentialTimeWindows ? (
        // At least one vehicle is residential - show strict time windows
        renderResidentialTimeWindow()
      ) : hasAnyOriginType ? (
        // Mixed types - show flexible for the non-residential portion
        renderFlexibleTimePreference()
      ) : (
        // No origin type selected yet - show placeholder
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">Pickup Scheduling</h4>
          </div>
          <div className="sp-info-box">
            <Info size={16} />
            <p>
              Please select where each vehicle is coming from above. Scheduling options will appear based on the pickup location type.
            </p>
          </div>
        </section>
      )}

      {/* Pickup-specific instructions for the carrier. Kept separate from the
          general "Note for the carrier" on the confirm step so carriers can
          read pickup access info in one place. */}
      <section className="sp-card" style={{ marginTop: '1rem' }}>
        <div className="sp-card-header">
          <h4 className="sp-card-title">Pickup instructions (optional)</h4>
        </div>
        <p className="sp-card-subtitle" style={{ marginBottom: '0.75rem' }}>
          Gate codes, access quirks, where the vehicle is parked, preferred contact time — anything the carrier should know about this specific pickup.
        </p>
        <textarea
          className="sp-textarea"
          value={scheduling.pickupInstructions || ''}
          onChange={(e) =>
            setScheduling({ ...scheduling, pickupInstructions: e.target.value })
          }
          placeholder="e.g. Ring the call box for unit 4. Vehicle is in the back lot — please text me when 10 minutes away."
          maxLength={500}
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.95rem',
            resize: 'vertical',
            minHeight: '80px',
            fontFamily: 'inherit',
          }}
        />
        <div style={{
          textAlign: 'right',
          fontSize: '0.8rem',
          color: '#6b7280',
          marginTop: '0.375rem',
        }}>
          {(scheduling.pickupInstructions || '').length}/500 characters
        </div>
      </section>

      {/* Actions */}
      <div className="sp-actions">
        <button
          className="sp-btn sp-btn--secondary"
          onClick={() => goToStep ? goToStep('offer') : navigate('../offer')}
          disabled={isSaving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Offer
        </button>

        <button
          className="sp-btn sp-btn--primary"
          onClick={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="sp-btn-spinner" />
              Saving...
            </>
          ) : (
            <>
              Continue to Drop-off
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}