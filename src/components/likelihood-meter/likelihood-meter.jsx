import React from 'react';
import './likelihood-meter.css';

function LikelihoodMeter({ percentage }) {
  const getTier = () => {
    if (percentage >= 75) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  };

  const tier = getTier();

  const getCopy = () => {
    switch (tier) {
      case 'high':
        return {
          headline: 'Great price — carriers should accept this quickly.',
          support: 'Expect faster dispatch on this route. If timing is flexible, you can try lowering slightly and recheck.',
        };
      case 'medium':
        return {
          headline: 'Solid offer — a fair balance of speed and cost.',
          support: 'You may dispatch soon, but raising your offer can accelerate pickup during busy periods.',
        };
      case 'low':
        return {
          headline: 'Below market — consider increasing to avoid delays.',
          support: 'Raising your offer typically moves you into a higher likelihood range and shortens wait time.',
        };
      default:
        return {
          headline: 'Enter an offer to see dispatch likelihood.',
          support: 'Add route and vehicle type for a precise estimate.',
        };
    }
  };

  const copy = getCopy();

  const colorClass = tier === 'high' ? 'meter-high' : tier === 'medium' ? 'meter-medium' : 'meter-low';
  const badgeText = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';

  if (!Number.isFinite(percentage)) {
    return (
      <div className="likelihood-meter">
        <p className="meter-empty">Enter an offer to see dispatch likelihood.</p>
      </div>
    );
  }

  return (
    <div className="likelihood-meter">
      <div className="meter-header">
        <span className="meter-label">Dispatch Likelihood</span>
        <div className="meter-value">
          <span className="meter-percentage">{percentage}%</span>
          <span className={`meter-badge ${colorClass}`}>{badgeText}</span>
        </div>
      </div>

      <div className="meter-bar-container">
        <div className="meter-bar-background">
          <div className={`meter-bar-fill ${colorClass}`} style={{ width: `${Math.min(95, percentage)}%` }} />
        </div>
      </div>

      <div className="meter-copy">
        <p className="meter-headline">{copy.headline}</p>
        <p className="meter-support">{copy.support}</p>
      </div>
    </div>
  );
}

export default LikelihoodMeter;
