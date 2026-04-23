import React from 'react';
import './form-section.css';

const FormSection = ({ title, children, className = '' }) => {
  return (
    <div className={`form-section ${className}`}>
      {title && <h3 className="form-section-title">{title}</h3>}
      <div className="form-section-content">
        {children}
      </div>
    </div>
  );
};

export default FormSection;