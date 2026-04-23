import React from 'react';
import './password-rules.css';

// Simplified password rules component - just shows helper text inline
const PasswordRules = () => {
  return (
    <div className="password-helper">
      <span className="helper-text">
        8+ chars, uppercase, lowercase, number, special character
      </span>
    </div>
  );
};

export default PasswordRules;