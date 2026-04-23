// src/pages/misc/not-found.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page not found</h2>
        <p className="not-found-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/carrier/dashboard" className="not-found-btn">
          Go back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;