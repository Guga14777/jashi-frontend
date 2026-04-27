// ============================================================
// FILE: src/pages/admin/customers-admin.jsx
// Professional Customers Admin with clean table layout
// ============================================================

import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import './customers-admin.css';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../lib/api-url.js';
const ITEMS_PER_PAGE = 10;

export default function CustomersAdmin() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState({});
  const [loadingOrders, setLoadingOrders] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/users?role=CUSTOMER`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch customers');

      const data = await response.json();
      setCustomers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    if (customerOrders[customerId]) return;
    
    setLoadingOrders(prev => ({ ...prev, [customerId]: true }));
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      const orders = (data.orders || []).filter(o => o.customer?.id === customerId);
      setCustomerOrders(prev => ({ ...prev, [customerId]: orders }));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingOrders(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const toggleCustomer = (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(customerId);
      fetchCustomerOrders(customerId);
    }
  };

  useEffect(() => {
    if (token) fetchCustomers();
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

  const filteredCustomers = customers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      searchTerm === '' ||
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(searchTerm)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page) => {
    setCurrentPage(page);
    setExpandedCustomer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="customers-admin">
        <div className="customers-loading">
          <div className="spinner"></div>
          <span>Loading customers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customers-admin">
        <div className="customers-error">
          <p>Error: {error}</p>
          <button onClick={fetchCustomers}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="customers-admin">
      <header className="customers-header">
        <h1>Customers</h1>
        <p>
          {filteredCustomers.length === customers.length 
            ? `${customers.length} registered customers`
            : `Showing ${filteredCustomers.length} of ${customers.length} customers`}
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </p>
      </header>

      <div className="customers-filters">
        <input
          type="text"
          className="customers-search"
          placeholder="Search by name, email, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Quotes</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-results">
                  No customers found
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer) => (
                <React.Fragment key={customer.id}>
                  <tr 
                    className={`customer-row ${expandedCustomer === customer.id ? 'expanded' : ''}`}
                    onClick={() => toggleCustomer(customer.id)}
                  >
                    <td className="customer-cell">
                      <div className="customer-info">
                        <span className="customer-name">
                          {customer.firstName} {customer.lastName}
                        </span>
                        <span className="customer-email">{customer.email}</span>
                      </div>
                    </td>
                    <td className="phone-cell">
                      {customer.phone ? (
                        <a 
                          href={`tel:${customer.phone}`} 
                          className="phone-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={14} />
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="no-phone">-</span>
                      )}
                    </td>
                    <td className="stat-cell">
                      <span className="stat-badge orders">
                        {customer._count?.bookings || 0}
                      </span>
                    </td>
                    <td className="stat-cell">
                      <span className="stat-badge quotes">
                        {customer._count?.quotes || 0}
                      </span>
                    </td>
                    <td className="date-cell">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${customer.isActive ? 'active' : 'inactive'}`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="expand-cell">
                      <button className="expand-btn">
                        {expandedCustomer === customer.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedCustomer === customer.id && (
                    <tr className="details-row">
                      <td colSpan="7">
                        <div className="customer-details">
                          <div className="details-section">
                            <h4>Customer Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <span className="info-label">Full Name</span>
                                <span className="info-value">{customer.firstName} {customer.lastName}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Email</span>
                                <a href={`mailto:${customer.email}`} className="info-link">
                                  <Mail size={14} />
                                  {customer.email}
                                </a>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Phone</span>
                                {customer.phone ? (
                                  <a href={`tel:${customer.phone}`} className="info-link">
                                    <Phone size={14} />
                                    {customer.phone}
                                  </a>
                                ) : (
                                  <span className="info-value">-</span>
                                )}
                              </div>
                              <div className="info-item">
                                <span className="info-label">Member Since</span>
                                <span className="info-value">
                                  <Calendar size={14} />
                                  {formatDate(customer.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="details-section">
                            <h4>Order History</h4>
                            {loadingOrders[customer.id] ? (
                              <div className="orders-loading">
                                <div className="spinner small"></div>
                                <span>Loading orders...</span>
                              </div>
                            ) : customerOrders[customer.id]?.length > 0 ? (
                              <div className="orders-mini-table">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Order #</th>
                                      <th>Route</th>
                                      <th>Vehicle</th>
                                      <th>Price</th>
                                      <th>Status</th>
                                      <th>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customerOrders[customer.id].map(order => (
                                      <tr key={order.id}>
                                        <td className="order-num">#{order.orderNumber}</td>
                                        <td className="order-route">
                                          {order.fromCity || '-'} → {order.toCity || '-'}
                                        </td>
                                        <td>{order.vehicle || '-'}</td>
                                        <td className="order-price">{formatCurrency(order.price)}</td>
                                        <td>
                                          <span className={`mini-status ${order.carrier ? 'accepted' : 'waiting'}`}>
                                            {order.carrier ? 'Accepted' : 'Waiting'}
                                          </span>
                                        </td>
                                        <td className="order-date">{formatDate(order.createdAt)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="no-orders">No orders found for this customer</div>
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
        <div className="customers-pagination">
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