// ============================================================
// FILE: src/store/customer-notifications-context.jsx
// ✅ FIXED: Notifications are read-only - no modal on click
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './auth-context';
import { apiUrl } from '../lib/api-url.js';

// Utility function for formatting relative time
export const formatRelativeTime = (isoString) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    
    if (diffMs < 0 || isNaN(diffMs)) return "Just now";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return "Just now";
  }
};

const CustomerNotificationsContext = createContext();

export const CustomerNotificationsProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ Keep selectedNotification for potential future use, but not triggered by clicks
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Calculate unread count
  const unreadCount = notifications.filter(n => n && n.readAt === null).length;

  // ✅ FETCH NOTIFICATIONS FROM API
  const fetchNotifications = useCallback(async () => {
    if (!user || !token) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(apiUrl('/api/customer/notifications'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // ✅ FETCH ON MOUNT AND WHEN USER CHANGES
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 20s polling for live notification updates — paused when the tab is hidden.
  useEffect(() => {
    if (!user || !token) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchNotifications();
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [user, token, fetchNotifications]);

  // ✅ MARK SINGLE AS READ
  const markAsRead = useCallback(async (id) => {
    if (!token || !id) return;

    // Optimistic update
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
          : notification
      )
    );

    try {
      const response = await fetch(apiUrl(`/api/customer/notifications/${id}/read`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  // ✅ MARK ALL AS READ
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    const now = new Date().toISOString();
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        readAt: notification.readAt || now
      }))
    );

    try {
      const response = await fetch(apiUrl('/api/customer/notifications/mark-all-read'), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  // ✅ REMOVE NOTIFICATION
  const removeNotification = useCallback(async (id) => {
    if (!token) return;

    setNotifications(prev => prev.filter(notification => notification.id !== id));

    try {
      const response = await fetch(apiUrl(`/api/customer/notifications/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  // Panel controls
  const openPanel = useCallback(() => {
    setSelectedNotification(null);
    setIsPanelOpen(true);
  }, []);
  
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);
  
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    if (!isPanelOpen) {
      setSelectedNotification(null);
    }
  }, [isPanelOpen]);

  // ✅ Modal controls - kept for potential future use but not called on notification click
  const openNotificationModal = useCallback((notification) => {
    if (!notification) return;
    setSelectedNotification(notification);
    markAsRead(notification.id);
  }, [markAsRead]);

  const closeNotificationModal = useCallback(() => {
    setSelectedNotification(null);
  }, []);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    isPanelOpen,
    selectedNotification,
    
    // Actions
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications: fetchNotifications,
    
    // Panel
    openPanel,
    closePanel,
    togglePanel,
    
    // Modal (kept for future use, but not triggered by notification clicks)
    openNotificationModal,
    closeNotificationModal,
  };

  return (
    <CustomerNotificationsContext.Provider value={value}>
      {children}
    </CustomerNotificationsContext.Provider>
  );
};

export const useCustomerNotifications = () => {
  const context = useContext(CustomerNotificationsContext);
  if (!context) {
    throw new Error('useCustomerNotifications must be used within a CustomerNotificationsProvider');
  }
  return context;
};