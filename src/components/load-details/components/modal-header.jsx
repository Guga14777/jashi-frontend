// ============================================================
// FILE: src/components/load-details/components/modal-header.jsx
// Modal header with title, order badge, status, and close button
// ✅ UPDATED: Clean icon close button design
// ============================================================

import React from 'react';
import { CarIcon } from './icons';

// Clean X icon for close button
const CloseIcon = () => (
  <svg 
    width="18" 
    height="18" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ModalHeader = ({
  isQuote,
  orderNum,
  loadId,
  isMultiVehicle,
  vehicleCount,
  statusDisplay,
  isPreviewOnly,
  onClose,
  closeButtonRef,
}) => {
  return (
    <div className="ldm-header">
      <div className="ldm-header__left">
        <h2 id="ldm-title" className="ldm-title">
          {isQuote ? 'Quote Details' : 'Shipment Details'}
        </h2>
        <span className="ldm-order-badge">
          #{orderNum || loadId?.slice(-6) || '—'}
        </span>
        {isMultiVehicle && (
          <span className="ldm-multi-vehicle-badge">
            <CarIcon />
            {vehicleCount} Vehicles
          </span>
        )}
      </div>
      <div className="ldm-header__right">
        {!isPreviewOnly && statusDisplay && (
          <span className={`ldm-status-badge ${statusDisplay.className || ''}`}>
            {statusDisplay.label}
          </span>
        )}
        <button 
          ref={closeButtonRef}
          className="ldm-close" 
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

export default ModalHeader;