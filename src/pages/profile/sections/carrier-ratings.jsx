import React from "react";
import "./carrier-ratings.css";

const CarrierRatings = () => {
  const rating = 4.0;
  const reviews = 128;
  const cancelRate = 2.4;

  const tier = (() => {
    if (cancelRate <= 5) return { label: "Good", cls: "good", color: "#15803D" };
    if (cancelRate <= 15) return { label: "Warning", cls: "warn", color: "#92400E" };
    return { label: "High", cls: "bad", color: "#7F1D1D" };
  })();

  const formatReviews = (n) => n.toLocaleString();

  const renderStars = () => {
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    return Array.from({ length: 5 }, (_, i) => {
      const idx = i + 1;
      if (idx <= full) return <span key={idx} className="cr-star filled">★</span>;
      if (idx === full + 1 && half) return <span key={idx} className="cr-star half">★</span>;
      return <span key={idx} className="cr-star empty">★</span>;
    });
  };

  const C = 314.16;
  const pct = Math.min(cancelRate, 100);

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Carrier Ratings</h2>
      </div>

      <div className="cr-grid">
        <div className="cr-card">
          <div className="cr-card-header">
            <h3 className="cr-card-title">Overall Rating</h3>
            <span className="cr-badge">{formatReviews(reviews)} reviews</span>
          </div>
          <div className="cr-stars-row">
            <div className="cr-stars-container">{renderStars()}</div>
            <span className="cr-rating-number">{rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="cr-card cr-card--cancel">
          <div className="cr-card-header">
            <h3 className="cr-card-title">Cancellation Rate</h3>
            <span className={`cr-indicator ${tier.cls}`}>{tier.label}</span>
          </div>

          <div className="cr-metric">
            <div className="cr-meter">
              <svg width="120" height="120" className="cr-meter-svg" aria-hidden="true">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={tier.color} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * C} ${C}`}
                  className="cr-progress-circle"
                />
              </svg>
              <div className="cr-meter-center">
                <span className="cr-meter-value">{cancelRate}%</span>
              </div>
            </div>
            <p className="cr-meter-caption">Overall cancellation rate for the carrier</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrierRatings;