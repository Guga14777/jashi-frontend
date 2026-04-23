// ============================================================
// FILE: src/pages/shipper-portal/sections/scheduling.jsx
// ✅ UPDATED: Multi-vehicle scheduling support (up to 3 vehicles)
// ✅ FIXED: vehicleCount from context, per-vehicle time window state
// ✅ FIXED: Date parsing uses local timezone (no more day shift bug)
// ✅ NEW: Scheduling rules backbone (location types, appointments, authorization)
// ============================================================

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as quotesApi from '../../../services/quotes.api.js';
import TimeWindowPicker from '../../../components/booking/time-window-picker.jsx';
import './sections.css';

// Import scheduling constants
import {
  LOCATION_TYPES,
  APPOINTMENT_REQUIREMENT,
  ATTEMPT_AUTH,
  TIME_PREFERENCE,
  KNOWN_AUCTION_FACILITIES,
  LOCATION_TYPE_DEFAULTS,
  REQUIRED_DOCS_BY_LOCATION,
  WEEKEND_DAYS,
} from '../../../utils/constants.js';

// ============================================================
// ✅ SCHEDULING RULES ENGINE - Pure Functions
// ============================================================

/**
 * Detect auction facility type from facility name
 * @param {string} facilityName - Name of the facility
 * @returns {Object|null} - Facility config if known, null if unknown
 */
export function detectAuctionFacility(facilityName) {
  if (!facilityName || typeof facilityName !== 'string') {
    return null;
  }

  const normalizedName = facilityName.toLowerCase().trim();

  for (const [key, config] of Object.entries(KNOWN_AUCTION_FACILITIES)) {
    for (const keyword of config.keywords) {
      if (normalizedName.includes(keyword)) {
        return {
          facilityType: key,
          ...config,
        };
      }
    }
  }

  return null;
}

/**
 * Determine appointment requirement based on facility info
 * @param {Object} params - Parameters
 * @param {string} params.locationType - Location type enum value
 * @param {string} [params.facilityName] - Facility name for auto-detection
 * @param {string} [params.explicitRequirement] - Explicitly set requirement
 * @returns {string} - APPOINTMENT_REQUIREMENT enum value
 */
export function getAppointmentRequirement({ locationType, facilityName, explicitRequirement }) {
  // If explicitly set, use that
  if (explicitRequirement && Object.values(APPOINTMENT_REQUIREMENT).includes(explicitRequirement)) {
    return explicitRequirement;
  }

  // Try to detect from facility name (for auctions)
  if (locationType === LOCATION_TYPES.AUCTION && facilityName) {
    const detected = detectAuctionFacility(facilityName);
    if (detected) {
      return detected.appointmentRequirement;
    }
  }

  // Fall back to location type defaults
  const defaults = LOCATION_TYPE_DEFAULTS[locationType];
  if (defaults) {
    return defaults.appointmentRequirement;
  }

  return APPOINTMENT_REQUIREMENT.UNKNOWN;
}

/**
 * Check if weekends are allowed for a given location
 * @param {Object} params - Parameters
 * @param {string} params.locationType - Location type enum value
 * @param {string} [params.facilityName] - Facility name for auto-detection
 * @param {boolean} [params.weekendConfirmed] - Explicit weekend confirmation
 * @returns {Object} - { allowed: boolean, requiresConfirmation: boolean, reason: string }
 */
export function checkWeekendsAllowed({ locationType, facilityName, weekendConfirmed = false }) {
  // Auctions: check specific facility first
  if (locationType === LOCATION_TYPES.AUCTION) {
    const detected = detectAuctionFacility(facilityName);
    
    if (detected && !detected.weekendsAllowed) {
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: `${detected.facilityType} facilities are closed on weekends`,
      };
    }

    // Unknown auction - weekends not allowed by default unless confirmed
    return {
      allowed: weekendConfirmed,
      requiresConfirmation: !weekendConfirmed,
      reason: weekendConfirmed 
        ? 'Weekend confirmed by user' 
        : 'Auction weekend access requires explicit confirmation',
    };
  }

  // Check location type defaults
  const defaults = LOCATION_TYPE_DEFAULTS[locationType];
  if (defaults) {
    return {
      allowed: defaults.weekendsAllowed,
      requiresConfirmation: false,
      reason: defaults.weekendsAllowed 
        ? `${locationType} locations typically allow weekends` 
        : `${locationType} locations typically closed on weekends`,
    };
  }

  // Default to allowed
  return {
    allowed: true,
    requiresConfirmation: false,
    reason: 'No restrictions',
  };
}

/**
 * Check if a specific date is a weekend
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if weekend
 */
export function isWeekend(date) {
  const d = typeof date === 'string' ? parseLocalDateString(date) : date;
  if (!d || isNaN(d.getTime())) return false;
  return WEEKEND_DAYS.includes(d.getDay());
}

/**
 * Check if time window is required for location type
 * @param {string} locationType - Location type enum value
 * @returns {boolean} - True if time window is required
 */
export function isTimeWindowRequired(locationType) {
  const defaults = LOCATION_TYPE_DEFAULTS[locationType];
  return defaults?.timeWindowRequired ?? false;
}

/**
 * Get required documents for a location type
 * @param {string} locationType - Location type enum value
 * @returns {string[]} - Array of required document types
 */
export function getRequiredDocuments(locationType) {
  return REQUIRED_DOCS_BY_LOCATION[locationType] || [];
}

/**
 * Check if all required documents are present
 * @param {string} locationType - Location type enum value
 * @param {Object} documents - Available documents { gatePass: true, buyerNumber: '123', ... }
 * @returns {Object} - { complete: boolean, missing: string[] }
 */
export function checkRequiredDocuments(locationType, documents = {}) {
  const required = getRequiredDocuments(locationType);
  const missing = required.filter(doc => !documents[doc]);

  return {
    complete: missing.length === 0,
    missing,
  };
}

/**
 * Compute attempt authorization status
 * Determines if carrier is authorized to attempt pickup/dropoff
 * 
 * @param {Object} params - Parameters
 * @param {string} params.locationType - Location type enum value
 * @param {string} [params.facilityName] - Facility name for auto-detection
 * @param {boolean} [params.appointmentScheduled] - Whether appointment is scheduled
 * @param {Object} [params.documents] - Available documents
 * @param {Date|string} [params.attemptDate] - Planned attempt date
 * @param {boolean} [params.weekendConfirmed] - Whether weekend access is confirmed
 * @returns {Object} - { status: ATTEMPT_AUTH, reasons: string[], canProceed: boolean }
 */
export function computeAttemptAuthorization({
  locationType,
  facilityName,
  appointmentScheduled = false,
  documents = {},
  attemptDate,
  weekendConfirmed = false,
}) {
  const reasons = [];
  let status = ATTEMPT_AUTH.AUTHORIZED;

  // 1. Check appointment requirement
  const appointmentReq = getAppointmentRequirement({ locationType, facilityName });
  
  if (appointmentReq === APPOINTMENT_REQUIREMENT.REQUIRED && !appointmentScheduled) {
    status = ATTEMPT_AUTH.NOT_AUTHORIZED;
    reasons.push('Appointment required but not scheduled');
  }

  // 2. Check required documents
  const docCheck = checkRequiredDocuments(locationType, documents);
  if (!docCheck.complete) {
    status = ATTEMPT_AUTH.NOT_AUTHORIZED;
    reasons.push(`Missing required documents: ${docCheck.missing.join(', ')}`);
  }

  // 3. Check weekend restrictions
  if (attemptDate && isWeekend(attemptDate)) {
    const weekendCheck = checkWeekendsAllowed({ locationType, facilityName, weekendConfirmed });
    
    if (!weekendCheck.allowed) {
      status = ATTEMPT_AUTH.NOT_AUTHORIZED;
      reasons.push(weekendCheck.reason);
    } else if (weekendCheck.requiresConfirmation && !weekendConfirmed) {
      status = ATTEMPT_AUTH.NOT_AUTHORIZED;
      reasons.push('Weekend access requires explicit confirmation');
    }
  }

  // 4. Handle unknown appointment requirement on weekday
  if (
    status === ATTEMPT_AUTH.AUTHORIZED &&
    appointmentReq === APPOINTMENT_REQUIREMENT.UNKNOWN &&
    !appointmentScheduled
  ) {
    // If it's a weekday and appointment status unknown, allow with protection
    if (!attemptDate || !isWeekend(attemptDate)) {
      status = ATTEMPT_AUTH.AUTHORIZED_PROTECTED;
      reasons.push('Unknown facility - proceeding with caution on weekday');
    }
  }

  // If fully authorized with no issues
  if (status === ATTEMPT_AUTH.AUTHORIZED && reasons.length === 0) {
    if (appointmentScheduled) {
      reasons.push('Appointment scheduled');
    } else if (appointmentReq === APPOINTMENT_REQUIREMENT.NOT_REQUIRED) {
      reasons.push('Appointment not required for this facility');
    }
  }

  return {
    status,
    reasons,
    canProceed: status !== ATTEMPT_AUTH.NOT_AUTHORIZED,
    appointmentRequirement: appointmentReq,
  };
}

/**
 * Get comprehensive scheduling rules for a booking location
 * This is the main function components should call to get all scheduling info
 * 
 * @param {Object} location - Location object from booking
 * @param {string} location.locationType - Location type
 * @param {string} [location.facilityName] - Facility name
 * @param {Object} [location.documents] - Available documents
 * @param {boolean} [location.appointmentScheduled] - Whether appointment is scheduled
 * @param {boolean} [location.weekendConfirmed] - Whether weekend access is confirmed
 * @param {Date|string} [location.plannedDate] - Planned pickup/dropoff date
 * @returns {Object} - Complete scheduling rules and authorization status
 */
export function getSchedulingRules(location = {}) {
  const {
    locationType = LOCATION_TYPES.OTHER,
    facilityName,
    documents = {},
    appointmentScheduled = false,
    weekendConfirmed = false,
    plannedDate,
  } = location;

  // Get detected facility info
  const detectedFacility = locationType === LOCATION_TYPES.AUCTION 
    ? detectAuctionFacility(facilityName)
    : null;

  // Get location type defaults
  const locationDefaults = LOCATION_TYPE_DEFAULTS[locationType] || LOCATION_TYPE_DEFAULTS[LOCATION_TYPES.OTHER];

  // Get appointment requirement
  const appointmentRequirement = getAppointmentRequirement({ locationType, facilityName });

  // Check weekends
  const weekendRules = checkWeekendsAllowed({ locationType, facilityName, weekendConfirmed });

  // Check if planned date is weekend
  const plannedDateIsWeekend = plannedDate ? isWeekend(plannedDate) : false;

  // Check documents
  const documentStatus = checkRequiredDocuments(locationType, documents);

  // Compute authorization
  const authorization = computeAttemptAuthorization({
    locationType,
    facilityName,
    appointmentScheduled,
    documents,
    attemptDate: plannedDate,
    weekendConfirmed,
  });

  return {
    // Location info
    locationType,
    facilityName,
    detectedFacility,
    
    // Rules
    appointmentRequirement,
    timeWindowRequired: isTimeWindowRequired(locationType),
    weekendsAllowed: weekendRules.allowed,
    weekendRequiresConfirmation: weekendRules.requiresConfirmation,
    businessHoursOnly: locationDefaults.businessHoursOnly,
    gatePassRequired: locationDefaults.gatePassRequired,
    
    // Documents
    requiredDocuments: getRequiredDocuments(locationType),
    documentStatus,
    
    // Date checks
    plannedDateIsWeekend,
    
    // Authorization
    authorization,
    canAttempt: authorization.canProceed,
    
    // Warnings/notes
    facilityNotes: detectedFacility?.notes || null,
  };
}

/**
 * Validate scheduling for a complete booking (all vehicles)
 * @param {Object} booking - Booking object with vehicles array
 * @returns {Object} - { valid: boolean, errors: Object[], warnings: Object[] }
 */
export function validateBookingScheduling(booking) {
  const errors = [];
  const warnings = [];
  const { vehicles = [], vehicleCount = 1 } = booking;

  for (let i = 0; i < vehicleCount; i++) {
    const vehicle = vehicles[i] || {};
    const vehicleLabel = `Vehicle ${i + 1}`;

    // Validate pickup
    if (vehicle.pickup) {
      const pickupRules = getSchedulingRules({
        locationType: vehicle.pickup.locationType,
        facilityName: vehicle.pickup.facilityName,
        documents: vehicle.pickup.documents,
        appointmentScheduled: vehicle.pickup.appointmentScheduled,
        weekendConfirmed: vehicle.pickup.weekendConfirmed,
        plannedDate: vehicle.pickup.timeWindow?.date,
      });

      if (!pickupRules.canAttempt) {
        errors.push({
          vehicleIndex: i,
          type: 'pickup',
          message: `${vehicleLabel} pickup: ${pickupRules.authorization.reasons.join(', ')}`,
        });
      }

      if (pickupRules.authorization.status === ATTEMPT_AUTH.AUTHORIZED_PROTECTED) {
        warnings.push({
          vehicleIndex: i,
          type: 'pickup',
          message: `${vehicleLabel} pickup: ${pickupRules.authorization.reasons.join(', ')}`,
        });
      }
    }

    // Validate dropoff
    if (vehicle.dropoff) {
      const dropoffRules = getSchedulingRules({
        locationType: vehicle.dropoff.locationType,
        facilityName: vehicle.dropoff.facilityName,
        documents: vehicle.dropoff.documents,
        appointmentScheduled: vehicle.dropoff.appointmentScheduled,
        weekendConfirmed: vehicle.dropoff.weekendConfirmed,
        plannedDate: vehicle.dropoff.timeWindow?.date,
      });

      if (!dropoffRules.canAttempt) {
        errors.push({
          vehicleIndex: i,
          type: 'dropoff',
          message: `${vehicleLabel} dropoff: ${dropoffRules.authorization.reasons.join(', ')}`,
        });
      }

      if (dropoffRules.authorization.status === ATTEMPT_AUTH.AUTHORIZED_PROTECTED) {
        warnings.push({
          vehicleIndex: i,
          type: 'dropoff',
          message: `${vehicleLabel} dropoff: ${dropoffRules.authorization.reasons.join(', ')}`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// ✅ FIXED: Parse date string as LOCAL date (not UTC)
// This prevents "2026-01-19" from becoming Jan 18 in local timezone
// ============================================================
export function parseLocalDateString(dateStr) {
  if (!dateStr) return null;
  
  // Handle YYYY-MM-DD format from HTML date inputs
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in LOCAL timezone (month is 0-indexed)
    return new Date(year, month - 1, day, 12, 0, 0, 0); // Use noon to avoid any edge cases
  }
  
  // For other formats, try normal parsing but be careful
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

// ============================================================
// ✅ FIXED: Compare dates by calendar day only (ignore time)
// ============================================================
function compareDatesOnly(dateStrA, dateStrB) {
  const a = parseLocalDateString(dateStrA);
  const b = parseLocalDateString(dateStrB);
  
  if (!a || !b) return 0;
  
  // Compare year, month, day only
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  
  return aDay.getTime() - bDay.getTime();
}

// ============================================================
// ✅ FIXED: Check if two dates are the same calendar day
// ============================================================
function isSameDay(dateStrA, dateStrB) {
  return compareDatesOnly(dateStrA, dateStrB) === 0;
}

// Helper: Parse time string to comparable value (minutes since midnight)
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

// Default time window structure
const DEFAULT_TIME_WINDOW = {
  date: '',
  preferredWindow: '',
  customFrom: '',
  customTo: '',
};

export default function Scheduling() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ✅ Get vehicleCount and vehicles from portal context
  const {
    vehicles,
    vehicleCount,
    updatePickup,
    updateDropoff,
    draftId,
    goToStep,
  } = usePortal();

  // ✅ Debug log to verify vehicleCount is received correctly
  console.log('🚗 [SCHEDULING] vehicleCount from context:', vehicleCount);
  console.log('🚗 [SCHEDULING] vehicles array length:', vehicles?.length);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // Helper functions to get vehicle data safely
  // ============================================================================

  // Get vehicle entry safely for a given index
  const getVehicleEntry = useCallback((index) => {
    return vehicles[index] || {};
  }, [vehicles]);

  // Get pickup time window for a specific vehicle index
  const getPickupTimeWindow = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickup?.timeWindow || DEFAULT_TIME_WINDOW;
  }, [getVehicleEntry]);

  // Get dropoff time window for a specific vehicle index
  const getDropoffTimeWindow = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoff?.timeWindow || DEFAULT_TIME_WINDOW;
  }, [getVehicleEntry]);

  // Get vehicle label for display (shows year/make/model if available)
  const getVehicleLabel = useCallback((index) => {
    const vehicleInfo = vehicles[index]?.vehicle || {};
    if (vehicleInfo.year && vehicleInfo.make && vehicleInfo.model) {
      return `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
    }
    return `Vehicle ${index + 1}`;
  }, [vehicles]);

  // ============================================================================
  // Event handlers - ALL update ONLY the specific vehicle index
  // ============================================================================

  // Clear specific error
  const clearError = (key) => {
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  // Handle pickup schedule change for a specific vehicle index
  const handlePickupScheduleChange = (index) => (newSchedule) => {
    console.log(`📅 [SCHEDULING] Pickup schedule change for Vehicle ${index + 1}:`, newSchedule);
    
    // ✅ Update ONLY this vehicle's pickup.timeWindow
    updatePickup(index, {
      timeWindow: {
        date: newSchedule.date || '',
        preferredWindow: newSchedule.preferredWindow || '',
        customFrom: newSchedule.customFrom || '',
        customTo: newSchedule.customTo || '',
      }
    });

    // Clear errors for this vehicle
    clearError(`${index}_pickupDate`);
    clearError(`${index}_pickupTime`);
    clearError(`${index}_dateOrder`);
  };

  // Handle dropoff schedule change for a specific vehicle index
  const handleDropoffScheduleChange = (index) => (newSchedule) => {
    console.log(`📅 [SCHEDULING] Dropoff schedule change for Vehicle ${index + 1}:`, newSchedule);
    
    // ✅ Update ONLY this vehicle's dropoff.timeWindow
    updateDropoff(index, {
      timeWindow: {
        date: newSchedule.date || '',
        preferredWindow: newSchedule.preferredWindow || '',
        customFrom: newSchedule.customFrom || '',
        customTo: newSchedule.customTo || '',
      }
    });

    // Clear errors for this vehicle
    clearError(`${index}_dropoffDate`);
    clearError(`${index}_dropoffTime`);
    clearError(`${index}_dateOrder`);
  };

  // ============================================================================
  // Validation and Continue
  // ============================================================================

  const handleContinue = async () => {
    const newErrors = {};
    
    // ✅ Validate each vehicle's scheduling (0 to vehicleCount-1)
    for (let i = 0; i < vehicleCount; i++) {
      const pickupTW = getPickupTimeWindow(i);
      const dropoffTW = getDropoffTimeWindow(i);
      
      // Validate pickup date
      if (!pickupTW.date) {
        newErrors[`${i}_pickupDate`] = 'Pickup date is required';
      }
      
      // Validate pickup time (preset or custom)
      const hasPickupPreset = Boolean(pickupTW.preferredWindow);
      const hasPickupCustom = Boolean(pickupTW.customFrom && pickupTW.customTo);
      
      if (!hasPickupPreset && !hasPickupCustom) {
        newErrors[`${i}_pickupTime`] = 'Please select a pickup time window';
      }

      // Validate dropoff date
      if (!dropoffTW.date) {
        newErrors[`${i}_dropoffDate`] = 'Drop-off date is required';
      }
      
      // Validate dropoff time (preset or custom)
      const hasDropoffPreset = Boolean(dropoffTW.preferredWindow);
      const hasDropoffCustom = Boolean(dropoffTW.customFrom && dropoffTW.customTo);
      
      if (!hasDropoffPreset && !hasDropoffCustom) {
        newErrors[`${i}_dropoffTime`] = 'Please select a drop-off time window';
      }

      // ✅ FIXED: Validate drop-off can't be before pickup using LOCAL date comparison
      if (pickupTW.date && dropoffTW.date) {
        const comparison = compareDatesOnly(pickupTW.date, dropoffTW.date);
        
        if (comparison > 0) {
          // Pickup is AFTER dropoff - invalid
          newErrors[`${i}_dateOrder`] = 'Drop-off date cannot be earlier than pickup date';
        } else if (comparison === 0) {
          // Same day - validate times don't overlap incorrectly
          let pickupTimeFrom = '';
          if (pickupTW.customFrom) {
            pickupTimeFrom = pickupTW.customFrom;
          } else if (pickupTW.preferredWindow) {
            pickupTimeFrom = getPresetStartTime(pickupTW.preferredWindow);
          }
          
          let dropoffTimeTo = '';
          if (dropoffTW.customTo) {
            dropoffTimeTo = dropoffTW.customTo;
          } else if (dropoffTW.preferredWindow) {
            dropoffTimeTo = getPresetEndTime(dropoffTW.preferredWindow);
          }
          
          if (pickupTimeFrom && dropoffTimeTo) {
            const pickupMinutes = parseTimeToMinutes(pickupTimeFrom);
            const dropoffMinutes = parseTimeToMinutes(dropoffTimeTo);
            
            if (dropoffMinutes < pickupMinutes) {
              newErrors[`${i}_dateOrder`] = 'For same-day delivery, drop-off time must be at or after pickup time';
            }
          }
        }
        // comparison < 0 means dropoff is after pickup - valid, no error
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorIndex = parseInt(firstErrorKey.split('_')[0], 10);
      const element = document.getElementById(`scheduling-section-${firstErrorIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Save to draft if draftId exists
    if (draftId) {
      setIsSaving(true);
      try {
        await quotesApi.patchDraft(
          draftId, 
          { 
            vehicles,
            vehicleCount, // ✅ Include vehicleCount in draft save
          }, 
          token
        );
        console.log(`✅ Scheduling saved for ${vehicleCount} vehicle(s)`);
      } catch (err) {
        console.error('Failed to save:', err);
        alert('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    
    // Navigate to payment step
    if (goToStep) {
      goToStep('payment');
    } else {
      navigate('../payment');
    }
  };

  const handleBack = () => {
    if (goToStep) {
      goToStep('vehicle');
    } else {
      navigate('../vehicle');
    }
  };

  // ============================================================================
  // Render scheduling section for a single vehicle
  // ============================================================================

  const renderVehicleScheduling = (index) => {
    const pickupTW = getPickupTimeWindow(index);
    const dropoffTW = getDropoffTimeWindow(index);
    const vehicleLabel = getVehicleLabel(index);
    const todayIso = new Date().toISOString().split('T')[0];
    const minDropoffDate = pickupTW.date || todayIso;

    return (
      <div 
        key={index}
        id={`scheduling-section-${index}`}
        className="sp-vehicle-scheduling-section"
        style={{ marginBottom: index < vehicleCount - 1 ? '2rem' : undefined }}
      >
        {/* ✅ Vehicle Header - Shows "Vehicle 1/2/3" with consistent styling */}
        {vehicleCount > 1 && (
          <div className="sp-vehicle-header" style={{ 
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-surface-secondary, #f5f5f5)',
            borderRadius: '8px',
            fontWeight: 600,
            borderLeft: '4px solid var(--color-primary, #2563eb)'
          }}>
            <span style={{ color: 'var(--color-primary, #2563eb)' }}>
              Vehicle {index + 1}
            </span>
            {vehicleLabel !== `Vehicle ${index + 1}` && (
              <span style={{ fontWeight: 400, marginLeft: '8px', color: 'var(--color-text-secondary, #666)' }}>
                — {vehicleLabel}
              </span>
            )}
          </div>
        )}

        {/* Date Order Validation Error */}
        {errors[`${index}_dateOrder`] && (
          <div className="sp-error-banner" style={{ 
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-error-bg, #fef2f2)',
            border: '1px solid var(--color-error, #ef4444)',
            borderRadius: '8px',
            color: 'var(--color-error, #ef4444)',
            fontSize: '0.875rem'
          }}>
            {errors[`${index}_dateOrder`]}
          </div>
        )}

        {/* Pickup Window Card */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              {vehicleCount > 1 
                ? `Pickup Window for Vehicle ${index + 1}` 
                : 'Pickup Window'
              }
            </h4>
          </div>
          <TimeWindowPicker
            label=""
            value={{
              date: pickupTW.date,
              preferredWindow: pickupTW.preferredWindow,
              customFrom: pickupTW.customFrom,
              customTo: pickupTW.customTo,
            }}
            onChange={handlePickupScheduleChange(index)}
            errors={{
              date: errors[`${index}_pickupDate`],
              time: errors[`${index}_pickupTime`],
            }}
            minDate={todayIso}
          />
        </section>

        {/* Drop-off Window Card */}
        <section className="sp-card">
          <div className="sp-card-header">
            <h4 className="sp-card-title">
              {vehicleCount > 1 
                ? `Drop-off Window for Vehicle ${index + 1}` 
                : 'Drop-off Window'
              }
            </h4>
          </div>
          <TimeWindowPicker
            label=""
            value={{
              date: dropoffTW.date,
              preferredWindow: dropoffTW.preferredWindow,
              customFrom: dropoffTW.customFrom,
              customTo: dropoffTW.customTo,
            }}
            onChange={handleDropoffScheduleChange(index)}
            errors={{
              date: errors[`${index}_dropoffDate`],
              time: errors[`${index}_dropoffTime`],
            }}
            minDate={minDropoffDate}
          />
        </section>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="sp-section sp-scheduling-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <Calendar size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Scheduling</h3>
          <p className="sp-step-description">
            {vehicleCount > 1 
              ? `Set pickup and drop-off times for your ${vehicleCount} vehicles`
              : 'Set your preferred pickup and drop-off dates and times'
            }
          </p>
        </div>
      </header>

      {/* ✅ Render scheduling section for EACH vehicle (0 to vehicleCount-1) */}
      {Array.from({ length: vehicleCount }).map((_, index) => renderVehicleScheduling(index))}

      {/* Info Box */}
      <div className="sp-info-box">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path
            d="M12 16v-4M12 8h.01"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p>
          {vehicleCount > 1 
            ? `Choose flexible time windows when possible for easier coordination. Each vehicle can have different pickup and drop-off times.`
            : `Choose a flexible time window when possible for easier coordination with the carrier.`
          }
        </p>
      </div>

      {/* Actions */}
      <div className="sp-actions">
        <button
          type="button"
          className="sp-btn sp-btn--secondary"
          onClick={handleBack}
          disabled={isSaving}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Vehicle
        </button>

        <button
          type="button"
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
              Continue to Payment
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}