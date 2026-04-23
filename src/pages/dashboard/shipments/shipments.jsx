// ============================================================
// FILE: src/pages/dashboard/shipments/shipments.jsx
// ✅ UPDATED: 4-step status flow with progress bar
// Status flow: Scheduled → Assigned → Picked Up → Delivered
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../store/auth-context';
import * as bookingApi from '../../../services/booking.api';
import LoadDetailsModal from '../../../components/load-details/load-details-modal';
import {
  DISPLAY_STATUS,
  DISPLAY_STATUS_LABELS,
  toDisplayStatus,
} from '../../../components/load-details/utils/status-map';
import './shipments.css';

// The progress bar only renders the 4 forward steps.
// Cancellation is handled separately in StatusBadge/progress UI.
const STATUS_ORDER = [
  DISPLAY_STATUS.WAITING,
  DISPLAY_STATUS.ASSIGNED,
  DISPLAY_STATUS.PICKED_UP,
  DISPLAY_STATUS.DELIVERED,
];

const getStatusStep = (status) => {
  const display = toDisplayStatus(status);
  if (display === DISPLAY_STATUS.CANCELLED) return -1;
  return STATUS_ORDER.indexOf(display);
};

// ✅ Status Progress Bar Component
const StatusProgressBar = ({ status, compact = false }) => {
  const currentStep = getStatusStep(status);

  const steps = [
    { key: DISPLAY_STATUS.WAITING,   label: 'Waiting',   shortLabel: 'Wait' },
    { key: DISPLAY_STATUS.ASSIGNED,  label: 'Assigned',  shortLabel: 'Assign' },
    { key: DISPLAY_STATUS.PICKED_UP, label: 'Picked Up', shortLabel: 'Pickup' },
    { key: DISPLAY_STATUS.DELIVERED, label: 'Delivered', shortLabel: 'Deliv' },
  ];
  
  return (
    <div className={`status-progress ${compact ? 'status-progress--compact' : ''}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        
        return (
          <React.Fragment key={step.key}>
            <div 
              className={`status-step ${isCompleted ? 'status-step--completed' : ''} ${isCurrent ? 'status-step--current' : ''} ${isUpcoming ? 'status-step--upcoming' : ''}`}
            >
              <div className="status-step__circle">
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="status-step__label">
                {compact ? step.shortLabel : step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`status-connector ${index < currentStep ? 'status-connector--completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ✅ Status Badge Component
const StatusBadge = ({ status }) => {
  const displayStatus = toDisplayStatus(status);
  const label = DISPLAY_STATUS_LABELS[displayStatus];

  const classMap = {
    [DISPLAY_STATUS.WAITING]:   'status-badge--scheduled',
    [DISPLAY_STATUS.ASSIGNED]:  'status-badge--assigned',
    [DISPLAY_STATUS.PICKED_UP]: 'status-badge--picked-up',
    [DISPLAY_STATUS.DELIVERED]: 'status-badge--delivered',
    [DISPLAY_STATUS.CANCELLED]: 'status-badge--cancelled',
  };

  return (
    <span className={`status-badge ${classMap[displayStatus] || 'status-badge--scheduled'}`}>
      {label}
    </span>
  );
};

export default function Shipments() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [downloadingBol, setDownloadingBol] = useState(false);

  useEffect(() => {
    async function fetchShipments() {
      try {
        console.log('📦 Fetching shipments...');
        const data = await bookingApi.listMyBookings(token);
        console.log('✅ Received data:', data);
        
        let shipmentsArray = [];
        if (Array.isArray(data)) {
          shipmentsArray = data;
        } else if (data.items && Array.isArray(data.items)) {
          shipmentsArray = data.items;
        } else if (data.bookings && Array.isArray(data.bookings)) {
          shipmentsArray = data.bookings;
        }
        
        console.log('📋 Processed shipments:', shipmentsArray);
        setShipments(shipmentsArray);
      } catch (err) {
        console.error('❌ Failed to fetch shipments:', err);
        setShipments([]);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchShipments();
    }
  }, [token]);

  const handleViewDetails = async (shipment) => {
    setLoadingDetails(true);
    setModalOpen(true);

    try {
      console.log('🔍 Fetching details for:', shipment.id);
      const data = await bookingApi.getFullBooking(shipment.id, token);
      console.log('✅ Full booking data:', data);
      
      const bookingData = data.booking || data;
      setSelectedLoad(bookingData);
    } catch (err) {
      console.error('❌ Failed to fetch full booking:', err);
      setSelectedLoad(shipment);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLoad(null);
  };

  const handleDownloadBol = async (shipment) => {
    if (!shipment?.id || downloadingBol) return;
    
    setDownloadingBol(true);
    try {
      await bookingApi.downloadBol(shipment.id, token, shipment.orderNumber);
    } catch (err) {
      console.error('❌ Failed to download BOL:', err);
      alert('Failed to download BOL. Please try again.');
    } finally {
      setDownloadingBol(false);
    }
  };

  const getOrderId = (shipment) => {
    if (shipment.orderNumber) {
      return `#${shipment.orderNumber}`;
    }
    if (shipment.ref) {
      return shipment.ref;
    }
    return shipment.id;
  };

  const getRouteDisplay = (shipment) => {
    const from = shipment.fromCity || 
                 shipment.pickup?.city || 
                 shipment.pickup?.zip || 
                 shipment.quote?.fromZip || 
                 'Origin';
    
    const to = shipment.toCity || 
               shipment.dropoff?.city || 
               shipment.dropoff?.zip || 
               shipment.quote?.toZip || 
               'Destination';
    
    return `${from} → ${to}`;
  };

  const getVehicleDisplay = (shipment) => {
    if (shipment.vehicleType) return shipment.vehicleType;
    if (shipment.vehicle) return shipment.vehicle;
    if (shipment.vehicleDetails) {
      const { year, make, model } = shipment.vehicleDetails;
      const parts = [year, make, model].filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
    }
    if (shipment.quote?.vehicle) return shipment.quote.vehicle;
    return 'Vehicle';
  };

  const getPrice = (shipment) => {
    if (shipment.price) return shipment.price;
    if (shipment.quote?.offer) return shipment.quote.offer;
    return 0;
  };

  if (loading) {
    return (
      <div className="shipments-page">
        <div className="shipments-loading">
          <div className="loading-spinner"></div>
          <p>Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shipments-page">
      <div className="shipments-header">
        <h1>Active Shipments</h1>
        <p className="shipments-subtitle">
          {shipments.length} active shipment{shipments.length !== 1 ? 's' : ''} • Page 1 of 1
        </p>
      </div>

      {shipments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No active shipments</h3>
          <p>Your shipments will appear here once you create them.</p>
        </div>
      ) : (
        <div className="shipments-table-wrapper">
          <table className="shipments-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>ROUTE</th>
                <th>VEHICLE</th>
                <th>PRICE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => {
                return (
                  <tr key={shipment.id}>
                    <td className="shipment-id">
                      <span className="id-text">{getOrderId(shipment)}</span>
                    </td>
                    <td className="shipment-route">
                      {getRouteDisplay(shipment)}
                    </td>
                    <td className="shipment-vehicle">
                      <span className="vehicle-type">{getVehicleDisplay(shipment)}</span>
                    </td>
                    <td className="shipment-price">
                      ${getPrice(shipment).toLocaleString()}
                    </td>
                    <td className="shipment-status">
                      {/* ✅ Use new StatusBadge component */}
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="shipment-actions">
                      <button
                        className="view-details-btn"
                        onClick={() => handleViewDetails(shipment)}
                        disabled={loadingDetails}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="shipments-footer-note">
        Updates are sent via email and SMS. Times are estimates and may vary.
      </p>

      {/* Load Details Modal */}
      {modalOpen && (
        <LoadDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          load={selectedLoad}
          loading={loadingDetails}
          type="booking"
          portal="shipper"
          onDownloadBol={handleDownloadBol}
          downloadingBol={downloadingBol}
        />
      )}
    </div>
  );
}

// Export components for use in other files
export { StatusProgressBar, StatusBadge, getStatusStep };