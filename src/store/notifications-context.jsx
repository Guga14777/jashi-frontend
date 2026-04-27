// src/store/notifications-context.jsx
// Carrier-side notifications provider. Backed by the real /api/carrier/notifications
// endpoints. Previously held demo/localStorage data — that ballast is gone.
// Client-local helpers (archive, mute, selection) are still supported because
// the existing carrier notification panel uses them for UX state.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './auth-context.jsx';

const NotificationsContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');
const url = (p) => `${API_BASE}${p}`;

const readLocal = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

export const NotificationsProvider = ({ children }) => {
  const { user, token } = useAuth();

  // Carrier notifications endpoints are role-scoped on the server. Mounting
  // this provider for a customer-only or admin-only session would 401 on
  // every poll and waste a round-trip on every page mount. Gate fetch +
  // polling on the user actually carrying the CARRIER role. Users with
  // multiple roles (e.g. carrier+admin) still get the carrier stream.
  const isCarrier = useMemo(() => {
    const raw = user?.roles ?? user?.role ?? [];
    const list = Array.isArray(raw) ? raw : String(raw).split(',');
    return list.map((r) => String(r).trim().toUpperCase()).includes('CARRIER');
  }, [user]);

  const [notifications, setNotifications] = useState([]);
  const [unreadCountFromServer, setUnreadCountFromServer] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Client-local UX state. Persists across reloads via localStorage.
  const [mutedTypes, setMutedTypes] = useState(() => readLocal('carrier.mutedNotificationTypes', []));
  const [archivedIds, setArchivedIds] = useState(() => new Set(readLocal('carrier.archivedNotifications', [])));
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  useEffect(() => { writeLocal('carrier.mutedNotificationTypes', mutedTypes); }, [mutedTypes]);
  useEffect(() => { writeLocal('carrier.archivedNotifications', Array.from(archivedIds)); }, [archivedIds]);

  // Panel DOM hook — kept for backward compat with any CSS that reads this attribute.
  useEffect(() => {
    const html = document.documentElement;
    if (isPanelOpen) html.setAttribute('data-notifications-open', 'true');
    else html.removeAttribute('data-notifications-open');
    return () => html.removeAttribute('data-notifications-open');
  }, [isPanelOpen]);

  // ---- API calls ----------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    if (!user || !token || !isCarrier) return;
    setIsLoadingNotifications(true);
    try {
      // Keep in sync with the customer provider (server default = 50). Dropdown
      // components slice their own "top N" from this list; the full page paginates.
      const res = await fetch(url('/api/carrier/notifications?limit=50'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCountFromServer(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err) {
      console.error('Failed to fetch carrier notifications:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user, token, isCarrier]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Lightweight polling for near-real-time notification updates.
  // 20s cadence — fast enough that admins see alert bells flip without
  // an explicit refresh, slow enough not to DoS the server.
  // Skip polling when the tab isn't visible to save server load.
  // Skip entirely for non-carrier sessions so customer/admin pages don't
  // burn an interval hitting an endpoint they're not authorized for.
  useEffect(() => {
    if (!user || !token || !isCarrier) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchNotifications();
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [user, token, isCarrier, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    // Optimistic update — keeps the bell badge responsive even over slow networks.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n))
    );
    setUnreadCountFromServer((c) => Math.max(0, c - 1));
    try {
      await fetch(url(`/api/carrier/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('markAsRead failed:', err);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  const markMultipleAsRead = useCallback(async (ids) => {
    const set = new Set(ids);
    setNotifications((prev) =>
      prev.map((n) => (set.has(n.id) && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    await Promise.all(
      Array.from(set).map((id) =>
        fetch(url(`/api/carrier/notifications/${id}/read`), {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch((e) => console.error('mark one failed:', e))
      )
    );
    fetchNotifications();
  }, [token, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );
    setUnreadCountFromServer(0);
    try {
      await fetch(url('/api/carrier/notifications/mark-all-read'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('markAllAsRead failed:', err);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedNotifications((prev) => { const next = new Set(prev); next.delete(id); return next; });
    try {
      await fetch(url(`/api/carrier/notifications/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('removeNotification failed:', err);
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  // ---- Client-only helpers ------------------------------------------------
  // Archive + mute are UX polish the backend doesn't track. They live only on
  // the device — intentional: a muted/archived notification is still delivered
  // at the data layer, the user just doesn't want to see it right now.

  const archiveNotifications = useCallback((ids) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedNotifications(new Set());
  }, []);

  const unarchiveNotifications = useCallback((ids) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const muteType = useCallback((t) => setMutedTypes((p) => (p.includes(t) ? p : [...p, t])), []);
  const unmuteType = useCallback((t) => setMutedTypes((p) => p.filter((x) => x !== t)), []);

  const toggleSelection = useCallback((id) => {
    setSelectedNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedNotifications(new Set()), []);
  const selectAll = useCallback((ids) => setSelectedNotifications(new Set(ids)), []);

  // Legacy API retained for callers that expected a client-side addNotification.
  const addNotification = useCallback((n) => {
    setNotifications((prev) => [
      { ...n, id: n.id || `local-${Date.now()}`, createdAt: n.createdAt || new Date().toISOString(), readAt: null },
      ...prev,
    ]);
  }, []);

  // ---- Derived views ------------------------------------------------------

  const activeNotifications = useMemo(
    () => notifications.filter((n) => !archivedIds.has(n.id) && !mutedTypes.includes(n.type)),
    [notifications, archivedIds, mutedTypes]
  );

  const unreadCount = useMemo(
    () => activeNotifications.filter((n) => !n.readAt).length,
    [activeNotifications]
  );

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  const value = {
    // data
    notifications,
    activeNotifications,
    unreadCount,
    unreadCountFromServer,
    isPanelOpen,
    isLoadingNotifications,
    selectedNotifications,
    mutedTypes,
    // panel
    openPanel,
    closePanel,
    // reads
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    // mutations
    addNotification,
    removeNotification,
    archiveNotifications,
    unarchiveNotifications,
    // preferences
    muteType,
    unmuteType,
    // selection
    toggleSelection,
    clearSelection,
    selectAll,
    // api
    fetchNotifications,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
