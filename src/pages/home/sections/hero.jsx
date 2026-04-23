// src/pages/home/sections/hero.jsx
import React from 'react';
import './hero.css';

function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-headline">
            Ship Your Vehicle with <span className="hero-highlight">Complete Control</span>
          </h1>
          
          <p className="hero-subtitle">
            <span className="subtitle-highlight">Revolutionary 3%</span> platform fee — <span className="subtitle-highlight">Set Your Own Price</span> and see dispatch probability in real time.
          </p>
        </div>
        
        {/* ADDED: Spacer div to create additional separation if needed */}
        <div className="hero-spacer" aria-hidden="true"></div>
      </div>
    </section>
  );
}

export default Hero;