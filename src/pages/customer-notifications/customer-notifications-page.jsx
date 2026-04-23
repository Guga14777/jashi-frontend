// ============================================================
// FILE: src/pages/customer-notifications/customer-notifications-page.jsx
// ✅ FIXED: Clicking notification only marks as read (no modal)
// ✅ FIXED: Removed duplicate footer
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  useCustomerNotifications, 
  formatRelativeTime 
} from '../../store/customer-notifications-context.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import {
  FiX, 
  FiCheckCircle, 
  FiBell, 
  FiTruck, 
  FiDollarSign, 
  FiFileText, 
  FiSettings, 
  FiUser,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import './customer-notifications-page.css';

/* ---------------- Icons by type ---------------- */
const getNotificationIcon = (type) => {
  const icons = {
    booking_confirmed: FiCheckCircle,
    booking_created: FiCheckCircle,
    carrier_assigned: FiTruck,
    booking_cancelled: FiX,
    payment_received: FiDollarSign,
    payment_failed: FiAlertCircle,
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
    payment_received: 'icon-success',
    payment_failed: 'icon-danger',
    document_uploaded: 'icon-primary',
    system: 'icon-muted',
    account: 'icon-primary',
  };
  return colorClasses[type] || 'icon-default';
};

/* ================================================================
   CUSTOMER NOTIFICATIONS PAGE
   ================================================================ */
const CustomerNotificationsPage = () => {
  // ─────────────────────────────────────────────────────────────
  // HOOKS — all called unconditionally, in a fixed order, on every
  // render. Nothing below this block is allowed to call a hook.
  // ─────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  const {
    notifications = [],
    unreadCount = 0,
    markAllAsRead,
    markAsRead,
    isLoading,
    refreshNotifications,
  } = useCustomerNotifications();

  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    refreshNotifications && refreshNotifications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // ─────────────────────────────────────────────────────────────
  // END OF HOOKS. DO NOT add hooks past this point.
  // ─────────────────────────────────────────────────────────────

  const itemsPerPage = 15;

  const filteredNotifications = (notifications || []).filter((n) => {
    if (!n) return false;
    if (filter === 'unread' && n.readAt) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNotificationClick = (notification) => {
    if (!notification) return;
    if (!notification.readAt) markAsRead(notification.id);

    const orderId = notification.orderId || notification.meta?.bookingId;
    if (orderId) {
      navigate(`/dashboard?openOrder=${encodeURIComponent(orderId)}`);
    }
  };

  return (
    <div className="customer-notifications-page">
      <div className="notifications-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Notifications</h1>
            <p>Stay informed about your vehicle shipments, payments, and updates.</p>
          </div>
          {unreadCount > 0 && (
            <button 
              className="mark-all-btn"
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="notifications-toolbar">
          {/* Tabs */}
          <div className="toolbar-tabs">
            <button
              className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`tab-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="notifications-list-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="empty-state">
              <FiCheckCircle size={56} />
              <h3>
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : "You're all caught up!"}
              </h3>
              <p>
                {filter === 'unread'
                  ? 'All your notifications have been read.'
                  : "We'll notify you about your shipments and payments here."}
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {paginatedNotifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft size={18} />
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <LiveChat />
    </div>
  );
};

/* ---------------- Notification Row - ✅ FIXED: Read-only, no modal ---------------- */
const NotificationRow = ({ notification, onClick }) => {
  if (!notification) return null;

  const { type, title, message, readAt, createdAt, orderId, meta } = notification;
  const NotificationIcon = getNotificationIcon(type);
  const iconColorClass = getIconColorClass(type);
  const isUnread = !readAt;

  const displayOrderId = orderId || meta?.orderNumber || meta?.ref || meta?.bookingId;

  return (
    <div
      className={`notification-row ${isUnread ? 'unread' : ''}`}
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
      <div className={`notification-icon-circle ${iconColorClass}`}>
        <NotificationIcon size={20} />
      </div>
      
      <div className="notification-main">
        <div className="notification-header">
          <h4 className="notification-title">{title}</h4>
          <span className="notification-time">{formatRelativeTime(createdAt)}</span>
        </div>
        <p className="notification-message">{message}</p>
        {displayOrderId && (
          <span className="notification-chip">#{displayOrderId}</span>
        )}
      </div>
    </div>
  );
};

export default CustomerNotificationsPage;