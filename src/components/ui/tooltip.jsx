// src/components/ui/tooltip.jsx
import React, { useState } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="tooltip-wrapper">
      <div
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`tooltip tooltip-${position}`}>
          {content}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

export default Tooltip;