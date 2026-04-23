import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../store/notifications-context';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer.jsx';
import {
  FiX, FiSearch, FiMoreVertical, FiChevronDown,
  FiCheckCircle, FiBell, FiTruck, FiDollarSign,
  FiFileText, FiSettings, FiClock, FiCheck, FiFilter, FiCalendar
} from 'react-icons/fi';
import './notifications.css';

/* ---------------- Icons by category ---------------- */
const getCategoryIcon = (category) => {
  const icons = {
    dispatch: FiTruck,
    payment: FiDollarSign,
    compliance: FiFileText,
    system: FiSettings,
    business: FiClock
  };
  return icons[category] || FiBell;
};

/* ✅ MODAL NOTIFICATION PANEL (NO NAVIGATION, PORTAL-BASED) */
export const NotificationPanel = () => {
  const navigate = useNavigate();
  const {
    activeNotifications,
    markAllAsRead,
    mutedTypes,
    isPanelOpen,
    openPanel,
    closePanel
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [typeFilters, setTypeFilters] = useState([]);
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);
  const previousScrollRef = useRef(0);

  // Dropdown shows only the latest 10 — the full page at /notifications/full
  // paginates the complete set.
  const DROPDOWN_LIMIT = 10;
  const filteredNotifications = activeNotifications.filter(n => {
    if (n.type === 'message') return false;
    if (mutedTypes.includes(n.type)) return false;
    if (filter === 'unread' && n.readAt) return false;
    if (typeFilters.length && !typeFilters.includes(n.category)) return false;
    return true;
  }).slice(0, DROPDOWN_LIMIT);

  // ✅ CLOSE HANDLER: Only closes panel, no navigation
  const handleClose = useCallback(() => {
    closePanel();
  }, [closePanel]);

  // ✅ ESCAPE KEY
  useEffect(() => {
    if (!isPanelOpen) return;
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isPanelOpen, handleClose]);

  // ✅ SCROLL LOCK: Save scroll position, lock body, restore on close
  useEffect(() => {
    if (!isPanelOpen) {
      // Restore scroll
      const scrollY = previousScrollRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      return;
    }

    // Save current scroll position
    previousScrollRef.current = window.scrollY;

    // Lock scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${previousScrollRef.current}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isPanelOpen]);

  // ✅ FOCUS MANAGEMENT
  useEffect(() => {
    if (isPanelOpen) {
      previousFocusRef.current = document.activeElement;
      setTimeout(() => {
        const closeBtn = panelRef.current?.querySelector('.close-btn');
        closeBtn?.focus();
      }, 50);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isPanelOpen]);

  // ✅ BACKDROP CLICK
  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  if (!isPanelOpen) return null;

  // ✅ RENDER IN PORTAL (direct child of body, full viewport)
  const panelContent = (
    <div
      className="notification-panel-overlay"
      ref={overlayRef}
      onClick={handleBackdropClick}
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
        <div className="panel-header">
          <h2>Notifications</h2>
          <button
            className="close-btn"
            onClick={handleClose}
            aria-label="Close notifications"
            type="button"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="panel-controls">
          <div className="panel-tabs">
            <button
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              type="button"
            >
              All
            </button>
            <button
              className={`tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
              type="button"
            >
              Unread
            </button>
          </div>

          <button
            className="btn-link"
            onClick={() => markAllAsRead()}
            type="button"
          >
            Mark all read
          </button>
        </div>

        <NotificationFilters typeFilters={typeFilters} setTypeFilters={setTypeFilters} />

        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            filteredNotifications.map(n => (
              <NotificationItem key={n.id} notification={n} showCheckbox={false} detailed />
            ))
          )}
        </div>

        <div className="panel-footer">
          <button
            className="footer-link"
            onClick={() => {
              handleClose();
              navigate('/notifications/full');
            }}
            type="button"
          >
            <FiCalendar size={14} />
            View full page
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
};

/* ✅ BELL ICON: Only toggles panel, no navigation */
export const NotificationBell = () => {
  const { unreadCount, openPanel } = useNotifications();

  return (
    <button
      type="button"
      className="notification-bell"
      onClick={openPanel}
      aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
    >
      <span className="bell-icon">
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </span>
    </button>
  );
};

/* ---------------- Row ---------------- */
export const NotificationItem = ({
  notification,
  detailed = true,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect = () => {},
  isArchived = false,
  onOpenDetails
}) => {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const {
    id, type, title, message, priority, readAt, createdAt,
    actionCTA, meta, category
  } = notification;

  const isUnread = !readAt;
  const CategoryIcon = getCategoryIcon(category);

  // Resolve a target route from any of the ways a notification can carry one.
  // Service-issued notifications set orderId + meta.bookingId; legacy demo
  // entries set actionCTA.route.
  const resolveRoute = () => {
    if (actionCTA?.route) return actionCTA.route;
    const orderId = notification.orderId || meta?.bookingId || meta?.loadId;
    if (orderId) return `/carrier-dashboard?openOrder=${encodeURIComponent(orderId)}`;
    return null;
  };

  const handleAction = () => {
    if (showCheckbox) return;
    markAsRead(id);
    if (onOpenDetails) { onOpenDetails(); return; }
    const route = resolveRoute();
    if (route) navigate(route);
  };

  const handleCTAClick = (e) => {
    e.stopPropagation();
    markAsRead(id);
    const route = resolveRoute();
    if (route) navigate(route);
  };

  const formatTimeAgo = (date) => {
    const ms = Date.now() - new Date(date).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    return `${w}w ago`;
  };

  const absTime = new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });

  return (
    <div
      className={`notification-item ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''} priority-${priority} category-${category}`}
      onClick={handleAction}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          className="notification-checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(id); }}
          aria-label={`Select notification: ${title}`}
        />
      )}

      <div className="notification-icon">
        <CategoryIcon size={20} />
      </div>

      <div className="notification-title-row">
        <h4 className="notification-title">{title}</h4>
      </div>

      <div className="notification-meta-row">
        <p className="notification-message">{message}</p>

        <div className="notification-chips">
          {meta?.loadId && <span className="notification-chip" title={`Load #${meta.loadId}`}>#{meta.loadId}</span>}
          {meta?.shortRoute && <span className="notification-chip" title={meta.route || meta.shortRoute}>{meta.shortRoute}</span>}
          {typeof meta?.amount === 'number' && (
            <span className="notification-chip" title={`$${meta.amount.toLocaleString()}`}>${meta.amount.toLocaleString()}</span>
          )}
        </div>

        {actionCTA && detailed && (
          <button
            type="button"
            className="notification-cta"
            onClick={handleCTAClick}
            aria-label={`${actionCTA.label} for ${meta?.loadId || title}`}
          >
            {actionCTA.label}
          </button>
        )}
      </div>

      <div className="notification-right">
        {isUnread && <span className="unread-dot" />}
        <div className="notification-timestamps">
          <span className="notification-time-primary" title={absTime}>
            {formatTimeAgo(createdAt)}
          </span>
        </div>
        <NotificationMenu
          notificationId={id}
          notificationType={type}
          onNavigate={() => {
            markAsRead(id);
            if (actionCTA?.route) navigate(actionCTA.route);
          }}
          isArchived={isArchived}
        />
      </div>
    </div>
  );
};

/* ---------------- Row menu ---------------- */
export const NotificationMenu = ({ notificationId, onNavigate, isArchived = false }) => {
  const { markAsRead, archiveNotifications, unarchiveNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const clickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [isOpen]);

  return (
    <div className="notification-menu" ref={menuRef}>
      <button
        className="menu-trigger"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        aria-label="More actions"
        type="button"
      >
        <FiMoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="menu-dropdown">
          <button onClick={() => { onNavigate(); setIsOpen(false); }} type="button">Open</button>
          <button onClick={() => { markAsRead(notificationId); setIsOpen(false); }} type="button">Mark as read</button>
          <button onClick={() => {
            if (isArchived) unarchiveNotifications([notificationId]);
            else archiveNotifications([notificationId]);
            setIsOpen(false);
          }} type="button">
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------------- Filters (type only) ---------------- */
export const NotificationFilters = ({ typeFilters, setTypeFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const types = [
    { value: 'dispatch', label: 'Dispatch' },
    { value: 'payment', label: 'Payments' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'system', label: 'System' },
    { value: 'business', label: 'Business' }
  ];

  return (
    <div className={`notification-filters ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="filter-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <FiFilter size={14} />
        Filters {typeFilters.length > 0 && `(${typeFilters.length})`}
        <FiChevronDown size={12} />
      </button>

      {isExpanded && (
        <div className="filter-options">
          <div className="filter-chips">
            {types.map(type => (
              <button
                key={type.value}
                className={`filter-chip ${typeFilters.includes(type.value) ? 'active' : ''}`}
                onClick={() => {
                  setTypeFilters(prev =>
                    prev.includes(type.value)
                      ? prev.filter(t => t !== type.value)
                      : [...prev, type.value]
                  );
                }}
                type="button"
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Full Page View (for /notifications/full route) ---------------- */
const NotificationsPage = () => {
  const {
    notifications,
    activeNotifications,
    markAllAsRead,
    selectedNotifications,
    toggleSelection,
    mutedTypes
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: [],
    status: 'all',
    timeRange: 'all'
  });
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    document.body.style.overflow = selectedNotification ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedNotification]);

  const filteredNotifications = useMemo(() => {
    let filtered = selectedFilters.status === 'archived'
      ? notifications.filter(n => n.archivedAt)
      : activeNotifications.filter(n => n.type !== 'message' && !mutedTypes.includes(n.type));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.meta?.loadId?.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }

    if (selectedFilters.status !== 'archived') {
      if (selectedFilters.status === 'unread') filtered = filtered.filter(n => !n.readAt);
      if (selectedFilters.status === 'read')   filtered = filtered.filter(n => n.readAt);
    }

    if (selectedFilters.type.length > 0) {
      filtered = filtered.filter(n => selectedFilters.type.includes(n.category));
    }

    const now = Date.now(), day = 86400000;
    if (selectedFilters.timeRange === 'today') filtered = filtered.filter(n => now - new Date(n.createdAt).getTime() < day);
    if (selectedFilters.timeRange === 'week')  filtered = filtered.filter(n => now - new Date(n.createdAt).getTime() < 7 * day);
    if (selectedFilters.timeRange === 'month') filtered = filtered.filter(n => now - new Date(n.createdAt).getTime() < 30 * day);

    return filtered;
  }, [activeNotifications, notifications, searchQuery, selectedFilters, mutedTypes]);

  const groupedNotifications = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);
  const unreadVisible = filteredNotifications.filter(n => !n.readAt).length;

  const handleMarkAllAsRead = () => {
    const visibleIds = new Set(filteredNotifications.map(n => n.id));
    markAllAsRead(visibleIds);
  };

  return (
    <>
      <div className="notifications-page">
        <div className="page-header">
          <h1>Notifications</h1>
          <p>Stay updated on loads, payments, compliance, and business opportunities</p>
        </div>

        <div className="notifications-toolbar">
          <div className="search-box">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Search notifications, load numbers, amounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="toolbar-filters">
            <select
              value={selectedFilters.status}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, status: e.target.value })}
              aria-label="Status filter"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
              <option value="read">Read only</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={selectedFilters.timeRange}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, timeRange: e.target.value })}
              aria-label="Time filter"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </div>

          <div className="toolbar-actions">
            <button
              className="btn-link"
              onClick={handleMarkAllAsRead}
              disabled={unreadVisible === 0}
              type="button"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div className="notifications-content">
          <div className="notifications-list">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="notification-group">
                <h3 className="group-header">{date}</h3>
                {items.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    detailed
                    showCheckbox={false}
                    isSelected={selectedNotifications.has(n.id)}
                    onToggleSelect={toggleSelection}
                    isArchived={selectedFilters.status === 'archived'}
                    onOpenDetails={() => setSelectedNotification(n)}
                  />
                ))}
              </div>
            ))}

            {filteredNotifications.length === 0 && <EmptyState filter={selectedFilters.status} />}
          </div>

          {selectedNotification && (
            <NotificationDetails notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
          )}
        </div>

        <LiveChat />
      </div>
      <CarrierDashboardFooter />
    </>
  );
};

/* ---------------- Details panel ---------------- */
export const NotificationDetails = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const handleCTAClick = () => {
    if (notification.actionCTA?.route) navigate(notification.actionCTA.route);
  };

  return (
    <div className="notification-details">
      <div className="details-header">
        <h3>{notification.title}</h3>
        <button onClick={onClose} aria-label="Close details" type="button">
          <FiX size={20} />
        </button>
      </div>

      <div className="details-content">
        <div className="details-message">{notification.message}</div>

        {notification.meta && (
          <div className="details-metadata">
            {notification.meta.amount && (
              <div className="meta-row">
                <span className="meta-label">Amount:</span>
                <span className="meta-value">${notification.meta.amount.toLocaleString()}</span>
              </div>
            )}
            {notification.meta.loadId && (
              <div className="meta-row">
                <span className="meta-label">Load ID:</span>
                <span className="meta-value">#{notification.meta.loadId}</span>
              </div>
            )}
          </div>
        )}

        {notification.actionCTA && (
          <button className="btn-primary" onClick={handleCTAClick} type="button">
            {notification.actionCTA.label}
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------------- Empty State ---------------- */
export const EmptyState = ({ filter }) => {
  const messages = {
    all: "You're all caught up! New notifications will appear here.",
    unread: "No unread notifications. Check back for updates.",
    read: "No read notifications to display.",
    archived: "No archived notifications."
  };
  return (
    <div className="empty-state">
      <FiCheckCircle size={48} />
      <p>{messages[filter] || messages.all}</p>
    </div>
  );
};

/* ---------------- Helpers ---------------- */
function groupNotificationsByDate(notifications) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  notifications.forEach(n => {
    const d = new Date(n.createdAt).toDateString();
    const daysDiff = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 86400000);
    let label;
    if (d === today) label = 'TODAY';
    else if (d === yesterday) label = 'YESTERDAY';
    else if (daysDiff < 7) label = new Date(n.createdAt).toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
    else if (daysDiff < 30) label = 'THIS MONTH';
    else label = 'OLDER';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  return groups;
}

export default NotificationsPage;