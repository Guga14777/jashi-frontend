// src/components/ui/badge.jsx
import React from 'react';
import './badge.css';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'medium',
  invert = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'badge-sm',
    small: 'badge-sm',
    medium: 'badge-md',
    md: 'badge-md',
    large: 'badge-lg',
    lg: 'badge-lg'
  };

  const variantClasses = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
    danger: 'badge-danger',
    neutral: 'badge-neutral'
  };

  const classes = [
    'badge',
    sizeClasses[size] || 'badge-md',
    variantClasses[variant] || 'badge-default',
    invert ? 'badge-invert' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} data-invert={invert}>
      {children}
    </span>
  );
};

export default Badge;