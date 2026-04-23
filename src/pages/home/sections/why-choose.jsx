// src/pages/home/sections/why-choose.jsx
import React from 'react';
import './why-choose.css';

const WhyChoose = () => {
  return (
    <section className="why-choose-section">
      <div className="container">
        <h2>Why Choose Guga</h2>
        <div className="why-choose-content">
          <p>Your trusted shipping partner</p>
          {/* Add your actual content here */}
        </div>
      </div>
    </section>
  );
};

// THIS IS THE FIX - Add default export
export default WhyChoose;