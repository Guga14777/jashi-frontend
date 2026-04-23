// ============================================================
// FILE: src/components/booking/steps-nav.jsx
// ✅ FIXED: Updated to use "confirm" route instead of "schedule"
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import './steps-nav.css';

export default function StepsNav({ steps = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ FIXED: Determine current step index based on route
  const getCurrentStepIndex = () => {
    const path = location.pathname;
    if (path.includes('/payment')) return 5;
    if (path.includes('/confirm')) return 4;
    if (path.includes('/vehicle')) return 3;
    if (path.includes('/dropoff')) return 2;
    if (path.includes('/pickup')) return 1;
    return 0; // offer
  };

  const currentStepIndex = getCurrentStepIndex();
  
  // ✅ FIXED: Updated step paths - confirm instead of schedule
  const stepPaths = [
    '/shipper/offer',
    '/shipper/pickup',
    '/shipper/dropoff',
    '/shipper/vehicle',
    '/shipper/confirm',
    '/shipper/payment'
  ];

  const handleStepClick = (index) => {
    const searchParams = new URLSearchParams(location.search);
    const quoteId = searchParams.get('quoteId');
    const draftId = searchParams.get('draftId');
    
    const targetPath = stepPaths[index];
    const params = new URLSearchParams();
    if (quoteId) params.set('quoteId', quoteId);
    if (draftId) params.set('draftId', draftId);
    
    const url = params.toString() ? `${targetPath}?${params.toString()}` : targetPath;
    
    console.log('🔄 StepsNav navigating to:', url);
    navigate(url);
  };

  // Determine step status: completed (before current), active (current), upcoming (after current)
  const getStepStatus = (index) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="steps-nav-container">
      <div className="steps-nav">
        {steps.map((step, index) => {
          const status = getStepStatus(index);

          return (
            <button
              key={step}
              type="button"
              className={`step-chip step--${status}`}
              onClick={() => handleStepClick(index)}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <span className="step-index">
                {status === 'completed' ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="step-label">{step}</span>
            </button>
          );
        })}
      </div>
      <div className="step-progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={currentStepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        />
      </div>
    </div>
  );
}