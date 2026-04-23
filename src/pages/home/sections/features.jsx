import React from 'react';
import './features.css';
import { FaHandshake, FaDollarSign, FaHeadset, FaMapMarkerAlt } from 'react-icons/fa';

const ModernFeatures = () => {
  const features = [
    {
      id: 1,
      icon: <FaHandshake />,
      title: 'Direct Driver Access',
      description: 'Talk directly with your carrier — no brokers, no hidden fees. Enjoy simple, transparent communication and get updates straight from the driver.'
    },
    {
      id: 2,
      icon: <FaDollarSign />,
      title: 'Set Your Price',
      description: 'You\'re in control — set the price you want to pay and instantly see dispatch odds. Transparent, flexible, and budget-friendly every step of the way.'
    },
    {
      id: 3,
      icon: <FaHeadset />,
      title: 'Dedicated Support',
      description: 'Our team is available 7 days a week via phone, email, or chat. Friendly, fast, and always ready to help you ship with confidence and ease.'
    },
    {
      id: 4,
      icon: <FaMapMarkerAlt />,
      title: 'Live Tracking',
      description: 'Track your shipment in real time from pickup through delivery. Stay informed with instant notifications so you always know where your vehicle is.'
    }
  ];

  return (
    <section className="modern-feature-section">
      <div className="modern-container">
        <div className="modern-hero-section">
          <h2 className="modern-hero-title">Revolutionizing Car Shipping</h2>
          <p className="modern-hero-subtitle">The first U.S. platform where you control your price.</p>
          <p className="modern-hero-highlight">Just 3% fee — the lowest in the industry.</p>
        </div>

        <div className="modern-value-bar">
          <span>Save</span>
          <span className="modern-accent">80%</span>
          <span>on fees compared to traditional brokers</span>
          <span className="modern-separator">•</span>
          <span>Keep more money in your pocket</span>
        </div>

        <div className="feature-strip">
          {features.map((feature) => (
            <div key={feature.id} className="feature-tile">
              <div className="feature-content">
                <div className="feature-header">
                  <div className="feature-icon">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                </div>
                <p className="feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModernFeatures;