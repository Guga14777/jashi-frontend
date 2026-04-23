// ============================================================
// FILE: src/pages/dashboard/quotes/quotes.jsx
// ✅ UPDATED: 4-step status flow + uses existing CSS classes
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/auth-context';
import LoadDetailsModal from '../../../components/load-details/load-details-modal';
import Pagination from '../../../components/ui/pagination';
import './quotes.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

// ============================================================
// ✅ STATUS CONSTANTS - 4-step flow
// ============================================================
const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
};

// ✅ Normalize status to 4-step flow
const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  const s = status.toLowerCase();
  
  if (['waiting', 'pending', 'booked', 'scheduled'].includes(s)) {
    return SHIPMENT_STATUS.SCHEDULED;
  }
  if (['assigned', 'accepted', 'dispatched'].includes(s)) {
    return SHIPMENT_STATUS.ASSIGNED;
  }
  if (['picked_up', 'in_transit', 'pickup_complete'].includes(s)) {
    return SHIPMENT_STATUS.PICKED_UP;
  }
  if (['delivered', 'completed', 'done'].includes(s)) {
    return SHIPMENT_STATUS.DELIVERED;
  }
  
  return SHIPMENT_STATUS.SCHEDULED;
};

// ============================================================
// MAIN QUOTES COMPONENT
// ============================================================
const Quotes = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      const quotesData = data?.quotes || data || [];
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to load quotes');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Parse vehicles from quote
  const parseVehicles = (quote) => {
    if (quote.vehicles) {
      if (Array.isArray(quote.vehicles)) return quote.vehicles;
      if (typeof quote.vehicles === 'string') {
        try { return JSON.parse(quote.vehicles); } catch { return []; }
      }
    }
    if (quote.vehicle) {
      return [{ 
        year: '', 
        make: quote.vehicle.split(' ')[0] || '', 
        model: quote.vehicle.split(' ').slice(1).join(' ') || quote.vehicle 
      }];
    }
    return [];
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  // Check if quote is booked
  const isBooked = (quote) => {
    return quote.bookings?.length > 0 || quote.status === 'booked';
  };

  // Get booking status from quote
  const getBookingStatus = (quote) => {
    if (quote.bookings?.length > 0) {
      return quote.bookings[0].status;
    }
    return null;
  };

  // Get order number to display
  const getDisplayOrderNumber = (quote) => {
    if (quote.bookings?.length > 0 && quote.bookings[0].orderNumber) {
      return `#${quote.bookings[0].orderNumber}`;
    }
    if (quote.orderNumber) {
      return `#${quote.orderNumber}`;
    }
    return 'N/A';
  };

  // Get status badge class
  const getStatusBadgeClass = (quote) => {
    if (!isBooked(quote)) {
      return 'status-waiting';
    }
    const status = normalizeStatus(getBookingStatus(quote));
    switch (status) {
      case SHIPMENT_STATUS.SCHEDULED:
        return 'status-waiting';
      case SHIPMENT_STATUS.ASSIGNED:
        return 'status-accepted';
      case SHIPMENT_STATUS.PICKED_UP:
        return 'status-accepted';
      case SHIPMENT_STATUS.DELIVERED:
        return 'status-accepted';
      default:
        return 'status-waiting';
    }
  };

  // Get status label
  const getStatusLabel = (quote) => {
    if (!isBooked(quote)) {
      return 'Pending';
    }
    const status = normalizeStatus(getBookingStatus(quote));
    return STATUS_LABELS[status] || 'Pending';
  };

  // Get likelihood badge class
  const getLikelihoodClass = (likelihood) => {
    if (likelihood >= 70) return 'likelihood-high';
    if (likelihood >= 40) return 'likelihood-medium';
    return 'likelihood-low';
  };

  // Handle view details
  const handleViewDetails = (quote) => {
    setSelectedQuote(quote);
    setModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedQuote(null);
  };

  // Book quote handler
  const handleBookQuote = (quoteId) => {
    navigate(`/book/${quoteId}`);
  };

  // Pagination
  const totalPages = Math.ceil(quotes.length / itemsPerPage);
  const paginatedQuotes = quotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="quotes-page">
        <div className="quotes-header">
          <h1>Quote History</h1>
          <p className="quotes-subtitle">View and manage your shipping quotes</p>
        </div>
        <div className="quotes-loading">Loading quotes...</div>
      </div>
    );
  }

  return (
    <div className="quotes-page">
      <div className="quotes-header">
        <h1>Quote History</h1>
        <p className="quotes-subtitle">View and manage your shipping quotes</p>
      </div>

      {error && (
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchQuotes}>Try Again</button>
        </div>
      )}

      {!error && quotes.length === 0 && (
        <div className="empty-state">
          <p>No quotes found. Get started by requesting a shipping quote.</p>
          <button className="btn-primary" onClick={() => navigate('/quote')}>
            Get a Quote
          </button>
        </div>
      )}

      {!error && quotes.length > 0 && (
        <div className="quotes-table">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Route</th>
                <th>Miles</th>
                <th>Price</th>
                <th>Likelihood</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuotes.map((quote) => {
                const vehicles = parseVehicles(quote);
                const vehicleDisplay = vehicles.length > 0 
                  ? `${vehicles[0].year || ''} ${vehicles[0].make || ''} ${vehicles[0].model || ''}`.trim()
                  : quote.vehicle || 'Vehicle';
                const booked = isBooked(quote);

                return (
                  <tr key={quote.id}>
                    <td>{getDisplayOrderNumber(quote)}</td>
                    <td>{formatDate(quote.createdAt)}</td>
                    <td>
                      {vehicleDisplay}
                      {vehicles.length > 1 && <span style={{ color: '#6b7280' }}> +{vehicles.length - 1}</span>}
                    </td>
                    <td>{quote.fromZip} → {quote.toZip}</td>
                    <td>{quote.miles || 0}</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(quote.offer)}</td>
                    <td>
                      <span className={`likelihood-badge ${getLikelihoodClass(quote.likelihood)}`}>
                        {quote.likelihood || 0}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(quote)}`}>
                        {getStatusLabel(quote)}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewDetails(quote)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="quote-history-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Load Details Modal */}
      <LoadDetailsModal
        open={modalOpen}
        onClose={handleModalClose}
        load={selectedQuote}
        type="quote"
        portal="shipper"
      />
    </div>
  );
};

export default Quotes;

// Export for reuse
export { normalizeStatus, SHIPMENT_STATUS, STATUS_LABELS };