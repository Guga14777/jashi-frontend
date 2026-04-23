// src/pages/home/sections/cta-section.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './cta-section.css';

function CTASection() {
  return (
    <section className="cta-section gradient-band">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Ship Smarter?</h2>
          <p className="cta-subtitle">
            Set your price, see dispatch likelihood, and book with our 3% fee.
          </p>
          <Link to="/quote" className="btn cta-button">
            Start Your Quote
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTASection;