// ============================================================
// FILE: src/pages/shipper-portal/sections/dropoff-details.jsx
// ✅ UPDATED: Destination-type-based scheduling rules
// - Auction/Dealership = flexible (Ready Date + Time Preference)
// - Private/Residential = strict time windows + Late Delivery Preference
// ============================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Info, Clock, Calendar, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as quotesApi from '../../../services/quotes.api.js';
import TimeWindowPicker from '../../../components/booking/time-window-picker.jsx';
import FileUploader from '../../../components/ui/file-uploader.jsx';
import { getStateFromZip, isValidZipFormat, isContinentalUSZip } from '../../../utils/geo.js';
import {
  getTimezoneForState,
  getTodayInTimezone,
} from '../../../utils/timezone-utils.js';
import { computeEarliestDelivery, formatFriendlyDate, validateDeliveryDateTime } from '../../../utils/delivery-window.js';
import './sections.css';
import '../../../components/ui/file-uploader.css';

// ✅ Continental United States + DC only
const US_STATES = [
  'AL','AZ','AR','CA','CO','CT','DE','FL','GA','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY','DC'
];

const DEFAULT_DROPOFF = {
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

// ✅ Time preferences for auction/dealership (flexible scheduling)
const TIME_PREFERENCES = [
  { value: 'morning', label: 'Morning', sublabel: '8 AM – 12 PM' },
  { value: 'afternoon', label: 'Afternoon', sublabel: '12 PM – 5 PM' },
  { value: 'flexible', label: 'Flexible', sublabel: 'Any time during business hours' },
];

// ✅ Late Delivery Preference options (for residential only)
const LATE_DELIVERY_OPTIONS = [
  {
    value: 'contact_first',
    label: 'Contact me first',
    description: 'Carrier must attempt to contact me if they will miss the delivery window.',
    icon: Phone,
  },
  {
    value: 'reschedule',
    label: 'Reschedule for next day',
    description: 'If carrier cannot arrive within the window, reschedule delivery for the next business day.',
    icon: Calendar,
  },
  {
    value: 'unattended',
    label: 'Allow unattended delivery if I\'m unreachable',
    description: 'If I cannot be reached, carrier may leave vehicle at the designated location.',
    icon: MapPin,
    requiresDetails: true,
  },
];

// Helper: Parse time string to minutes
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

// Helper: Get preset end time
function getPresetEndTime(presetWindow) {
  const presetMap = {
    '8:00-10:00': '10:00 AM',
    '10:00-12:00': '12:00 PM',
    '12:00-14:00': '2:00 PM',
    '14:00-16:00': '4:00 PM',
    '16:00-18:00': '6:00 PM',
    'flexible': '11:59 PM'
  };
  return presetMap[presetWindow] || '';
}

// Helper: Get preset start time
function getPresetStartTime(presetWindow) {
  const presetMap = {
    '8:00-10:00': '8:00 AM',
    '10:00-12:00': '10:00 AM',
    '12:00-14:00': '12:00 PM',
    '14:00-16:00': '2:00 PM',
    '16:00-18:00': '4:00 PM',
    'flexible': '12:00 AM'
  };
  return presetMap[presetWindow] || '';
}

// ✅ Check if destination type uses flexible scheduling
function isFlexibleDestinationType(destType) {
  return destType === 'auction' || destType === 'dealership';
}

export default function DropoffDetails() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const {
    vehicles,
    vehicleCount,
    updateDropoff,
    updateVehicle,
    updateVehicleDocuments,
    scheduling,
    setScheduling,
    draftId,
    quoteId,
    quoteData,
    goToStep,
  } = usePortal();

  console.log('🚗 [DROPOFF] vehicleCount from context:', vehicleCount);
  console.log('🚗 [DROPOFF] vehicles array length:', vehicles?.length);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Track ZIP lookup status per vehicle
  const [zipLookupStatus, setZipLookupStatus] = useState({});
  
  // ✅ Track gate pass save status per vehicle
  const [gatePassSaveStatus, setGatePassSaveStatus] = useState({});
  
  // ✅ Ref to track ongoing gate pass saves
  const gatePassSaveInProgress = useRef({});
  
  // ✅ Ref for latest vehicles state
  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  // ✅ Get the dropoff state from the FIRST vehicle (for timezone calculation)
  const dropoffState = useMemo(() => {
    const firstVehicle = vehicles[0];
    const state = firstVehicle?.dropoff?.state || null;
    console.log('🌍 [DROPOFF] Extracted dropoffState:', state);
    return state;
  }, [vehicles]);

  // ✅ Determine timezone from dropoff state
  const dropoffTimezone = useMemo(() => {
    if (dropoffState) {
      const tz = getTimezoneForState(dropoffState);
      if (tz) {
        console.log(`🌍 [DROPOFF] Using timezone for ${dropoffState}: ${tz}`);
        return tz;
      }
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/New_York';
    }
  }, [dropoffState]);

  // ✅ Compute earliest realistic delivery DATETIME from pickup + route.
  // Returns { earliestDate, earliestDateTime, earliestStartMinutes, ... }.
  // Recalculates whenever pickup date / preset / custom time changes.
  const deliveryEstimate = useMemo(() => {
    return computeEarliestDelivery({
      pickupDate: scheduling?.pickupDate,
      pickupCustomTo: scheduling?.pickupCustomTo,
      pickupPreferredWindow: scheduling?.pickupPreferredWindow,
      pickupWindowEnd: scheduling?.pickupWindowEnd,
      miles: Number(quoteData?.miles) || Number(quoteData?.distance) || 0,
      durationHours: Number(quoteData?.durationHours) || undefined,
      todayIso: getTodayInTimezone(dropoffTimezone),
    });
  }, [
    scheduling?.pickupDate,
    scheduling?.pickupCustomTo,
    scheduling?.pickupPreferredWindow,
    scheduling?.pickupWindowEnd,
    quoteData?.miles,
    quoteData?.distance,
    quoteData?.durationHours,
    dropoffTimezone,
  ]);

  const minDropoffDate = deliveryEstimate.earliestDate || getTodayInTimezone(dropoffTimezone);

  // Time-of-day floor only matters when the customer has selected the
  // floor date itself. The picker uses this to disable preset windows whose
  // end time is before the floor and to validate custom ranges.
  const minDropoffStartMinutes = useMemo(() => {
    if (!scheduling?.dropoffDate) return null;
    if (scheduling.dropoffDate !== deliveryEstimate.earliestDate) return null;
    return deliveryEstimate.earliestStartMinutes;
  }, [scheduling?.dropoffDate, deliveryEstimate.earliestDate, deliveryEstimate.earliestStartMinutes]);

  // ✅ Determine if ALL vehicles use flexible destination type
  const allVehiclesUseFlexibleDestination = useMemo(() => {
    if (vehicleCount === 0) return false;
    return vehicles.slice(0, vehicleCount).every(v => isFlexibleDestinationType(v?.dropoffDestinationType));
  }, [vehicles, vehicleCount]);

  // ✅ Determine if we should show residential time windows
  const showResidentialTimeWindows = useMemo(() => {
    return vehicles.slice(0, vehicleCount).some(v => v?.dropoffDestinationType === 'private');
  }, [vehicles, vehicleCount]);

  // ✅ Check if any destination type is selected
  const hasAnyDestinationType = useMemo(() => {
    return vehicles.slice(0, vehicleCount).some(v => v?.dropoffDestinationType);
  }, [vehicles, vehicleCount]);

  // ============================================================================
  // ✅ AUTO-DERIVE STATE FROM ZIP
  // ============================================================================
  useEffect(() => {
    vehicles.forEach((entry, index) => {
      const zip = entry?.dropoff?.zip;
      const currentState = entry?.dropoff?.state;
      
      if (zip && isValidZipFormat(zip)) {
        const derivedState = getStateFromZip(zip);
        
        if (derivedState && derivedState !== currentState) {
          console.log(`🗺️ [DROPOFF] Auto-setting state for vehicle ${index + 1}: ${zip} → ${derivedState}`);
          updateDropoff(index, { state: derivedState });
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
  }, [vehicles, updateDropoff]);

  // ============================================================================
  // Helper functions
  // ============================================================================

  const getVehicleEntry = useCallback((index) => {
    return vehicles[index] || {};
  }, [vehicles]);

  const getDropoff = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoff || DEFAULT_DROPOFF;
  }, [getVehicleEntry]);

  const getDestinationType = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoffDestinationType || '';
  }, [getVehicleEntry]);

  const getContactInfo = useCallback((index, destType) => {
    const entry = getVehicleEntry(index);
    if (destType === 'dealership') {
      return entry.dropoffDealerInfo || DEFAULT_CONTACT;
    } else if (destType === 'private') {
      return entry.dropoffPrivateInfo || DEFAULT_CONTACT;
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
    return entry.dropoffAuctionInfo?.gatePass || null;
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

  const handleDropoffChange = (index, field) => (e) => {
    let value = e.target.value;
    
    if (field === 'city') {
      if (!validateLettersOnly(value)) return;
    } else if (field === 'zip') {
      if (!validateNumbersOnly(value)) return;
      if (value.length > 5) return;
      
      if (value.length === 5) {
        const derivedState = getStateFromZip(value);
        if (derivedState) {
          console.log(`🗺️ [DROPOFF] ZIP changed, auto-setting state: ${value} → ${derivedState}`);
          updateDropoff(index, { zip: value, state: derivedState });
          setZipLookupStatus(prev => ({ ...prev, [index]: 'success' }));
          clearError(`${index}_zip`);
          clearError(`${index}_state`);
          return;
        } else {
          console.log(`⚠️ [DROPOFF] ZIP lookup failed for ${value}, clearing state`);
          updateDropoff(index, { zip: value, state: '' });
          setZipLookupStatus(prev => ({ ...prev, [index]: 'unknown' }));
          return;
        }
      } else {
        setZipLookupStatus(prev => ({ ...prev, [index]: 'incomplete' }));
      }
    }
    
    updateDropoff(index, { [field]: value });
    clearError(`${index}_${field}`);
  };

  const handleStateChange = (index) => (e) => {
    const value = e.target.value;
    updateDropoff(index, { state: value });
    clearError(`${index}_state`);
  };

  const handleDestinationTypeChange = (index) => (e) => {
    const value = e.target.value;
    updateVehicle(index, { dropoffDestinationType: value });
    
    // ✅ Clear scheduling fields when switching between flexible/strict destination
    if (isFlexibleDestinationType(value)) {
      // Switching to flexible (auction/dealership) - clear strict time windows and late delivery
      setScheduling(prev => ({
        ...prev,
        dropoffPreferredWindow: '',
        dropoffCustomFrom: '',
        dropoffCustomTo: '',
        // Clear late delivery preference (only for residential)
        dropoffLateDeliveryPreference: '',
        dropoffUnattendedInstructions: '',
        dropoffKeyInstructions: '',
        dropoffEntryInfo: '',
        dropoffUnattendedWaiverAccepted: false,
      }));
    } else {
      // Switching to residential - clear flexible time preference
      setScheduling(prev => ({
        ...prev,
        dropoffTimePreference: '',
      }));
    }
    
    const errorsToClear = [
      `${index}_dropoffDestinationType`,
      `${index}_dropoffDealerFirstName`,
      `${index}_dropoffDealerLastName`,
      `${index}_dropoffDealerPhone`,
      `${index}_dropoffAuctionGatePass`,
      `${index}_dropoffPrivateFirstName`,
      `${index}_dropoffPrivateLastName`,
      `${index}_dropoffPrivatePhone`,
      'lateDeliveryPreference',
      'unattendedInstructions',
      'unattendedWaiver',
    ];
    setErrors((prev) => {
      const newErrors = { ...prev };
      errorsToClear.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const handleContactChange = (index, destType, field) => (e) => {
    let value = e.target.value;
    
    if (field === 'firstName' || field === 'lastName') {
      if (!validateLettersOnly(value)) return;
    } else if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    
    const infoKey = destType === 'dealership' ? 'dropoffDealerInfo' : 'dropoffPrivateInfo';
    const currentInfo = destType === 'dealership' 
      ? getVehicleEntry(index).dropoffDealerInfo || DEFAULT_CONTACT
      : getVehicleEntry(index).dropoffPrivateInfo || DEFAULT_CONTACT;
    
    updateVehicle(index, {
      [infoKey]: { ...currentInfo, [field]: value }
    });
    
    const errorPrefix = destType === 'dealership' ? 'dropoffDealer' : 'dropoffPrivate';
    clearError(`${index}_${errorPrefix}${field.charAt(0).toUpperCase() + field.slice(1)}`);
  };

  // ✅ Gate pass handlers
  const handleGatePassUpload = (index) => async (uploadedFiles) => {
    const fileInfo = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
    
    if (!fileInfo) {
      console.error(`❌ Dropoff gate pass upload for Vehicle ${index + 1} returned no file info`);
      return;
    }
    
    console.log(`📁 Dropoff gate pass uploaded for Vehicle ${index + 1}:`, fileInfo);
    
    const gatePassMetadata = {
      id: fileInfo.id || fileInfo.documentId,
      url: fileInfo.url || fileInfo.downloadUrl,
      filename: fileInfo.filename || fileInfo.name || fileInfo.file?.name,
      contentType: fileInfo.contentType || fileInfo.type || fileInfo.file?.type,
      size: fileInfo.size || fileInfo.file?.size,
      uploadedAt: new Date().toISOString(),
    };
    
    const currentAuctionInfo = getVehicleEntry(index).dropoffAuctionInfo || {};
    updateVehicle(index, {
      dropoffAuctionInfo: { ...currentAuctionInfo, gatePass: gatePassMetadata }
    });
    
    if (gatePassMetadata.id) {
      updateVehicleDocuments(index, { dropoffGatePassId: gatePassMetadata.id });
      console.log(`✅ Set dropoffGatePassId for Vehicle ${index + 1} to:`, gatePassMetadata.id);
    }
    
    clearError(`${index}_dropoffAuctionGatePass`);
    
    // Backend save
    if (draftId && token) {
      if (gatePassSaveInProgress.current[index]) {
        console.log(`⏳ Dropoff gate pass save already in progress for Vehicle ${index + 1}, skipping duplicate`);
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
            dropoffAuctionInfo: { ...(v.dropoffAuctionInfo || {}), gatePass: gatePassMetadata },
            documents: { ...(v.documents || {}), dropoffGatePassId: gatePassMetadata.id }
          };
        });
        
        await quotesApi.patchDraft(draftId, { vehicles: updatedVehicles }, token);
        console.log(`✅ [BACKEND] Dropoff gate pass saved for Vehicle ${index + 1}`);
        
        setGatePassSaveStatus(prev => ({ ...prev, [index]: 'saved' }));
        setTimeout(() => {
          setGatePassSaveStatus(prev => ({ ...prev, [index]: 'idle' }));
        }, 3000);
        
      } catch (err) {
        console.warn(`⚠️ [BACKEND] Failed to save dropoff gate pass:`, err.message);
        setGatePassSaveStatus(prev => ({ ...prev, [index]: 'error' }));
      } finally {
        gatePassSaveInProgress.current[index] = false;
      }
    }
  };

  const handleGatePassRemove = (index) => () => {
    console.log(`🗑️ Removing dropoff gate pass for Vehicle ${index + 1}`);
    
    const currentAuctionInfo = getVehicleEntry(index).dropoffAuctionInfo || {};
    updateVehicle(index, {
      dropoffAuctionInfo: { ...currentAuctionInfo, gatePass: null }
    });
    updateVehicleDocuments(index, { dropoffGatePassId: null });
  };

  // ✅ Handle time preference change (for auction/dealership - flexible)
  const handleTimePreferenceChange = (preference) => {
    setScheduling({
      ...scheduling,
      dropoffTimePreference: preference,
      // Clear strict time windows when using flexible preference
      dropoffPreferredWindow: '',
      dropoffCustomFrom: '',
      dropoffCustomTo: '',
    });
    if (errors.dropoffTime) setErrors((prev) => ({ ...prev, dropoffTime: '' }));
  };

  // ✅ Handle strict time window changes (for residential)
  const handleDropoffScheduleChange = (newSchedule) => {
    setScheduling({
      ...scheduling,
      dropoffDate: newSchedule.date || '',
      dropoffPreferredWindow: newSchedule.presetId || '',
      dropoffCustomFrom: newSchedule.customFrom || '',
      dropoffCustomTo: newSchedule.customTo || '',
      // ✅ Persist "Allow early arrival" toggle. Picker emits it on every
      // change, but a date/window edit may emit without the key — preserve
      // the prior value in that case.
      allowEarlyArrival: newSchedule.allowEarlyArrival !== undefined
        ? newSchedule.allowEarlyArrival
        : (scheduling.allowEarlyArrival || false),
      // Clear flexible preference when using strict windows
      dropoffTimePreference: '',
    });
    console.log('[DROPOFF] schedule change → allowEarlyArrival:',
      newSchedule.allowEarlyArrival !== undefined
        ? newSchedule.allowEarlyArrival
        : (scheduling.allowEarlyArrival || false));

    if (errors.dropoffDate) setErrors((prev) => ({ ...prev, dropoffDate: '' }));
    if (errors.dropoffTime) setErrors((prev) => ({ ...prev, dropoffTime: '' }));
  };

  // ✅ Handle Late Delivery Preference change
  const handleLateDeliveryPreferenceChange = (value) => {
    setScheduling({
      ...scheduling,
      dropoffLateDeliveryPreference: value,
      // Clear unattended details if switching away from unattended
      ...(value !== 'unattended' && {
        dropoffUnattendedInstructions: '',
        dropoffKeyInstructions: '',
        dropoffEntryInfo: '',
        dropoffUnattendedWaiverAccepted: false,
      }),
    });
    clearError('lateDeliveryPreference');
    clearError('unattendedInstructions');
    clearError('unattendedWaiver');
  };

  // ✅ Handle unattended delivery details
  const handleUnattendedFieldChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setScheduling({
      ...scheduling,
      [field]: value,
    });
    
    if (field === 'dropoffUnattendedInstructions') clearError('unattendedInstructions');
    if (field === 'dropoffUnattendedWaiverAccepted') clearError('unattendedWaiver');
  };

  // ============================================================================
  // Validation and Continue
  // ============================================================================

  const handleContinue = async () => {
    const newErrors = {};
    
    // Validate each vehicle
    for (let i = 0; i < vehicleCount; i++) {
      const dropoff = getDropoff(i);
      const destType = getDestinationType(i);
      const gatePass = getGatePass(i);
      
      if (!destType) {
        newErrors[`${i}_dropoffDestinationType`] = 'Please select where the vehicle is going to';
      }
      
      if (destType === 'dealership') {
        const contact = getContactInfo(i, 'dealership');
        if (!contact.firstName?.trim()) newErrors[`${i}_dropoffDealerFirstName`] = 'Dealer first name is required';
        if (!contact.lastName?.trim()) newErrors[`${i}_dropoffDealerLastName`] = 'Dealer last name is required';
        if (!contact.phone?.trim()) {
          newErrors[`${i}_dropoffDealerPhone`] = 'Dealer phone number is required';
        } else if (!validatePhoneNumber(contact.phone)) {
          newErrors[`${i}_dropoffDealerPhone`] = 'Please enter a valid 10-digit phone number';
        }
      } else if (destType === 'auction') {
        if (!gatePass || !gatePass.id) {
          newErrors[`${i}_dropoffAuctionGatePass`] = 'Please upload the auction gate pass to continue';
        }
      } else if (destType === 'private') {
        const contact = getContactInfo(i, 'private');
        if (!contact.firstName?.trim()) newErrors[`${i}_dropoffPrivateFirstName`] = 'First name is required';
        if (!contact.lastName?.trim()) newErrors[`${i}_dropoffPrivateLastName`] = 'Last name is required';
        if (!contact.phone?.trim()) {
          newErrors[`${i}_dropoffPrivatePhone`] = 'Phone number is required';
        } else if (!validatePhoneNumber(contact.phone)) {
          newErrors[`${i}_dropoffPrivatePhone`] = 'Please enter a valid 10-digit phone number';
        }
      }
      
      if (!dropoff.address) newErrors[`${i}_address`] = 'Street address is required';
      if (!dropoff.city) newErrors[`${i}_city`] = 'City is required';
      if (!dropoff.zip) newErrors[`${i}_zip`] = 'ZIP code is required';
      else if (dropoff.zip.length !== 5) newErrors[`${i}_zip`] = 'ZIP code must be 5 digits';
      
      if (!dropoff.state) {
        if (dropoff.zip && dropoff.zip.length === 5) {
          newErrors[`${i}_state`] = 'Could not determine state from ZIP. Please select manually.';
        } else {
          newErrors[`${i}_state`] = 'State is required (enter ZIP to auto-fill)';
        }
      }
      
      // Block AK/HI
      if (dropoff.state && ['AK', 'HI'].includes(dropoff.state)) {
        newErrors[`${i}_zip`] = 'Sorry, we currently only ship within the continental United States (48 states + DC). Alaska and Hawaii are not available.';
      }
      
      if (dropoff.zip && dropoff.zip.length === 5 && !isContinentalUSZip(dropoff.zip)) {
        const derivedState = getStateFromZip(dropoff.zip);
        if (derivedState && ['AK', 'HI'].includes(derivedState)) {
          newErrors[`${i}_zip`] = 'Sorry, we currently only ship within the continental United States (48 states + DC). Alaska and Hawaii are not available.';
        }
      }
    }
    
    // ✅ Scheduling validation - depends on destination type
    if (!scheduling.dropoffDate) {
      newErrors.dropoffDate = 'Preferred date is required';
    }

    // ✅ Time validation based on destination type
    if (allVehiclesUseFlexibleDestination) {
      // Auction/Dealership: Time preference is OPTIONAL
      if (!scheduling.dropoffTimePreference) {
        console.log('📝 No time preference selected for flexible destination, will default to flexible');
      }
    } else if (showResidentialTimeWindows) {
      // Residential: Require strict time windows
      const hasPresetTime = Boolean(scheduling.dropoffPreferredWindow);
      const hasCustomTime = Boolean(scheduling.dropoffCustomFrom && scheduling.dropoffCustomTo);

      if (!hasPresetTime && !hasCustomTime) {
        newErrors.dropoffTime = 'Please select a preferred time window or set a custom time range';
      }

      // ✅ Unified earliest-delivery datetime check — covers same-day AND
      // cross-day (long-route) cases, replacing the older "drop-off >= pickup end" rule.
      if (!newErrors.dropoffDate && !newErrors.dropoffTime) {
        const v = validateDeliveryDateTime({
          pickupDate: scheduling.pickupDate,
          pickupCustomTo: scheduling.pickupCustomTo,
          pickupPreferredWindow: scheduling.pickupPreferredWindow,
          pickupWindowEnd: scheduling.pickupWindowEnd,
          miles: Number(quoteData?.miles) || Number(quoteData?.distance) || 0,
          durationHours: Number(quoteData?.durationHours) || undefined,
          dropoffDate: scheduling.dropoffDate,
          dropoffCustomFrom: scheduling.dropoffCustomFrom,
          dropoffCustomTo: scheduling.dropoffCustomTo,
          dropoffPreferredWindow: scheduling.dropoffPreferredWindow,
        });
        if (!v.valid) {
          // Surface as date error if it's a date issue, otherwise as time error.
          if (/cannot be earlier than|Delivery date is required/i.test(v.error)) {
            newErrors.dropoffDate = v.error;
          } else {
            newErrors.dropoffTime = v.error;
          }
        }
      }

      // ✅ Validate Late Delivery Preference (required for residential)
      if (!scheduling.dropoffLateDeliveryPreference) {
        newErrors.lateDeliveryPreference = 'Please select what to do if delivery is late';
      }

      // ✅ Validate unattended delivery details if selected
      if (scheduling.dropoffLateDeliveryPreference === 'unattended') {
        if (!scheduling.dropoffUnattendedInstructions?.trim()) {
          newErrors.unattendedInstructions = 'Please specify where the vehicle should be left';
        }
        if (!scheduling.dropoffUnattendedWaiverAccepted) {
          newErrors.unattendedWaiver = 'You must acknowledge the unattended delivery terms';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorIndex = firstErrorKey.includes('_') ? parseInt(firstErrorKey.split('_')[0], 10) : 0;
      const element = document.getElementById(`dropoff-section-${firstErrorIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

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
              // Pickup fields (preserve existing)
              pickupDate: scheduling.pickupDate,
              pickupPreferredWindow: scheduling.pickupPreferredWindow,
              pickupCustomFrom: scheduling.pickupCustomFrom,
              pickupCustomTo: scheduling.pickupCustomTo,
              pickupTimePreference: scheduling.pickupTimePreference,
              pickupEarlyArrivalAllowed: scheduling.pickupEarlyArrivalAllowed,
              // Dropoff fields
              dropoffDate: scheduling.dropoffDate,
              dropoffPreferredWindow: scheduling.dropoffPreferredWindow,
              dropoffCustomFrom: scheduling.dropoffCustomFrom,
              dropoffCustomTo: scheduling.dropoffCustomTo,
              dropoffTimePreference: scheduling.dropoffTimePreference || (allVehiclesUseFlexibleDestination ? 'flexible' : ''),
              // ✅ "Allow early arrival" toggle on the dropoff time-window picker.
              allowEarlyArrival: scheduling.allowEarlyArrival || false,
              // ✅ Late Delivery Preference fields (residential only)
              dropoffLateDeliveryPreference: scheduling.dropoffLateDeliveryPreference || '',
              dropoffUnattendedInstructions: scheduling.dropoffUnattendedInstructions || '',
              dropoffKeyInstructions: scheduling.dropoffKeyInstructions || '',
              dropoffEntryInfo: scheduling.dropoffEntryInfo || '',
              dropoffUnattendedWaiverAccepted: scheduling.dropoffUnattendedWaiverAccepted || false,
            },
          },
          token
        );
        console.log(`✅ Dropoff details saved for ${vehicleCount} vehicle(s)`);
      } catch (err) {
        console.error('Failed to save:', err);
        alert('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    
    if (goToStep) {
      goToStep('vehicle');
    } else {
      navigate('../vehicle');
    }
  };

  // ============================================================================
  // Render dropoff section for a single vehicle
  // ============================================================================

  const renderVehicleDropoff = (index) => {
    const dropoff = getDropoff(index);
    const destType = getDestinationType(index);
    const vehicleLabel = getVehicleLabel(index);
    const gatePass = getGatePass(index);
    const zipStatus = zipLookupStatus[index];
    const saveStatus = gatePassSaveStatus[index] || 'idle';

    return (
      <div 
        key={index} 
        id={`dropoff-section-${index}`}
        className="sp-vehicle-dropoff-section"
        style={{ marginBottom: index < vehicleCount - 1 ? '2rem' : undefined }}
      >
        {vehicleCount > 1 && (
          <div className="sp-vehicle-header">
            <span className="sp-vehicle-header__number">
              Vehicle {index + 1}
            </span>
            {vehicleLabel !== `Vehicle ${index + 1}` && (
              <span className="sp-vehicle-header__label">
                — {vehicleLabel}
              </span>
            )}
          </div>
        )}

        {/* Vehicle Destination Type */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              {vehicleCount > 1 
                ? `Where is Vehicle ${index + 1} going to?` 
                : 'Where is the vehicle going to?'
              }
            </h4>
          </div>

          <div className="sp-form-group">
            <select
              className={`sp-select ${errors[`${index}_dropoffDestinationType`] ? 'sp-input--error' : ''}`}
              value={destType}
              onChange={handleDestinationTypeChange(index)}
            >
              <option value="">Select destination type</option>
              <option value="dealership">Dealership</option>
              <option value="auction">Auction (Copart, Manheim, etc.)</option>
              <option value="private">Private / Residential</option>
            </select>
            {errors[`${index}_dropoffDestinationType`] && (
              <span className="sp-error-text">{errors[`${index}_dropoffDestinationType`]}</span>
            )}
          </div>

          {/* Dealership Contact */}
          {destType === 'dealership' && (
            <div className="sp-form-grid" style={{ marginTop: '16px' }}>
              <div className="sp-form-group">
                <label className="sp-label">
                  Dealer First Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dropoffDealerFirstName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter first name"
                  value={getContactInfo(index, 'dealership').firstName || ''}
                  onChange={handleContactChange(index, 'dealership', 'firstName')}
                />
                {errors[`${index}_dropoffDealerFirstName`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffDealerFirstName`]}</span>
                )}
              </div>

              <div className="sp-form-group">
                <label className="sp-label">
                  Dealer Last Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dropoffDealerLastName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter last name"
                  value={getContactInfo(index, 'dealership').lastName || ''}
                  onChange={handleContactChange(index, 'dealership', 'lastName')}
                />
                {errors[`${index}_dropoffDealerLastName`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffDealerLastName`]}</span>
                )}
              </div>

              <div className="sp-form-group sp-form-group--full">
                <label className="sp-label">
                  Dealer Phone Number <span className="sp-required">*</span>
                </label>
                <input
                  type="tel"
                  className={`sp-input ${errors[`${index}_dropoffDealerPhone`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter phone number"
                  value={getContactInfo(index, 'dealership').phone || ''}
                  onChange={handleContactChange(index, 'dealership', 'phone')}
                  maxLength="14"
                />
                {errors[`${index}_dropoffDealerPhone`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffDealerPhone`]}</span>
                )}
              </div>
            </div>
          )}

          {/* Auction Section */}
          {destType === 'auction' && (
            <div style={{ marginTop: '16px' }}>
              <h5 className="sp-subsection-title">
                Auction Gate Pass <span className="sp-required">*</span>
                {vehicleCount > 1 && (
                  <span style={{ fontWeight: 400, fontSize: '0.875rem', marginLeft: '8px' }}>
                    (for Vehicle {index + 1})
                  </span>
                )}
              </h5>
              
              {gatePass && gatePass.id ? (
                <div className="sp-uploaded-file">
                  <div className="sp-uploaded-file__info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sp-uploaded-file__icon">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                      <div className="sp-uploaded-file__name">
                        {gatePass.filename || 'Gate Pass Uploaded'}
                      </div>
                      <div className="sp-uploaded-file__status">
                        <span>Uploaded successfully</span>
                        {saveStatus === 'saving' && (
                          <span className="sp-uploaded-file__sync sp-uploaded-file__sync--saving">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                            Syncing...
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className="sp-uploaded-file__sync sp-uploaded-file__sync--saved">✓ Synced</span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="sp-uploaded-file__sync sp-uploaded-file__sync--error">⚠ Sync pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sp-uploaded-file__actions">
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
                  type="DROPOFF_GATEPASS"
                  label="Upload gate pass"
                  hint="PDF, JPG, PNG • Max 10MB"
                  existingFile={null}
                  className={errors[`${index}_dropoffAuctionGatePass`] ? 'file-uploader-has-error' : ''}
                  quoteId={quoteId}
                  multiple={false}
                  maxFiles={1}
                  vehicleIndex={index}
                  stage="dropoff"
                  token={token}
                />
              )}
              
              <div className="sp-info-box" style={{ marginTop: '12px' }}>
                <Info size={16} />
                <p>
                  Your gate pass already includes the auction name, lot number, and buyer details. 
                  Carriers need this document to access the auction facility and deliver the vehicle.
                </p>
              </div>
              
              {errors[`${index}_dropoffAuctionGatePass`] && (
                <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
                  {errors[`${index}_dropoffAuctionGatePass`]}
                </span>
              )}
            </div>
          )}

          {/* Private Contact */}
          {destType === 'private' && (
            <div className="sp-form-grid" style={{ marginTop: '16px' }}>
              <div className="sp-form-group">
                <label className="sp-label">
                  First Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dropoffPrivateFirstName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter first name"
                  value={getContactInfo(index, 'private').firstName || ''}
                  onChange={handleContactChange(index, 'private', 'firstName')}
                />
                {errors[`${index}_dropoffPrivateFirstName`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffPrivateFirstName`]}</span>
                )}
              </div>

              <div className="sp-form-group">
                <label className="sp-label">
                  Last Name <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[`${index}_dropoffPrivateLastName`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter last name"
                  value={getContactInfo(index, 'private').lastName || ''}
                  onChange={handleContactChange(index, 'private', 'lastName')}
                />
                {errors[`${index}_dropoffPrivateLastName`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffPrivateLastName`]}</span>
                )}
              </div>

              <div className="sp-form-group sp-form-group--full">
                <label className="sp-label">
                  Phone Number <span className="sp-required">*</span>
                </label>
                <input
                  type="tel"
                  className={`sp-input ${errors[`${index}_dropoffPrivatePhone`] ? 'sp-input--error' : ''}`}
                  placeholder="Enter phone number"
                  value={getContactInfo(index, 'private').phone || ''}
                  onChange={handleContactChange(index, 'private', 'phone')}
                  maxLength="14"
                />
                {errors[`${index}_dropoffPrivatePhone`] && (
                  <span className="sp-error-text">{errors[`${index}_dropoffPrivatePhone`]}</span>
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
                ? `Drop-off Address for Vehicle ${index + 1}` 
                : 'Drop-off Address'
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
                value={dropoff.address || ''}
                onChange={handleDropoffChange(index, 'address')}
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
                value={dropoff.city || ''}
                onChange={handleDropoffChange(index, 'city')}
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
                value={dropoff.zip || ''}
                onChange={handleDropoffChange(index, 'zip')}
                maxLength="5"
                inputMode="numeric"
              />
              {zipStatus === 'success' && dropoff.state && (
                <div className="sp-field-helper sp-field-helper--success">
                  ✓ State auto-filled: {dropoff.state}
                </div>
              )}
              {zipStatus === 'unknown' && dropoff.zip?.length === 5 && (
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
                  <span className="sp-label__hint">(auto-filled from ZIP)</span>
                )}
              </label>
              <select
                className={`sp-select ${errors[`${index}_state`] ? 'sp-input--error' : ''} ${zipStatus === 'success' ? 'sp-input--derived' : ''}`}
                value={dropoff.state || ''}
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
  // ✅ Render Route Details info card — shown above any time-selection UI so
  // the customer always sees distance / drive time / earliest delivery and
  // a same-day availability hint, regardless of destination type.
  // ============================================================================
  const renderRouteInfo = () => {
    const miles = Number(quoteData?.miles) || Number(quoteData?.distance) || 0;
    const hours = Number(quoteData?.durationHours) || 0;

    console.log('[ROUTE INFO]', {
      miles,
      hours,
      pickupDate: scheduling?.pickupDate,
      earliestDate: deliveryEstimate?.earliestDate,
      earliestStartMinutes: deliveryEstimate?.earliestStartMinutes,
      source: deliveryEstimate?.source,
    });

    // Hide only if we truly have nothing to show — no route data and no pickup chosen.
    if (miles <= 0 && hours <= 0 && !scheduling?.pickupDate) {
      return null;
    }

    const formatTimeLabel = (mins) => {
      if (!Number.isFinite(mins)) return '';
      const h24 = Math.floor(mins / 60);
      const m = mins % 60;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    };

    let availabilityMsg = '';
    if (scheduling?.pickupDate) {
      availabilityMsg = (deliveryEstimate.earliestDate === scheduling.pickupDate)
        ? 'Same-day delivery may be available depending on your selected window.'
        : 'Same-day delivery is not available for this route.';
    }

    return (
      <section className="sp-card" style={{ marginBottom: 12 }}>
        <div className="sp-info-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
            <Info size={16} />
            <span>Route details</span>
          </div>
          <div style={{ paddingLeft: 24, fontSize: 14, lineHeight: 1.7, width: '100%' }}>
            {miles > 0 && (
              <div>Distance: <strong>{miles.toLocaleString('en-US')} miles</strong></div>
            )}
            {hours > 0 ? (
              <div>Estimated drive time: <strong>{hours.toFixed(1)} hours</strong></div>
            ) : miles > 0 && (
              <div style={{ color: '#666' }}>Estimated drive time: based on mileage tiers</div>
            )}
            <div>
              Earliest delivery:{' '}
              <strong>
                {formatFriendlyDate(deliveryEstimate.earliestDate)}
                {Number.isFinite(deliveryEstimate.earliestStartMinutes)
                  ? `, ${formatTimeLabel(deliveryEstimate.earliestStartMinutes)}`
                  : ''}
              </strong>
            </div>
            {availabilityMsg && (
              <div style={{ marginTop: 8, fontWeight: 500 }}>{availabilityMsg}</div>
            )}
            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
              Delivery availability is based on pickup time, route duration, and scheduling buffer.
            </div>
          </div>
        </div>
      </section>
    );
  };

  // ============================================================================
  // ✅ Render FLEXIBLE time preference (for Auction/Dealership)
  // ============================================================================
  const renderFlexibleTimePreference = () => {
    return (
      <section className="sp-card">
        <div className="sp-card-header">
          <h4 className="sp-card-title">
            <Calendar size={18} className="sp-card-title-icon" />
            {vehicleCount > 1 ? 'Delivery Ready Date (for all vehicles)' : 'Delivery Ready Date'}
          </h4>
        </div>

        {/* Date Picker */}
        <div className="sp-form-group">
          <label className="sp-label">
            <Calendar size={14} />
            When should delivery occur? <span className="sp-required">*</span>
          </label>
          <input
            type="date"
            className={`sp-input ${errors.dropoffDate ? 'sp-input--error' : ''}`}
            value={scheduling.dropoffDate || ''}
            min={minDropoffDate}
            onChange={(e) => {
              setScheduling({ ...scheduling, dropoffDate: e.target.value });
              if (errors.dropoffDate) setErrors((prev) => ({ ...prev, dropoffDate: '' }));
            }}
          />
          {errors.dropoffDate && (
            <span className="sp-error-text">{errors.dropoffDate}</span>
          )}
        </div>

        {/* Time Preference Selector */}
        <div className="sp-form-group" style={{ marginTop: '24px' }}>
          <label className="sp-label">
            <Clock size={14} style={{ marginRight: '6px' }} />
            Time Preference (Optional)
          </label>
          <p className="sp-card-subtitle">
            This is a preference, not a strict appointment. Auctions and dealerships may have their own processing times.
          </p>
          
          <div className="sp-time-preference-grid">
            {TIME_PREFERENCES.map((pref) => (
              <button
                key={pref.value}
                type="button"
                className={`sp-time-preference-btn ${
                  scheduling.dropoffTimePreference === pref.value ? 'sp-time-preference-btn--active' : ''
                }`}
                onClick={() => handleTimePreferenceChange(pref.value)}
              >
                <span className="sp-time-preference-label">{pref.label}</span>
                <span className="sp-time-preference-sublabel">{pref.sublabel}</span>
              </button>
            ))}
          </div>
          
          {errors.dropoffTime && (
            <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
              {errors.dropoffTime}
            </span>
          )}
        </div>

        <div className="sp-info-box" style={{ marginTop: '16px' }}>
          <Info size={16} />
          <p>
            <strong>Flexible scheduling:</strong> Carriers will deliver during business hours on or after the specified date. 
            Exact arrival times depend on facility operating hours and processing.
          </p>
        </div>
      </section>
    );
  };

  // ============================================================================
  // ✅ Render STRICT time window picker (for Residential) + Late Delivery Preference
  // ============================================================================
  const renderResidentialTimeWindow = () => {
    const isUnattendedSelected = scheduling.dropoffLateDeliveryPreference === 'unattended';

    return (
      <>
        {/* Time Window Section */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              <Clock size={18} className="sp-card-title-icon" />
              {vehicleCount > 1 ? 'Preferred Delivery Window (for all vehicles)' : 'Delivery Window'}
            </h4>
          </div>
          <TimeWindowPicker
            label=""
            value={{
              date: scheduling.dropoffDate,
              presetId: scheduling.dropoffPreferredWindow,
              customFrom: scheduling.dropoffCustomFrom,
              customTo: scheduling.dropoffCustomTo,
              allowEarlyArrival: scheduling?.allowEarlyArrival || false,
            }}
            onChange={handleDropoffScheduleChange}
            errors={{
              date: errors.dropoffDate,
              time: errors.dropoffTime,
            }}
            minDate={minDropoffDate}
            minStartMinutes={minDropoffStartMinutes}
            type="dropoff"
            locationState={dropoffState}
          />
        </section>

        {/* ✅ Late Delivery Preference Section (Residential Only) */}
        <section className="sp-card sp-late-delivery-section">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              <AlertTriangle size={18} className="sp-card-title-icon sp-card-title-icon--warning" />
              If delivery is late, what should we do? <span className="sp-required">*</span>
            </h4>
          </div>
          <p className="sp-card-subtitle">
            Traffic happens—choose what you prefer so your driver doesn't have to guess.
          </p>

          <div className="sp-late-delivery-options">
            {LATE_DELIVERY_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isSelected = scheduling.dropoffLateDeliveryPreference === option.value;

              return (
                <div key={option.value} className="sp-late-delivery-option-wrapper">
                  <label 
                    className={`sp-late-delivery-option ${isSelected ? 'sp-late-delivery-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="lateDeliveryPreference"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleLateDeliveryPreferenceChange(option.value)}
                      className="sp-late-delivery-radio"
                    />
                    <div className="sp-late-delivery-icon">
                      <IconComponent size={20} />
                    </div>
                    <div className="sp-late-delivery-content">
                      <span className="sp-late-delivery-label">{option.label}</span>
                      <span className="sp-late-delivery-description">{option.description}</span>
                    </div>
                  </label>

                  {/* ✅ Unattended Delivery Details (shown when unattended is selected) */}
                  {option.value === 'unattended' && isUnattendedSelected && (
                    <div className="sp-unattended-details">
                      <div className="sp-form-group">
                        <label className="sp-label">
                          Where should the vehicle be left? <span className="sp-required">*</span>
                        </label>
                        <textarea
                          className={`sp-textarea ${errors.unattendedInstructions ? 'sp-input--error' : ''}`}
                          placeholder="E.g., In the driveway, on the street in front of 123 Main St, in the parking lot by building entrance..."
                          value={scheduling.dropoffUnattendedInstructions || ''}
                          onChange={handleUnattendedFieldChange('dropoffUnattendedInstructions')}
                          rows={3}
                        />
                        {errors.unattendedInstructions && (
                          <span className="sp-error-text">{errors.unattendedInstructions}</span>
                        )}
                      </div>

                      <div className="sp-form-group">
                        <label className="sp-label">
                          Key drop instructions (optional)
                        </label>
                        <input
                          type="text"
                          className="sp-input"
                          placeholder="E.g., Leave keys under the front mat, in the mailbox..."
                          value={scheduling.dropoffKeyInstructions || ''}
                          onChange={handleUnattendedFieldChange('dropoffKeyInstructions')}
                        />
                      </div>

                      <div className="sp-form-group">
                        <label className="sp-label">
                          Gate/entry code (optional)
                        </label>
                        <input
                          type="text"
                          className="sp-input"
                          placeholder="E.g., Gate code: #1234"
                          value={scheduling.dropoffEntryInfo || ''}
                          onChange={handleUnattendedFieldChange('dropoffEntryInfo')}
                        />
                      </div>

                      {/* ✅ Waiver Checkbox */}
                      <div className="sp-unattended-waiver">
                        <label className={`sp-waiver-checkbox-label ${errors.unattendedWaiver ? 'sp-waiver-checkbox-label--error' : ''}`}>
                          <input
                            type="checkbox"
                            checked={scheduling.dropoffUnattendedWaiverAccepted || false}
                            onChange={handleUnattendedFieldChange('dropoffUnattendedWaiverAccepted')}
                            className="sp-waiver-checkbox"
                          />
                          <div className="sp-waiver-text">
                            <strong>I authorize unattended delivery.</strong> If the carrier cannot reach me, I agree they may leave the vehicle at the location above. I accept responsibility for the vehicle from the moment it is delivered.
                          </div>
                        </label>
                        {errors.unattendedWaiver && (
                          <span className="sp-error-text" style={{ marginTop: '8px', display: 'block' }}>
                            {errors.unattendedWaiver}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {errors.lateDeliveryPreference && (
            <span className="sp-error-text" style={{ marginTop: '12px', display: 'block' }}>
              {errors.lateDeliveryPreference}
            </span>
          )}
        </section>

        <div className="sp-info-box">
          <Info size={16} />
          <p>
            <strong>Residential deliveries use time windows for coordination.</strong> The carrier will arrive within your selected window. 
            Your late delivery preference helps us handle unexpected delays professionally.
          </p>
        </div>
      </>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="sp-section sp-dropoff-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <MapPin size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Drop-off Details</h3>
          <p className="sp-step-description">
            {vehicleCount > 1 
              ? `Provide drop-off details for your ${vehicleCount} vehicles`
              : "Provide the address where we'll deliver your vehicle"
            }
          </p>
        </div>
      </header>

      {/* Render dropoff section for EACH vehicle */}
      {Array.from({ length: vehicleCount }).map((_, index) => renderVehicleDropoff(index))}

      {/* ✅ Route info card — always rendered (when route data is available),
          regardless of destination type. */}
      {renderRouteInfo()}

      {/* ✅ Conditional Time Selection UI based on destination type */}
      {allVehiclesUseFlexibleDestination ? (
        // All vehicles are auction/dealership - show flexible preference
        renderFlexibleTimePreference()
      ) : showResidentialTimeWindows ? (
        // At least one vehicle is residential - show strict time windows + late delivery preference
        renderResidentialTimeWindow()
      ) : hasAnyDestinationType ? (
        // Mixed types - show flexible for the non-residential portion
        renderFlexibleTimePreference()
      ) : (
        // No destination type selected yet - show placeholder
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">Delivery Scheduling</h4>
          </div>
          <div className="sp-info-box">
            <Info size={16} />
            <p>
              Please select where each vehicle is going to above. Scheduling options will appear based on the delivery location type.
            </p>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="sp-actions">
        <button
          className="sp-btn sp-btn--secondary"
          onClick={() => goToStep ? goToStep('pickup') : navigate('../pickup')}
          disabled={isSaving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Pickup
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
              Continue to Vehicle
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