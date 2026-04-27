// ============================================================
// FILE: src/pages/carrier/loads/carrier-loads.jsx
// ✅ UPDATED: Added arrived_at_pickup status for 6-step flow
// ✅ UPDATED: Action indicators show correct buttons per status
// ============================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './carrier-loads.css';
import Pagination from '../../../components/ui/pagination.jsx';
import LoadDetailsModal from '../../../components/load-details';
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import CarrierDashboardFooter from '../../../components/footer/carrier-dashboard-footer.jsx';
import { useAuth } from '../../../store/auth-context';
import { useDebounce } from '../../../hooks/use-debounce.js';
import { TAB_STATUS_MAP } from '../../../utils/constants.js';
import { Search, Calendar, Truck, Filter, Grid3x3, List, ChevronDown, MapPin, Clock, DollarSign, Package, X, RefreshCw, Camera, CheckCircle, Navigation, MapPinned } from 'lucide-react';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../lib/api-url.js';

// Formatter utilities
const formatPrice = (n) => (n == null ? '—' : `$${n.toLocaleString()}`);
const formatRate = (n) => (n == null ? '—' : `$${n.toFixed(2)}`);
const formatDate = (s) => (s ? new Date(s).toLocaleDateString() : '—');

// Calculate price per mile from price and miles
const calcRatePerMile = (price, miles) => {
  if (price == null || miles == null || miles <= 0) return null;
  return price / miles;
};

// Normalize string for search and comparison (case-insensitive)
const normalize = (value) => (value || '').toString().toLowerCase().trim();

// ✅ UPDATED: Status configuration for display - includes new statuses
const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', className: 'status-scheduled' },
  assigned: { label: 'Assigned', className: 'status-assigned' },
  booked: { label: 'Scheduled', className: 'status-scheduled' },
  pickup_scheduled: { label: 'Scheduled', className: 'status-scheduled' },
  on_the_way_to_pickup: { label: 'On the Way', className: 'status-on-way' },
  arrived_at_pickup: { label: 'At Pickup', className: 'status-at-pickup' },
  picked_up: { label: 'In Transit', className: 'status-in-transit' },
  in_transit: { label: 'In Transit', className: 'status-in-transit' },
  delivered: { label: 'Delivered', className: 'status-delivered' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled' }
};

const CarrierLoads = () => {
  const { loadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    q: '',
    vehicleType: '',
    transportType: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [sort, setSort] = useState('updatedDesc');
  const [page, setPage] = useState(1);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const announcerRef = useRef(null);
  const prevPageRef = useRef(page);
  const cardRef = useRef(null);

  // Real data state
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const pageSize = 10;
  const debouncedQ = useDebounce(filters.q, 300);

  // Fetch carrier's loads from API
  const fetchMyLoads = useCallback(async (showLoading = true) => {
    if (!token) {
      setLoading(false);
      setError('Please log in to view your loads');
      return;
    }

    try {
      if (showLoading && !initialLoadDone) {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      });
      
      console.log('📤 Fetching my loads...', params.toString());
      
      const response = await fetch(`${API_BASE}/api/carrier/my-loads?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ My loads fetched:', data);
      
      // Debug: Log unique values
      const uniqueStatuses = [...new Set((data.loads || []).map(l => l.status))];
      console.log('📊 Unique statuses in loads:', uniqueStatuses);
      
      setLoads(data.loads || []);
      setInitialLoadDone(true);
      
    } catch (err) {
      console.error('❌ Failed to fetch my loads:', err);
      setError(err.message);
      setLoads([]);
    } finally {
      setLoading(false);
    }
  }, [token, initialLoadDone]);

  // Fetch loads on mount
  useEffect(() => {
    fetchMyLoads(true);
  }, [token]);

  // Manual refresh function
  const handleRefresh = () => {
    setInitialLoadDone(false);
    fetchMyLoads(true);
  };

  // Handle load updates from modal (pickup/delivery success)
  const handleLoadUpdated = useCallback((updatedBooking) => {
    console.log('📦 Load updated, refreshing list...', updatedBooking);
    
    // Update the load in the local state immediately
    if (updatedBooking?.id) {
      setLoads(prevLoads => 
        prevLoads.map(load => 
          load.id === updatedBooking.id 
            ? { ...load, ...updatedBooking }
            : load
        )
      );
      
      // Also update selectedLoad if it's the same
      setSelectedLoad(prev => 
        prev?.id === updatedBooking.id 
          ? { ...prev, ...updatedBooking }
          : prev
      );
    }
    
    // Refresh full list from server
    setTimeout(() => {
      fetchMyLoads(false);
    }, 500);
  }, [fetchMyLoads]);

  // Handle opening modal when loadId is in URL
  useEffect(() => {
    if (loadId && loads.length > 0) {
      const load = loads.find(l => l.id === loadId || l.ref === loadId);
      if (load) {
        setSelectedLoad(load);
        setIsModalOpen(true);
      }
    }
  }, [loadId, loads]);

  // Get unique values from loads for dynamic filter options
  const filterOptions = useMemo(() => {
    const vehicleTypes = [...new Set(loads.map(l => l.vehicleType).filter(Boolean))].sort();
    const transportTypes = [...new Set(loads.map(l => l.transportType).filter(Boolean))].sort();
    return { vehicleTypes, transportTypes };
  }, [loads]);

  // Count loads by status using TAB_STATUS_MAP for consistency
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      scheduled: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0
    };
    
    loads.forEach(load => {
      counts.all++;
      
      if (TAB_STATUS_MAP.scheduled.includes(load.status)) {
        counts.scheduled++;
      } else if (TAB_STATUS_MAP.in_transit.includes(load.status)) {
        counts.in_transit++;
      } else if (TAB_STATUS_MAP.delivered.includes(load.status)) {
        counts.delivered++;
      } else if (TAB_STATUS_MAP.cancelled.includes(load.status)) {
        counts.cancelled++;
      }
    });
    
    return counts;
  }, [loads]);

  // Filter and sort loads using TAB_STATUS_MAP for consistency
  const filteredLoads = useMemo(() => {
    let data = [...loads];
    
    // Filter by tab using TAB_STATUS_MAP
    if (activeTab !== 'all') {
      const statusesForTab = TAB_STATUS_MAP[activeTab];
      if (statusesForTab) {
        data = data.filter(load => statusesForTab.includes(load.status));
      }
    }
    
    // Filter by search query
    if (debouncedQ) {
      const searchTerm = normalize(debouncedQ);
      data = data.filter(load => {
        const orderId = normalize(load.orderNumber || load.displayOrderId || load.ref || load.id);
        const origin = normalize(load.origin);
        const destination = normalize(load.destination);
        const fromCity = normalize(load.pickupCity || load.fromCity);
        const fromState = normalize(load.pickupState || load.fromState);
        const fromZip = normalize(load.pickupZip || load.fromZip);
        const toCity = normalize(load.dropoffCity || load.toCity);
        const toState = normalize(load.dropoffState || load.toState);
        const toZip = normalize(load.dropoffZip || load.toZip);
        const vehicleType = normalize(load.vehicleType);

        return (
          orderId.includes(searchTerm) ||
          origin.includes(searchTerm) ||
          destination.includes(searchTerm) ||
          fromCity.includes(searchTerm) ||
          fromState.includes(searchTerm) ||
          fromZip.includes(searchTerm) ||
          toCity.includes(searchTerm) ||
          toState.includes(searchTerm) ||
          toZip.includes(searchTerm) ||
          vehicleType.includes(searchTerm)
        );
      });
    }
    
    // Filter by vehicle type (case-insensitive)
    if (filters.vehicleType) {
      const filterValue = normalize(filters.vehicleType);
      data = data.filter(load => normalize(load.vehicleType) === filterValue);
    }
    
    // Filter by transport type (case-insensitive)
    if (filters.transportType) {
      const filterValue = normalize(filters.transportType);
      data = data.filter(load => normalize(load.transportType) === filterValue);
    }

    // Filter by explicit status dropdown
    if (filters.status) {
      const statusGroup = TAB_STATUS_MAP[filters.status];
      if (statusGroup) {
        data = data.filter(load => statusGroup.includes(load.status));
      } else {
        data = data.filter(load => load.status === filters.status);
      }
    }

    // Date range
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      data = data.filter(l => l.pickupDate && new Date(l.pickupDate) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      data = data.filter(l => l.pickupDate && new Date(l.pickupDate) <= to);
    }
    
    // Sort
    switch (sort) {
      case 'pickupSoon':
        data.sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate));
        break;
      case 'priceDesc':
        data.sort((a, b) => b.price - a.price);
        break;
      case 'priceAsc':
        data.sort((a, b) => a.price - b.price);
        break;
      case 'milesAsc':
        data.sort((a, b) => a.miles - b.miles);
        break;
      default:
        data.sort((a, b) => new Date(b.updatedAt || b.pickupDate) - new Date(a.updatedAt || a.pickupDate));
        break;
    }
    
    return data;
  }, [loads, activeTab, debouncedQ, filters, sort]);

  // Paginated loads
  const paginatedLoads = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredLoads.slice(startIndex, startIndex + pageSize);
  }, [filteredLoads, page, pageSize]);

  const totalPages = Math.ceil(filteredLoads.length / pageSize);

  // Announce results to screen readers
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = `${filteredLoads.length} results found. Page ${page} of ${totalPages || 1}.`;
    }
  }, [filteredLoads.length, page, totalPages]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Scroll to top of card on page change
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, status: '' }));
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setPage(1);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      q: '',
      vehicleType: '',
      transportType: '',
      dateFrom: '',
      dateTo: '',
      status: ''
    });
    setActiveTab('all');
    setPage(1);
  };

  const handleLoadClick = (load) => {
    setSelectedLoad(load);
    setIsModalOpen(true);
    navigate(`/carrier/loads/${load.id}`, { replace: false });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    navigate('/carrier/loads', { replace: true });
    setTimeout(() => {
      const triggerElement = document.querySelector(`[data-load-id="${selectedLoad?.id}"]`);
      if (triggerElement) {
        triggerElement.focus();
      }
      setSelectedLoad(null);
    }, 100);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.q || filters.vehicleType || filters.transportType || 
                           filters.dateFrom || filters.dateTo || filters.status || 
                           activeTab !== 'all';

  // ✅ UPDATED: Get action indicator for load item based on 6-step flow
  const getActionIndicator = (load) => {
    const status = load.status;
    
    // Step 1-2: Assigned - Ready to start trip
    if (['assigned', 'scheduled', 'booked'].includes(status)) {
      return (
        <span className="cl-action-indicator cl-action-indicator--start-trip" title="Start trip to pickup">
          <Navigation size={12} />
        </span>
      );
    }
    
    // Step 3: On the way - Ready to mark arrived
    if (status === 'on_the_way_to_pickup') {
      return (
        <span className="cl-action-indicator cl-action-indicator--arrived" title="Mark arrived at pickup">
          <MapPinned size={12} />
        </span>
      );
    }
    
    // Step 4: Arrived at pickup - Ready to pick up (may have waiting fee option)
    if (status === 'arrived_at_pickup') {
      return (
        <span className="cl-action-indicator cl-action-indicator--pickup" title="Ready for pickup">
          <Camera size={12} />
        </span>
      );
    }
    
    // Step 5: Picked up / In transit - Ready for delivery
    if (['picked_up', 'in_transit'].includes(status)) {
      return (
        <span className="cl-action-indicator cl-action-indicator--deliver" title="Ready for delivery">
          <CheckCircle size={12} />
        </span>
      );
    }
    
    return null;
  };

  const renderLoadItem = (load) => {
    const statusConfig = STATUS_CONFIG[load.status] || STATUS_CONFIG.scheduled;
    const ratePerMile = calcRatePerMile(load.price, load.miles);
    const orderNumber = load.orderNumber || load.displayOrderId || load.ref || load.id?.slice(-6);
    const actionIndicator = getActionIndicator(load);
    
    // Check if waiting fee was requested
    const hasWaitingFee = load.waitFeeAmount > 0;
    
    return (
      <div
        key={load.id}
        className="cl-item"
        role="button"
        aria-pressed="false"
        tabIndex={0}
        data-load-id={load.id}
        onClick={() => handleLoadClick(load)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLoadClick(load);
          }
        }}
        aria-label={`Load ${orderNumber} from ${load.origin} to ${load.destination}`}
      >
        {/* Route Section */}
        <div className="cl-route">
          <div className="cl-route-line">
            <MapPin className="cl-route-icon" aria-hidden="true" />
            <div className="cl-route-locations">
              <span className="cl-order-number">#{orderNumber}</span>
              <span className="cl-route-origin">{load.origin}</span>
              <span className="cl-route-arrow" aria-hidden="true">→</span>
              <span className="cl-route-destination">{load.destination}</span>
            </div>
          </div>
          <div className="cl-status-row">
            <span className={`cl-status ${statusConfig.className}`} role="status">
              {statusConfig.label}
            </span>
            {actionIndicator}
          </div>
        </div>
        
        {/* Dates Section */}
        <div className="cl-dates">
          <div className="cl-date-item">
            <Clock className="cl-date-icon" aria-hidden="true" />
            <div>
              <span className="cl-date-label">Pickup</span>
              <span className="cl-date-value">{formatDate(load.pickupDate)}</span>
            </div>
          </div>
          {load.deliveryDate && (
            <div className="cl-date-item">
              <Clock className="cl-date-icon" aria-hidden="true" />
              <div>
                <span className="cl-date-label">
                  {load.status === 'delivered' ? 'Delivered' : 'Delivery'}
                </span>
                <span className="cl-date-value">{formatDate(load.deliveryDate)}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Price Section */}
        <div className="cl-price">
          <div className="cl-price-main">
            <DollarSign className="cl-price-icon" aria-hidden="true" />
            <span className="cl-price-value">{formatPrice(load.price)}</span>
          </div>
          <span className="cl-price-rate">{formatRate(ratePerMile)}/mi</span>
          <button 
            className="cl-view-details"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadClick(load);
            }}
            aria-label={`View details for load ${orderNumber}`}
          >
            View details
          </button>
        </div>
        
        {/* Badges Section */}
        <div className="cl-badges">
          <span className="cl-badge">{load.vehicleType}</span>
          <span className="cl-badge">{load.transportType}</span>
          <span className="cl-badge">{load.miles} mi</span>
          {load.hasGatePass && (
            <span className="cl-badge cl-badge-gatepass">Gate Pass</span>
          )}
          {hasWaitingFee && (
            <span className="cl-badge cl-badge-waitfee">+$50 Wait Fee</span>
          )}
          {(load.pickupPhotos?.length > 0 || load.deliveryPhotos?.length > 0) && (
            <span className="cl-badge cl-badge-photos">
              <Camera size={12} /> {(load.pickupPhotos?.length || 0) + (load.deliveryPhotos?.length || 0)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && !initialLoadDone) {
    return (
      <>
        <div className="cl-wrapper">
          <div className="cl-container">
            <div className="cl-loading" role="status" aria-live="polite">
              <RefreshCw className="cl-loading-spinner" size={24} />
              <span>Loading your loads...</span>
            </div>
          </div>
          <LiveChat />
        </div>
        <CarrierDashboardFooter />
      </>
    );
  }

  return (
    <>
      <div className="cl-wrapper">
        <div className="cl-container">
          {/* Screen reader announcer */}
          <div ref={announcerRef} className="sr-only" aria-live="polite" aria-atomic="true"></div>
          
          {/* Unified Cover Area with Header + Controls */}
          <div className="cl-cover" ref={cardRef}>
            {/* Header with Interactive Counters */}
            <header className="cl-header">
             <h1 className="cl-title">My Loads</h1>
              <nav className="cl-counters" role="group" aria-label="Status filter">
                <button
                  className={`cl-counter ${activeTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => handleTabChange('all')}
                  aria-pressed={activeTab === 'all'}
                  aria-label={`All, ${statusCounts.all} loads`}
                >
                  All ({statusCounts.all})
                </button>
                <button
                  className={`cl-counter ${activeTab === 'scheduled' ? 'is-active' : ''}`}
                  onClick={() => handleTabChange('scheduled')}
                  aria-pressed={activeTab === 'scheduled'}
                  aria-label={`Scheduled, ${statusCounts.scheduled} loads`}
                >
                  Scheduled ({statusCounts.scheduled})
                </button>
                <button
                  className={`cl-counter ${activeTab === 'in_transit' ? 'is-active' : ''}`}
                  onClick={() => handleTabChange('in_transit')}
                  aria-pressed={activeTab === 'in_transit'}
                  aria-label={`In Transit, ${statusCounts.in_transit} loads`}
                >
                  In Transit ({statusCounts.in_transit})
                </button>
                <button
                  className={`cl-counter ${activeTab === 'delivered' ? 'is-active' : ''}`}
                  onClick={() => handleTabChange('delivered')}
                  aria-pressed={activeTab === 'delivered'}
                  aria-label={`Delivered, ${statusCounts.delivered} loads`}
                >
                  Delivered ({statusCounts.delivered})
                </button>
                <button
                  className={`cl-counter ${activeTab === 'cancelled' ? 'is-active' : ''}`}
                  onClick={() => handleTabChange('cancelled')}
                  aria-pressed={activeTab === 'cancelled'}
                  aria-label={`Cancelled, ${statusCounts.cancelled} loads`}
                >
                  Cancelled ({statusCounts.cancelled})
                </button>
              </nav>
            </header>

            {/* Controls */}
            <div className="cl-controls">
              <div className="cl-search">
                <label htmlFor="loads-search" className="sr-only">Search loads</label>
                <Search className="cl-search-icon" aria-hidden="true" />
                <input
                  id="loads-search"
                  type="text"
                  placeholder="Search"
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  className="cl-search-input"
                  aria-label="Search loads"
                />
              </div>

              <div className="cl-filter-group">
                <label htmlFor="vehicle-filter" className="sr-only">Filter by vehicle type</label>
                <select
                  id="vehicle-filter"
                  value={filters.vehicleType}
                  onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                  className="cl-filter-select"
                  aria-label="Filter by vehicle type"
                >
                  <option value="">All Vehicles</option>
                  {filterOptions.vehicleTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <label htmlFor="transport-filter" className="sr-only">Filter by transport type</label>
                <select
                  id="transport-filter"
                  value={filters.transportType}
                  onChange={(e) => handleFilterChange('transportType', e.target.value)}
                  className="cl-filter-select"
                  aria-label="Filter by transport type"
                >
                  <option value="">All Transport</option>
                  {filterOptions.transportTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="cl-filter-select"
                  aria-label="Filter by status"
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <label htmlFor="date-from" className="sr-only">Pickup date from</label>
                <input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="cl-filter-select"
                  aria-label="Pickup date from"
                />
                
                <label htmlFor="date-to" className="sr-only">Pickup date to</label>
                <input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="cl-filter-select"
                  aria-label="Pickup date to"
                />
              </div>

              <div className="cl-view-toggle" role="group" aria-label="View mode">
                <button
                  className={viewMode === 'list' ? 'is-active' : ''}
                  onClick={() => handleViewModeChange('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={18} />
                </button>
                <button
                  className={viewMode === 'grid' ? 'is-active' : ''}
                  onClick={() => handleViewModeChange('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3x3 size={18} />
                </button>
              </div>

              <div className="cl-sort-wrapper">
                <label htmlFor="sort-select" className="sr-only">Sort loads</label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="cl-sort"
                  aria-label="Sort loads"
                >
                  <option value="updatedDesc">Recently Updated</option>
                  <option value="pickupSoon">Pickup Soon</option>
                  <option value="priceDesc">Price (High to Low)</option>
                  <option value="priceAsc">Price (Low to High)</option>
                  <option value="milesAsc">Distance (Short First)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="cl-error" role="alert">
              {error}
              <button onClick={handleRefresh} style={{ marginLeft: '16px' }}>
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          <main id="loads-content" className="cl-content">
            {paginatedLoads.length === 0 ? (
              <div className="cl-empty">
                <Package className="cl-empty-icon" aria-hidden="true" />
                <p>
                  {loads.length === 0 
                    ? "You haven't accepted any loads yet. Check Available Loads to find shipments!" 
                    : "No loads found matching your criteria."
                  }
                </p>
                {loads.length === 0 && (
                  <button 
                    className="cl-clear-search"
                    onClick={() => navigate('/carrier')}
                  >
                    Browse Available Loads
                  </button>
                )}
                {hasActiveFilters && loads.length > 0 && (
                  <button 
                    className="cl-clear-search"
                    onClick={handleClearFilters}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'cl-grid' : 'cl-list'}>
                {paginatedLoads.map(renderLoadItem)}
              </div>
            )}
          </main>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cl-pagination">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                ariaLabel="Load pagination"
              />
            </div>
          )}

          {/* Modal */}
          {selectedLoad && (
            <LoadDetailsModal
              open={isModalOpen}
              onClose={handleModalClose}
              load={selectedLoad}
              portal="carrier"
              onLoadUpdated={handleLoadUpdated}
            />
          )}
        </div>
        <LiveChat />
      </div>
      <CarrierDashboardFooter />
    </>
  );
};

export default CarrierLoads;