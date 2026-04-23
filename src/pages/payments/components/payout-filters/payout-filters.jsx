import React, { useState, useEffect, useRef, useMemo } from 'react';
import './payout-filters.css';

// Module-level constants to avoid re-creation
const DEFAULT_FILTERS = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },
  status: 'all',
  method: 'all',
  query: ''
};

const LABEL_MAP = {
  // Status labels
  'paid': 'Paid',
  'pending': 'Pending',
  'cancelled': 'Cancelled',
  // Method labels
  'bank_transfer': 'Bank Transfer',
  'card': 'Card',
  'check': 'Check',
  'cod': 'Cash on Delivery'
};

const PayoutFilters = ({
  value = {},
  onChange,
  onReset,
  isSticky = false,
  loading = false
}) => {
  // Use ref to ensure defaults are computed only once
  const defaultFilters = useRef(DEFAULT_FILTERS).current;
  
  // Only merge defaults if value is empty/undefined, otherwise trust value
  const currentValue = useMemo(() => {
    if (!value || Object.keys(value).length === 0) {
      return defaultFilters;
    }
    return value;
  }, [value, defaultFilters]);
  
  // Local state for search debouncing
  const [localQuery, setLocalQuery] = useState(currentValue.query || '');
  const [dateError, setDateError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  // Update local query when prop changes (avoid cursor jump)
  useEffect(() => {
    if (localQuery !== currentValue.query) {
      setLocalQuery(currentValue.query || '');
    }
  }, [currentValue.query]);

  // Validate date range
  const validateDates = (start, end) => {
    if (start && end && new Date(start) > new Date(end)) {
      setDateError('Start date must be before end date');
      return false;
    }
    setDateError('');
    return true;
  };

  // Handle field changes with validation
  const handleFieldChange = (field, fieldValue) => {
    let newValue = { ...currentValue };
    let isValid = true;
    
    if (field === 'dateRange.start') {
      newValue.dateRange = { ...newValue.dateRange, start: fieldValue };
      isValid = validateDates(fieldValue, newValue.dateRange.end);
    } else if (field === 'dateRange.end') {
      newValue.dateRange = { ...newValue.dateRange, end: fieldValue };
      isValid = validateDates(newValue.dateRange.start, fieldValue);
    } else {
      newValue[field] = fieldValue;
    }
    
    // Only call onChange if validation passes
    if (isValid) {
      onChange(newValue);
      setAnnouncement('Filters updated');
    }
  };

  // Handle search with debouncing (single source of truth)
  useEffect(() => {
    // Don't fire while loading to prevent churn
    if (loading) return;
    
    const timer = setTimeout(() => {
      if (localQuery !== currentValue.query) {
        handleFieldChange('query', localQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localQuery, loading]);

  // Handle reset - single contract with onChange
  const handleReset = () => {
    setLocalQuery('');
    setDateError('');
    onChange(defaultFilters);
    setAnnouncement('Filters reset');
    
    // Call onReset if provided for additional parent logic
    if (onReset) {
      onReset();
    }
  };

  // Clear search
  const clearSearch = () => {
    setLocalQuery('');
  };

  // Remove individual filter
  const removeFilter = (field) => {
    const newValue = { ...currentValue };
    
    if (field === 'dateRange') {
      newValue.dateRange = { ...defaultFilters.dateRange };
    } else if (field === 'query') {
      newValue.query = '';
      setLocalQuery('');
    } else {
      newValue[field] = 'all';
    }
    
    onChange(newValue);
    setAnnouncement(`Filter removed`);
  };

  // Get active filters for chips
  const getActiveFilters = () => {
    const filters = [];
    
    // Add date range chip if different from defaults
    const isDefaultDateRange = currentValue.dateRange.start === defaultFilters.dateRange.start &&
                              currentValue.dateRange.end === defaultFilters.dateRange.end;
    
    if (!isDefaultDateRange) {
      const startFormatted = formatDateForDisplay(currentValue.dateRange.start);
      const endFormatted = formatDateForDisplay(currentValue.dateRange.end);
      filters.push({ 
        field: 'dateRange', 
        label: `Date: ${startFormatted} → ${endFormatted}` 
      });
    }
    
    if (currentValue.status !== 'all') {
      filters.push({ 
        field: 'status', 
        label: `Status: ${formatLabel(currentValue.status)}` 
      });
    }
    
    if (currentValue.method !== 'all') {
      filters.push({ 
        field: 'method', 
        label: `Method: ${formatLabel(currentValue.method)}` 
      });
    }
    
    if (currentValue.query) {
      filters.push({ 
        field: 'query', 
        label: `Search: "${currentValue.query}"` 
      });
    }
    
    return filters;
  };

  // Format labels for display
  const formatLabel = (value) => {
    return LABEL_MAP[value] || value;
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Format date for display (readable format)
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Get min/max for date inputs
  const getDateConstraints = () => {
    return {
      startMax: currentValue.dateRange.end || undefined,
      endMin: currentValue.dateRange.start || undefined
    };
  };

  const { startMax, endMin } = getDateConstraints();
  const dateErrorId = dateError ? 'date-error' : undefined;

  return (
    <div className={`filters-card ${isSticky ? 'filters-card--sticky' : ''}`}>
      {loading && <div className="filters-loading-bar" aria-hidden="true" />}
      
      {/* Screen reader announcement for filter updates */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {announcement}
      </div>
      
      <div className="filters-row">
        {/* Date Range */}
        <fieldset className="filter-group filter-group--date">
          <legend className="filter-label">Date Range</legend>
          <div className="date-range-inputs">
            <label htmlFor="start-date" className="sr-only">Start date</label>
            <input
              id="start-date"
              type="date"
              className="filter-input filter-input--date"
              value={formatDateForInput(currentValue.dateRange.start)}
              max={startMax}
              onChange={(e) => handleFieldChange('dateRange.start', e.target.value)}
              disabled={loading}
              aria-describedby={dateErrorId}
              aria-label="Start date"
            />
            <span className="date-separator" aria-hidden="true">to</span>
            <label htmlFor="end-date" className="sr-only">End date</label>
            <input
              id="end-date"
              type="date"
              className="filter-input filter-input--date"
              value={formatDateForInput(currentValue.dateRange.end)}
              min={endMin}
              onChange={(e) => handleFieldChange('dateRange.end', e.target.value)}
              disabled={loading}
              aria-describedby={dateErrorId}
              aria-label="End date"
            />
          </div>
          {dateError && (
            <div id="date-error" className="filter-error" role="alert">
              {dateError}
            </div>
          )}
        </fieldset>

        {/* Status */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="status-select">Status</label>
          <select
            id="status-select"
            className="filter-input filter-select"
            value={currentValue.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Method */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="method-select">Method</label>
          <select
            id="method-select"
            className="filter-input filter-select"
            value={currentValue.method}
            onChange={(e) => handleFieldChange('method', e.target.value)}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="check">Check</option>
            <option value="cod">Cash on Delivery</option>
          </select>
        </div>

        {/* Search */}
        <div className="filter-group filter-group--search">
          <label className="filter-label" htmlFor="search-input">Search</label>
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M14 14L10.5 10.5M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5Z" 
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              id="search-input"
              type="text"
              className="filter-input filter-input--search"
              placeholder="Search reference, load..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
              disabled={loading}
              aria-label="Search payouts"
              aria-controls="payouts-table"
            />
            {localQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={clearSearch}
                disabled={loading}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" 
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <div className="filter-group filter-group--reset">
          <label className="filter-label">&nbsp;</label>
          <button
            type="button"
            className="btn-reset"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {getActiveFilters().length > 0 && (
        <div className={`filter-chips ${loading ? 'filter-chips--loading' : ''}`}>
          {getActiveFilters().map((filter) => (
            <button
              key={filter.field}
              type="button"
              className="filter-chip"
              onClick={() => removeFilter(filter.field)}
              disabled={loading}
              aria-label={`Remove ${filter.label} filter`}
            >
              <span className="chip-label">{filter.label}</span>
              <span className="chip-close" aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayoutFilters;