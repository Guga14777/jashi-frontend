// ============================================================
// FILE: src/pages/shipment-details/shipment-details.jsx
// ✅ UPDATED: 4-step status flow + uses existing sd- CSS classes
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { downloadBol } from '../../services/booking.api';
import './shipment-details.css';

// Icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LoaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sd-spinner">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ============================================================
// ✅ STATUS CONSTANTS - 4-step flow
// ============================================================
const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.PICKED_UP]: 'In Transit',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
};

// ✅ Normalize status to 4-step flow
const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  const s = status.toLowerCase();
  
  if (['waiting', 'pending', 'booked', 'scheduled'].includes(s)) {
    return SHIPMENT_STATUS.SCHEDULED;
  }
  if (['assigned', 'accepted', 'dispatched'].includes(s)) {
    return SHIPMENT_STATUS.ASSIGNED;
  }
  if (['picked_up', 'in_transit', 'pickup_complete'].includes(s)) {
    return SHIPMENT_STATUS.PICKED_UP;
  }
  if (['delivered', 'completed', 'done'].includes(s)) {
    return SHIPMENT_STATUS.DELIVERED;
  }
  
  return SHIPMENT_STATUS.SCHEDULED;
};

// Get status badge class
const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case SHIPMENT_STATUS.SCHEDULED:
      return 'status--waiting';
    case SHIPMENT_STATUS.ASSIGNED:
      return 'status--accepted';
    case SHIPMENT_STATUS.PICKED_UP:
      return 'status--transit';
    case SHIPMENT_STATUS.DELIVERED:
      return 'status--delivered';
    default:
      return 'status--waiting';
  }
};

// ============================================================
// MAIN SHIPMENT DETAILS COMPONENT
// ============================================================
const ShipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingBol, setDownloadingBol] = useState(false);

  // Fetch shipment details
  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/bookings/${id}`);
      const data = response.data?.booking || response.data;
      setShipment(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching shipment:', err);
      setError('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  // Parse JSON safely
  const safeParseJson = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  // Build address string
  const buildAddress = (addressData) => {
    if (!addressData) return 'N/A';
    const parsed = safeParseJson(addressData);
    return [
      parsed.city,
      parsed.state,
      parsed.zip
    ].filter(Boolean).join(', ');
  };

  // Get pickup/dropoff type
  const getLocationType = (type) => {
    if (!type) return '';
    const typeMap = {
      'residential': 'Residential',
      'business': 'Business',
      'dealer': 'Dealer',
      'auction': 'Auction',
      'port': 'Port',
    };
    return typeMap[type.toLowerCase()] || type;
  };

  // Download BOL
  const handleDownloadBol = async () => {
    if (!shipment?.id) return;
    
    setDownloadingBol(true);
    try {
      const token = localStorage.getItem('token');
      await downloadBol(shipment.id, token, shipment.orderNumber);
    } catch (err) {
      console.error('Error downloading BOL:', err);
      alert('Failed to download BOL');
    } finally {
      setDownloadingBol(false);
    }
  };

  // Download gate pass
  const handleDownloadGatePass = async (gatePassUrl, filename) => {
    try {
      const link = document.createElement('a');
      link.href = gatePassUrl;
      link.download = filename || 'gate-pass';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading gate pass:', err);
    }
  };

  if (loading) {
    return (
      <div className="sd-page">
        <div className="sd-loading">
          <LoaderIcon />
          <p>Loading shipment details...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="sd-page">
        <div className="sd-error">
          <AlertCircleIcon />
          <h2>{error || 'Shipment not found'}</h2>
          <p>Unable to load shipment details</p>
          <button className="sd-btn sd-btn--primary" onClick={() => navigate('/dashboard/shipments')}>
            Back to Shipments
          </button>
        </div>
      </div>
    );
  }

  const vehicleDetails = safeParseJson(shipment.vehicleDetails);
  const pickup = safeParseJson(shipment.pickup);
  const dropoff = safeParseJson(shipment.dropoff);
  const normalizedStatus = normalizeStatus(shipment.status);
  const statusLabel = STATUS_LABELS[normalizedStatus];

  return (
    <div className="sd-page">
      {/* Header */}
      <div className="sd-header">
        <button className="sd-back-btn" onClick={() => navigate('/dashboard/shipments')}>
          <ArrowLeftIcon />
          Back to Shipments
        </button>
        
        <div className="sd-header-content">
          <div className="sd-header-title">
            <h1>Shipment Details</h1>
            <span className="sd-order-badge">#{shipment.orderNumber}</span>
          </div>
          <span className={`sd-status-badge ${getStatusClass(shipment.status)}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="sd-content">
        <div className="sd-grid">
          {/* Route Card */}
          <div className="sd-card sd-route-card">
            <h3 className="sd-card-title">
              <MapPinIcon /> Route
            </h3>
            <div className="sd-route">
              <div className="sd-route-point">
                <div className="sd-route-marker sd-route-marker--pickup"></div>
                <div className="sd-route-details">
                  <span className="sd-route-label">Pickup</span>
                  <span className="sd-route-address">{buildAddress(pickup)}</span>
                  {shipment.pickupOriginType && (
                    <span className="sd-route-type">
                      <TruckIcon /> {getLocationType(shipment.pickupOriginType)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="sd-route-line">
                <span className="sd-route-distance">{shipment.miles || 0} mi</span>
              </div>
              
              <div className="sd-route-point">
                <div className="sd-route-marker sd-route-marker--dropoff"></div>
                <div className="sd-route-details">
                  <span className="sd-route-label">Drop-off</span>
                  <span className="sd-route-address">{buildAddress(dropoff)}</span>
                  {shipment.dropoffDestinationType && (
                    <span className="sd-route-type">
                      <TruckIcon /> {getLocationType(shipment.dropoffDestinationType)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="sd-card">
            <h3 className="sd-card-title">
              <CalendarIcon /> Schedule
            </h3>
            <div className="sd-info-grid">
              <div className="sd-info-item">
                <span className="sd-info-label">Pickup Date</span>
                <span className="sd-info-value">{formatDate(shipment.pickupDate)}</span>
                {(shipment.pickupWindowStart || shipment.pickupWindowEnd) && (
                  <span className="sd-info-time">
                    <ClockIcon /> {shipment.pickupWindowStart || ''} - {shipment.pickupWindowEnd || ''}
                  </span>
                )}
              </div>
              <div className="sd-info-item">
                <span className="sd-info-label">Drop-off Date</span>
                <span className="sd-info-value">{formatDate(shipment.dropoffDate)}</span>
                {(shipment.dropoffWindowStart || shipment.dropoffWindowEnd) && (
                  <span className="sd-info-time">
                    <ClockIcon /> {shipment.dropoffWindowStart || ''} - {shipment.dropoffWindowEnd || ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Card */}
          <div className="sd-card">
            <h3 className="sd-card-title">
              <TruckIcon /> Vehicle
            </h3>
            <div className="sd-info-grid">
              <div className="sd-info-item">
                <span className="sd-info-label">Vehicle</span>
                <span className="sd-info-value">
                  {`${vehicleDetails.year || ''} ${vehicleDetails.make || ''} ${vehicleDetails.model || ''}`.trim() || shipment.vehicle}
                </span>
              </div>
              <div className="sd-info-item">
                <span className="sd-info-label">Type</span>
                <span className="sd-info-value">{shipment.vehicleType || vehicleDetails.type || 'Sedan'}</span>
              </div>
              <div className="sd-info-item">
                <span className="sd-info-label">Transport</span>
                <span className="sd-info-value">{shipment.transportType || 'Open'}</span>
              </div>
              {vehicleDetails.vin && (
                <div className="sd-info-item">
                  <span className="sd-info-label">VIN</span>
                  <span className="sd-info-value" style={{ fontFamily: 'monospace' }}>{vehicleDetails.vin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price Card */}
          <div className="sd-card">
            <h3 className="sd-card-title">
              <DollarIcon /> Payment
            </h3>
            <div className="sd-price-display">
              <span className="sd-price-amount">{formatCurrency(shipment.price)}</span>
              {shipment.miles > 0 && (
                <span className="sd-price-per-mile">
                  ${(shipment.price / shipment.miles).toFixed(2)}/mi
                </span>
              )}
            </div>
          </div>

          {/* Documents Card */}
          <div className="sd-card">
            <h3 className="sd-card-title">
              <FileTextIcon /> Documents
            </h3>
            <div className="sd-documents">
              <div className="sd-doc-item">
                <span className="sd-doc-label">Bill of Lading (BOL)</span>
                <button 
                  className="sd-doc-download"
                  onClick={handleDownloadBol}
                  disabled={downloadingBol}
                >
                  <DownloadIcon />
                  {downloadingBol ? 'Downloading...' : 'Download'}
                </button>
              </div>
              
              {shipment.auctionGatePass && (
                <div className="sd-doc-item">
                  <span className="sd-doc-label">Pickup Gate Pass</span>
                  <button 
                    className="sd-doc-download"
                    onClick={() => handleDownloadGatePass(shipment.auctionGatePass, 'pickup-gate-pass')}
                  >
                    <DownloadIcon />
                    Download
                  </button>
                </div>
              )}
              
              {shipment.dropoffAuctionGatePass && (
                <div className="sd-doc-item">
                  <span className="sd-doc-label">Drop-off Gate Pass</span>
                  <button 
                    className="sd-doc-download"
                    onClick={() => handleDownloadGatePass(shipment.dropoffAuctionGatePass, 'dropoff-gate-pass')}
                  >
                    <DownloadIcon />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes Card */}
          {(shipment.notes || shipment.customerInstructions || shipment.instructions) && (
            <div className="sd-card">
              <h3 className="sd-card-title">
                <FileTextIcon /> Notes
              </h3>
              <p className="sd-notes">
                {shipment.notes || shipment.customerInstructions || shipment.instructions}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetails;