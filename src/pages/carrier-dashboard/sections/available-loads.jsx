// ============================================================
// FILE: src/pages/carrier-dashboard/sections/available-loads.jsx
// ✅ FIXED: Shows unified orderNumber on load cards
// ✅ UPDATED: Pagination set to 9 items per page
// ✅ FIXED: Default sort is now "Newest First" (by createdAt desc)
// ✅ FIXED: ALL filters are now client-side (no page refresh)
// ✅ FIXED: Search works for order #, city, state, and ZIP
// ✅ ADDED: isPreviewOnly prop to hide customer PII and BOL in modal
// ✅ FIXED: Rate now computed from price/miles (not relying on ratePerMile field)
// ============================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './available-loads.css';
import { formatPrice, formatRate, formatDate } from '../../../utils/formatters';
import { formatShortDate } from '../../../utils/formatDate.js';
import Pagination from '../../../components/ui/pagination.jsx';
import LoadDetailsModal from '../../../components/load-details';
import Skeleton from '../../../components/ui/skeleton';
import ConfirmModal from '../../../components/ui/confirm-modal';
import Toast from '../../../components/ui/toast.jsx';
import { useAuth } from '../../../store/auth-context';
import { Package, Clock, AlertCircle, MapPin, Calendar, Truck, RefreshCw } from 'lucide-react';
import * as carrierApi from '../../../services/carrier.api.js';

// US States data
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

// LocalStorage key for UI state persistence
const LS_KEY = 'available_loads_ui_v3';

// ✅ PAGINATION CONFIG - Set to 9 items per page
const PAGE_SIZE = 9;

// Custom Empty State Component with Icon
const EmptyStateWithIcon = ({ message, onRefresh }) => (
  <div className="al-empty-state">
    <Package size={48} color="#94A3B8" strokeWidth={1.5} />
    <h3>No loads available</h3>
    <p>{message}</p>
    {onRefresh && (
      <button className="al-btn-refresh" onClick={onRefresh}>
        <RefreshCw size={16} />
        Refresh
      </button>
    )}
  </div>
);

// ✅ Helper to normalize strings for search/filter comparison
const normalize = (value) => {
  if (value == null) return '';
  return String(value).toLowerCase().trim();
};

// ✅ FIXED: Helper to compute rate per mile from price and miles
const computeRatePerMile = (price, miles) => {
  if (price == null || !miles || miles <= 0) return null;
  return price / miles;
};

// ✅ FIXED: Helper to format rate per mile for display
const formatRatePerMile = (price, miles) => {
  const rate = computeRatePerMile(price, miles);
  if (rate === null) return '—';
  return `$${rate.toFixed(2)}/mi`;
};

const AvailableLoads = () => {
  const { token } = useAuth();
  
  // ✅ Ref for scrolling to top of card on page change
  const cardRef = useRef(null);
  const prevPageRef = useRef(1);

  const [viewMode, setViewMode] = useState('grid');
  
  // ✅ FIXED: ALL filter states are now client-side only (no API calls)
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [dropoffState, setDropoffState] = useState('');
  const [originZip, setOriginZip] = useState('');
  const [destZip, setDestZip] = useState('');
  
  // ✅ FIXED: Default sort is now "Newest First"
  const [sort, setSort] = useState('dateDesc');
  const [page, setPage] = useState(1);
  
  // Modal state for View Details
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Accept confirmation modal state
  const [acceptModalLoad, setAcceptModalLoad] = useState(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptedLoads, setAcceptedLoads] = useState(new Set());
  const [loadingAccept, setLoadingAccept] = useState(null);
  const [lastOpenedId, setLastOpenedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Real data state - fetched from API
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Scroll to top of card when page changes
  useEffect(() => {
    if (prevPageRef.current !== page && cardRef.current) {
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
    
    prevPageRef.current = page;
  }, [page]);

  // Load UI state from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved) {
        if (saved.sort && ['dateDesc', 'dateAsc', 'priceDesc', 'priceAsc', 'milesDesc', 'milesAsc'].includes(saved.sort)) {
          setSort(saved.sort);
        }
        if (saved.viewMode) setViewMode(saved.viewMode);
        // Don't restore filters - start fresh each session
      }
    } catch {}
  }, []);

  // Save UI state to localStorage when it changes
  useEffect(() => {
    const toSave = { sort, viewMode };
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  }, [sort, viewMode]);

  // ✅ FIXED: Reset page when any filter changes
  useEffect(() => { 
    setPage(1); 
  }, [searchTerm, pickupState, dropoffState, originZip, destZip, sort, viewMode]);

  // ✅ FIXED: Fetch ALL loads from API ONCE (no filters sent to API)
  const fetchAvailableLoads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📤 Fetching ALL available loads from API...');
      
      // ✅ FIXED: No filters sent to API - all filtering is client-side
      const response = await carrierApi.getAvailableLoads(token, {
        page: 1,
        limit: 1000, // Get all loads for client-side filtering
      });
      
      console.log('✅ Available loads fetched:', response);
      
      const fetchedLoads = response.loads || [];
      setLoads(fetchedLoads);
      
    } catch (err) {
      console.error('❌ Failed to fetch available loads:', err);
      setError(err.message);
      setLoads([]);
    } finally {
      setLoading(false);
    }
  }, [token]); // ✅ FIXED: Only depends on token, not filters

  // Fetch loads on mount only
  useEffect(() => {
    fetchAvailableLoads();
  }, [fetchAvailableLoads]);

  // ⭐ Get unified Order ID with # prefix
  const getOrderId = (load) => {
    if (load.orderNumber) {
      return `#${load.orderNumber}`;
    }
    if (load.ref) {
      return load.ref;
    }
    return `#${load.id?.slice(-6) || '—'}`;
  };

  // ⭐ Get raw order number for search (without #)
  const getRawOrderNumber = (load) => {
    if (load.orderNumber) return String(load.orderNumber);
    if (load.ref) return load.ref.replace('#', '');
    return load.id?.slice(-6) || '';
  };

  /** Handle ZIP input - only allow digits, max 5 */
  const handleOriginZipChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setOriginZip(value);
  };

  const handleDestZipChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setDestZip(value);
  };

  /** Clear all filters AND search */
  const clearFilters = () => {
    setSearchTerm('');
    setPickupState('');
    setDropoffState('');
    setOriginZip('');
    setDestZip('');
    setSort('dateDesc');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || pickupState || dropoffState || originZip || destZip;

  // View Details modal handlers
  const openModal = (load) => {
    console.log('🔍 Opening View Details modal for load:', load.id);
    setSelectedLoad(load);
    setIsModalOpen(true);
    setLastOpenedId(load.id);
  };

  const closeModal = () => {
    console.log('🔍 Closing View Details modal');
    setIsModalOpen(false);
    setSelectedLoad(null);
    setTimeout(() => {
      if (lastOpenedId) {
        const el = document.querySelector(`[data-load-id="${lastOpenedId}"]`);
        el?.focus();
      }
    }, 50);
  };

  /** Handle Accept Offer */
  const openAcceptModal = (load) => {
    setAcceptModalLoad(load);
    setIsAcceptModalOpen(true);
  };

  const closeAcceptModal = () => {
    setIsAcceptModalOpen(false);
    setAcceptModalLoad(null);
  };

  // Real API call to accept load
  const confirmAcceptOffer = async (loadId) => {
    if (!token) {
      setToast({ type: 'error', message: 'Please log in to accept loads' });
      return;
    }

    const orderLabel = acceptModalLoad ? getOrderId(acceptModalLoad) : `#${String(loadId).slice(-6)}`;

    setLoadingAccept(loadId);

    try {
      const response = await carrierApi.acceptLoad(loadId, token);

      console.log('✅ Load accepted:', response);

      setAcceptedLoads(prev => new Set([...prev, loadId]));
      setLoads(prev => prev.filter(l => l.id !== loadId));

      closeAcceptModal();
      setToast({
        type: 'success',
        message: `Load ${orderLabel} accepted — added to My Loads`,
      });
    } catch (err) {
      console.error('❌ Failed to accept load:', err);
      setToast({
        type: 'error',
        message: `Failed to accept load — ${err.message || 'please try again'}`,
      });
    } finally {
      setLoadingAccept(null);
    }
  };

  /** ✅ FIXED: ALL filtering is now client-side */
  const filteredAndSortedLoads = useMemo(() => {
    let data = [...loads];

    // ✅ STEP 1: Apply SEARCH filter (order #, city, state, zip, vehicle)
    const term = normalize(searchTerm);
    if (term) {
      data = data.filter((load) => {
        const orderNum = normalize(getRawOrderNumber(load));
        const ref = normalize(load.ref);
        
        const pCity = normalize(load.pickup?.city || load.fromCity);
        const pState = normalize(load.pickup?.state);
        const pZip = normalize(load.pickup?.zip || load.pickup?.zipCode);
        const origin = normalize(load.origin);
        
        const dCity = normalize(load.dropoff?.city || load.toCity);
        const dState = normalize(load.dropoff?.state);
        const dZip = normalize(load.dropoff?.zip || load.dropoff?.zipCode);
        const destination = normalize(load.destination);
        
        const vehicle = normalize(load.vehicle);
        const vehicleType = normalize(load.vehicleType);

        return (
          orderNum.includes(term) ||
          ref.includes(term) ||
          pCity.includes(term) ||
          pState.includes(term) ||
          pZip.includes(term) ||
          origin.includes(term) ||
          dCity.includes(term) ||
          dState.includes(term) ||
          dZip.includes(term) ||
          destination.includes(term) ||
          vehicle.includes(term) ||
          vehicleType.includes(term)
        );
      });
    }

    // ✅ STEP 2: Apply PICKUP STATE filter
    if (pickupState) {
      data = data.filter((load) => {
        const loadPickupState = normalize(load.pickup?.state);
        return loadPickupState === normalize(pickupState);
      });
    }

    // ✅ STEP 3: Apply DROPOFF STATE filter
    if (dropoffState) {
      data = data.filter((load) => {
        const loadDropoffState = normalize(load.dropoff?.state);
        return loadDropoffState === normalize(dropoffState);
      });
    }

    // ✅ STEP 4: Apply ORIGIN ZIP filter (partial match)
    if (originZip) {
      data = data.filter((load) => {
        const loadOriginZip = normalize(load.pickup?.zip || load.pickup?.zipCode);
        return loadOriginZip.startsWith(normalize(originZip));
      });
    }

    // ✅ STEP 5: Apply DESTINATION ZIP filter (partial match)
    if (destZip) {
      data = data.filter((load) => {
        const loadDestZip = normalize(load.dropoff?.zip || load.dropoff?.zipCode);
        return loadDestZip.startsWith(normalize(destZip));
      });
    }

    // ✅ STEP 6: Apply sorting
    switch (sort) {
      case 'dateDesc': 
        data.sort((a, b) => new Date(b.createdAt || b.postedAt) - new Date(a.createdAt || a.postedAt)); 
        break;
      case 'dateAsc':  
        data.sort((a, b) => new Date(a.createdAt || a.postedAt) - new Date(b.createdAt || b.postedAt)); 
        break;
      case 'priceDesc': 
        data.sort((a, b) => (b.price || 0) - (a.price || 0)); 
        break;
      case 'priceAsc':  
        data.sort((a, b) => (a.price || 0) - (b.price || 0)); 
        break;
      case 'milesDesc': 
        data.sort((a, b) => (b.miles || 0) - (a.miles || 0)); 
        break;
      case 'milesAsc':  
        data.sort((a, b) => (a.miles || 0) - (b.miles || 0)); 
        break;
      default:          
        data.sort((a, b) => new Date(b.createdAt || b.postedAt) - new Date(a.createdAt || a.postedAt)); 
        break;
    }
    
    return data;
  }, [loads, searchTerm, pickupState, dropoffState, originZip, destZip, sort]);

  // ✅ Calculate total pages based on filtered loads
  const totalPages = Math.ceil(filteredAndSortedLoads.length / PAGE_SIZE);

  // Keep page within bounds when filtered length changes
  useEffect(() => {
    const maxPage = Math.max(1, totalPages);
    if (page > maxPage) setPage(maxPage);
  }, [filteredAndSortedLoads.length, totalPages, page]);

  /** Pagination slice - client-side pagination */
  const paginatedLoads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSortedLoads.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedLoads, page]);

  const formatPostedTime = (date) => {
    if (!date) return 'just now';
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  };

  const hasLoads = paginatedLoads.length > 0;
  const totalLoadsCount = filteredAndSortedLoads.length;
  const totalUnfilteredCount = loads.length;

  // Debug logging
  console.log('📊 Available Loads Debug:', {
    totalFetched: loads.length,
    afterFilters: filteredAndSortedLoads.length,
    searchTerm,
    pickupState,
    dropoffState,
    originZip,
    destZip,
    currentSort: sort,
    currentPage: page,
    showingLoads: paginatedLoads.length,
  });

  if (loading) {
    return (
      <section className="available-loads al-wrapper" ref={cardRef}>
        <div className="al-container">
          <div className="al-header">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="al-filters">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          <div className="al-content">
            <div className="al-grid">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="available-loads al-wrapper" ref={cardRef}>
        <div className="al-container">
          <div className="al-error-banner">
            <AlertCircle size={16} color="#DC2626" strokeWidth={2} style={{ display: 'inline-block', marginRight: '8px' }} />
            Error loading loads: {String(error)}
            <button 
              onClick={fetchAvailableLoads} 
              style={{ marginLeft: '16px', padding: '4px 12px', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="available-loads al-wrapper" ref={cardRef}>
      <div className="al-container">
        {/* Header */}
        <div className="al-header">
          <div className="al-header-content">
            <div className="al-title">
              <h2>Available Loads</h2>
              <span className="al-count" aria-live="polite">
                {hasActiveFilters 
                  ? `${totalLoadsCount} of ${totalUnfilteredCount} loads`
                  : `${totalLoadsCount} ${totalLoadsCount === 1 ? 'load' : 'loads'} available`
                }
              </span>
            </div>
            
            <div className="al-controls">
              <button 
                className="al-btn-refresh-small" 
                onClick={fetchAvailableLoads}
                title="Refresh loads"
                aria-label="Refresh available loads"
              >
                <RefreshCw size={16} />
              </button>
              <div className="al-view-toggle">
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="6" height="6" />
                    <rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" />
                    <rect x="9" y="9" width="6" height="6" />
                  </svg>
                </button>
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="2" width="14" height="2" />
                    <rect x="1" y="7" width="14" height="2" />
                    <rect x="1" y="12" width="14" height="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ FIXED: All filters are client-side - no form submission */}
        <form 
          className="al-filters" 
          role="region" 
          aria-label="Load filters"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Search input */}
          <label className="sr-only" htmlFor="al-search">Search</label>
          <input
            id="al-search"
            className="al-filter-search"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />

          {/* Pickup State dropdown */}
          <label className="sr-only" htmlFor="al-pickup-state">Pickup State</label>
          <select
            id="al-pickup-state"
            className="al-filter-select"
            value={pickupState}
            onChange={(e) => setPickupState(e.target.value)}
          >
            <option value="">Pickup State</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Origin ZIP input */}
          <label className="sr-only" htmlFor="al-origin-zip">Origin ZIP</label>
          <input
            id="al-origin-zip"
            className="al-filter-input"
            type="text"
            inputMode="numeric"
            placeholder="ZIP"
            value={originZip}
            onChange={handleOriginZipChange}
            autoComplete="off"
          />

          {/* Dropoff State dropdown */}
          <label className="sr-only" htmlFor="al-dropoff-state">Drop-off State</label>
          <select
            id="al-dropoff-state"
            className="al-filter-select"
            value={dropoffState}
            onChange={(e) => setDropoffState(e.target.value)}
          >
            <option value="">Drop-off State</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Destination ZIP input */}
          <label className="sr-only" htmlFor="al-dest-zip">Destination ZIP</label>
          <input
            id="al-dest-zip"
            className="al-filter-input"
            type="text"
            inputMode="numeric"
            placeholder="ZIP"
            value={destZip}
            onChange={handleDestZipChange}
            autoComplete="off"
          />

          {/* Sort dropdown */}
          <label className="sr-only" htmlFor="al-sort">Sort by</label>
          <select 
            id="al-sort"
            className="al-filter-sort" 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="dateDesc">Newest First</option>
            <option value="dateAsc">Oldest First</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="milesDesc">Miles: High to Low</option>
            <option value="milesAsc">Miles: Low to High</option>
          </select>

          {/* Clear button */}
          <button 
            type="button" 
            className="al-clear" 
            onClick={clearFilters}
          >
            Clear
          </button>
        </form>

        {/* Content */}
        <div className={`al-content ${hasLoads ? 'has-data' : ''}`}>
          {hasLoads ? (
            <div className={viewMode === 'grid' ? 'al-grid' : 'al-list'}>
              {paginatedLoads.map((load) => (
                <div
                  key={load.id}
                  className={viewMode === 'grid' ? 'al-card' : 'al-row'}
                  onClick={() => openModal(load)}
                  role="button"
                  tabIndex={0}
                  data-load-id={load.id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openModal(load);
                    }
                  }}
                >
                  {/* Order ID badge */}
                  <div className="al-card-header">
                    <span className="al-order-badge">{getOrderId(load)}</span>
                    <span className="al-badge al-badge--miles">{load.miles} mi</span>
                  </div>

                  <div className="al-meta">
                    <div className="al-route">
                      <MapPin size={14} color="#64748B" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      <span>{load.origin}</span>
                      <span className="al-arrow">→</span>
                      <span>{load.destination}</span>
                    </div>

                    <div className="al-details">
                      <Calendar size={14} color="#64748B" strokeWidth={1.5} />
                      <span>{formatDate(load.pickupDate)}</span>
                      <span className="al-separator">•</span>
                      <Truck size={14} color="#64748B" strokeWidth={1.5} />
                      <span>{load.vehicleType}</span>
                      <span className="al-separator">•</span>
                      <span>{load.transportType}</span>
                    </div>

                    <div className="al-badges">
                      <span className="al-badge">
                        <Clock size={12} color="#94A3B8" strokeWidth={1.5} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Posted {formatShortDate(load.postedAt || load.createdAt)}
                      </span>
                      {load.hasGatePass && (
                        <span className="al-badge photos">Gate Pass</span>
                      )}
                    </div>
                  </div>

                  <div className="al-cta-col">
                    <div className="al-price-block">
                      <div className="al-price-main">{formatPrice(load.price)}</div>
                      <div className="al-price-meta">
                        {/* ✅ FIXED: Compute rate from price/miles instead of using ratePerMile field */}
                        <span className="al-price-rate">
                          {formatRatePerMile(load.price, load.miles)}
                        </span>
                        <span className="al-separator">•</span>
                        <span>{load.miles?.toLocaleString()} mi</span>
                      </div>
                    </div>

                    <div className="al-cta-actions">
                      {acceptedLoads.has(load.id) ? (
                        <>
                          <button className="al-btn-accepted" disabled>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M13.485 3.515a1 1 0 010 1.414l-6.5 6.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L6.5 9.53l5.793-5.793a1 1 0 011.414 0z"/>
                            </svg>
                            Accepted
                          </button>
                          <button
                            className="al-btn-secondary"
                            onClick={(e) => { e.stopPropagation(); openModal(load); }}
                          >
                            View Details
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="al-btn-primary"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openAcceptModal(load); 
                            }}
                            disabled={loadingAccept === load.id}
                            aria-label={`Accept offer ${load.origin} to ${load.destination} for ${formatPrice(load.price)}`}
                            title={`Accept offer for ${formatPrice(load.price)}`}
                          >
                            {loadingAccept === load.id ? (
                              <>
                                <span className="al-spinner"></span>
                                Accepting...
                              </>
                            ) : (
                              'Accept Offer'
                            )}
                          </button>
                          <button
                            className="al-btn-secondary"
                            onClick={(e) => { e.stopPropagation(); openModal(load); }}
                          >
                            View Details
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyStateWithIcon 
              message={
                hasActiveFilters 
                  ? "No loads match your filters. Try adjusting your search criteria."
                  : "No loads available right now. New loads are posted regularly — check back soon!"
              }
              onRefresh={!hasActiveFilters ? fetchAvailableLoads : null}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="al-pagination">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ✅ UPDATED: Details Modal - Pass isPreviewOnly to hide customer PII and BOL */}
      <LoadDetailsModal 
        open={isModalOpen} 
        onClose={closeModal} 
        load={selectedLoad}
        portal="carrier"
        type="booking"
        isPreviewOnly={true}
      />
      
      {/* ✅ FIXED: Accept Offer Confirmation Modal - Compute rate from price/miles */}
      {acceptModalLoad && (
        <ConfirmModal
          open={isAcceptModalOpen}
          onClose={closeAcceptModal}
          onConfirm={() => confirmAcceptOffer(acceptModalLoad.id)}
          title="Confirm Offer Acceptance"
          description={
            <div className="accept-modal-content">
              <div className="accept-summary">
                <p><strong>Order ID:</strong> {getOrderId(acceptModalLoad)}</p>
                <p><strong>Route:</strong> {acceptModalLoad.origin} → {acceptModalLoad.destination}</p>
                <p><strong>Distance:</strong> {acceptModalLoad.miles} miles</p>
                <p><strong>Pickup Date:</strong> {formatDate(acceptModalLoad.pickupDate)}</p>
                <p><strong>Vehicle Type:</strong> {acceptModalLoad.vehicleType}</p>
                <p><strong>Transport Type:</strong> {acceptModalLoad.transportType}</p>
                <div className="accept-price-highlight">
                  <p><strong>Total Price:</strong> {formatPrice(acceptModalLoad.price)}</p>
                  {/* ✅ FIXED: Compute rate from price/miles */}
                  <p><strong>Rate:</strong> {formatRatePerMile(acceptModalLoad.price, acceptModalLoad.miles)}</p>
                </div>
              </div>
              <div className="accept-terms">
                <p className="terms-note">By accepting this offer, you agree to pick up and deliver the vehicle according to the specified dates and conditions. The broker will contact you shortly with further details.</p>
              </div>
            </div>
          }
          confirmLabel={loadingAccept === acceptModalLoad?.id ? "Accepting..." : "Confirm & Accept"}
          cancelLabel="Cancel"
          variant="primary"
          loading={loadingAccept === acceptModalLoad?.id}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
};

export default AvailableLoads;
