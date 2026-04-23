// src/components/ui/skeleton.jsx
import React from 'react';

const Skeleton = ({ width, height, variant = 'text', className = '' }) => {
  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%')
  };

  return (
    <div 
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
    />
  );
};

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <Skeleton height="200px" variant="rectangular" />
    <div className="skeleton-card-content">
      <Skeleton width="60%" height="24px" />
      <Skeleton width="100%" height="16px" />
      <Skeleton width="80%" height="16px" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <div className="skeleton-row">
    <Skeleton width="40px" height="40px" variant="circular" />
    <div className="skeleton-row-content">
      <Skeleton width="30%" />
      <Skeleton width="50%" />
    </div>
  </div>
);

export default Skeleton;