// ============================================================
// FILE: src/components/load-details/components/status-stepper.jsx
// 6-step status progress bar component
// ============================================================

import React from 'react';
import { SHIPMENT_STATUS, STATUS_ORDER, normalizeStatus, getStatusStep } from '../utils/status-map';
import { CheckIcon } from './icons';

const formatTimestamp = (ts) => {
  if (!ts) return null;
  const date = new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StatusStepper = ({ status, timestamps = {} }) => {
  const normalized = normalizeStatus(status);
  
  // Don't render for cancelled
  if (normalized === SHIPMENT_STATUS.CANCELLED) {
    return null;
  }
  
  const currentStep = getStatusStep(status);
  
  const steps = [
    { key: SHIPMENT_STATUS.SCHEDULED, label: 'Scheduled', timestamp: timestamps.createdAt },
    { key: SHIPMENT_STATUS.ASSIGNED, label: 'Assigned', timestamp: timestamps.assignedAt },
    { key: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, label: 'On the Way', timestamp: timestamps.onTheWayAt },
    { key: SHIPMENT_STATUS.ARRIVED_AT_PICKUP, label: 'Arrived', timestamp: timestamps.arrivedAtPickupAt },
    { key: SHIPMENT_STATUS.PICKED_UP, label: 'Picked Up', timestamp: timestamps.pickedUpAt },
    { key: SHIPMENT_STATUS.DELIVERED, label: 'Delivered', timestamp: timestamps.deliveredAt },
  ];

  return (
    <div className="ldm-progress-bar">
      <div className="ldm-progress-steps">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          
          return (
            <React.Fragment key={step.key}>
              <div className={`ldm-progress-step ${isCompleted ? 'ldm-progress-step--completed' : ''} ${isCurrent ? 'ldm-progress-step--current' : ''} ${isUpcoming ? 'ldm-progress-step--upcoming' : ''}`}>
                <div className="ldm-progress-circle">
                  {isCompleted ? <CheckIcon /> : <span>{index + 1}</span>}
                </div>
                <div className="ldm-progress-label">{step.label}</div>
                {step.timestamp && (isCompleted || isCurrent) && (
                  <div className="ldm-progress-timestamp">{formatTimestamp(step.timestamp)}</div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`ldm-progress-line ${index < currentStep ? 'ldm-progress-line--completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StatusStepper;
