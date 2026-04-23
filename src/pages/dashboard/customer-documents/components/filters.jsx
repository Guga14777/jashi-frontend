import React, { useState, useEffect, useRef, useCallback } from 'react';
import './filters.css';

const CustomerDocumentsFilters = ({
  value = '',
  onChange,
  disabled = false,
  type = '',
  status = '',
  isLoading = false,
  componentId = 'custdocs' // For unique IDs across pages
}) => {
  const [searchValue, setSearchValue] = useState(value);
  const [currentType, setCurrentType] = useState(type);
  const [currentStatus, setCurrentStatus] = useState(status);
  
  const debounceRef = useRef(null);
  const announcementRef = useRef(null);
  const searchInputRef = useRef(null);
  const userInitiatedRef = useRef(false);
  const prevPropsRef = useRef({ value, type, status });

  const emitFilterChange = useCallback(() => {
    // Only emit if this was a user-initiated change
    if (!userInitiatedRef.current) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (onChange) {
        const filters = {
          search: searchValue.trim(),
          type: currentType,
          status: currentStatus
        };
        
        // Only emit if values actually changed
        const prevFilters = {
          search: prevPropsRef.current.value.trim(),
          type: prevPropsRef.current.type,
          status: prevPropsRef.current.status
        };
        
        if (JSON.stringify(filters) !== JSON.stringify(prevFilters)) {
          onChange(filters);
        }
      }
      userInitiatedRef.current = false;
    }, 300);
  }, [searchValue, currentType, currentStatus, onChange]);

  // Sync with props without triggering emissions
  useEffect(() => {
    if (value !== prevPropsRef.current.value && value !== searchValue) {
      setSearchValue(value);
    }
    if (type !== prevPropsRef.current.type && type !== currentType) {
      setCurrentType(type);
    }
    if (status !== prevPropsRef.current.status && status !== currentStatus) {
      setCurrentStatus(status);
    }
    
    prevPropsRef.current = { value, type, status };
  }, [value, type, status]);

  useEffect(() => {
    emitFilterChange();
  }, [emitFilterChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setSearchValue(nextValue);
    userInitiatedRef.current = true;
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Immediate search on Enter
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (onChange) {
        onChange({
          search: searchValue.trim(),
          type: currentType,
          status: currentStatus
        });
      }
      userInitiatedRef.current = false;
    }
  };

  const handleSearchClear = () => {
    setSearchValue('');
    userInitiatedRef.current = true;
    announceChange('Search cleared');
    
    // Return focus to search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setCurrentType('');
    setCurrentStatus('');
    userInitiatedRef.current = true;
    announceChange('All filters cleared');
    
    // Return focus to search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setCurrentType(newType);
    userInitiatedRef.current = true;
    announceChange(`Document type ${newType ? `set to ${getTypeLabel(newType)}` : 'cleared'}`);
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    userInitiatedRef.current = true;
    announceChange(`Status ${newStatus ? `set to ${getStatusLabel(newStatus)}` : 'cleared'}`);
  };

  const announceChange = (message) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      // Clear announcement after 1 second to avoid repeated reads
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const getTypeLabel = (typeValue) => {
    const typeLabels = {
      'bol': 'Bill of Lading',
      'pickup_inspection': 'Pickup Inspection',
      'delivery_pod': 'Proof of Delivery',
      'insurance': 'Insurance Certificate',
      'other': 'Other'
    };
    return typeLabels[typeValue] || typeValue;
  };

  const getStatusLabel = (statusValue) => {
    const statusLabels = {
      'provided': 'Provided',
      'pending_review': 'Pending Review',
      'rejected': 'Rejected',
      'missing': 'Missing',
      'expired': 'Expired',
      'expiring_soon': 'Expiring Soon',
      'processing': 'Processing'
    };
    return statusLabels[statusValue] || statusValue;
  };

  const showSearchClear = searchValue && searchValue.length > 0 && !disabled && !isLoading;
  const hasActiveFilters = searchValue || currentType || currentStatus;
  const isDisabled = disabled || isLoading;

  return (
    <div className={`custdocs-filters ${isDisabled ? 'custdocs-filters--disabled' : ''}`}>
      <div 
        ref={announcementRef}
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      />
      
      <div className="custdocs-filters__section">
        <label className="custdocs-label" htmlFor={`${componentId}-search`}>
          Search documents
        </label>
        <div className="custdocs-filters__search-container">
          <input
            ref={searchInputRef}
            id={`${componentId}-search`}
            type="text"
            className="custdocs-search"
            placeholder="Search by name, type, or uploader..."
            value={searchValue}
            onChange={handleInputChange}
            onKeyDown={handleSearchKeyDown}
            disabled={isDisabled}
            aria-describedby={`${componentId}-search-help`}
          />
          
          <div id={`${componentId}-search-help`} className="sr-only">
            Search documents by file name, document type, or uploader name
          </div>
          
          {showSearchClear && (
            <button
              type="button"
              className="custdocs-filters__clear-button"
              onClick={handleSearchClear}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="custdocs-filters__section">
        <label className="custdocs-label" htmlFor={`${componentId}-documentType`}>
          Document type
        </label>
        <div className="custdocs-select">
          <select
            id={`${componentId}-documentType`}
            value={currentType}
            onChange={handleTypeChange}
            disabled={isDisabled}
          >
            <option value="">All types</option>
            <option value="bol">Bill of Lading</option>
            <option value="pickup_inspection">Pickup Inspection</option>
            <option value="delivery_pod">Proof of Delivery</option>
            <option value="insurance">Insurance Certificate</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="custdocs-filters__section">
        <label className="custdocs-label" htmlFor={`${componentId}-status`}>
          Status
        </label>
        <div className="custdocs-select">
          <select
            id={`${componentId}-status`}
            value={currentStatus}
            onChange={handleStatusChange}
            disabled={isDisabled}
          >
            <option value="">All statuses</option>
            <option value="provided">Provided</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="missing">Missing</option>
            <option value="expired">Expired</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="processing">Processing</option>
          </select>
        </div>
      </div>

      <div className="custdocs-filters__section custdocs-filters__clear">
        <button
          type="button"
          className="custdocs-clear"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters || isDisabled}
          aria-label="Clear all filters"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default React.memo(CustomerDocumentsFilters);