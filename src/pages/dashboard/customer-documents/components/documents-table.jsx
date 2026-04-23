import React, { useState, useCallback, useRef } from 'react';
import './documents-table.css';

// Note: Add these styles to documents-table.css:
// .custdocs-table-orderid { white-space: nowrap; }
// .custdocs-orderid-badge { 
//   display: inline-flex; align-items: center; padding: 4px 10px;
//   background: #EEF0FF; color: #3A3FB2; border: 1px solid #CBD1FF;
//   border-radius: 6px; font-size: 0.8rem; font-weight: 600;
// }
// .custdocs-orderid-none { color: #9ca3af; }

const trackEvent = (eventName, properties) => {
  console.log('Analytics:', eventName, properties);
};

// Status display mapping
const STATUS_DISPLAY = {
  provided: 'Provided',
  pending_review: 'Pending Review',
  rejected: 'Rejected',
  missing: 'Missing',
  expired: 'Expired',
  expiring_soon: 'Expiring Soon',
  processing: 'Processing'
};

const DocumentsTable = ({
  items = [],
  isLoading = false,
  onOpen,
  hasActiveFilters = false,
  onClearFilters,
  emptyState,
  itemsPerPage = 8
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [announcement, setAnnouncement] = useState('');
  const tableRef = useRef(null);
  const viewButtonRefs = useRef({});

  const COLUMN_COUNT = 6; // Updated from 5 to 6 for Order ID column

  const sortedItems = React.useMemo(() => {
    if (!sortConfig.key || !items.length) return items;

    return [...items].sort((a, b) => {
      let aVal, bVal;

      // Normalize sort keys
      if (sortConfig.key === 'date') {
        // Convert to timestamps for reliable comparison
        aVal = new Date(a.uploadedAt || a.date || 0).getTime();
        bVal = new Date(b.uploadedAt || b.date || 0).getTime();
        
        // Handle invalid dates (NaN) - sort them last in ascending
        if (isNaN(aVal)) aVal = sortConfig.direction === 'asc' ? Infinity : -Infinity;
        if (isNaN(bVal)) bVal = sortConfig.direction === 'asc' ? Infinity : -Infinity;
      } else if (sortConfig.key === 'type') {
        // Use typeLabel when available, fall back to type
        aVal = (a.typeLabel || a.type || '').toLowerCase();
        bVal = (b.typeLabel || b.type || '').toLowerCase();
      } else if (sortConfig.key === 'orderId') {
        // Extract numeric part from order ID for proper sorting (e.g., "#1018" -> 1018)
        const extractNumber = (id) => {
          if (!id) return 0;
          const match = id.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        aVal = extractNumber(a.shipmentId);
        bVal = extractNumber(b.shipmentId);
      } else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
      }

      // Handle missing values consistently
      if (!aVal && !bVal) return 0;
      if (!aVal) return sortConfig.direction === 'asc' ? 1 : -1;
      if (!bVal) return sortConfig.direction === 'asc' ? -1 : 1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      const newDirection = prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
      
      // Announce sort change
      const columnNames = {
        name: 'Document',
        orderId: 'Order ID',
        type: 'Type',
        date: 'Date'
      };
      const columnName = columnNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      setAnnouncement(`Table sorted by ${columnName}, ${newDirection}ending order`);
      
      // Track analytics
      trackEvent('documents_table_sort', { column: key, direction: newDirection });
      
      return { key, direction: newDirection };
    });
  }, []);

  const handleViewClick = useCallback((doc, index) => {
    trackEvent('documents_table_view_clicked', { 
      id: doc.id, 
      status: doc.status,
      type: doc.typeLabel || doc.type 
    });
    onOpen?.(doc, viewButtonRefs.current[index]);
  }, [onOpen]);

  const handleClearFilters = useCallback(() => {
    trackEvent('documents_table_filters_cleared');
    onClearFilters?.();
  }, [onClearFilters]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '—';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'provided':
        return 'custdocs-badge--success';
      case 'pending_review':
      case 'expiring_soon':
        return 'custdocs-badge--warning';
      case 'rejected':
      case 'expired':
        return 'custdocs-badge--danger';
      case 'processing':
        return 'custdocs-badge--info';
      case 'missing':
      default:
        return 'custdocs-badge--neutral';
    }
  };

  const getStatusDisplay = (status) => {
    return STATUS_DISPLAY[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Not Provided');
  };

  const getSortArrow = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const getSortAriaSort = (key) => {
    if (sortConfig.key !== key) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  const renderSkeletonRow = (i) => (
    <tr key={`skeleton-${i}`} className="custdocs-table--loading">
      <td aria-hidden="true"><div className="loading-skeleton" /></td>
      <td aria-hidden="true"><div className="loading-skeleton" /></td>
      <td aria-hidden="true"><div className="loading-skeleton" /></td>
      <td aria-hidden="true"><div className="loading-skeleton" /></td>
      <td aria-hidden="true"><div className="loading-skeleton" /></td>
      <td className="custdocs-table-actions" aria-hidden="true">
        <div className="loading-skeleton" />
      </td>
    </tr>
  );

  const renderEmptyState = () => {
    if (emptyState?.show) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className="custdocs-table-empty">
            <div className="custdocs-table-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div className="custdocs-table-empty-text">{emptyState.title}</div>
            <div className="custdocs-table-empty-description">{emptyState.message}</div>
            {emptyState.action && (
              <button type="button" className="btn btn-primary" onClick={emptyState.action.onClick}>
                {emptyState.action.label}
              </button>
            )}
          </td>
        </tr>
      );
    }

    const msg = hasActiveFilters
      ? 'No documents match your current filters.'
      : 'Documents will appear here once available.';

    return (
      <tr>
        <td colSpan={COLUMN_COUNT} className="custdocs-table-empty">
          <div className="custdocs-table-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div className="custdocs-table-empty-text">No documents found</div>
          <div className="custdocs-table-empty-description">{msg}</div>
          {hasActiveFilters && onClearFilters && (
            <button type="button" className="btn btn-primary" onClick={handleClearFilters}>
              Clear filters
            </button>
          )}
        </td>
      </tr>
    );
  };

  const renderDocumentRow = (doc, index) => {
    const isExpiringSoon = doc.status === 'expiring_soon';
    const isMissingRequired = doc.status === 'missing' && doc.required;
    
    return (
      <tr
        key={doc.id}
        className={isMissingRequired ? 'custdocs-table-row-missing-required' : ''}
      >
        <td title={doc.name} className="custdocs-table-name">
          {isMissingRequired && <span className="custdocs-missing-indicator" aria-label="Required document missing" />}
          <span className="custdocs-table-name-text">{doc.name}</span>
        </td>
        <td className="custdocs-table-orderid">
          {doc.shipmentId ? (
            <span className="custdocs-orderid-badge">{doc.shipmentId}</span>
          ) : (
            <span className="custdocs-orderid-none">—</span>
          )}
        </td>
        <td>{doc.typeLabel || doc.type || '—'}</td>
        <td>
          <time dateTime={doc.uploadedAt || doc.date || ''}>
            {formatDate(doc.uploadedAt || doc.date)}
          </time>
        </td>
        <td>
          <span className={`custdocs-badge ${getStatusBadgeClass(doc.status)}`}>
            {getStatusDisplay(doc.status)}
            {isExpiringSoon && <span className="custdocs-expire-dot" aria-label="Expires soon" />}
          </span>
        </td>
        <td className="custdocs-table-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleViewClick(doc, index)}
            ref={el => (viewButtonRefs.current[index] = el)}
            aria-label={`View document ${doc.name}`}
            title={`View document ${doc.name}`}
          >
            View
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="custdocs-table-container">
      {/* Live region for sort announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>
      
      <table 
        className="custdocs-table" 
        role="table" 
        ref={tableRef}
        aria-busy={isLoading}
      >
        <thead>
          <tr>
            <th scope="col" aria-sort={getSortAriaSort('name')}>
              <button 
                type="button" 
                onClick={() => handleSort('name')} 
                aria-label="Sort by document name"
                className="custdocs-table-sort-button"
              >
                Document{getSortArrow('name')}
              </button>
            </th>
            <th scope="col" aria-sort={getSortAriaSort('orderId')}>
              <button 
                type="button" 
                onClick={() => handleSort('orderId')} 
                aria-label="Sort by order ID"
                className="custdocs-table-sort-button"
              >
                Order ID{getSortArrow('orderId')}
              </button>
            </th>
            <th scope="col" aria-sort={getSortAriaSort('type')}>
              <button 
                type="button" 
                onClick={() => handleSort('type')} 
                aria-label="Sort by document type"
                className="custdocs-table-sort-button"
              >
                Type{getSortArrow('type')}
              </button>
            </th>
            <th scope="col" aria-sort={getSortAriaSort('date')}>
              <button 
                type="button" 
                onClick={() => handleSort('date')} 
                aria-label="Sort by date"
                className="custdocs-table-sort-button"
              >
                Date{getSortArrow('date')}
              </button>
            </th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {isLoading && Array.from({ length: itemsPerPage }).map((_, i) => renderSkeletonRow(i))}
          {!isLoading && sortedItems.length === 0 && renderEmptyState()}
          {!isLoading && sortedItems.length > 0 && sortedItems.map((doc, i) => renderDocumentRow(doc, i))}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentsTable;