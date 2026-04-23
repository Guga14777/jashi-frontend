import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PayoutRow, { PayoutCard } from './components/payout-row/payout-row';
import Pagination from '../../components/ui/pagination';
import { parseLocalDate } from '../../utils/date';
import { getCarrierPayouts } from '../../services/payments.api';
import PayoutDetailModal from './components/payout-detail-modal/payout-detail-modal';
import './payments.css';

/**
 * Carrier Payouts Page
 * ✅ UPDATED: 100% Real data from database
 * - Load ID: Real orderNumber like #1045
 * - Method: Only COD or ACH
 * - Reference: Real reference from CarrierPayout table
 */
const Payments = () => {
  // Helper functions
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const n = (v) => (typeof v === 'number' ? v : Number(v) || 0);

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: 'all', search: '' });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('payments-page-size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Data state - 100% from real API
  const [allPayouts, setAllPayouts] = useState([]);
  const [summary, setSummary] = useState({
    totalGross: 0,
    pendingCount: 0,
    pendingAmount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [activePayout, setActivePayout] = useState(null);

  // Debounced search
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(t);
  }, [searchValue]);
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
    setCurrentPage(1);
  }, [debouncedSearch]);

  /**
   * Fetch payouts from real API
   * ✅ Maps response to show real Load ID, Method, and Reference
   */
  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await getCarrierPayouts({
        status: filters.status !== 'all' ? filters.status : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: filters.search || undefined,
        page: 1,
        limit: 500 // Fetch all for client-side sorting/pagination
      });

      if (response.success) {
        // ✅ Map API response - all fields are REAL from database
        const cleaned = response.items.map(p => ({
          id: p.id,
          date: p.date,
          // ✅ Real reference from DB (e.g., REF-A3B7K9)
          reference: p.reference,
          // ✅ Real Load ID like #1045 (from booking.orderNumber)
          loadId: p.loadId || null,
          // Raw orderNumber for sorting
          orderNumber: p.orderNumber || null,
          grossAmount: n(p.grossAmount),
          netAmount: n(p.netAmount),
          status: p.status,
          // ✅ Method is only 'cod' or 'ach'
          paymentMethod: p.paymentMethod || p.method || 'ach',
          method: p.method || p.paymentMethod || 'ach',
          // ✅ Method label is 'COD' or 'ACH'
          methodLabel: p.methodLabel || (p.method === 'cod' ? 'COD' : 'ACH'),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          paidAt: p.paidAt,
          // ✅ Full booking object for modal details
          booking: p.booking
        }));

        setAllPayouts(cleaned);
        setSummary(response.summary);
      } else {
        throw new Error('Failed to fetch payouts');
      }
    } catch (e) {
      console.error('Error fetching payouts:', e);
      setError(e.message || "Failed to load payouts. Check your connection or try again.");
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.dateFrom, filters.dateTo, filters.search]);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem('payments-page-size', String(itemsPerPage));
  }, [itemsPerPage]);

  // Modal handlers
  const openDetails = useCallback((payout) => { setActivePayout(payout); setDetailOpen(true); }, []);
  const closeDetails = useCallback(() => { setDetailOpen(false); setTimeout(() => setActivePayout(null), 200); }, []);

  const statusOrder = { paid: 3, pending: 2, cancelled: 1, failed: 0 };

  const handleSort = useCallback((key) => {
    if (!['date', 'gross', 'status'].includes(key)) return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);
  const handleSearchChange = useCallback((value) => setSearchValue(value), []);
  const clearFilters = useCallback(() => {
    setFilters({ dateFrom: '', dateTo: '', status: 'all', search: '' });
    setSearchValue('');
    setCurrentPage(1);
  }, []);

  // Filtered + sorted (client-side sorting after API filter)
  const filteredPayouts = useMemo(() => {
    let filtered = [...allPayouts];

    // Additional client-side filtering if needed
    if (filters.dateFrom) {
      const from = parseLocalDate(filters.dateFrom);
      if (from) filtered = filtered.filter(p => {
        const d = parseLocalDate(p.date);
        return d && d >= from;
      });
    }
    if (filters.dateTo) {
      const to = parseLocalDate(filters.dateTo);
      if (to) {
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => {
          const d = parseLocalDate(p.date);
          return d && d <= to;
        });
      }
    }
    if (filters.status !== 'all') filtered = filtered.filter(p => p.status === filters.status);
    
    // ✅ Search by reference, loadId (#1045), or orderNumber (1045)
    if (filters.search) {
      const q = filters.search.toLowerCase().replace(/^#/, ''); // Remove # prefix
      filtered = filtered.filter(p =>
        p.reference?.toLowerCase().includes(q) ||
        p.loadId?.toLowerCase().includes(q) ||
        (p.orderNumber && String(p.orderNumber).includes(q))
      );
    }

    // Client-side sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let av, bv;
        switch (sortConfig.key) {
          case 'date': {
            const ad = parseLocalDate(a.date);
            const bd = parseLocalDate(b.date);
            av = ad ? ad.getTime() : 0;
            bv = bd ? bd.getTime() : 0;
            break;
          }
          case 'gross':
            av = n(a.grossAmount); bv = n(b.grossAmount); break;
          case 'status':
            av = statusOrder[a.status] ?? 0; bv = statusOrder[b.status] ?? 0; break;
          default: return 0;
        }
        const cmp = av === bv ? a.id.localeCompare(b.id) : (av - bv);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  }, [allPayouts, filters, sortConfig]);

  const paginatedPayouts = useMemo(() => {
    return filteredPayouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPayouts, currentPage, itemsPerPage]);

  // Use summary from API for KPIs
  const metrics = useMemo(() => {
    // If no client-side filtering applied, use server summary
    if (!filters.dateFrom && !filters.dateTo && filters.status === 'all' && !filters.search) {
      return summary;
    }
    
    // Otherwise calculate from filtered data
    const totalGross = filteredPayouts
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + n(p.grossAmount), 0);
    const pending = filteredPayouts.filter(p => p.status === 'pending');
    const pendingAmount = pending.reduce((s, p) => s + n(p.grossAmount), 0);
    return {
      totalGross,
      pendingCount: pending.length,
      pendingAmount,
      totalCount: filteredPayouts.length
    };
  }, [filteredPayouts, summary, filters]);

  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getAriaSort = (key) => (sortConfig.key !== key ? 'none' : (sortConfig.direction === 'asc' ? 'ascending' : 'descending'));

  const handleRetry = useCallback(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.search;

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    const live = document.getElementById('page-announcement');
    if (live) live.textContent = `Page ${page} of ${totalPages}`;
  }, [totalPages]);

  /**
   * ✅ Handle navigation to load details
   * Uses booking.id to navigate to load details page
   */
  const handleGoToLoad = useCallback((payout) => {
    if (payout?.booking?.id) {
      window.location.href = `/carrier/loads/${payout.booking.id}`;
    }
  }, []);

  if (loading) {
    return (
      <div className="payments-page">
        <div className="payments-wrapper">
          <div className="payments-container">
            <div className="payments-header">
              <h1 className="payments-title">Payouts & Earnings</h1>
            </div>
            <div className="payments-card" aria-busy>
              <div className="loading-state" role="status" aria-live="polite">
                <div className="skeleton-wrapper">
                  <div className="skeleton-row"></div>
                  <div className="skeleton-row"></div>
                  <div className="skeleton-row"></div>
                  <div className="skeleton-row"></div>
                </div>
                <p className="loading-text"><span className="sr-only">Loading payouts...</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="payments-page">
        <div className="payments-wrapper">
          <div className="payments-container">
            {/* Live region */}
            <div id="page-announcement" aria-live="polite" aria-atomic="true" className="sr-only" />

            {/* Header */}
            <div className="payments-header">
              <h1 className="payments-title">Payouts & Earnings</h1>
            </div>

            {/* KPIs */}
            <div className="payments-kpis">
              <div className="kpi-card">
                <div className="kpi-label">Total Gross</div>
                <div className="kpi-value">{formatPrice(n(metrics.totalGross))}</div>
                <div className="kpi-subtext">Total earnings</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Pending</div>
                <div className="kpi-value kpi-pending">
                  {metrics.pendingCount}
                  <span className="kpi-value-sub"> ({formatPrice(n(metrics.pendingAmount))})</span>
                </div>
                <div className="kpi-subtext">Awaiting processing</div>
              </div>
            </div>

            {/* Filters */}
            <div className="payments-filters">
              <div className="filters-grid">
                <div className="filter-group">
                  <label htmlFor="date-from">From</label>
                  <input
                    type="date"
                    id="date-from"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="date-to">To</label>
                  <input
                    type="date"
                    id="date-to"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="status-filter">Status</label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="filter-input"
                  >
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="search-filter">Search</label>
                  <input
                    type="text"
                    id="search-filter"
                    placeholder="Reference, load #..."
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="filter-input"
                    aria-label="Search payouts"
                    aria-controls="payments-table"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="page-size">Per page</label>
                  <select
                    id="page-size"
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                    className="filter-input"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <button className="filters-clear" onClick={clearFilters}>Clear Filters</button>
              )}
            </div>

            {/* Table / Cards */}
            <div className="payments-card">
              {error ? (
                <div className="error-state" role="alert" aria-live="assertive">
                  <div className="error-content">
                    <h3 className="error-title">Couldn't load payouts</h3>
                    <p className="error-text">{error}</p>
                    <button className="btn-retry" onClick={handleRetry}>Try Again</button>
                  </div>
                </div>
              ) : filteredPayouts.length > 0 ? (
                <>
                  {isMobile ? (
                    <div className="payout-cards-container">
                      {paginatedPayouts.map(payout => (
                        <PayoutCard
                          key={payout.id}
                          item={payout}
                          onView={openDetails}
                          formatPrice={formatPrice}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="payments-table-wrapper">
                      <table className="payments-table" id="payments-table">
                        <caption className="sr-only">Carrier payouts table</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="ref-col">Reference</th>
                            <th scope="col" className="sortable" aria-sort={getAriaSort('date')}>
                              <button className="sort-button" onClick={() => handleSort('date')} title="Sort by Date">
                                Date
                                {sortConfig.key === 'date' && (
                                  <span className={`sort-icon ${sortConfig.direction}`} aria-hidden="true">▼</span>
                                )}
                              </button>
                            </th>
                            <th scope="col" className="load-col">Load ID</th>
                            <th scope="col" className="sortable amount-col" aria-sort={getAriaSort('gross')}>
                              <button className="sort-button" onClick={() => handleSort('gross')} title="Sort by Amount">
                                Amount
                                {sortConfig.key === 'gross' && (
                                  <span className={`sort-icon ${sortConfig.direction}`} aria-hidden="true">▼</span>
                                )}
                              </button>
                            </th>
                            <th scope="col" className="method-col">Method</th>
                            <th scope="col" className="sortable" aria-sort={getAriaSort('status')}>
                              <button className="sort-button" onClick={() => handleSort('status')} title="Sort by Status">
                                Status
                                {sortConfig.key === 'status' && (
                                  <span className={`sort-icon ${sortConfig.direction}`} aria-hidden="true">▼</span>
                                )}
                              </button>
                            </th>
                            <th scope="col" className="actions-col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPayouts.map(payout => (
                            <PayoutRow
                              key={payout.id}
                              item={payout}
                              onView={openDetails}
                              formatPrice={formatPrice}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  <div className="payments-footer">
                    {totalPages > 1 && (
                      <div className="pagination-container">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-state" role="status" aria-live="polite">
                  <div className="empty-content">
                    <h3 className="empty-title">No payouts found</h3>
                    <p className="empty-text">
                      {hasActiveFilters
                        ? "No payouts match your filters. Try adjusting them."
                        : "You don't have any payouts yet. Payouts are created when loads are delivered."}
                    </p>
                    {hasActiveFilters && (
                      <button className="btn-clear-filters" onClick={clearFilters}>Clear Filters</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <PayoutDetailModal
        open={detailOpen}
        payout={activePayout}
        onClose={closeDetails}
        formatPrice={formatPrice}
        onGoToLoad={handleGoToLoad}
      />
    </>
  );
};

export default Payments;