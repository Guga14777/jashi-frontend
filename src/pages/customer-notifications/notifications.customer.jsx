// ============================================================
// FILE: src/pages/customer-notifications/notifications.customer.jsx
// ✅ FIXED: Clicking notification only marks as read (no modal)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiX,
  FiCheckCircle,
  FiBell,
  FiTruck,
  FiDollarSign,
  FiFileText,
  FiSettings,
  FiFilter,
  FiChevronDown,
  FiUser,
  FiCalendar,
  FiAlertCircle
} from 'react-icons/fi';

import { useCustomerNotifications, formatRelativeTime } from '../../store/customer-notifications-context.jsx';

import './notifications.customer.css';

/* ---------------- Icons by type ---------------- */
const getTypeIcon = (type) => {
  const icons = {
    booking_confirmed: FiCheckCircle,
    booking_created: FiCheckCircle,
    carrier_assigned: FiTruck,
    booking_cancelled: FiX,
    payment: FiDollarSign,
    payment_received: FiDollarSign,
    payment_failed: FiAlertCircle,
    documents: FiFileText,
    document_uploaded: FiFileText,
    system: FiSettings,
    account: FiUser,
  };
  return icons[type] || FiBell;
};

/* ---------------- Get icon color class by type ---------------- */
const getIconColorClass = (type) => {
  const colorClasses = {
    booking_confirmed: 'icon-success',
    booking_created: 'icon-success',
    carrier_assigned: 'icon-primary',
    booking_cancelled: 'icon-danger',
    payment: 'icon-primary',
    payment_received: 'icon-success',
    payment_failed: 'icon-danger',
    documents: 'icon-primary',
    document_uploaded: 'icon-primary',
    system: 'icon-muted',
    account: 'icon-primary',
  };
  return colorClasses[type] || 'icon-default';
};

/* ============================================================
   SLIDE-OUT PANEL (used by Header & Notifications Page)
   ============================================================ */
export const CustomerNotificationPanel = () => {
  // ─────────────────────────────────────────────────────────────
  // HOOKS — all called unconditionally, in a fixed order, on
  // every render. Nothing below this block is allowed to call a
  // hook. If you need to add a hook later, add it HERE, not below.
  // ─────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  const {
    notifications = [],
    unreadCount = 0,
    markAllAsRead,
    markAsRead,
    isPanelOpen,
    closePanel,
    isLoading,
  } = useCustomerNotifications();

  const [filter, setFilter] = useState('all');
  const [typeFilters, setTypeFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    if (!isPanelOpen) return;
    const onEsc = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isPanelOpen, closePanel]);

  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPanelOpen]);

  // ─────────────────────────────────────────────────────────────
  // END OF HOOKS. Conditional returns and plain-function derivations
  // live below this line. DO NOT add hooks past this point.
  // ─────────────────────────────────────────────────────────────

  // Dropdown shows only the latest 10 — the full page at
  // /customer-notifications paginates the complete set.
  const DROPDOWN_LIMIT = 10;
  const filteredNotifications = (notifications || []).filter((n) => {
    if (!n) return false;
    if (filter === 'unread' && n.readAt) return false;
    if (typeFilters.length && !typeFilters.includes(n.type)) return false;
    return true;
  }).slice(0, DROPDOWN_LIMIT);

  // Click → mark read + navigate to the related order if the notification
  // carries one. Otherwise just mark read.
  const handleNotificationClick = (notification) => {
    if (!notification) return;
    if (!notification.readAt) markAsRead(notification.id);

    const orderId = notification.orderId || notification.meta?.bookingId;
    if (orderId) {
      closePanel?.();
      navigate(`/dashboard?openOrder=${encodeURIComponent(orderId)}`);
    }
  };

  if (!isPanelOpen) return null;

  return (
    <div
      className="notification-panel-overlay"
      onClick={closePanel}
      role="presentation"
    >
      <div
        className="notification-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="panel-header">
          <h2>Notifications</h2>
          <button
            className="close-btn"
            onClick={closePanel}
            aria-label="Close notifications"
            type="button"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs + Mark all read */}
        <div className="panel-controls">
          <div className="panel-tabs">
            <button
              type="button"
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <button
            type="button"
            className="btn-link"
            onClick={() => markAllAsRead && markAllAsRead()}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>

        {/* Filters */}
        <div className={`notification-filters ${showFilters ? 'expanded' : ''}`}>
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowFilters((v) => !v)}
          >
            <FiFilter size={14} /> Filters{' '}
            <FiChevronDown
              size={12}
              className={showFilters ? 'rotated' : ''}
            />
          </button>
          {showFilters && (
            <div className="filter-options">
              {[
                { value: 'booking_confirmed', label: 'Booking Confirmed' },
                { value: 'carrier_assigned', label: 'Carrier Assigned' },
                { value: 'booking_cancelled', label: 'Cancelled' },
                { value: 'payment_received', label: 'Payment' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.value}
                  className={`filter-chip ${
                    typeFilters.includes(t.value) ? 'active' : ''
                  }`}
                  onClick={() =>
                    setTypeFilters((prev) =>
                      prev.includes(t.value)
                        ? prev.filter((v) => v !== t.value)
                        : [...prev, t.value]
                    )
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="notification-list">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <FiCheckCircle size={48} />
              <p>
                {filter === 'unread'
                  ? 'No unread notifications.'
                  : "You're all caught up! We'll notify you about your shipments and payments here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <Link
            to="/customer-notifications"
            className="footer-link"
            onClick={closePanel}
          >
            <FiCalendar size={14} />
            View all notifications
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Single Notification Row - ✅ FIXED: Read-only, no modal ---------------- */
const NotificationItem = ({ notification, onClick }) => {
  if (!notification) return null;

  const { type, title, message, readAt, createdAt, orderId, meta } = notification;
  const TypeIcon = getTypeIcon(type);
  const iconColorClass = getIconColorClass(type);
  const isUnread = !readAt;

  const displayOrderId = orderId || meta?.orderNumber || meta?.ref || meta?.bookingId;

  return (
    <div
      className={`notification-item ${isUnread ? 'unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`notification-icon-wrapper ${iconColorClass}`}>
        <TypeIcon size={18} />
      </div>
      <div className="notification-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <h4>{title}</h4>
          <span className="time">{formatRelativeTime(createdAt)}</span>
        </div>
        {/* ✅ Full message text visible */}
        <p>{message}</p>
        {displayOrderId && (
          <span className="chip">#{displayOrderId}</span>
        )}
      </div>
    </div>
  );
};

export default CustomerNotificationPanel;