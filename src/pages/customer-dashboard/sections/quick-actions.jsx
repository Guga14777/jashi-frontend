// src/pages/customer-dashboard/sections/quick-actions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './quick-actions.css';

const QuickActions = ({ onRequestShipment }) => {
  const navigate = useNavigate();

  const handleShipVehicleClick = () => {
    window.analytics?.track?.('dashboard_ship_vehicle_clicked');
    onRequestShipment?.();
  };

  return (
    <div className="quick-actions">
      <div className="quick-actions-header">
        <h2 className="quick-actions-title">Quick Actions</h2>
        <p className="quick-actions-subtitle">Get started with your shipping needs</p>
      </div>

      <div className="actions-grid">
        {/* Primary Action - Ship My Vehicle */}
        <button 
          className="ship-vehicle-btn"
          onClick={handleShipVehicleClick}
          aria-label="Ship My Vehicle"
        >
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5" />
            </svg>
          </div>
          <div className="action-content">
            <span className="action-title">Ship My Vehicle</span>
            <span className="action-description">Get a quote and book transport</span>
          </div>
        </button>

        {/* Secondary Actions */}
        <button 
          className="action-card secondary"
          onClick={() => navigate('/customer/quotes')}
        >
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div className="action-content">
            <span className="action-title">My Quotes</span>
            <span className="action-description">View and manage quotes</span>
          </div>
        </button>

        <button 
          className="action-card secondary"
          onClick={() => navigate('/customer/shipments')}
        >
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/>
              <path d="m16 8 4-4-4-4"/>
              <path d="M20 12H4"/>
            </svg>
          </div>
          <div className="action-content">
            <span className="action-title">Track Shipments</span>
            <span className="action-description">Monitor active transports</span>
          </div>
        </button>

        <button 
          className="action-card secondary"
          onClick={() => navigate('/support')}
        >
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="action-content">
            <span className="action-title">Get Support</span>
            <span className="action-description">Contact our team</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
