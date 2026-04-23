// ============================================================
// FILE: src/pages/shipper-portal/sections/vehicle-details.jsx
// ✅ UPDATED: Multi-vehicle support (up to 3 vehicles)
// ✅ FIXED: vehicleCount from context, per-vehicle state management
// ✅ UPDATED: Removed Vehicle Type, moved Operable next to Model
// ============================================================

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as quotesApi from '../../../services/quotes.api.js';
import { getVinRules, sanitizeVinInput, validateVin } from '../../../utils/vin-rules.js';
import './sections.css';

export default function VehicleDetails() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // ✅ Get vehicleCount and vehicles from portal context
  const {
    vehicles,
    vehicleCount,
    updateVehicleInfo,
    draftId,
    goToStep,
  } = usePortal();

  // ✅ Debug log to verify vehicleCount is received correctly
  console.log('🚗 [VEHICLE] vehicleCount from context:', vehicleCount);
  console.log('🚗 [VEHICLE] vehicles array length:', vehicles?.length);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // Helper functions to get vehicle data safely
  // ============================================================================

  // Get vehicle info for a specific index (handles both old and new structure)
  const getVehicleInfo = useCallback((index) => {
    const entry = vehicles?.[index];
    if (!entry) {
      return { year: '', make: '', model: '', operable: 'yes', vin: '' };
    }
    // New structure: entry.vehicle contains the vehicle info
    if (entry.vehicle) {
      return entry.vehicle;
    }
    // Legacy structure: entry itself is the vehicle info
    return entry;
  }, [vehicles]);

  // Get vehicle label for display (shows year/make/model if available)
  const getVehicleLabel = useCallback((index) => {
    const vehicle = getVehicleInfo(index);
    if (vehicle.year && vehicle.make && vehicle.model) {
      return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }
    return `Vehicle ${index + 1}`;
  }, [getVehicleInfo]);

  // ============================================================================
  // Event handlers - ALL update ONLY the specific vehicle index
  // ============================================================================

  // Handle field change for a specific vehicle index
  const handleChange = (index, field) => (e) => {
    const value = e.target.value;
    
    // ✅ Update ONLY this vehicle's info
    updateVehicleInfo(index, { [field]: value });

    // Clear error for this field
    const errorKey = `${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
  };

  // Year handler - allows any 4 digit numbers
  const handleYearChange = (index) => (e) => {
    const value = e.target.value;
    
    // Only allow digits, max 4 characters
    if (value === '' || /^\d{0,4}$/.test(value)) {
      // ✅ Update ONLY this vehicle's year
      updateVehicleInfo(index, { year: value });
      
      const errorKey = `${index}_year`;
      if (errors[errorKey]) {
        setErrors((prev) => ({ ...prev, [errorKey]: '' }));
      }
    }
  };

  // VIN handler — rules depend on the selected vehicle type (see vin-rules.js).
  // Sanitizer caps length and strips non-alphanumeric characters.
  const handleVinChange = (index) => (e) => {
    const vehicle = getVehicleInfo(index);
    const sanitized = sanitizeVinInput(e.target.value, vehicle.type);
    updateVehicleInfo(index, { vin: sanitized });

    const errorKey = `${index}_vin`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
  };

  // ============================================================================
  // Validation and Continue
  // ============================================================================

  const handleContinue = async () => {
    const newErrors = {};

    // ✅ Validate each vehicle (0 to vehicleCount-1)
    for (let i = 0; i < vehicleCount; i++) {
      const vehicle = getVehicleInfo(i);

      // Validate year exists and is 4 digits
      if (!vehicle.year) {
        newErrors[`${i}_year`] = 'Year is required';
      } else if (vehicle.year.length !== 4) {
        newErrors[`${i}_year`] = 'Year must be 4 digits';
      }

      if (!vehicle.make?.trim()) {
        newErrors[`${i}_make`] = 'Make is required';
      }
      if (!vehicle.model?.trim()) {
        newErrors[`${i}_model`] = 'Model is required';
      }

      // VIN / serial validation — rules depend on vehicle type.
      const vinCheck = validateVin(vehicle.vin, vehicle.type);
      if (!vinCheck.valid) {
        newErrors[`${i}_vin`] = vinCheck.error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorIndex = parseInt(firstErrorKey.split('_')[0], 10);
      const element = document.getElementById(`vehicle-section-${firstErrorIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Save to draft if it exists
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
        console.log(`✅ Vehicle details saved for ${vehicleCount} vehicle(s)`);
      } catch (err) {
        console.error('Failed to save vehicle details:', err);
        alert('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    // Navigate to Confirm
    if (goToStep) {
      goToStep('confirm');
    } else {
      navigate('../confirm');
    }
  };

  const handleBack = () => {
    if (goToStep) {
      goToStep('dropoff');
    } else {
      navigate('../dropoff');
    }
  };

  // ============================================================================
  // Render vehicle section for a single vehicle
  // ============================================================================

  const renderVehicleSection = (index) => {
    const vehicle = getVehicleInfo(index);
    const vehicleLabel = getVehicleLabel(index);

    return (
      <section 
        key={index} 
        id={`vehicle-section-${index}`}
        className="sp-card"
        style={{ marginBottom: index < vehicleCount - 1 ? '1.5rem' : undefined }}
      >
        {/* ✅ Vehicle Header - Shows "Vehicle 1/2/3" with consistent styling */}
        <div className="sp-card-header">
          {vehicleCount > 1 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px'
            }}>
              <h4 className="sp-card-title" style={{ margin: 0 }}>
                <span style={{ color: 'var(--color-primary, #2563eb)' }}>
                  Vehicle {index + 1}
                </span>
              </h4>
              {vehicleLabel !== `Vehicle ${index + 1}` && (
                <span style={{ 
                  fontWeight: 400, 
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary, #666)' 
                }}>
                  — {vehicleLabel}
                </span>
              )}
            </div>
          ) : (
            <h4 className="sp-card-title">Vehicle Information</h4>
          )}
        </div>

        <div className="sp-form-grid vd-grid">
          {/* Year Input */}
          <div className="sp-form-group">
            <label className="sp-label">
              Year <span className="sp-required">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              className={`sp-input ${errors[`${index}_year`] ? 'sp-input--error' : ''}`}
              placeholder="Enter Year"
              value={vehicle.year || ''}
              onChange={handleYearChange(index)}
              maxLength={4}
            />
            {errors[`${index}_year`] && (
              <span className="sp-error-text">{errors[`${index}_year`]}</span>
            )}
          </div>

          {/* Make Input */}
          <div className="sp-form-group">
            <label className="sp-label">
              Make <span className="sp-required">*</span>
            </label>
            <input
              type="text"
              className={`sp-input ${errors[`${index}_make`] ? 'sp-input--error' : ''}`}
              placeholder="Enter Make"
              value={vehicle.make || ''}
              onChange={handleChange(index, 'make')}
            />
            {errors[`${index}_make`] && (
              <span className="sp-error-text">{errors[`${index}_make`]}</span>
            )}
          </div>

          {/* Model Input */}
          <div className="sp-form-group">
            <label className="sp-label">
              Model <span className="sp-required">*</span>
            </label>
            <input
              type="text"
              className={`sp-input ${errors[`${index}_model`] ? 'sp-input--error' : ''}`}
              placeholder="Enter Model"
              value={vehicle.model || ''}
              onChange={handleChange(index, 'model')}
            />
            {errors[`${index}_model`] && (
              <span className="sp-error-text">{errors[`${index}_model`]}</span>
            )}
          </div>

          {/* Operable Dropdown - Now next to Model */}
          <div className="sp-form-group">
            <label className="sp-label">
              Operable? <span className="sp-required">*</span>
            </label>
            <select
              className="sp-select"
              value={vehicle.operable || 'yes'}
              onChange={handleChange(index, 'operable')}
            >
              <option value="yes">Yes (Runs and Drives)</option>
              <option value="no">No (Inoperable)</option>
            </select>
            {vehicle.operable === 'no' && (
              <span className="sp-field-helper" style={{ color: 'var(--color-warning, #d97706)' }}>
                Note: Inoperable vehicles may incur additional fees
              </span>
            )}
          </div>

          {/* VIN / Serial Input — label + rules adapt to vehicle type. */}
          {(() => {
            const rule = getVinRules(vehicle.type);
            const errorKey = `${index}_vin`;
            return (
              <div className="sp-form-group sp-form-group--full">
                <label className="sp-label">
                  {rule.label} <span className="sp-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sp-input ${errors[errorKey] ? 'sp-input--error' : ''}`}
                  placeholder={rule.placeholder}
                  value={vehicle.vin || ''}
                  onChange={handleVinChange(index)}
                  maxLength={rule.maxLength}
                  style={{
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}
                />
                {errors[errorKey] && (
                  <span className="sp-error-text">{errors[errorKey]}</span>
                )}
                <span className="sp-field-helper">
                  {vehicle.vin
                    ? rule.mustBe17
                      ? `${vehicle.vin.length}/17 characters`
                      : `${vehicle.vin.length}/${rule.maxLength} characters`
                    : rule.helperText}
                </span>
              </div>
            );
          })()}
        </div>
      </section>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="sp-section sp-vehicle-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <Car size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Vehicle Details</h3>
          <p className="sp-step-description">
            {vehicleCount > 1 
              ? `Tell us about the ${vehicleCount} vehicles you're shipping`
              : "Tell us about the vehicle you're shipping"
            }
          </p>
        </div>
      </header>

      {/* ✅ Render vehicle section for EACH vehicle (0 to vehicleCount-1) */}
      {Array.from({ length: vehicleCount }).map((_, index) => renderVehicleSection(index))}

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
            ? `VINs are required for each vehicle's Bill of Lading (BOL) document. You can find them on the dashboard (driver's side), door jamb, or vehicle registration.`
            : `The VIN is required for your Bill of Lading (BOL) document. You can find it on your vehicle's dashboard (driver's side), door jamb, or vehicle registration.`
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
          Back to Drop-off
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
              Continue to Confirm
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