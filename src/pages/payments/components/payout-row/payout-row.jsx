import React from 'react';
import './payout-row.css';

/**
 * PayoutRow Component
 * ✅ UPDATED: Shows real Load ID (#1045), COD/ACH method only, real reference
 */
const PayoutRow = React.memo(({ 
  item,
  onView,
  formatPrice,
  parseLocalDate
}) => {
  if (!item) return null;

  const formatMoney = formatPrice || ((amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = parseLocalDate ? parseLocalDate(dateStr) : new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * ✅ Get method label - ONLY 'COD' or 'ACH'
   */
  const getMethodLabel = (method) => {
    if (method == null) return 'ACH';
    const m = String(method).trim().toLowerCase();
    if (!m) return 'ACH';
    
    // COD variations
    if (['cod', 'cash', 'cash_on_delivery', 'check', 'zelle'].includes(m)) {
      return 'COD';
    }
    
    // Everything else is ACH
    return 'ACH';
  };

  /**
   * ✅ Get method tooltip description
   */
  const getMethodTooltip = (method) => {
    const label = getMethodLabel(method);
    if (label === 'COD') {
      return 'Cash on Delivery - Customer pays carrier directly';
    }
    return 'ACH Transfer - Platform pays carrier';
  };

  const getStatusLabel = (status) => {
    if (status == null) return '—';
    const s = String(status).trim().toLowerCase();
    if (!s) return '—';
    const map = { 
      paid: 'Paid', 
      pending: 'Pending', 
      cancelled: 'Cancelled',
      canceled: 'Cancelled',
      processing: 'Processing',
      failed: 'Failed'
    };
    return map[s] || (s[0].toUpperCase() + s.slice(1));
  };

  const handleRowClick = (e) => {
    if (e.target.closest('button')) return;
    onView && onView(item);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    onView && onView(item);
  };

  // ✅ Real reference from DB
  const reference = item.reference ?? '—';
  const createdAt = item.createdAt ?? null;
  // ✅ Real Load ID like #1045
  const loadId = item.loadId ?? '—';
  const amount = item.grossAmount ?? 0;
  // ✅ Only 'COD' or 'ACH'
  const methodLabel = getMethodLabel(item.paymentMethod || item.method);
  const methodTooltip = getMethodTooltip(item.paymentMethod || item.method);
  const methodClass = methodLabel.toLowerCase(); // 'cod' or 'ach'
  const statusRaw = item.status ?? 'unknown';
  const statusClass = `badge badge-${String(statusRaw).toLowerCase() || 'unknown'}`;
  const statusLabel = getStatusLabel(statusRaw);

  return (
    <tr 
      className="payout-row"
      onClick={handleRowClick}
      role="row"
      data-testid="payout-row"
      data-ref={reference}
      data-status={statusRaw}
      data-method={methodClass}
    >
      <td className="reference-col" data-col="reference">
        <span 
          className="reference-display ref-lg" 
          title={reference}
        >
          {reference}
        </span>
      </td>
      
      <td className="date-col" data-col="date">
        <span className="date-text">{formatDate(createdAt)}</span>
      </td>
      
      <td className="load-col" data-col="load">
        <span className="load-text">
          {loadId}
        </span>
      </td>
      
      <td className="amount-col align-right" data-col="amount">
        <span className="amount-value">{formatMoney(amount)}</span>
      </td>
      
      <td className="method-col" data-col="method">
        <span 
          className={`method-badge method-${methodClass}`}
          title={methodTooltip}
        >
          {methodLabel}
        </span>
      </td>
      
      <td className="status-col" data-col="status">
        <span className={statusClass}>
          {statusLabel}
        </span>
      </td>
      
      <td className="actions-col">
        <button 
          className="action-btn action-view"
          onClick={handleViewClick}
          aria-label={`View details for ${reference}`}
          type="button"
        >
          View Details
        </button>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return prevProps.item?.id === nextProps.item?.id &&
         prevProps.item?.status === nextProps.item?.status &&
         prevProps.item?.grossAmount === nextProps.item?.grossAmount &&
         prevProps.item?.paymentMethod === nextProps.item?.paymentMethod &&
         prevProps.item?.method === nextProps.item?.method &&
         prevProps.item?.loadId === nextProps.item?.loadId &&
         prevProps.item?.reference === nextProps.item?.reference &&
         prevProps.item?.createdAt === nextProps.item?.createdAt;
});

/**
 * PayoutCard Component (Mobile)
 * ✅ UPDATED: Shows real Load ID (#1045), COD/ACH method only
 */
export const PayoutCard = React.memo(({ 
  item,
  onView,
  formatPrice,
  parseLocalDate
}) => {
  if (!item) return null;

  const formatMoney = formatPrice || ((amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = parseLocalDate ? parseLocalDate(dateStr) : new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMethodLabel = (method) => {
    if (method == null) return 'ACH';
    const m = String(method).trim().toLowerCase();
    if (!m) return 'ACH';
    if (['cod', 'cash', 'cash_on_delivery', 'check', 'zelle'].includes(m)) {
      return 'COD';
    }
    return 'ACH';
  };

  const getMethodTooltip = (method) => {
    const label = getMethodLabel(method);
    if (label === 'COD') {
      return 'Cash on Delivery - Customer pays carrier directly';
    }
    return 'ACH Transfer - Platform pays carrier';
  };

  const getStatusLabel = (status) => {
    if (status == null) return '—';
    const s = String(status).trim().toLowerCase();
    if (!s) return '—';
    const map = { 
      paid: 'Paid', 
      pending: 'Pending', 
      cancelled: 'Cancelled',
      canceled: 'Cancelled',
      processing: 'Processing',
      failed: 'Failed'
    };
    return map[s] || (s[0].toUpperCase() + s.slice(1));
  };

  const reference = item.reference ?? '—';
  const createdAt = item.createdAt ?? null;
  const loadId = item.loadId ?? null;
  const amount = item.grossAmount ?? 0;
  const methodLabel = getMethodLabel(item.paymentMethod || item.method);
  const methodTooltip = getMethodTooltip(item.paymentMethod || item.method);
  const methodClass = methodLabel.toLowerCase();
  const statusRaw = item.status ?? 'unknown';
  const statusClass = `badge badge-${String(statusRaw).toLowerCase() || 'unknown'}`;
  const statusLabel = getStatusLabel(statusRaw);

  return (
    <div 
      className="payout-card"
      role="group"
      aria-label={`Payout ${reference}`}
      data-testid="payout-card"
      data-ref={reference}
      data-status={statusRaw}
      data-method={methodClass}
    >
      <div className="payout-card-header">
        <span 
          className="reference-display ref-sm" 
          title={reference}
        >
          {reference}
        </span>
        <span className={statusClass}>
          {statusLabel}
        </span>
      </div>
      
      <div className="payout-card-info">
        <span className="date-text">{formatDate(createdAt)}</span>
      </div>
      
      <div className="payout-card-amounts">
        <div className="amount-row">
          <span className="amount-label">Amount</span>
          <span className="amount-value">{formatMoney(amount)}</span>
        </div>
        <div className="amount-row">
          <span className="amount-label">Method</span>
          <span 
            className={`method-badge method-${methodClass}`}
            title={methodTooltip}
          >
            {methodLabel}
          </span>
        </div>
        {loadId && loadId !== '—' && (
          <div className="amount-row">
            <span className="amount-label">Load ID</span>
            <span className="load-text">{loadId}</span>
          </div>
        )}
      </div>
      
      <div className="payout-card-actions">
        <button 
          className="card-action-primary"
          onClick={() => onView && onView(item)}
          aria-label={`View details for payment ${reference}`}
          type="button"
        >
          View Details
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.item?.id === nextProps.item?.id &&
         prevProps.item?.status === nextProps.item?.status &&
         prevProps.item?.grossAmount === nextProps.item?.grossAmount &&
         prevProps.item?.paymentMethod === nextProps.item?.paymentMethod &&
         prevProps.item?.method === nextProps.item?.method &&
         prevProps.item?.loadId === nextProps.item?.loadId &&
         prevProps.item?.reference === nextProps.item?.reference &&
         prevProps.item?.createdAt === nextProps.item?.createdAt;
});

export default PayoutRow;