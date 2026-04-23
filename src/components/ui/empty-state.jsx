// src/components/ui/empty-state.jsx
import React from 'react';

const EmptyState = ({ 
  icon = '📦', 
  title = 'No data found', 
  message = 'There are no items to display at this time.',
  action = null 
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;