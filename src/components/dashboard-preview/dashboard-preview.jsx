// src/pages/home/sections/dashboard-preview-section.jsx
import React from 'react';
import DashboardPreview from '../../../components/dashboard-preview/dashboard-preview';
import './dashboard-preview-section.css';

const DashboardPreviewSection = () => {
  return (
    <section id="dashboard" className="dashboard-preview-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Powerful Dashboard at Your Fingertips</h2>
          <p className="section-subtitle">
            Manage all your shipping operations from one intuitive platform
          </p>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
};

export default DashboardPreviewSection;