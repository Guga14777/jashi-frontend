// ============================================================
// FILE: src/pages/shipper-portal/sections/confirm.jsx
// ✅ UPDATED: Multi-vehicle confirmation support (up to 3 vehicles)
// ✅ UPDATED: Removed Transport Summary, rearranged layout
// ============================================================

import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, MapPin, Truck, Calendar, FileText, Building2, User, Gavel, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as quotesApi from '../../../services/quotes.api.js';
import './sections.css';

export default function Confirm() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  
  const {
    quoteData,
    quoteId,
    draftId,
    setDraftId,
    vehicles,
    vehicleCount,
    scheduling,
    goToStep,
    acceptedPrice,
    instructions,
    setInstructions,
  } = usePortal();

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Get offer amount
  const offerAmount = acceptedPrice || quoteData?.offer || 0;

  // Get draftId from URL if not in context
  const urlDraftId = searchParams.get('draftId');
  const currentDraftId = draftId || urlDraftId;

  // Helper to get vehicle entry safely
  const getVehicleEntry = useCallback((index) => {
    return vehicles[index] || {};
  }, [vehicles]);

  // Helper to get vehicle info
  const getVehicleInfo = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.vehicle || {};
  }, [getVehicleEntry]);

  // Helper to get pickup for a vehicle
  const getPickup = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickup || {};
  }, [getVehicleEntry]);

  // Helper to get dropoff for a vehicle
  const getDropoff = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoff || {};
  }, [getVehicleEntry]);

  // Helper to get pickup origin type
  const getPickupOriginType = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickupOriginType || '';
  }, [getVehicleEntry]);

  // Helper to get dropoff destination type
  const getDropoffDestinationType = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoffDestinationType || '';
  }, [getVehicleEntry]);

  // Helper to get pickup time window
  const getPickupTimeWindow = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.pickupTimeWindow || entry.pickup?.timeWindow || scheduling?.pickupPreferredWindow || '';
  }, [getVehicleEntry, scheduling]);

  // Helper to get dropoff time window
  const getDropoffTimeWindow = useCallback((index) => {
    const entry = getVehicleEntry(index);
    return entry.dropoffTimeWindow || entry.dropoff?.timeWindow || scheduling?.dropoffPreferredWindow || '';
  }, [getVehicleEntry, scheduling]);

  // Helper to check if vehicle has a pickup gate pass
  const hasPickupGatePass = useCallback((index) => {
    const entry = getVehicleEntry(index);
    
    // Check multiple possible locations for gate pass
    if (entry.pickupAuctionInfo?.gatePass) return true;
    if (entry.documents?.pickupGatePassId) return true;
    if (Array.isArray(entry.documents?.gatePass) && entry.documents.gatePass.length > 0) return true;
    if (Array.isArray(entry.pickup?.documents?.gatePass) && entry.pickup.documents.gatePass.length > 0) return true;
    if (entry.pickupGatePass) return true;
    if (Array.isArray(entry.documents)) {
      const hasGP = entry.documents.some(doc => 
        doc.type === 'GATE_PASS' && (doc.stage === 'pickup' || doc.stage === 'PICKUP')
      );
      if (hasGP) return true;
    }
    return false;
  }, [getVehicleEntry]);

  // Helper to check if vehicle has a dropoff gate pass
  const hasDropoffGatePass = useCallback((index) => {
    const entry = getVehicleEntry(index);
    
    if (entry.dropoffAuctionInfo?.gatePass) return true;
    if (entry.documents?.dropoffGatePassId) return true;
    if (Array.isArray(entry.documents?.dropoffGatePass) && entry.documents.dropoffGatePass.length > 0) return true;
    if (Array.isArray(entry.dropoff?.documents?.gatePass) && entry.dropoff.documents.gatePass.length > 0) return true;
    if (entry.dropoffGatePass) return true;
    if (Array.isArray(entry.documents)) {
      const hasGP = entry.documents.some(doc => 
        doc.type === 'GATE_PASS' && (doc.stage === 'dropoff' || doc.stage === 'DROPOFF' || doc.stage === 'delivery')
      );
      if (hasGP) return true;
    }
    return false;
  }, [getVehicleEntry]);

  // Helper to get pickup contact info
  const getPickupContact = useCallback((index) => {
    const entry = getVehicleEntry(index);
    const originType = entry.pickupOriginType || '';
    
    switch (originType) {
      case 'dealership': {
        const info = entry.pickupDealerInfo || {};
        return {
          name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Not provided',
          phone: info.phone || 'Not provided',
        };
      }
      case 'auction': {
        const info = entry.pickupAuctionInfo || {};
        return {
          name: info.name || 'Auction',
          extra: info.buyerNumber ? `Buyer #: ${info.buyerNumber}` : null,
          hasGatePass: hasPickupGatePass(index),
        };
      }
      case 'private': {
        const info = entry.pickupPrivateInfo || {};
        return {
          name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Not provided',
          phone: info.phone || 'Not provided',
        };
      }
      default:
        return { name: 'Not specified' };
    }
  }, [getVehicleEntry, hasPickupGatePass]);

  // Helper to get dropoff contact info
  const getDropoffContact = useCallback((index) => {
    const entry = getVehicleEntry(index);
    const destType = entry.dropoffDestinationType || '';
    
    switch (destType) {
      case 'dealership': {
        const info = entry.dropoffDealerInfo || {};
        return {
          name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Not provided',
          phone: info.phone || 'Not provided',
        };
      }
      case 'auction': {
        const info = entry.dropoffAuctionInfo || {};
        return {
          name: info.name || 'Auction',
          extra: info.buyerNumber ? `Buyer #: ${info.buyerNumber}` : null,
          hasGatePass: hasDropoffGatePass(index),
        };
      }
      case 'private': {
        const info = entry.dropoffPrivateInfo || {};
        return {
          name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Not provided',
          phone: info.phone || 'Not provided',
        };
      }
      default:
        return { name: 'Not specified' };
    }
  }, [getVehicleEntry, hasDropoffGatePass]);

  const formatLocationType = (type) => {
    switch (type) {
      case 'dealership': return 'Dealership';
      case 'auction': return 'Auction';
      case 'private': return 'Private Residence';
      default: return type || 'Not specified';
    }
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'dealership': return <Building2 size={16} />;
      case 'auction': return <Gavel size={16} />;
      case 'private': return <User size={16} />;
      default: return <MapPin size={16} />;
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'Not provided';
    const parts = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeWindow = (window) => {
    if (!window || window === 'flexible') return 'Flexible';
    const [start, end] = window.split('-');
    const formatTime = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m || '00'} ${ampm}`;
    };
    if (start && end) {
      return `${formatTime(start)} - ${formatTime(end)}`;
    }
    return window;
  };

  // Get vehicle display number (1-indexed)
  const getVehicleNumber = (index) => {
    return `Vehicle ${index + 1}`;
  };

  // Get vehicle label with details
  const getVehicleLabel = (index) => {
    const info = getVehicleInfo(index);
    if (info.year && info.make && info.model) {
      return `${info.year} ${info.make} ${info.model}`;
    }
    return `Vehicle ${index + 1}`;
  };

  // Validate all vehicles
  const validateVehicles = () => {
    const errors = [];

    for (let i = 0; i < vehicleCount; i++) {
      const vehicleErrors = [];
      const pickup = getPickup(i);
      const dropoff = getDropoff(i);
      const vehicleInfo = getVehicleInfo(i);
      const pickupOriginType = getPickupOriginType(i);
      const dropoffDestType = getDropoffDestinationType(i);
      const vehicleNumber = getVehicleNumber(i);

      // Validate vehicle info - year, make, model required
      if (!vehicleInfo.year) {
        vehicleErrors.push('Vehicle year is required');
      }
      if (!vehicleInfo.make) {
        vehicleErrors.push('Vehicle make is required');
      }
      if (!vehicleInfo.model) {
        vehicleErrors.push('Vehicle model is required');
      }

      // Validate VIN (17 characters)
      if (!vehicleInfo.vin) {
        vehicleErrors.push('VIN is required');
      } else if (vehicleInfo.vin.length !== 17) {
        vehicleErrors.push('VIN must be exactly 17 characters');
      }

      // Validate pickup origin type
      if (!pickupOriginType) {
        vehicleErrors.push('Pickup location type is required');
      }

      // Validate pickup address
      if (!pickup.address) {
        vehicleErrors.push('Pickup street address is required');
      }
      if (!pickup.city) {
        vehicleErrors.push('Pickup city is required');
      }
      if (!pickup.state) {
        vehicleErrors.push('Pickup state is required');
      }
      if (!pickup.zip) {
        vehicleErrors.push('Pickup ZIP code is required');
      }

      // Validate dropoff destination type
      if (!dropoffDestType) {
        vehicleErrors.push('Drop-off location type is required');
      }

      // Validate dropoff address
      if (!dropoff.address) {
        vehicleErrors.push('Drop-off street address is required');
      }
      if (!dropoff.city) {
        vehicleErrors.push('Drop-off city is required');
      }
      if (!dropoff.state) {
        vehicleErrors.push('Drop-off state is required');
      }
      if (!dropoff.zip) {
        vehicleErrors.push('Drop-off ZIP code is required');
      }

      // Validate gate pass for auction pickup
      if (pickupOriginType === 'auction') {
        if (!hasPickupGatePass(i)) {
          vehicleErrors.push('Pickup gate pass is required for auction pickup');
        }
      }

      // Validate gate pass for auction dropoff
      if (dropoffDestType === 'auction') {
        if (!hasDropoffGatePass(i)) {
          vehicleErrors.push('Drop-off gate pass is required for auction delivery');
        }
      }

      if (vehicleErrors.length > 0) {
        errors.push({
          vehicleIndex: i,
          vehicleLabel: vehicleNumber,
          vehicleDetails: getVehicleLabel(i),
          errors: vehicleErrors,
        });
      }
    }

    // Validate scheduling (shared across all vehicles)
    const schedulingErrors = [];
    if (!scheduling?.pickupDate) {
      schedulingErrors.push('Pickup date is required');
    }
    if (!scheduling?.dropoffDate) {
      schedulingErrors.push('Drop-off date is required');
    }

    if (schedulingErrors.length > 0) {
      errors.push({
        vehicleIndex: -1,
        vehicleLabel: 'Scheduling',
        vehicleDetails: 'Transport Schedule',
        errors: schedulingErrors,
      });
    }

    return errors;
  };

  const handleContinue = async () => {
    // Validate all vehicles
    const errors = validateVehicles();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);
    
    try {
      // Build draft data with all vehicles
      const draftData = {
        quoteId: quoteId,
        vehicles: vehicles,
        vehicleCount: vehicleCount,
        scheduling,
        instructions,
        notes: instructions,
        customerInstructions: instructions,
        acceptedPrice: offerAmount,
      };

      let finalDraftId = currentDraftId;

      if (currentDraftId) {
        console.log('🔄 Updating existing draft:', currentDraftId);
        try {
          await quotesApi.updateDraft(currentDraftId, draftData, token);
          console.log('✅ Draft updated with all vehicle data');
        } catch (updateErr) {
          console.warn('⚠️ Draft update failed, continuing anyway:', updateErr.message);
        }
      } else {
        console.log('📝 Creating new draft...');
        try {
          const response = await quotesApi.createDraft(draftData, token);
          const newDraftId = response?.id || response?.draft?.id || response?.draftId;
          console.log('✅ Draft created:', newDraftId);
          
          if (newDraftId) {
            finalDraftId = newDraftId;
            if (setDraftId) {
              setDraftId(newDraftId);
            }
          }
        } catch (createErr) {
          console.warn('⚠️ Draft creation failed, continuing without draft:', createErr.message);
          finalDraftId = quoteId;
        }
      }

      goToStep('payment', finalDraftId || quoteId);
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      goToStep('payment', currentDraftId || quoteId);
    } finally {
      setIsSaving(false);
    }
  };

  // Render vehicle summary card - NEW ORDER: Pickup → Dropoff → Vehicle Details
  const renderVehicleSummary = (index) => {
    const pickup = getPickup(index);
    const dropoff = getDropoff(index);
    const vehicleInfo = getVehicleInfo(index);
    const pickupOriginType = getPickupOriginType(index);
    const dropoffDestType = getDropoffDestinationType(index);
    const pickupContact = getPickupContact(index);
    const dropoffContact = getDropoffContact(index);
    const pickupTimeWindow = getPickupTimeWindow(index);
    const dropoffTimeWindow = getDropoffTimeWindow(index);
    const pickupHasGatePass = hasPickupGatePass(index);
    const dropoffHasGatePass = hasDropoffGatePass(index);

    return (
      <div key={index} className="sp-vehicle-summary" style={{ marginBottom: '2rem' }}>
        {/* Only show vehicle header for multi-vehicle bookings */}
        {vehicleCount > 1 && (
          <div className="sp-vehicle-header" style={{ 
            marginBottom: '1rem',
            padding: '0.875rem 1.25rem',
            backgroundColor: 'var(--color-primary, #2563eb)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Truck size={20} />
            <span style={{ fontSize: '1.1rem' }}>Vehicle {index + 1}</span>
            {vehicleInfo.year && vehicleInfo.make && vehicleInfo.model && (
              <span style={{ 
                fontSize: '0.95rem', 
                fontWeight: 500,
                opacity: 0.9,
                marginLeft: 'auto'
              }}>
                {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </span>
            )}
          </div>
        )}

        <div className="sp-confirm-grid">
          {/* 1. Pickup Location Card (LEFT) */}
          <div className="sp-confirm-card">
            <div className="sp-confirm-card-header">
              <MapPin size={18} />
              <h4>Pickup Location</h4>
            </div>
            <div className="sp-confirm-card-body">
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Location Type</span>
                <span className="sp-confirm-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getLocationIcon(pickupOriginType)}
                  {formatLocationType(pickupOriginType)}
                </span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Address</span>
                <span className="sp-confirm-value">{formatAddress(pickup)}</span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Time Window</span>
                <span className="sp-confirm-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  {formatTimeWindow(pickupTimeWindow)}
                </span>
              </div>
              {pickupContact.name && pickupContact.name !== 'Not specified' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Contact</span>
                  <span className="sp-confirm-value">{pickupContact.name}</span>
                </div>
              )}
              {pickupContact.phone && pickupContact.phone !== 'Not provided' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Phone</span>
                  <span className="sp-confirm-value">{pickupContact.phone}</span>
                </div>
              )}
              {pickupContact.extra && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Details</span>
                  <span className="sp-confirm-value">{pickupContact.extra}</span>
                </div>
              )}
              {pickupOriginType === 'auction' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Gate Pass</span>
                  <span className="sp-confirm-value" style={{ 
                    color: pickupHasGatePass ? '#16a34a' : '#dc2626',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {pickupHasGatePass ? '✓ Uploaded' : '✗ Missing (Required)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Drop-off Location Card (RIGHT) */}
          <div className="sp-confirm-card">
            <div className="sp-confirm-card-header">
              <MapPin size={18} />
              <h4>Drop-off Location</h4>
            </div>
            <div className="sp-confirm-card-body">
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Location Type</span>
                <span className="sp-confirm-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getLocationIcon(dropoffDestType)}
                  {formatLocationType(dropoffDestType)}
                </span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Address</span>
                <span className="sp-confirm-value">{formatAddress(dropoff)}</span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Time Window</span>
                <span className="sp-confirm-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  {formatTimeWindow(dropoffTimeWindow)}
                </span>
              </div>
              {dropoffContact.name && dropoffContact.name !== 'Not specified' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Contact</span>
                  <span className="sp-confirm-value">{dropoffContact.name}</span>
                </div>
              )}
              {dropoffContact.phone && dropoffContact.phone !== 'Not provided' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Phone</span>
                  <span className="sp-confirm-value">{dropoffContact.phone}</span>
                </div>
              )}
              {dropoffContact.extra && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Details</span>
                  <span className="sp-confirm-value">{dropoffContact.extra}</span>
                </div>
              )}
              {dropoffDestType === 'auction' && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Gate Pass</span>
                  <span className="sp-confirm-value" style={{ 
                    color: dropoffHasGatePass ? '#16a34a' : '#dc2626',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {dropoffHasGatePass ? '✓ Uploaded' : '✗ Missing (Required)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Vehicle Details Card (BELOW) */}
          <div className="sp-confirm-card">
            <div className="sp-confirm-card-header">
              <Truck size={18} />
              <h4>Vehicle Details</h4>
            </div>
            <div className="sp-confirm-card-body">
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Year</span>
                <span className="sp-confirm-value">{vehicleInfo.year || 'Not specified'}</span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Make</span>
                <span className="sp-confirm-value">{vehicleInfo.make || 'Not specified'}</span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Model</span>
                <span className="sp-confirm-value">{vehicleInfo.model || 'Not specified'}</span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">VIN</span>
                <span className="sp-confirm-value" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {vehicleInfo.vin || 'Not provided'}
                </span>
              </div>
              <div className="sp-confirm-row">
                <span className="sp-confirm-label">Operable</span>
                <span className="sp-confirm-value">
                  {vehicleInfo.operable === 'no' ? 'No (Inoperable)' : 'Yes'}
                </span>
              </div>
              {vehicleInfo.type && (
                <div className="sp-confirm-row">
                  <span className="sp-confirm-label">Type</span>
                  <span className="sp-confirm-value" style={{ textTransform: 'capitalize' }}>
                    {vehicleInfo.type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sp-section sp-confirm-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <ClipboardCheck size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Confirm Your Booking</h3>
          <p className="sp-step-description">
            {vehicleCount > 1 
              ? `Review details for all ${vehicleCount} vehicles before proceeding to payment`
              : 'Review all details before proceeding to payment'
            }
          </p>
        </div>
      </header>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="sp-validation-errors" style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '1rem', 
            color: '#dc2626',
            fontSize: '1.05rem'
          }}>
            <AlertCircle size={22} />
            <strong>Please fix the following issues before continuing:</strong>
          </div>
          {validationErrors.map((vehicleError, idx) => (
            <div key={idx} style={{ 
              marginBottom: idx < validationErrors.length - 1 ? '0.875rem' : 0,
              paddingLeft: '0.5rem'
            }}>
              <div style={{ 
                color: '#991b1b', 
                fontWeight: 600,
                marginBottom: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {vehicleError.vehicleIndex >= 0 && <Truck size={16} />}
                {vehicleError.vehicleLabel}
                {vehicleError.vehicleDetails && vehicleError.vehicleDetails !== vehicleError.vehicleLabel && (
                  <span style={{ fontWeight: 400, color: '#b91c1c' }}>
                    ({vehicleError.vehicleDetails})
                  </span>
                )}
              </div>
              <ul style={{ 
                margin: '0', 
                paddingLeft: '1.75rem', 
                color: '#dc2626',
                listStyleType: 'disc'
              }}>
                {vehicleError.errors.map((err, errIdx) => (
                  <li key={errIdx} style={{ marginBottom: '0.25rem' }}>{err}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="sp-confirm-content">
        <h4 className="sp-section-subtitle">Booking Overview</h4>

        {/* Transport Schedule (shared across all vehicles) */}
        <div className="sp-confirm-card" style={{ marginBottom: '1.5rem' }}>
          <div className="sp-confirm-card-header">
            <Calendar size={18} />
            <h4>Transport Schedule</h4>
          </div>
          <div className="sp-confirm-card-body">
            <div className="sp-confirm-row">
              <span className="sp-confirm-label">Pickup Date</span>
              <span className="sp-confirm-value">{formatDate(scheduling?.pickupDate)}</span>
            </div>
            <div className="sp-confirm-row">
              <span className="sp-confirm-label">Pickup Window</span>
              <span className="sp-confirm-value">{formatTimeWindow(scheduling?.pickupPreferredWindow)}</span>
            </div>
            <div className="sp-confirm-row">
              <span className="sp-confirm-label">Drop-off Date</span>
              <span className="sp-confirm-value">{formatDate(scheduling?.dropoffDate)}</span>
            </div>
            <div className="sp-confirm-row">
              <span className="sp-confirm-label">Drop-off Window</span>
              <span className="sp-confirm-value">{formatTimeWindow(scheduling?.dropoffPreferredWindow)}</span>
            </div>
          </div>
        </div>

        {/* Vehicle-specific summaries - header only for multi-vehicle */}
        {vehicleCount > 1 && (
          <h4 className="sp-section-subtitle" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            Vehicle Details ({vehicleCount} vehicles)
          </h4>
        )}
        
        {Array.from({ length: vehicleCount }).map((_, index) => renderVehicleSummary(index))}

        {/* General note for the carrier. Gate codes, access, and unattended
            delivery details already live on the drop-off step — this field is
            just for anything else worth calling out. */}
        <div className="sp-confirm-card" style={{ marginTop: '1rem' }}>
          <div className="sp-confirm-card-header">
            <FileText size={18} />
            <h4>Note for the carrier (optional)</h4>
          </div>
          <div className="sp-confirm-card-body">
            <p style={{
              margin: '0 0 0.75rem',
              fontSize: '0.85rem',
              color: '#475569',
              lineHeight: 1.5,
            }}>
              Add anything not already covered in the pickup or drop-off steps — keys, escalation contacts, unusual access. Leave blank if nothing to add.
            </p>
            <textarea
              className="sp-textarea"
              placeholder="e.g. Please call me 30 minutes before pickup. There's a dog in the backyard — stay in the driveway."
              value={instructions || ''}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={500}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.95rem',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
            <div className="sp-textarea-counter" style={{
              textAlign: 'right',
              fontSize: '0.85rem',
              color: '#6b7280',
              marginTop: '0.375rem'
            }}>
              {(instructions || '').length}/500 characters
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sp-actions sp-actions--sticky" style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            className="sp-btn sp-btn--secondary"
            onClick={() => goToStep('vehicle')}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Vehicle
          </button>

          <button
            className="sp-btn sp-btn--primary"
            onClick={handleContinue}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSaving ? (
              <>
                <span className="sp-btn-spinner" />
                Saving...
              </>
            ) : (
              <>
                Continue to Payment
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}