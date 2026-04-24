// src/pages/home/sections/how-it-works.jsx
import React from 'react';
import './how-it-works.css';

function HowItWorks() {
  const steps = [
    {
      number: '1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: 'Enter Route & Vehicle',
      description: 'ZIPs and basic vehicle info.'
    },
    {
      number: '2',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      title: 'Set Your Offer',
      description: 'We show likelihood instantly.'
    },
    {
      number: '3',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      title: 'Book Securely',
      description: 'Pay with confidence. We itemize the 6% service fee.'
    }
  ];

  return (
    <section className="how-it-works section">
      <div className="container">
        <h2 className="how-it-works-title h2">How It Works</h2>
        
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-icon-wrapper">
                <div className="step-icon">
                  {step.icon}
                </div>
                <span className="step-number">{step.number}</span>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;