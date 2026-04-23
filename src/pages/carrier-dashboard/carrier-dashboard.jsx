// src/pages/carrier-dashboard/carrier-dashboard.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../../store/auth-context';
import AvailableLoads from './sections/available-loads';
import './carrier-dashboard.css';

const CarrierDashboard = () => {
  const { user } = useAuth();

  // Sync a CSS var with the fixed header’s height (header comes from CarrierLayout)
  useEffect(() => {
    const headerEl = document.querySelector('.car-header, .carrier-header, .site-header, .main-header');
    const setHeaderHeight = () => {
      const height = headerEl?.offsetHeight || 72;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    };

    setHeaderHeight();

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setHeaderHeight, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const welcomeName = user?.companyName || user?.firstName || 'Carrier';

  return (
    <div className="carrier-dashboard">
      <a className="skip-link" href="#main">Skip to content</a>

      {/* The fixed header, chat, and footer are provided by CarrierLayout. */}
      <div id="main" className="dashboard-container" role="main" aria-label="Carrier Dashboard">
        <div className="dashboard-header" role="region" aria-label="Welcome">
          <div className="header-content dash-welcome">
            <h1 className="dashboard-greeting">
              Welcome to your Carrier Portal, <span>{welcomeName}</span>
            </h1>
            <p className="dashboard-subtitle">Your logistics command center</p>
          </div>
        </div>

        <div className="dashboard-content">
          <AvailableLoads />
        </div>
      </div>
    </div>
  );
};

export default CarrierDashboard;
