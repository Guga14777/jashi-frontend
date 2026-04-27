// ============================================================
// FILE: src/components/load-details/components/route-vehicle-card.jsx
// Route info, vehicle details, schedule, and locations
// ============================================================

import React, { useState } from 'react';
import { ClockIcon, LocationTypeIcon, CarIcon, ChevronUpIcon, ChevronDownIcon, DownloadIcon } from './icons';
import { capitalize, formatAddr, formatLocationType } from '../utils/formatters';
import { formatDate } from '../../../utils/formatters';
import { fetchDownloadUrl } from '../../../services/documents.api';
import { useAuth } from '../../../store/auth-context.jsx';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../lib/api-url.js';

// Time pill component
const TimePill = ({ time }) => time ? (
  <span className="ldm-time"><ClockIcon />{time}</span>
) : null;

// Location type badge
const LocationTypeBadge = ({ type }) => {
  if (!type) return null;
  
  const getTypeClass = () => {
    const t = type.toLowerCase();
    if (t.includes('auction')) return 'ldm-location-type--auction';
    if (t.includes('dealership')) return 'ldm-location-type--dealership';
    return 'ldm-location-type--private';
  };
  
  return (
    <span className={`ldm-location-type ${getTypeClass()}`}>
      <LocationTypeIcon />
      {type}
    </span>
  );
};

// Document link component.
//
// Rendered as a <button>, NOT an <a>. See the matching comment in
// documents-panel.jsx for the full reasoning — short version: an
// anchor tag let middle-click / right-click bypass the auth-injecting
// onClick handler, which sent users to the SPA fallback and then to
// /dashboard. A button has no href and no default navigation.
const DocLink = ({ doc, label }) => {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);

  if (!doc) return null;

  // Pre-uploaded/stub docs without an id sometimes carry a direct
  // fileUrl. Those don't need the URL handshake.
  const directUrl = !doc.id
    ? (() => {
        const u = doc.fileUrl || doc.filePath;
        if (!u) return null;
        return u.startsWith('http') ? u : `${API_BASE}${u}`;
      })()
    : null;

  if (!doc.id && !directUrl) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const url = directUrl
        ? directUrl
        : await fetchDownloadUrl(doc.id, token);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        alert('Your browser blocked the popup. Please allow popups for this site and try again.');
      }
    } catch (err) {
      console.error('[DocLink] download failed:', err);
      alert(`Could not open document: ${err.message || 'unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ldm-doc-link"
      aria-busy={pending}
      disabled={pending}
    >
      <DownloadIcon />{label}
    </button>
  );
};

// Route and Vehicle Card (for single vehicle)
export const RouteVehicleCard = ({ from, to, miles, vehicle, transport }) => {
  return (
    <div className="ldm-section">
      <div className="ldm-grid ldm-grid--2">
        <div className="ldm-box">
          <div className="ldm-section-label">Route</div>
          <div className="ldm-grid ldm-grid--route">
            <div className="ldm-field">
              <span className="ldm-field__label">From</span>
              <span className="ldm-field__value">{from}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">To</span>
              <span className="ldm-field__value">{to}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Distance</span>
              <span className="ldm-field__value">{miles > 0 ? `${miles.toLocaleString()} mi` : '—'}</span>
            </div>
          </div>
        </div>
        <div className="ldm-box">
          <div className="ldm-section-label">Vehicle</div>
          <div className="ldm-grid ldm-grid--2">
            <div className="ldm-field">
              <span className="ldm-field__label">Year</span>
              <span className="ldm-field__value">{vehicle.year || '—'}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Make</span>
              <span className="ldm-field__value">{capitalize(vehicle.make) || '—'}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Model</span>
              <span className="ldm-field__value">{capitalize(vehicle.model) || '—'}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Type</span>
              <span className="ldm-field__value">{capitalize(vehicle.type) || '—'}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Condition</span>
              <span className="ldm-field__value">{vehicle.condition || '—'}</span>
            </div>
            <div className="ldm-field">
              <span className="ldm-field__label">Transport</span>
              <span className="ldm-field__value">{transport}</span>
            </div>
            {vehicle.vin && (
              <div className="ldm-field ldm-field--full">
                <span className="ldm-field__label">VIN</span>
                <span className="ldm-field__value ldm-field__value--mono">{vehicle.vin}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Schedule Card
export const ScheduleCard = ({ dates, times, pickupAt, deliveredAt }) => {
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Schedule</div>
      <div className="ldm-box ldm-grid ldm-grid--2">
        <div className="ldm-field">
          <span className="ldm-field__label">Pickup</span>
          <div className="ldm-schedule-value">
            <span className="ldm-field__value">{dates.pickup ? formatDate(dates.pickup) : '—'}</span>
            <TimePill time={times.pickup} />
          </div>
          {pickupAt && (
            <span className="ldm-field__sub ldm-timestamp">
              Picked up: {formatDate(pickupAt)}
            </span>
          )}
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Drop-off</span>
          <div className="ldm-schedule-value">
            <span className="ldm-field__value">{dates.dropoff ? formatDate(dates.dropoff) : '—'}</span>
            <TimePill time={times.dropoff} />
          </div>
          {deliveredAt && (
            <span className="ldm-field__sub ldm-timestamp">
              Delivered: {formatDate(deliveredAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Locations Card (for single vehicle).
// A gate pass row only renders when BOTH conditions hold for that
// stage: the location is an auction or dealership AND a real gate pass
// document exists for that stage. Residences never need a gate pass,
// so we don't show a "Gate Pass" button on a private/residential
// pickup card even if a doc was somehow miswired into the wrong side.
const isGatePassEligibleLocation = (locationType) => {
  if (!locationType) return false;
  const t = String(locationType).toLowerCase();
  return t.includes('auction') || t.includes('dealer');
};

export const LocationsCard = ({ pickup, dropoff, locationTypes, showGatePass, pickupGatePass, dropoffGatePass, isPreviewOnly }) => {
  const showPickupGatePass =
    showGatePass &&
    !!pickupGatePass &&
    isGatePassEligibleLocation(locationTypes.pickup);
  const showDropoffGatePass =
    showGatePass &&
    !!dropoffGatePass &&
    isGatePassEligibleLocation(locationTypes.dropoff);

  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Locations</div>
      <div className="ldm-grid ldm-grid--2">
        <div className="ldm-box">
          <div className="ldm-field">
            <span className="ldm-field__label">Pickup</span>
            <span className="ldm-field__value">{formatAddr(pickup)}</span>
          </div>
          {locationTypes.pickup && (
            <div className="ldm-location-type-row">
              <LocationTypeBadge type={locationTypes.pickup} />
            </div>
          )}
          {!isPreviewOnly && (pickup?.phone || pickup?.contact?.phone) && (
            <div className="ldm-field" style={{ marginTop: 6 }}>
              <a href={`tel:${pickup?.phone || pickup?.contact?.phone}`} className="ldm-link">
                {pickup?.phone || pickup?.contact?.phone}
              </a>
            </div>
          )}
          {showPickupGatePass && <DocLink doc={pickupGatePass} label="Gate Pass" />}
        </div>
        <div className="ldm-box">
          <div className="ldm-field">
            <span className="ldm-field__label">Drop-off</span>
            <span className="ldm-field__value">{formatAddr(dropoff)}</span>
          </div>
          {locationTypes.dropoff && (
            <div className="ldm-location-type-row">
              <LocationTypeBadge type={locationTypes.dropoff} />
            </div>
          )}
          {!isPreviewOnly && (dropoff?.phone || dropoff?.contact?.phone) && (
            <div className="ldm-field" style={{ marginTop: 6 }}>
              <a href={`tel:${dropoff?.phone || dropoff?.contact?.phone}`} className="ldm-link">
                {dropoff?.phone || dropoff?.contact?.phone}
              </a>
            </div>
          )}
          {showDropoffGatePass && <DocLink doc={dropoffGatePass} label="Gate Pass" />}
        </div>
      </div>
    </div>
  );
};

// Multi-Vehicle Route Summary Card
export const RouteSummaryCard = ({ from, to, miles, transport, pickupStopsCount, dropoffStopsCount }) => {
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Route Summary</div>
      <div className="ldm-box ldm-grid ldm-grid--3">
        <div className="ldm-field">
          <span className="ldm-field__label">From</span>
          <span className="ldm-field__value">{from}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">To</span>
          <span className="ldm-field__value">{to}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Distance</span>
          <span className="ldm-field__value">{miles > 0 ? `${miles.toLocaleString()} mi` : '—'}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Transport</span>
          <span className="ldm-field__value">{transport}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Pickup Stops</span>
          <span className="ldm-field__value">{pickupStopsCount || 1}</span>
        </div>
        <div className="ldm-field">
          <span className="ldm-field__label">Dropoff Stops</span>
          <span className="ldm-field__value">{dropoffStopsCount || 1}</span>
        </div>
      </div>
    </div>
  );
};

// Vehicle Card for multi-vehicle
export const VehicleCard = ({ vehicle, index, showGatePass = true }) => {
  const [expanded, setExpanded] = useState(false);
  
  const vehicleName = [vehicle.year, capitalize(vehicle.make), capitalize(vehicle.model)].filter(Boolean).join(' ') || `Vehicle ${index + 1}`;
  const isOperable = vehicle.operable?.toString().toLowerCase() === 'yes' || 
                     vehicle.operable === true || 
                     vehicle.operable === 'true';
  
  const pickupStop = vehicle.pickupStop;
  const dropoffStop = vehicle.dropoffStop;
  const pickupGatePass = vehicle.pickupGatePass;
  const dropoffGatePass = vehicle.dropoffGatePass;
  
  return (
    <div className={`ldm-vehicle-card ${expanded ? 'ldm-vehicle-card--expanded' : ''}`}>
      <div className="ldm-vehicle-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="ldm-vehicle-card__index">{index + 1}</div>
        <div className="ldm-vehicle-card__info">
          <span className="ldm-vehicle-card__name">{vehicleName}</span>
          <div className="ldm-vehicle-card__meta">
            {vehicle.vin && <span className="ldm-vehicle-card__vin">VIN: {vehicle.vin}</span>}
            <span className={`ldm-vehicle-card__condition ${isOperable ? 'ldm-vehicle-card__condition--operable' : 'ldm-vehicle-card__condition--inoperable'}`}>
              {isOperable ? 'Operable' : 'Inoperable'}
            </span>
          </div>
        </div>
        <div className="ldm-vehicle-card__toggle">
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </div>
      
      {expanded && (
        <div className="ldm-vehicle-card__details">
          {pickupStop && (
            <div className="ldm-vehicle-card__stop ldm-vehicle-card__stop--pickup">
              <div className="ldm-vehicle-card__stop-header">
                <span className="ldm-vehicle-card__stop-badge ldm-vehicle-card__stop-badge--pickup">Pickup</span>
                {pickupStop.locationType && (
                  <LocationTypeBadge type={formatLocationType(pickupStop.locationType)} />
                )}
              </div>
              <div className="ldm-vehicle-card__stop-address">
                <LocationTypeIcon />
                <span>{formatAddr(pickupStop)}</span>
              </div>
              {pickupStop.auctionName && (
                <div className="ldm-vehicle-card__auction">
                  <strong>{pickupStop.auctionName}</strong>
                  {pickupStop.auctionBuyerNumber && <span>Buyer #: {pickupStop.auctionBuyerNumber}</span>}
                </div>
              )}
              {pickupStop.contactFirstName && (
                <div className="ldm-vehicle-card__contact">
                  {pickupStop.contactFirstName} {pickupStop.contactLastName}
                  {pickupStop.contactPhone && <span> • {pickupStop.contactPhone}</span>}
                </div>
              )}
            </div>
          )}
          
          {dropoffStop && (
            <div className="ldm-vehicle-card__stop ldm-vehicle-card__stop--dropoff">
              <div className="ldm-vehicle-card__stop-header">
                <span className="ldm-vehicle-card__stop-badge ldm-vehicle-card__stop-badge--dropoff">Dropoff</span>
                {dropoffStop.locationType && (
                  <LocationTypeBadge type={formatLocationType(dropoffStop.locationType)} />
                )}
              </div>
              <div className="ldm-vehicle-card__stop-address">
                <LocationTypeIcon />
                <span>{formatAddr(dropoffStop)}</span>
              </div>
              {dropoffStop.auctionName && (
                <div className="ldm-vehicle-card__auction">
                  <strong>{dropoffStop.auctionName}</strong>
                  {dropoffStop.auctionBuyerNumber && <span>Buyer #: {dropoffStop.auctionBuyerNumber}</span>}
                </div>
              )}
              {dropoffStop.contactFirstName && (
                <div className="ldm-vehicle-card__contact">
                  {dropoffStop.contactFirstName} {dropoffStop.contactLastName}
                  {dropoffStop.contactPhone && <span> • {dropoffStop.contactPhone}</span>}
                </div>
              )}
            </div>
          )}
          
          {showGatePass && (pickupGatePass || dropoffGatePass) && (
            <div className="ldm-vehicle-card__gatepasses">
              {pickupGatePass && (
                <DocLink doc={pickupGatePass} label="Pickup Gate Pass" />
              )}
              {dropoffGatePass && (
                <DocLink doc={dropoffGatePass} label="Dropoff Gate Pass" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Multi-Vehicle Section
export const MultiVehicleSection = ({ vehicles, showGatePass = true }) => {
  if (!vehicles || vehicles.length === 0) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">
        <CarIcon />
        <span style={{ marginLeft: 6 }}>Vehicles ({vehicles.length})</span>
      </div>
      <div className="ldm-vehicle-list">
        {vehicles.map((vehicle, index) => (
          <VehicleCard
            key={vehicle.id || index}
            vehicle={vehicle}
            index={vehicle.vehicleIndex ?? index}
            showGatePass={showGatePass}
          />
        ))}
      </div>
    </div>
  );
};

// Notes Card
export const NotesCard = ({ notes }) => {
  const hasNotes = notes.general || notes.pickup || notes.dropoff;
  if (!hasNotes) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Notes</div>
      <div className="ldm-box">
        {notes.general && <p className="ldm-notes-text">{notes.general}</p>}
        {notes.pickup && (
          <div className="ldm-notes-sub">
            <div className="ldm-notes-sub-label">Pickup</div>
            <p className="ldm-notes-text">{notes.pickup}</p>
          </div>
        )}
        {notes.dropoff && (
          <div className="ldm-notes-sub">
            <div className="ldm-notes-sub-label">Drop-off</div>
            <p className="ldm-notes-text">{notes.dropoff}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { TimePill, LocationTypeBadge, DocLink };
