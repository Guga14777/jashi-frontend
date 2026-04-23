// ============================================================
// FILE: src/pages/admin/carriers-admin.jsx
// Professional Carriers Admin with clean table layout
// ============================================================

import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import './carriers-admin.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';
const ITEMS_PER_PAGE = 10;

export default function CarriersAdmin() {
  const { token } = useAuth();
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCarrier, setExpandedCarrier] = useState(null);
  const [carrierOrders, setCarrierOrders] = useState({});
  const [loadingOrders, setLoadingOrders] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCarriers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/users?role=CARRIER`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch carriers');

      const data = await response.json();
      setCarriers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCarrierOrders = async (carrierId) => {
    if (carrierOrders[carrierId]) return;
    
    setLoadingOrders(prev => ({ ...prev, [carrierId]: true }));
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      const orders = (data.orders || []).filter(o => o.carrier?.id === carrierId);
      setCarrierOrders(prev => ({ ...prev, [carrierId]: orders }));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingOrders(prev => ({ ...prev, [carrierId]: false }));
    }
  };

  const toggleCarrier = (carrierId) => {
    if (expandedCarrier === carrierId) {
      setExpandedCarrier(null);
    } else {
      setExpandedCarrier(carrierId);
      fetchCarrierOrders(carrierId);
    }
  };

  useEffect(() => {
    if (token) fetchCarriers();
  }, [token]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(amount);
  };

  const filteredCarriers = carriers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      searchTerm === '' ||
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(searchTerm) ||
      c.companyName?.toLowerCase().includes(search) ||
      c.mcNumber?.includes(searchTerm) ||
      c.dotNumber?.includes(searchTerm)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredCarriers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCarriers = filteredCarriers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page) => {
    setCurrentPage(page);
    setExpandedCarrier(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="carriers-admin">
        <div className="carriers-loading">
          <div className="spinner"></div>
          <span>Loading carriers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="carriers-admin">
        <div className="carriers-error">
          <p>Error: {error}</p>
          <button onClick={fetchCarriers}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="carriers-admin">
      <header className="carriers-header">
        <h1>Carriers</h1>
        <p>
          {filteredCarriers.length === carriers.length 
            ? `${carriers.length} registered carriers`
            : `Showing ${filteredCarriers.length} of ${carriers.length} carriers`}
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </p>
      </header>

      <div className="carriers-filters">
        <input
          type="text"
          className="carriers-search"
          placeholder="Search by name, email, company, MC#, DOT#..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="carriers-table-wrapper">
        <table className="carriers-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Company</th>
              <th>MC #</th>
              <th>DOT #</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedCarriers.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-results">
                  No carriers found
                </td>
              </tr>
            ) : (
              paginatedCarriers.map((carrier) => (
                <React.Fragment key={carrier.id}>
                  <tr 
                    className={`carrier-row ${expandedCarrier === carrier.id ? 'expanded' : ''}`}
                    onClick={() => toggleCarrier(carrier.id)}
                  >
                    <td className="carrier-cell">
                      <div className="carrier-info">
                        <span className="carrier-name">
                          {carrier.firstName} {carrier.lastName}
                        </span>
                        <span className="carrier-email">{carrier.email}</span>
                      </div>
                    </td>
                    <td className="company-cell">
                      {carrier.companyName || <span className="no-data">-</span>}
                    </td>
                    <td className="mc-cell">
                      {carrier.mcNumber ? (
                        <span className="id-badge mc">{carrier.mcNumber}</span>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                    <td className="dot-cell">
                      {carrier.dotNumber ? (
                        <span className="id-badge dot">{carrier.dotNumber}</span>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                    <td className="phone-cell">
                      {carrier.phone ? (
                        <a 
                          href={`tel:${carrier.phone}`} 
                          className="phone-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={14} />
                          {carrier.phone}
                        </a>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                    <td className="date-cell">
                      {formatDate(carrier.createdAt)}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${carrier.isActive ? 'active' : 'inactive'}`}>
                        {carrier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="expand-cell">
                      <button className="expand-btn">
                        {expandedCarrier === carrier.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedCarrier === carrier.id && (
                    <tr className="details-row">
                      <td colSpan="8">
                        <div className="carrier-details">
                          <div className="details-section">
                            <h4>Carrier Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <span className="info-label">Full Name</span>
                                <span className="info-value">{carrier.firstName} {carrier.lastName}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Company</span>
                                <span className="info-value">{carrier.companyName || '-'}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Email</span>
                                <a href={`mailto:${carrier.email}`} className="info-link">
                                  <Mail size={14} />
                                  {carrier.email}
                                </a>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Phone</span>
                                {carrier.phone ? (
                                  <a href={`tel:${carrier.phone}`} className="info-link">
                                    <Phone size={14} />
                                    {carrier.phone}
                                  </a>
                                ) : (
                                  <span className="info-value">-</span>
                                )}
                              </div>
                              <div className="info-item">
                                <span className="info-label">MC Number</span>
                                <span className="info-value">{carrier.mcNumber || '-'}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">DOT Number</span>
                                <span className="info-value">{carrier.dotNumber || '-'}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Cargo Insurance</span>
                                <span className="info-value">{carrier.hasCargoInsurance ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Member Since</span>
                                <span className="info-value">
                                  <Calendar size={14} />
                                  {formatDate(carrier.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="details-section">
                            <h4>Accepted Loads</h4>
                            {loadingOrders[carrier.id] ? (
                              <div className="orders-loading">
                                <div className="spinner small"></div>
                                <span>Loading loads...</span>
                              </div>
                            ) : carrierOrders[carrier.id]?.length > 0 ? (
                              <div className="orders-mini-table">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Order #</th>
                                      <th>Route</th>
                                      <th>Customer</th>
                                      <th>Vehicle</th>
                                      <th>Price</th>
                                      <th>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {carrierOrders[carrier.id].map(order => (
                                      <tr key={order.id}>
                                        <td className="order-num">#{order.orderNumber}</td>
                                        <td className="order-route">
                                          {order.fromCity || '-'} → {order.toCity || '-'}
                                        </td>
                                        <td>{order.customer?.firstName} {order.customer?.lastName}</td>
                                        <td>{order.vehicle || '-'}</td>
                                        <td className="order-price">{formatCurrency(order.price)}</td>
                                        <td className="order-date">{formatDate(order.createdAt)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="no-orders">No accepted loads for this carrier</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="carriers-pagination">
          <button 
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="pagination-ellipsis">...</span>
                  )}
                  <button
                    className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))
            }
          </div>
          
          <button 
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}