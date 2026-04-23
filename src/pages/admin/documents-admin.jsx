// ============================================================
// FILE: src/pages/admin/documents-admin.jsx
// ✅ UPDATED: Documents grouped by order with detail modal
// ✅ NEW: Shows one row per order, click to see all documents
// ✅ NEW: Documents grouped by type (BOL, Gate Pass, Photos, etc.)
// ✅ NEW: Download BOL button - generates on demand if not exists
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  FileText, 
  Image, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  ChevronRight,
  Package,
  User,
  Calendar,
  MapPin,
  File,
  Truck,
  FileDown
} from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import DocumentViewer from '../../components/admin/document-viewer.jsx';
import './documents-admin.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5177';

const ITEMS_PER_PAGE = 15;

// Document type icons
const DOC_TYPE_ICONS = {
  bol: FileText,
  gate_pass: File,
  pickup_photo: Image,
  delivery_photo: Image,
  pod: FileText,
  invoice: FileText,
  contract: FileText,
  OTHER: File,
};

// Document type colors
const DOC_TYPE_COLORS = {
  bol: { bg: '#dbeafe', color: '#1e40af' },
  gate_pass: { bg: '#fef3c7', color: '#92400e' },
  pickup_photo: { bg: '#dcfce7', color: '#166534' },
  delivery_photo: { bg: '#ede9fe', color: '#6d28d9' },
  pod: { bg: '#fce7f3', color: '#9d174d' },
  invoice: { bg: '#e0e7ff', color: '#3730a3' },
  contract: { bg: '#f3f4f6', color: '#374151' },
  OTHER: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function DocumentsAdmin() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDocuments, setOrderDocuments] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Inline viewer state
  const [viewerDoc, setViewerDoc] = useState(null);

  // BOL download state
  const [bolDownloading, setBolDownloading] = useState(false);

  // Fetch orders with documents (grouped view)
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE}/api/admin/documents/by-order?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalOrders(data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch documents for a specific order
  const fetchOrderDocuments = async (orderNumber) => {
    setModalLoading(true);
    setOrderDocuments(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/documents/order/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order documents');
      }

      const data = await response.json();
      setOrderDocuments(data);
    } catch (err) {
      console.error('Error fetching order documents:', err);
      setOrderDocuments({ error: err.message });
    } finally {
      setModalLoading(false);
    }
  };

  // Open order detail modal
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    fetchOrderDocuments(order.orderId);
    document.body.style.overflow = 'hidden';
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedOrder(null);
    setOrderDocuments(null);
    document.body.style.overflow = '';
  };

  // ✅ NEW: Download BOL on demand (generates if doesn't exist)
  const handleDownloadBol = async (orderNumber) => {
    setBolDownloading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${orderNumber}/bol`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate BOL');
      }

      // Get the blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BOL-${orderNumber}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Refresh order documents to show the newly created BOL
      if (selectedOrder?.orderId === orderNumber) {
        fetchOrderDocuments(orderNumber);
      }
    } catch (err) {
      console.error('BOL download error:', err);
      alert(`Failed to download BOL: ${err.message}`);
    } finally {
      setBolDownloading(false);
    }
  };

  // Download document
  const handleDownload = async (doc) => {
    try {
      const fileName = doc.originalName || doc.fileName || 'document';
      
      // If we have a direct URL, fetch and download
      if (doc.fileUrl && doc.fileUrl.startsWith('http')) {
        const response = await fetch(doc.fileUrl);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Otherwise use the download endpoint
      const response = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  // Inline preview (PDF + images); falls back to open-in-new-tab for other types.
  const handleView = (doc) => {
    setViewerDoc(doc);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') return 'status-delivered';
    if (s === 'picked_up' || s === 'in_transit') return 'status-picked-up';
    if (s === 'assigned') return 'status-assigned';
    if (s === 'scheduled' || s === 'waiting') return 'status-scheduled';
    return 'status-default';
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="docs-admin-loading">
        <RefreshCw className="spin" size={24} />
        <span>Loading documents...</span>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="docs-admin-error">
        <p>Error: {error}</p>
        <button onClick={fetchOrders}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="docs-admin">
      <header className="docs-admin-header">
        <div className="header-content">
          <h1>Documents by Order</h1>
          <p>
            {totalOrders} order{totalOrders !== 1 ? 's' : ''} with documents
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </header>

      {/* Search */}
      <div className="docs-admin-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by order #, customer name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="docs-admin-table-wrapper">
        <table className="docs-admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Status</th>
              <th>Documents</th>
              <th>Last Upload</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-results">
                  {searchTerm ? 'No orders match your search' : 'No orders with documents found'}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.bookingId} onClick={() => handleViewOrder(order)}>
                  <td className="order-id-cell">
                    <span className="order-id-badge">#{order.orderId}</span>
                  </td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <span className="customer-name">{order.customer?.name || '—'}</span>
                      <span className="customer-email">{order.customer?.email || '—'}</span>
                    </div>
                  </td>
                  <td className="route-cell">
                    <span className="route-text">{order.route || '—'}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="docs-count-cell">
                    <div className="docs-count-info">
                      <span className="docs-count">{order.docsCount} doc{order.docsCount !== 1 ? 's' : ''}</span>
                      <div className="docs-type-tags">
                        {order.docTypeSummary?.slice(0, 3).map((dt, idx) => (
                          <span 
                            key={idx}
                            className="doc-type-mini"
                            style={{ 
                              backgroundColor: DOC_TYPE_COLORS[dt.type]?.bg || '#f3f4f6',
                              color: DOC_TYPE_COLORS[dt.type]?.color || '#6b7280'
                            }}
                          >
                            {dt.count}
                          </span>
                        ))}
                        {order.docTypeSummary?.length > 3 && (
                          <span className="doc-type-mini more">+{order.docTypeSummary.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="date-cell">{formatDate(order.lastDocAt)}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleViewOrder(order)}
                      title="View Documents"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="docs-admin-pagination">
          <button 
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <div className="pagination-pages">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={page}
                  className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              );
            })}
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

      {/* Order Documents Modal */}
      {selectedOrder && (
        <div className="order-docs-modal-overlay" onClick={handleCloseModal}>
          <div className="order-docs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>Documents for Order #{selectedOrder.orderId}</h2>
                <span className={`status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {modalLoading ? (
              <div className="modal-loading">
                <RefreshCw className="spin" size={24} />
                <span>Loading documents...</span>
              </div>
            ) : orderDocuments?.error ? (
              <div className="modal-error">
                <p>Error: {orderDocuments.error}</p>
              </div>
            ) : orderDocuments ? (
              <div className="modal-body">
                {/* Order Info */}
                <div className="order-info-card">
                  <div className="order-info-row">
                    <div className="info-item">
                      <User size={16} />
                      <div>
                        <label>Customer</label>
                        <span>{orderDocuments.customer?.name || '—'}</span>
                        <small>{orderDocuments.customer?.email}</small>
                      </div>
                    </div>
                    <div className="info-item">
                      <MapPin size={16} />
                      <div>
                        <label>Route</label>
                        <span>{orderDocuments.order?.route?.display || '—'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Truck size={16} />
                      <div>
                        <label>Vehicle</label>
                        <span>{orderDocuments.order?.vehicle || '—'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <div>
                        <label>Created</label>
                        <span>{formatDate(orderDocuments.order?.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ NEW: Download BOL Button - Always Available */}
                <div className="bol-download-section">
                  <button
                    className="bol-download-btn"
                    onClick={() => handleDownloadBol(selectedOrder.orderId)}
                    disabled={bolDownloading}
                  >
                    {bolDownloading ? (
                      <>
                        <RefreshCw size={18} className="spin" />
                        Generating BOL...
                      </>
                    ) : (
                      <>
                        <FileDown size={18} />
                        Download Bill of Lading (PDF)
                      </>
                    )}
                  </button>
                  <span className="bol-download-hint">
                    {orderDocuments.hasBol 
                      ? 'BOL already exists - click to download' 
                      : 'BOL will be generated on download'}
                  </span>
                </div>

                {/* Document Groups */}
                <div className="document-groups">
                  {orderDocuments.documentGroups?.length === 0 ? (
                    <div className="no-documents">
                      <FileText size={48} />
                      <p>No documents found for this order</p>
                    </div>
                  ) : (
                    orderDocuments.documentGroups?.map((group) => {
                      const IconComponent = DOC_TYPE_ICONS[group.type] || File;
                      const colors = DOC_TYPE_COLORS[group.type] || DOC_TYPE_COLORS.OTHER;
                      
                      return (
                        <div key={group.type} className="document-group">
                          <div className="group-header">
                            <div 
                              className="group-icon"
                              style={{ backgroundColor: colors.bg, color: colors.color }}
                            >
                              <IconComponent size={18} />
                            </div>
                            <h3>{group.label}</h3>
                            <span className="group-count">{group.count} file{group.count !== 1 ? 's' : ''}</span>
                          </div>
                          
                          <div className={`group-documents ${group.type === 'pickup_photo' || group.type === 'delivery_photo' ? 'photo-grid' : ''}`}>
                            {group.documents.map((doc) => (
                              <div key={doc.id} className="document-item">
                                {(group.type === 'pickup_photo' || group.type === 'delivery_photo') && doc.mimeType?.startsWith('image/') ? (
                                  // Photo thumbnail view
                                  <div className="photo-thumbnail">
                                    <img 
                                      src={doc.fileUrl} 
                                      alt={doc.originalName}
                                      onClick={() => handleView(doc)}
                                    />
                                    <div className="photo-overlay">
                                      <button onClick={() => handleView(doc)} title="View">
                                        <Eye size={16} />
                                      </button>
                                      <button onClick={() => handleDownload(doc)} title="Download">
                                        <Download size={16} />
                                      </button>
                                    </div>
                                    <div className="photo-info">
                                      <span className="photo-date">{formatDate(doc.createdAt)}</span>
                                      <span className="photo-size">{formatFileSize(doc.fileSize)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  // Regular document view
                                  <div className="doc-file-item">
                                    <div className="doc-file-icon">
                                      <IconComponent size={20} />
                                    </div>
                                    <div className="doc-file-info">
                                      <span className="doc-file-name" title={doc.originalName}>
                                        {doc.originalName || doc.fileName}
                                      </span>
                                      <div className="doc-file-meta">
                                        <span>{formatDateTime(doc.createdAt)}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(doc.fileSize)}</span>
                                        {doc.storageType === 'supabase' && (
                                          <>
                                            <span>•</span>
                                            <span className="storage-cloud">☁️ Cloud</span>
                                          </>
                                        )}
                                        {doc.sourceLabel && (
                                          <>
                                            <span>•</span>
                                            <span className={`source-badge source-${doc.source || 'unknown'}`}>
                                              {doc.sourceLabel}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {doc.uploadedBy?.name && (
                                        <span className="doc-uploader">
                                          Uploaded by: {doc.uploadedBy.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="doc-file-actions">
                                      <button 
                                        className="doc-action-btn"
                                        onClick={() => handleView(doc)}
                                        title="View"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button 
                                        className="doc-action-btn"
                                        onClick={() => handleDownload(doc)}
                                        title="Download"
                                      >
                                        <Download size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}