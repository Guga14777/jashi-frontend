// src/components/ui/expiry-badge.jsx
import React from 'react';

const ExpiryBadge = ({ daysUntilExpiry }) => {
  if (daysUntilExpiry === null) return null;

  let badgeClass = 'expiry-badge';
  let badgeText = '';

  if (daysUntilExpiry < 0) {
    badgeClass += ' expired';
    badgeText = 'Expired';
  } else if (daysUntilExpiry === 0) {
    badgeClass += ' expiring-today';
    badgeText = 'Expires today';
  } else if (daysUntilExpiry <= 7) {
    badgeClass += ' expiring-soon';
    badgeText = `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
  } else if (daysUntilExpiry <= 30) {
    badgeClass += ' expiring';
    badgeText = `Expires in ${daysUntilExpiry} days`;
  } else {
    return null; // Don't show badge for documents expiring in more than 30 days
  }

  return (
    <span className={badgeClass}>
      {badgeText}
    </span>
  );
};

export default ExpiryBadge;