// ============================================================
// FILE: src/components/load-details/components/alerts-strip.jsx
// Status banners (on the way, arrived, delivered, cancelled)
// ============================================================

import React from 'react';
import { TruckIcon, MapPinIcon, CheckCircleIcon } from './icons';
import { formatDate } from '../../../utils/formatters';

// Cancelled notice - simple one-line
export const CancelledNotice = ({ cancelledAt }) => (
  <div className="ldm-cancelled-notice">
    Shipment cancelled{cancelledAt && ` on ${formatDate(cancelledAt)}`}
  </div>
);

// On the Way banner
export const OnTheWayBanner = ({ isCarrier, onTheWayAt, pickupTripStartedAt }) => (
  <div className="ldm-section">
    <div className="ldm-on-the-way-banner">
      <TruckIcon />
      <span>{isCarrier ? 'You are on the way to pickup' : 'Carrier is on the way to pickup'}</span>
      {(onTheWayAt || pickupTripStartedAt) && (
        <span className="ldm-on-the-way-date">
          Started: {formatDate(onTheWayAt || pickupTripStartedAt)}
        </span>
      )}
    </div>
  </div>
);

// Arrived at Pickup banner
export const ArrivedBanner = ({ isCarrier, arrivedAtPickupAt }) => (
  <div className="ldm-arrived-banner">
    <MapPinIcon />
    <span>{isCarrier ? 'You have arrived at pickup location' : 'Carrier has arrived at pickup'}</span>
    {arrivedAtPickupAt && (
      <span className="ldm-arrived-date">
        Arrived: {formatDate(arrivedAtPickupAt)}
      </span>
    )}
  </div>
);

// Delivered banner
export const DeliveredBanner = ({ deliveredAt }) => (
  <div className="ldm-section">
    <div className="ldm-delivered-banner">
      <CheckCircleIcon />
      <span>This shipment has been delivered</span>
      {deliveredAt && (
        <span className="ldm-delivered-date">
          on {formatDate(deliveredAt)}
        </span>
      )}
    </div>
  </div>
);

export default {
  CancelledNotice,
  OnTheWayBanner,
  ArrivedBanner,
  DeliveredBanner,
};
