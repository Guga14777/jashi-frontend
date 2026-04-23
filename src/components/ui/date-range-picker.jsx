// ============================================================
// FILE: src/components/ui/date-range-picker.jsx
// Optional utility component for date range selection
// NOT USED in main shipper portal flow
// ============================================================

import React, { useState, useEffect } from 'react';
import './date-range-picker.css';

const DateRangePicker = ({ value, onChange, minDate, maxDate, label }) => {
  const [startDate, setStartDate] = useState(value?.start || '');
  const [endDate, setEndDate] = useState(value?.end || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (value) {
      setStartDate(value.start || '');
      setEndDate(value.end || '');
    }
  }, [value]);

  const handleStartChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    
    // ✅ Validate: end date can't be before start date
    if (endDate && newStart && newDate < new Date(newStart)) {
      setError('End date cannot be before start date');
    } else {
      setError('');
      onChange({ start: newStart, end: endDate });
    }
  };

  const handleEndChange = (e) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    
    // ✅ Validate: end date can't be before start date
    if (startDate && newEnd && new Date(newEnd) < new Date(startDate)) {
      setError('End date cannot be before start date');
    } else {
      setError('');
      onChange({ start: startDate, end: newEnd });
    }
  };

  const handleQuickSelect = (range) => {
    const today = new Date();
    let start, end;

    switch (range) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'week':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setError('');
    onChange({ start, end });
  };

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
    setError('');
    onChange({ start: '', end: '' });
  };

  return (
    <div className="date-range-picker">
      {label && <label className="drp-label">{label}</label>}
      
      <div className="date-inputs">
        <div className="date-input-wrapper">
          <label className="date-input-label">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartChange}
            min={minDate}
            max={maxDate}
            placeholder="Start date"
            className={`date-input ${error ? 'date-input--error' : ''}`}
          />
        </div>
        
        <span className="date-separator">to</span>
        
        <div className="date-input-wrapper">
          <label className="date-input-label">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndChange}
            min={startDate || minDate}
            max={maxDate}
            placeholder="End date"
            className={`date-input ${error ? 'date-input--error' : ''}`}
          />
        </div>
      </div>

      {error && (
        <div className="drp-error">
          {error}
        </div>
      )}

      <div className="quick-select">
        <button 
          type="button"
          onClick={() => handleQuickSelect('today')}
          className="quick-select-btn"
        >
          Today
        </button>
        <button 
          type="button"
          onClick={() => handleQuickSelect('week')}
          className="quick-select-btn"
        >
          Last 7 days
        </button>
        <button 
          type="button"
          onClick={() => handleQuickSelect('month')}
          className="quick-select-btn"
        >
          Last 30 days
        </button>
        {(startDate || endDate) && (
          <button 
            type="button"
            onClick={clearDates}
            className="quick-select-btn quick-select-btn--clear"
          >
            Clear
          </button>
        )}
      </div>

      {(startDate && endDate) && (
        <div className="drp-helper">
          Selected: {startDate} to {endDate}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;