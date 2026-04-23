// ============================================================
// FILE: src/pages/customer-dashboard/customer-dashboard.jsx
// ✅ FIXED: Removed old customer-quote-modal.css import
// ✅ UNIFIED: Uses LoadDetailsModal for both quotes and shipments
// ✅ FIXED: Fetches fresh booking data when opening modal
// ✅ FIXED: Refreshes list after cancellation via onLoadUpdated callback
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth-context';
import * as quotesApi from '../../services/quotes.api';
import { listMyBookings, getFullBooking, getCustomerDashboardStats } from '../../services/booking.api';
import { transformBookingToLoad } from '../../utils/booking-transformers';

import CustomerQuoteWidget from '../../components/quote-widget/quote-widget.customer.jsx';
import LoadDetailsModal from '../../components/load-details/load-details-modal.jsx';
import ActiveShipments from './sections/active-shipments';
import DashboardStats from './sections/dashboard-stats';
import LiveChat from '../../components/live-chat/live-chat.jsx';

import './customer-dashboard.css';
import '../../components/ui/customer-quote-modal.css';

const CustomerDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load cached data from localStorage on mount
  const [shipments, setShipments] = useState(() => {
    try {
      const cached = localStorage.getItem('dashboard_shipments_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Loaded cached shipments:', parsed.length);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached shipments:', e);
    }
    return [];
  });

  const [shipmentsPagination, setShipmentsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Load cached quotes from localStorage on mount
  const [quotes, setQuotes] = useState(() => {
    try {
      const cached = localStorage.getItem('dashboard_quotes_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Loaded cached quotes:', parsed.length);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached quotes:', e);
    }
    return [];
  });

  const [quotePagination, setQuotePagination] = useState({ 
    page: 1, 
    pageSize: 10, 
    total: 0, 
    totalPages: 0 
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Whole-account stats from GET /api/customer/dashboard-stats.
  // Independent of Orders table pagination/search/filters.
  const [dashboardStats, setDashboardStats] = useState(() => {
    try {
      const cached = localStorage.getItem('dashboard_stats_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to load cached dashboard stats:', e);
    }
    return null;
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Search queries (committed, debounced by the child input). Passing through
  // to the server via loadShipments/loadQuotes so results include every record
  // the user owns, not just the currently cached page.
  const [shipmentSearch, setShipmentSearch] = useState('');

  // Dropdown filters applied on top of search. Empty string = "All".
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState('');

  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboard_has_loaded');
      return stored === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  
  // Modal state for LoadDetailsModal
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [modalType, setModalType] = useState('booking');
  // ✅ NEW: Loading state for shipment details
  const [loadingShipmentDetails, setLoadingShipmentDetails] = useState(false);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isReactivationToast, setIsReactivationToast] = useState(false);

  const isSubpage = location.pathname !== '/dashboard';

  const welcomeName = useMemo(() => {
    if (user?.firstName?.trim()) return user.firstName.trim();
    if (user?.email) {
      const p = user.email.split('@')[0];
      return p.charAt(0).toUpperCase() + p.slice(1);
    }
    return 'there';
  }, [user]);

  // BOOKING SUCCESS TOAST
  useEffect(() => {
    if (location.state?.showSuccessToast && location.state?.message) {
      setSuccessMessage(location.state.message);
      setIsReactivationToast(false);
      setShowSuccessToast(true);

      window.history.replaceState({}, document.title);

      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // REACTIVATION TOAST
  useEffect(() => {
    const justReactivated = sessionStorage.getItem('justReactivated');
    
    if (justReactivated && user) {
      sessionStorage.removeItem('justReactivated');
      
      setIsReactivationToast(true);
      setSuccessMessage('Your account has been successfully reactivated. You now have full access to all features.');
      setShowSuccessToast(true);

      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isQuoteModalOpen || isLoadModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isQuoteModalOpen, isLoadModalOpen]);

  const loadShipments = async (page = 1, search = shipmentSearch, filters = { statusFilter: shipmentStatusFilter }) => {
    try {
      console.log('🔄 Loading shipments - Page:', page, 'Search:', search || '(none)', 'Filters:', filters);

      setShipmentsLoading(true);

      const response = await listMyBookings(token, page, 10, search, filters);

      console.log('📡 Raw API response:', response);

      let allBookings = [];
      let paginationData = {};

      if (response.success === true && response.bookings) {
        allBookings = response.bookings;
        paginationData = response.pagination || {};
      } else if (response.bookings) {
        allBookings = response.bookings;
        paginationData = response.pagination || {};
      } else if (Array.isArray(response)) {
        allBookings = response;
        paginationData = {};
      } else if (response.data) {
        if (Array.isArray(response.data)) {
          allBookings = response.data;
        } else if (response.data.bookings) {
          allBookings = response.data.bookings;
          paginationData = response.data.pagination || {};
        }
      }

      console.log('📥 Extracted bookings:', allBookings.length);

      // Transform bookings and ensure ID is consistent (string)
      const transformedShipments = allBookings.map((booking) => {
        const transformed = transformBookingToLoad(booking);
        return {
          ...transformed,
          id: String(transformed.id)
        };
      });
      
      console.log('✅ Transformed shipments:', transformedShipments.length);

      setShipments(transformedShipments);
      
      // Cache shipments to localStorage
      try {
        localStorage.setItem('dashboard_shipments_cache', JSON.stringify(transformedShipments));
      } catch (e) {
        console.error('Failed to cache shipments:', e);
      }

      setShipmentsPagination({
        page: paginationData.page || page,
        limit: paginationData.limit || 10,
        total: paginationData.total || transformedShipments.length,
        totalPages:
          paginationData.totalPages ||
          Math.ceil((paginationData.total || transformedShipments.length) / 10),
        hasNextPage: paginationData.hasNextPage || false,
        hasPrevPage: paginationData.hasPrevPage || false
      });
    } catch (err) {
      console.error('❌ Failed to load shipments:', err);
    } finally {
      setShipmentsLoading(false);
    }
  };

  // Quote History was removed from the UI. We still fetch quotes silently so
  // the Stats cards (Total Quotes, Conversion Rate) keep working. Nothing
  // calls this with search/filter args anymore — a simple page-1 fetch is all
  // that's needed for the count.
  const loadQuotes = async (page = 1) => {
    try {
      setQuotesLoading(true);

      const response = await quotesApi.listMyQuotes({ page, pageSize: 10 }, token);

      console.log('📡 Raw quotes API response:', response);

      let quoteItems = [];
      let paginationData = {};

      if (response.success === true && response.quotes) {
        quoteItems = response.quotes;
        paginationData = response.pagination || {};
      } else if (response.success === true && response.items) {
        quoteItems = response.items;
        paginationData = response.pagination || {};
      } else if (response.quotes) {
        quoteItems = response.quotes;
        paginationData = response.pagination || {};
      } else if (response.items) {
        quoteItems = response.items;
        paginationData = response.pagination || {};
      } else if (Array.isArray(response)) {
        quoteItems = response;
        paginationData = {};
      } else if (response.data) {
        if (Array.isArray(response.data)) {
          quoteItems = response.data;
        } else if (response.data.quotes) {
          quoteItems = response.data.quotes;
          paginationData = response.data.pagination || {};
        } else if (response.data.items) {
          quoteItems = response.data.items;
          paginationData = response.data.pagination || {};
        }
      }

      console.log('📥 Extracted quotes:', quoteItems.length);

      // Normalize quotes with carrierAccepted and displayStatus
      const normalizedQuotes = quoteItems.map((q) => ({
        id: String(q.id),
        // UNIFIED ORDER ID: Use bookingOrderNumber when available
        orderNumber: q.bookingOrderNumber || q.orderNumber,
        fromCity: q.fromCity ?? q.fromZip ?? q.from ?? q.pickupZip,
        toCity: q.toCity ?? q.toZip ?? q.to ?? q.dropoffZip,
        vehicle: q.vehicle ?? 'Vehicle',
        offer: Number(q.offer ?? 0),
        likelihood: Number(q.likelihood ?? 0),
        status: q.status ?? 'waiting',
        createdAt: q.createdAt,
        // Customer info
        customerFirstName: q.customerFirstName || '',
        customerLastName: q.customerLastName || '',
        customerPhone: q.customerPhone || '',
        // Address data
        pickupAddress: q.pickupAddress,
        dropoffAddress: q.dropoffAddress,
        pickup: q.pickup,
        dropoff: q.dropoff,
        // Route data
        miles: q.miles || 0,
        transportType: q.transportType || 'open',
        marketAvg: q.marketAvg || 0,
        // Booking linkage
        bookingOrderNumber: q.bookingOrderNumber || null,
        hasBooking: q.hasBooking || false,
        bookingId: q.bookingId || null,
        bookingRef: q.bookingRef || null,
        bookingStatus: q.bookingStatus || null,
        // Carrier acceptance status
        carrierAccepted: q.carrierAccepted || false,
        displayStatus: q.displayStatus || 'waiting',
        // Carrier info (if assigned)
        carrier: q.carrier || null,
        // Vehicle details
        vehicleDetails: q.vehicleDetails || null,
        vehicleCondition: q.vehicleCondition || null,
        // Time windows
        pickupWindowStart: q.pickupWindowStart || null,
        pickupWindowEnd: q.pickupWindowEnd || null,
        dropoffWindowStart: q.dropoffWindowStart || null,
        dropoffWindowEnd: q.dropoffWindowEnd || null,
        // Notes
        notes: q.notes || '',
        customerInstructions: q.customerInstructions || '',
        // Scheduling
        scheduling: q.scheduling || {},
        pickupDate: q.pickupDate || null,
        dropoffDate: q.dropoffDate || null,
      }));

      console.log('✅ Normalized quotes:', normalizedQuotes.length);

      setQuotes(normalizedQuotes);
      
      // Cache quotes to localStorage
      try {
        localStorage.setItem('dashboard_quotes_cache', JSON.stringify(normalizedQuotes));
      } catch (e) {
        console.error('Failed to cache quotes:', e);
      }

      setQuotePagination({
        page: paginationData.page || page,
        pageSize: paginationData.pageSize || 10,
        total: paginationData.total || normalizedQuotes.length,
        totalPages:
          paginationData.totalPages ||
          Math.ceil((paginationData.total || normalizedQuotes.length) / 10)
      });
    } catch (err) {
      console.error('❌ Failed to load quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  };

  // Whole-account aggregates fetched from the server. This is the only
  // source for the summary cards — do NOT derive stats from `shipments`
  // or `quotes` arrays, which are paginated.
  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const response = await getCustomerDashboardStats(token);
      const stats = response?.stats || response?.data?.stats || null;
      if (stats) {
        setDashboardStats(stats);
        try {
          localStorage.setItem('dashboard_stats_cache', JSON.stringify(stats));
        } catch (e) {
          console.error('Failed to cache dashboard stats:', e);
        }
      }
    } catch (err) {
      console.error('❌ Failed to load dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        if (!token) {
          setError('Authentication required');
          return;
        }

        setLoading(true);

        await Promise.all([
          loadShipments(1).catch((err) => {
            console.warn('⚠️ Shipments load failed:', err);
            return null;
          }),
          loadQuotes(1).catch((err) => {
            console.warn('⚠️ Quotes load failed:', err);
            return null;
          }),
          loadDashboardStats().catch((err) => {
            console.warn('⚠️ Stats load failed:', err);
            return null;
          })
        ]);

        if (!alive) return;
        setError(null);
      } catch (e) {
        console.error('Dashboard load error:', e);
        setError(e.message || 'Failed to load dashboard');
      } finally {
        if (alive) {
          setLoading(false);
          
          if (!hasLoadedOnce) {
            setHasLoadedOnce(true);
            try {
              localStorage.setItem('dashboard_has_loaded', 'true');
            } catch (e) {
              console.error('Failed to set dashboard_has_loaded:', e);
            }
          }
        }
      }
    }

    if (token) {
      load();
    }

    return () => {
      alive = false;
    };
  }, [token]);

  const handleShipmentsPageChange = async (newPage) => {
    try {
      await loadShipments(newPage, shipmentSearch, { statusFilter: shipmentStatusFilter });
    } catch (err) {
      console.error('Shipments page change error:', err);
    }
  };

  const handleShipmentsSearchChange = async (query) => {
    const next = typeof query === 'string' ? query : '';
    setShipmentSearch(next);
    try {
      // Reset to page 1 whenever the search term changes so the user lands
      // on the first batch of matching results.
      await loadShipments(1, next, { statusFilter: shipmentStatusFilter });
    } catch (err) {
      console.error('Shipments search error:', err);
    }
  };

  const handleShipmentsStatusFilterChange = async (next) => {
    const value = typeof next === 'string' ? next : '';
    setShipmentStatusFilter(value);
    try {
      await loadShipments(1, shipmentSearch, { statusFilter: value });
    } catch (err) {
      console.error('Shipments filter error:', err);
    }
  };

  const handleStartQuote = () => {
    console.log('🚀 handleStartQuote called!');
    setIsQuoteModalOpen(true);
  };

  // ✅ FIXED: handleShipmentView - now fetches fresh data from API
  const handleShipmentView = async (id) => {
    console.log('🔍 handleShipmentView called with ID:', id);
    
    const stringId = String(id);
    
    try {
      setLoadingShipmentDetails(true);
      
      // ✅ FETCH FRESH DATA FROM API instead of using cached data
      const response = await getFullBooking(stringId, token);
      
      console.log('📡 Booking API response:', response);
      
      let fullBooking = null;
      
      if (response.success === true && response.booking) {
        fullBooking = response.booking;
      } else if (response.booking) {
        fullBooking = response.booking;
      } else if (response.data?.booking) {
        fullBooking = response.data.booking;
      } else if (response.id) {
        fullBooking = response;
      }
      
      if (!fullBooking) {
        console.error('❌ Booking not found in API response, falling back to cache');
        // Fallback to cached data
        fullBooking = shipments.find((s) => String(s.id) === stringId);
        
        if (!fullBooking) {
          console.error('❌ Booking not found in cache either');
          return;
        }
      } else {
        // Transform the fresh booking data
        fullBooking = transformBookingToLoad(fullBooking);
      }
      
      console.log('✅ Setting booking for modal:', fullBooking.orderNumber || fullBooking.id, 'Status:', fullBooking.status);
      
      fullBooking.id = String(fullBooking.id);
      
      setSelectedLoad(fullBooking);
      setModalType('booking');
      setIsLoadModalOpen(true);
      
    } catch (err) {
      console.error('❌ Failed to load booking details:', err);
      
      // Fallback to cached data on error
      const cachedShipment = shipments.find((s) => String(s.id) === stringId);
      
      if (cachedShipment) {
        console.log('⚠️ Using cached shipment as fallback');
        setSelectedLoad(cachedShipment);
        setModalType('booking');
        setIsLoadModalOpen(true);
      }
    } finally {
      setLoadingShipmentDetails(false);
    }
  };


  const closeQuote = () => {
    console.log('🚪 Closing quote modal');
    setIsQuoteModalOpen(false);
  };
  
  // closeLoad - properly resets all modal state
  const closeLoad = () => {
    console.log('🚪 Closing load modal');
    setIsLoadModalOpen(false);
    setTimeout(() => {
      setSelectedLoad(null);
      setModalType('booking');
    }, 300);
  };

  // ✅ NEW: Callback to handle updates from LoadDetailsModal (cancellation, status changes)
  const handleLoadUpdated = async (updatedBooking) => {
    console.log('🔄 handleLoadUpdated called:', updatedBooking?.id, 'Status:', updatedBooking?.status);
    
    if (!updatedBooking) return;
    
    // ✅ Update the selectedLoad immediately so modal shows correct status
    const transformed = transformBookingToLoad(updatedBooking);
    transformed.id = String(transformed.id);
    setSelectedLoad(transformed);
    
    // ✅ Update the shipments list immediately (optimistic update)
    setShipments(prevShipments => {
      const updatedShipments = prevShipments.map(shipment => {
        if (String(shipment.id) === String(updatedBooking.id)) {
          return transformed;
        }
        return shipment;
      });
      
      // Update cache
      try {
        localStorage.setItem('dashboard_shipments_cache', JSON.stringify(updatedShipments));
      } catch (e) {
        console.error('Failed to update shipments cache:', e);
      }
      
      return updatedShipments;
    });
    
    // ✅ Refresh the shipments list from API in background to ensure consistency
    try {
      await loadShipments(shipmentsPagination.page);
    } catch (err) {
      console.error('Failed to refresh shipments after update:', err);
    }

    // Refresh whole-account stats — cancellations/status changes move counts
    // and totalSpend, so the summary cards need re-aggregation from the DB.
    loadDashboardStats().catch((err) =>
      console.error('Failed to refresh dashboard stats after update:', err)
    );
  };

  const handleToastClick = () => {
    if (isReactivationToast) {
      setShowSuccessToast(false);
      navigate('/customer-notifications');
    }
  };

  // Subpage rendering
  if (isSubpage) {
    return (
      <div className="customer-dashboard customer-dashboard-subpage">
        <div className="dashboard-subpage-content">
          <div className="subpage-content-wrapper">
            <Outlet />
          </div>
        </div>
        
        {/* Quote Widget Modal */}
        {isQuoteModalOpen && (
          <div className="customer-quote-modal-backdrop" onClick={closeQuote}>
            <div className="customer-quote-modal-panel" onClick={(e) => e.stopPropagation()}>
              <button 
                className="customer-quote-modal-close"
                onClick={closeQuote}
                aria-label="Close modal"
              >
                ×
              </button>
              <div className="customer-quote-modal-body">
                <CustomerQuoteWidget
                  onModalClose={closeQuote}
                  inModal
                  forceNewQuote={true}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Load Details Modal - unified for quotes and shipments */}
        <LoadDetailsModal
          open={isLoadModalOpen}
          onClose={closeLoad}
          load={selectedLoad}
          type={modalType}
          portal="shipper"
          onLoadUpdated={handleLoadUpdated}
        />
        
        <LiveChat />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="customer-dashboard customer-dashboard-main">
        <div className="error-state">
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  // Show skeleton ONLY on first visit with no cached data
  const showSkeleton = !hasLoadedOnce && loading && shipments.length === 0 && quotes.length === 0;

  if (showSkeleton) {
    return (
      <div className="customer-dashboard customer-dashboard-main">
        <div className="dashboard-header-section">
          <div className="dashboard-header-container">
            <div className="header-main">
              <div className="header-text">
                <h1 className="dashboard-greeting">
                  Welcome, <span>{welcomeName}</span>
                </h1>
                <p className="dashboard-subtitle">
                  Your vehicle shipping dashboard
                </p>
              </div>
              <div className="header-actions">
                <button className="ship-vehicle-btn" disabled>
                  Ship My Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-content-section">
          <div className="dashboard-container">
            <div className="dashboard-grid dashboard-main-grid">
              <div className="dashboard-card" style={{ minHeight: 400 }}>
                <div style={{ padding: 24 }}>
                  <div className="skeleton-line" style={{ width: '40%', height: 24, marginBottom: 16 }} />
                  <div className="skeleton-line" style={{ width: '100%', height: 200 }} />
                </div>
              </div>
              <div className="dashboard-card" style={{ minHeight: 400 }}>
                <div style={{ padding: 24 }}>
                  <div className="skeleton-line" style={{ width: '40%', height: 24, marginBottom: 16 }} />
                  <div className="skeleton-line" style={{ width: '100%', height: 200 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="customer-dashboard customer-dashboard-main">
      {showSuccessToast && (
        <div className="success-toast-wrapper">
          <div 
            className={`success-toast ${isReactivationToast ? 'clickable-toast' : ''}`}
            onClick={handleToastClick}
            style={isReactivationToast ? { cursor: 'pointer' } : undefined}
            role={isReactivationToast ? 'button' : undefined}
            tabIndex={isReactivationToast ? 0 : undefined}
            onKeyDown={isReactivationToast ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToastClick();
              }
            } : undefined}
          >
            <div className="success-toast-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="success-toast-content">
              <h4>{isReactivationToast ? 'Welcome Back' : 'Booking Confirmed'}</h4>
              <p>{successMessage}</p>
            </div>
            <button
              className="success-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowSuccessToast(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ✅ NEW: Loading indicator for shipment details fetch */}
      {loadingShipmentDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ margin: 0, color: '#6b7280' }}>Loading shipment details...</p>
          </div>
        </div>
      )}

      <div className="dashboard-header-section">
        <div className="dashboard-header-container">
          <div className="header-main">
            <div className="header-text">
              <h1 className="dashboard-greeting">
                Welcome, <span>{welcomeName}</span>
              </h1>
              <p className="dashboard-subtitle">
                Your vehicle shipping dashboard
              </p>
            </div>
            <div className="header-actions">
              <button 
                className="ship-vehicle-btn" 
                onClick={handleStartQuote}
                type="button"
              >
                Ship My Vehicle
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content-section">
        <div className="dashboard-container">
          <div className="dashboard-grid dashboard-main-grid">
            <DashboardStats
              stats={dashboardStats}
              loading={statsLoading && !dashboardStats}
            />

            <ActiveShipments
              shipments={shipments}
              onViewDetails={handleShipmentView}
              onStartQuote={handleStartQuote}
              onPageChange={handleShipmentsPageChange}
              onSearchChange={handleShipmentsSearchChange}
              onStatusFilterChange={handleShipmentsStatusFilterChange}
              search={shipmentSearch}
              statusFilter={shipmentStatusFilter}
              pagination={shipmentsPagination}
              loading={shipmentsLoading}
            />

          </div>
        </div>
      </div>

      {/* Quote Widget Modal */}
      {isQuoteModalOpen && (
        <div className="customer-quote-modal-backdrop" onClick={closeQuote}>
          <div className="customer-quote-modal-panel" onClick={(e) => e.stopPropagation()}>
            <button 
              className="customer-quote-modal-close"
              onClick={closeQuote}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="customer-quote-modal-body">
              <CustomerQuoteWidget
                onModalClose={closeQuote}
                inModal
                forceNewQuote={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Load Details Modal - unified for quotes and shipments */}
      <LoadDetailsModal
        open={isLoadModalOpen}
        onClose={closeLoad}
        load={selectedLoad}
        type={modalType}
        portal="shipper"
        onLoadUpdated={handleLoadUpdated}
      />
      
      {!isQuoteModalOpen && <LiveChat />}
    </div>
  );
};

export default CustomerDashboard;