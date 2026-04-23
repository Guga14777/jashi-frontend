// ============================================================
// FILE: src/pages/customer-dashboard/sections/active-shipments.jsx
// ✅ FIXED: Status shows "Waiting" until carrier accepts
// ✅ FIXED: Green checkmark only when carrier has accepted
// ✅ FIXED: Route displays zip codes with multiple fallbacks
// ✅ FIXED: Vehicle type now properly capitalized
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import Pagination from '../../../components/ui/pagination.jsx';
import {
  DISPLAY_STATUS,
  DISPLAY_STATUS_LABELS,
  toDisplayStatus,
} from '../../../components/load-details/utils/status-map.js';
import './active-shipments.css';

const ActiveShipments = ({
  shipments,
  onViewDetails,
  onStartQuote,
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  search = '',
  statusFilter = '',
  pagination,
  loading
}) => {
  const prevPageRef = useRef(pagination.page);
  const cardRef = useRef(null);

  // Local search input state. We debounce into the parent's committed `search`
  // prop so every keystroke doesn't hit the server — and so clearing is instant.
  const [searchInput, setSearchInput] = useState(search || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    // Sync local input if the parent resets the search programmatically.
    setSearchInput(search || '');
  }, [search]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (typeof onSearchChange === 'function') onSearchChange(value);
    }, 300);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    if (typeof onSearchChange === 'function') onSearchChange('');
  };

  const isSearching = Boolean((search || '').trim());
  const isFiltering = isSearching || Boolean(statusFilter);

  // Scroll to Active Shipments card on page change
  useEffect(() => {
    if (prevPageRef.current !== pagination.page && cardRef.current) {
      let element = cardRef.current;
      let offsetTop = 0;
      
      while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      
      const headerOffset = 100;
      const targetScroll = Math.max(0, offsetTop - headerOffset);
      
      window.scrollTo(0, targetScroll);
      document.documentElement.scrollTop = targetScroll;
      document.body.scrollTop = targetScroll;
    }
    
    prevPageRef.current = pagination.page;
  }, [pagination.page]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);

  // Keep the order-number format identical across Active Shipments and Quote
  // History: 4-digit zero-padded. Source of truth is the booking's numeric
  // orderNumber; we pad only for display.
  const formatOrderNumber = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    return String(Math.trunc(num)).padStart(4, '0');
  };

  const getOrderId = (shipment) => {
    if (shipment.orderNumber != null) {
      return formatOrderNumber(shipment.orderNumber) || shipment.orderNumber;
    }
    return shipment.ref || shipment.id || '—';
  };

  // ✅ Helper to capitalize first letter of each word
  const capitalize = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ✅ Helper to get pickup location (zip code preferred)
  const getPickupLocation = (shipment) => {
    // Priority: pickup.zip > fromZip > pickup.city > fromCity > origin
    return shipment.pickup?.zip 
        || shipment.fromZip 
        || shipment.pickup?.city 
        || shipment.fromCity 
        || shipment.origin 
        || '—';
  };

  // ✅ Helper to get dropoff location (zip code preferred)
  const getDropoffLocation = (shipment) => {
    // Priority: dropoff.zip > toZip > dropoff.city > toCity > destination
    return shipment.dropoff?.zip 
        || shipment.toZip 
        || shipment.dropoff?.city 
        || shipment.toCity 
        || shipment.destination 
        || '—';
  };

  // Status display — uses the shared 5-bucket mapper so customer cards, admin
  // panel, and shipments page all agree on what status a booking is in.
  const getStatusDisplay = (shipment) => {
    return DISPLAY_STATUS_LABELS[toDisplayStatus(shipment.status)] || 'Waiting';
  };

  // Pill modifier — one class per display bucket. Styles live in
  // active-shipments.css (.status-pill--waiting, ...).
  const getStatusPillModifier = (shipment) => {
    switch (toDisplayStatus(shipment.status)) {
      case DISPLAY_STATUS.WAITING:   return 'status-pill--waiting';
      case DISPLAY_STATUS.ASSIGNED:  return 'status-pill--assigned';
      case DISPLAY_STATUS.PICKED_UP: return 'status-pill--picked-up';
      case DISPLAY_STATUS.DELIVERED: return 'status-pill--delivered';
      case DISPLAY_STATUS.CANCELLED: return 'status-pill--cancelled';
      default:                       return 'status-pill--waiting';
    }
  };

  const handlePageChange = (newPage) => {
    console.log(`📄 Active Shipments: Page changed to ${newPage}`);
    onPageChange(newPage);
  };

  // Click handler for View Details
  const handleViewClick = (e, shipmentId) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 Active Shipments: View Details clicked for ID:', shipmentId);
    
    if (onViewDetails && typeof onViewDetails === 'function') {
      onViewDetails(shipmentId);
    } else {
      console.error('❌ onViewDetails is not a function:', onViewDetails);
    }
  };

  const renderSearchBar = () => (
    <div className="table-toolbar">
      <div className="table-search">
        <span className="table-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="table-search-input"
          placeholder="Search orders by order ID, ZIP, vehicle, or status"
          value={searchInput}
          onChange={handleSearchInput}
          aria-label="Search orders"
        />
        {searchInput && (
          <button
            type="button"
            className="table-search-clear"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <select
        className={`table-filter-select${statusFilter ? ' is-active' : ''}`}
        value={statusFilter}
        onChange={(e) => onStatusFilterChange?.(e.target.value)}
        aria-label="Filter orders by status"
      >
        <option value="">All Orders</option>
        <option value="open">Open</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );

  // First-time empty state — no search bar, surface the onboarding CTA.
  // A zero-result search/filter is handled further down.
  if (!isFiltering && (!pagination || pagination.total === 0) && !loading) {
    return (
      <div className="dashboard-card active-shipments" ref={cardRef}>
        <div className="card-header">
          <h2 className="card-title">Orders</h2>
          <p className="card-subtitle">Your shipments, past and present</p>
        </div>
        <div className="empty-state">
          <svg
            className="empty-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <div className="empty-title">No orders yet</div>
          <div className="empty-description">
            Start a quote to book your first shipment.
          </div>
          <button className="btn-primary" onClick={onStartQuote}>
            Start a Quote
          </button>
        </div>
      </div>
    );
  }

  // Loading state (first-ever load). Once we have results, subsequent loads
  // keep the table visible so the search bar doesn't flicker.
  if (loading && shipments.length === 0 && !isFiltering) {
    return (
      <div className="dashboard-card active-shipments" ref={cardRef}>
        <div className="card-header">
          <h2 className="card-title">Orders</h2>
          <p className="card-subtitle">Loading…</p>
        </div>
        <div className="table-wrapper" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <p>Loading orders…</p>
          </div>
        </div>
      </div>
    );
  }

  const hasResults = shipments.length > 0 && pagination.total > 0;

  return (
    <div className="dashboard-card active-shipments" ref={cardRef}>
      <div className="card-header card-header--with-search">
        <div className="card-header-text">
          <h2 className="card-title">Orders</h2>
          <p className="card-subtitle">
            {isFiltering
              ? `${pagination.total} match${pagination.total === 1 ? '' : 'es'}${isSearching ? ` for "${search}"` : ''}`
              : `${pagination.total} order${pagination.total !== 1 ? 's' : ''} • Page ${pagination.page} of ${pagination.totalPages || 1}`}
          </p>
        </div>
        {renderSearchBar()}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Route</th>
              <th>Vehicle</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!hasResults && (
              <tr className="table-empty-row">
                <td colSpan={6} className="table-empty-cell">
                  {loading ? 'Searching…' : 'No orders found'}
                </td>
              </tr>
            )}
            {hasResults && shipments.map((shipment) => {
              return (
                <tr key={shipment.id} className="table-row">
                  <td>
                    <strong className="shipment-id">
                      #{getOrderId(shipment)}
                    </strong>
                  </td>
                  <td>
                    {/* ✅ FIXED: Use helper functions with multiple fallbacks */}
                    <div className="route-info">
                      <div className="route-from">{getPickupLocation(shipment)}</div>
                      <div className="route-to">→ {getDropoffLocation(shipment)}</div>
                    </div>
                  </td>
                  <td className="vehicle-cell">
                    {/* ✅ FIXED: Capitalize vehicle type */}
                    <span className="vehicle-type">
                      {capitalize(shipment.vehicleType || shipment.vehicle)}
                    </span>
                  </td>
                  <td className="price-cell">
                    {formatCurrency(shipment.price)}
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusPillModifier(shipment)}`}>
                      <span className="status-pill__dot" aria-hidden="true" />
                      {getStatusDisplay(shipment)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="view-details-btn"
                        onClick={(e) => handleViewClick(e, shipment.id)}
                      >
                        View details
                        <svg
                          className="view-details-btn__arrow"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <div className="shipments-footer">
        <div className="tracking-info">
          <p className="tracking-text">
            <svg
              className="info-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Updates are sent via email and SMS. Times are estimates and may
            vary.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveShipments;