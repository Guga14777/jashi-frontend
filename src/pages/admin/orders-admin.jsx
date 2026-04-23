// ============================================================
// FILE: src/pages/admin/orders-admin.jsx
// Server-side search/filter + full 6-step timeline.
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, ChevronDown, ChevronUp, X,
  MapPin, Calendar, DollarSign, Truck, User,
  Mail, Phone, Clock, Package, Car, CreditCard,
  ChevronLeft, ChevronRight, CheckCircle, Circle,
  UserCheck, PackageCheck, Navigation, Flag, Ban,
  MapPinned, Route, Filter,
  FileText, Download, Eye, Square, CheckSquare, FileDown,
  AlertTriangle, MessageSquare, Trash2, Edit3
} from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import {
  SHIPMENT_STATUS,
  STATUS_ORDER,
  STATUS_LABELS,
  getStatusStep,
  normalizeStatus,
  getStatusDisplay,
} from '../../components/load-details/utils/status-map.js';
import { AdminOrdersAPI, AdminDocumentsAPI, AdminUsersAPI, AdminNotesAPI } from '../../services/admin.api.js';
import DocumentViewer from '../../components/admin/document-viewer.jsx';
import AdminActionModal from '../../components/admin/admin-action-modal.jsx';
import './orders-admin.css';

const ORDERS_PER_PAGE = 25;

// Full 6-step admin timeline. Each step maps to the backend timestamp that
// records when it happened; a missing timestamp means the step hasn't been
// reached yet (or the order was cancelled before it).
const TIMELINE_STEPS = [
  { key: SHIPMENT_STATUS.SCHEDULED,             label: 'Order Created',      icon: Calendar,      tsKey: 'createdAt' },
  { key: SHIPMENT_STATUS.ASSIGNED,              label: 'Carrier Assigned',   icon: UserCheck,     tsKey: 'assignedAt' },
  { key: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,  label: 'On the Way',         icon: Route,         tsKey: 'onTheWayAt' },
  { key: SHIPMENT_STATUS.ARRIVED_AT_PICKUP,     label: 'Arrived at Pickup',  icon: MapPinned,     tsKey: 'arrivedAtPickupAt' },
  { key: SHIPMENT_STATUS.PICKED_UP,             label: 'Vehicle Picked Up',  icon: PackageCheck,  tsKey: 'pickedUpAt' },
  { key: SHIPMENT_STATUS.DELIVERED,             label: 'Vehicle Delivered',  icon: Flag,          tsKey: 'deliveredAt' },
];

// Debounce a rapidly-changing value.
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------- URL-sync helpers --------------------------------------------
// Keep filter state and URL query string in lockstep so every view is
// bookmarkable and shareable. Empty / default values are stripped from the URL.
const FILTER_DEFAULTS = {
  q: '', status: 'all', from: '', to: '',
  customerId: '', carrierId: '',
  priceMin: '', priceMax: '',
  transportType: '', vehicleType: '',
  page: '1',
};

function paramsFromUrl(searchParams) {
  const out = {};
  for (const k of Object.keys(FILTER_DEFAULTS)) {
    const v = searchParams.get(k);
    out[k] = v ?? FILTER_DEFAULTS[k];
  }
  return out;
}

function toYmd(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function OrdersAdmin() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state — initialized from URL so bookmarks reopen the same view.
  const initial = paramsFromUrl(searchParams);
  const [searchTerm, setSearchTerm] = useState(initial.q);
  const [statusFilter, setStatusFilter] = useState(initial.status);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [customerIdFilter, setCustomerIdFilter] = useState(initial.customerId);
  const [carrierIdFilter, setCarrierIdFilter] = useState(initial.carrierId);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [transportType, setTransportType] = useState(initial.transportType);
  const [vehicleType, setVehicleType] = useState(initial.vehicleType);

  // UI state
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(initial.page, 10) || 1));

  // Selection for bulk actions — a Set of booking IDs.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Per-order document cache { [orderNumber]: { status: 'loading'|'ready'|'error', docs, error } }
  const [docsByOrder, setDocsByOrder] = useState({});
  const [viewerDoc, setViewerDoc] = useState(null);

  // Per-order admin notes cache { [orderId]: { status, notes, error, draft } }
  const [notesByOrder, setNotesByOrder] = useState({});
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteBody, setEditingNoteBody] = useState('');

  // Admin-action modal state: { type, order }
  const [actionModal, setActionModal] = useState(null);
  // Carriers list (lazy-loaded on first "Reassign" click)
  const [carriers, setCarriers] = useState(null);
  const [carriersLoading, setCarriersLoading] = useState(false);

  // Debounce the search term so the server isn't hammered on every keystroke.
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const filtersActive =
    debouncedSearch || statusFilter !== 'all' || fromDate || toDate ||
    customerIdFilter || carrierIdFilter || priceMin || priceMax ||
    transportType || vehicleType;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
    setCustomerIdFilter('');
    setCarrierIdFilter('');
    setPriceMin('');
    setPriceMax('');
    setTransportType('');
    setVehicleType('');
    setCurrentPage(1);
  };

  // Server-backed filter params — one builder used by both the list fetch
  // and the CSV export, so the export always reflects the same view.
  const buildApiParams = useCallback((includePage = true) => ({
    q: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    customerId: customerIdFilter || undefined,
    carrierId: carrierIdFilter || undefined,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    transportType: transportType || undefined,
    vehicleType: vehicleType || undefined,
    ...(includePage ? { page: currentPage, limit: ORDERS_PER_PAGE } : {}),
  }), [debouncedSearch, statusFilter, fromDate, toDate, customerIdFilter, carrierIdFilter, priceMin, priceMax, transportType, vehicleType, currentPage]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminOrdersAPI.list(buildApiParams(true), token);
      setOrders(data.orders || []);
      setTotal(data.pagination?.total ?? (data.orders?.length || 0));
    } catch (err) {
      console.error('Error loading admin orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Refetch whenever token OR any filter OR page changes.
  useEffect(() => {
    if (token) fetchOrders();

  }, [token, debouncedSearch, statusFilter, fromDate, toDate, customerIdFilter, carrierIdFilter, priceMin, priceMax, transportType, vehicleType, currentPage]);

  // Lightweight polling — background refresh every 30s so stale rows update
  // without a manual refresh. Suspended while a row is expanded (to avoid
  // jarring UI jumps while the admin reads) or during an in-flight request.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (!loading && !expandedOrder && !bulkModalOpen && !actionModal) {
        fetchOrders();
      }
    }, 30000);
    return () => clearInterval(id);

  }, [token, loading, expandedOrder, bulkModalOpen, actionModal, debouncedSearch, statusFilter, fromDate, toDate, currentPage, priceMin, priceMax, transportType, vehicleType]);

  // Reset to page 1 whenever filters change (but not on page change itself).

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, fromDate, toDate, customerIdFilter, carrierIdFilter, priceMin, priceMax, transportType, vehicleType]);

  // Keep URL in sync with current filter state. We skip keys that match their
  // defaults so the URL stays short and meaningful.
  useEffect(() => {
    const next = {
      q: debouncedSearch, status: statusFilter, from: fromDate, to: toDate,
      customerId: customerIdFilter, carrierId: carrierIdFilter,
      priceMin, priceMax, transportType, vehicleType,
      page: String(currentPage),
    };
    const urlParams = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === undefined || v === '' || v === FILTER_DEFAULTS[k]) continue;
      urlParams.set(k, String(v));
    }
    setSearchParams(urlParams, { replace: true });

  }, [debouncedSearch, statusFilter, fromDate, toDate, customerIdFilter, carrierIdFilter, priceMin, priceMax, transportType, vehicleType, currentPage]);

  // Quick date range chips — compute ISO strings and set both from/to at once.
  const setQuickRange = (kind) => {
    const now = new Date();
    if (kind === 'today') {
      const d = toYmd(now);
      setFromDate(d); setToDate(d);
    } else if (kind === '7d') {
      const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setFromDate(toYmd(start)); setToDate(toYmd(now));
    } else if (kind === '30d') {
      const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setFromDate(toYmd(start)); setToDate(toYmd(now));
    }
  };

  // --- Selection + bulk + export -----------------------------------------
  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) orders.forEach((o) => next.delete(o.id));
      else orders.forEach((o) => next.add(o.id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Build an authenticated CSV download that respects current filters or selection.
  const downloadCsv = async (scope) => {
    const params = scope === 'selected'
      ? { ids: Array.from(selectedIds).join(',') }
      : buildApiParams(false);
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === '') continue;
      search.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    try {
      const resp = await fetch('/api/admin/orders/export/csv?' + search.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Export failed (HTTP ' + resp.status + ')');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.message || 'unknown error'));
    }
  };

  const runBulkStatus = async (newStatus, note) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const resp = await fetch('/api/admin/bulk/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, status: newStatus, note }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Bulk update failed');
      clearSelection();
      setBulkModalOpen(false);
      await fetchOrders();
    } catch (err) {
      throw err;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(amount);
  };

  // Format time window
  const formatTimeWindow = (start, end) => {
    if (!start && !end) return null;
    if (start && end) return `${start} - ${end}`;
    return start || end;
  };

  // Format vehicle info: Year Make Model
  const formatVehicle = (order) => {
    const parts = [];
    if (order.vehicleYear) parts.push(order.vehicleYear);
    if (order.vehicleMake) parts.push(order.vehicleMake);
    if (order.vehicleModel) parts.push(order.vehicleModel);
    if (parts.length > 0) return parts.join(' ');
    return order.vehicle || order.vehicleType || '-';
  };

  // Format short vehicle for header
  const formatVehicleShort = (order) => {
    if (order.vehicleYear && order.vehicleMake && order.vehicleModel) {
      return `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`;
    }
    if (order.vehicleMake && order.vehicleModel) {
      return `${order.vehicleMake} ${order.vehicleModel}`;
    }
    return order.vehicle || order.vehicleType || 'Vehicle';
  };

  // Format card brand nicely
  const formatCardBrand = (brand) => {
    if (!brand) return '';
    const brands = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'diners': 'Diners Club',
      'jcb': 'JCB',
      'unionpay': 'UnionPay',
    };
    return brands[brand.toLowerCase()] || brand;
  };

  const getStatusBadge = (order) => {
    const display = getStatusDisplay(order.status);
    return (
      <span
        className="order-status"
        style={{ backgroundColor: display.bgColor, color: display.color }}
      >
        {display.label}
      </span>
    );
  };

  // Get payment status badge
  const getPaymentBadge = (payment) => {
    if (!payment) return <span className="payment-status pending">No Payment</span>;
    
    const statusMap = {
      'succeeded': { class: 'paid', label: 'Paid' },
      'paid': { class: 'paid', label: 'Paid' },
      'pending': { class: 'pending', label: 'Pending' },
      'failed': { class: 'failed', label: 'Failed' },
      'refunded': { class: 'refunded', label: 'Refunded' },
    };
    
    const status = statusMap[payment.status?.toLowerCase()] || { class: 'pending', label: payment.status };
    return <span className={`payment-status ${status.class}`}>{status.label}</span>;
  };

  // Get pickup/dropoff contact name based on type
  const getContactInfo = (contact) => {
    if (!contact || !contact.type) return null;
    
    switch (contact.type?.toLowerCase()) {
      case 'dealer':
        return { name: contact.dealerName, phone: contact.dealerPhone, type: 'Dealer' };
      case 'auction':
        return { name: contact.auctionName, buyerNumber: contact.auctionBuyerNumber, type: 'Auction' };
      case 'private':
        return { name: contact.privateName, phone: contact.privatePhone, type: 'Private' };
      default:
        return null;
    }
  };

  // Rank an order inside the 6-step timeline. -1 means cancelled.
  const getStatusStepIndex = (status) => getStatusStep(status);

  // Lazy-load documents when an order is expanded. We cache per orderNumber
  // because the same admin often expands → collapses → expands while scanning.
  const loadOrderDocs = async (orderNumber) => {
    if (!orderNumber) return;
    if (docsByOrder[orderNumber]?.status === 'ready' || docsByOrder[orderNumber]?.status === 'loading') return;
    setDocsByOrder((m) => ({ ...m, [orderNumber]: { status: 'loading' } }));
    try {
      const data = await AdminDocumentsAPI.getOrderDocuments(orderNumber, token);
      setDocsByOrder((m) => ({
        ...m,
        [orderNumber]: {
          status: 'ready',
          docs: data.allDocuments || [],
          hasBol: !!data.hasBol,
        },
      }));
    } catch (err) {
      setDocsByOrder((m) => ({
        ...m,
        [orderNumber]: { status: 'error', error: err.message || 'Failed to load documents' },
      }));
    }
  };

  const loadOrderNotes = async (orderId) => {
    if (!orderId) return;
    if (notesByOrder[orderId]?.status === 'loading' || notesByOrder[orderId]?.status === 'ready') return;
    setNotesByOrder((m) => ({ ...m, [orderId]: { status: 'loading', draft: '' } }));
    try {
      const data = await AdminNotesAPI.list(orderId, token);
      setNotesByOrder((m) => ({ ...m, [orderId]: { status: 'ready', notes: data.notes || [], draft: m[orderId]?.draft || '' } }));
    } catch (err) {
      setNotesByOrder((m) => ({ ...m, [orderId]: { status: 'error', error: err.message || 'Failed to load notes' } }));
    }
  };

  const setNoteDraft = (orderId, value) => {
    setNotesByOrder((m) => ({ ...m, [orderId]: { ...(m[orderId] || {}), draft: value } }));
  };

  const submitNewNote = async (orderId) => {
    const draft = (notesByOrder[orderId]?.draft || '').trim();
    if (!draft) return;
    try {
      const data = await AdminNotesAPI.create(orderId, draft, token);
      setNotesByOrder((m) => ({
        ...m,
        [orderId]: { status: 'ready', notes: [data.note, ...(m[orderId]?.notes || [])], draft: '' },
      }));
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    }
  };

  const saveEditingNote = async (orderId) => {
    if (!editingNoteId) return;
    const body = editingNoteBody.trim();
    if (!body) return;
    try {
      const data = await AdminNotesAPI.update(editingNoteId, body, token);
      setNotesByOrder((m) => ({
        ...m,
        [orderId]: {
          ...(m[orderId] || {}),
          notes: (m[orderId]?.notes || []).map((n) => (n.id === editingNoteId ? { ...n, ...data.note } : n)),
        },
      }));
      setEditingNoteId(null);
      setEditingNoteBody('');
    } catch (err) {
      alert('Failed to save note: ' + err.message);
    }
  };

  const removeNote = async (orderId, noteId) => {
    if (!window.confirm('Delete this admin note?')) return;
    try {
      await AdminNotesAPI.remove(noteId, token);
      setNotesByOrder((m) => ({
        ...m,
        [orderId]: {
          ...(m[orderId] || {}),
          notes: (m[orderId]?.notes || []).filter((n) => n.id !== noteId),
        },
      }));
    } catch (err) {
      alert('Failed to delete note: ' + err.message);
    }
  };

  const handleToggleExpand = (order) => {
    const next = expandedOrder === order.id ? null : order.id;
    setExpandedOrder(next);
    if (next && order.orderNumber) loadOrderDocs(order.orderNumber);
    if (next) loadOrderNotes(order.id);
  };

  // Download handler that works for both Supabase and local-hosted docs.
  const handleDocDownload = async (doc) => {
    const url = (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl))
      ? doc.fileUrl
      : (doc.fileUrl || doc.filePath);
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const href = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = href;
      a.download = doc.originalName || doc.fileName || 'document';
      a.style.display = 'none';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error('Document download failed:', err);
      alert('Download failed');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // --- Admin actions ------------------------------------------------------
  // After any action we re-fetch the orders page so the row reflects reality.
  // Cheaper than surgical patching and matches the server's view of truth.
  const openAction = async (type, order) => {
    if (type === 'reassign' && !carriers) {
      setCarriersLoading(true);
      try {
        const data = await AdminUsersAPI.list({ role: 'CARRIER', limit: 200 }, token);
        setCarriers(data.users || []);
      } catch (err) {
        console.error('Failed to load carriers:', err);
      } finally {
        setCarriersLoading(false);
      }
    }
    setActionModal({ type, order });
  };

  const closeAction = () => setActionModal(null);

  const runAction = async (type, order, values) => {
    if (type === 'status') {
      await AdminOrdersAPI.updateStatus(order.id, { status: values.status, note: values.note }, token);
    } else if (type === 'reassign') {
      const carrierId = values.carrierId === '__unassign__' ? null : values.carrierId;
      await AdminOrdersAPI.assignCarrier(order.id, { carrierId, note: values.note }, token);
    } else if (type === 'cancel') {
      await AdminOrdersAPI.cancel(order.id, { reason: values.reason, notes: values.notes }, token);
    } else if (type === 'detention-approve') {
      await AdminOrdersAPI.approveDetention(order.id, { amount: values.amount ? Number(values.amount) : undefined, notes: values.notes }, token);
    } else if (type === 'detention-deny') {
      await AdminOrdersAPI.denyDetention(order.id, { notes: values.notes }, token);
    } else if (type === 'cnp') {
      await AdminOrdersAPI.resolveCnp(order.id, { resolution: values.resolution, notes: values.notes }, token);
    }
    closeAction();
    await fetchOrders();
  };

  // Build the modal config for whichever action is active. This keeps all
  // action-specific wording in one place.
  const actionModalConfig = (() => {
    if (!actionModal) return null;
    const { type, order } = actionModal;

    const submit = (values) => runAction(type, order, values);

    const statusOptions = [
      { value: SHIPMENT_STATUS.SCHEDULED, label: 'Scheduled' },
      { value: SHIPMENT_STATUS.ASSIGNED, label: 'Assigned' },
      { value: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP, label: 'On the Way' },
      { value: SHIPMENT_STATUS.ARRIVED_AT_PICKUP, label: 'Arrived at Pickup' },
      { value: SHIPMENT_STATUS.PICKED_UP, label: 'Picked Up' },
      { value: SHIPMENT_STATUS.DELIVERED, label: 'Delivered' },
      { value: SHIPMENT_STATUS.CANCELLED, label: 'Cancelled' },
    ];

    if (type === 'status') {
      return {
        title: `Change status — order #${order.orderNumber}`,
        description: `Currently: ${STATUS_LABELS[normalizeStatus(order.status)] || order.status}`,
        fields: [
          { name: 'status', label: 'New status', type: 'select', options: statusOptions, initial: normalizeStatus(order.status), required: true },
          { name: 'note', label: 'Admin note (optional)', type: 'textarea', placeholder: 'Why are you overriding this status?' },
        ],
        confirmLabel: 'Update status',
        confirmTone: 'primary',
        onConfirm: submit,
      };
    }
    if (type === 'reassign') {
      const options = [{ value: '__unassign__', label: '— Unassign (remove carrier) —' }].concat(
        (carriers || []).map((c) => ({
          value: c.id,
          label: [c.companyName, (c.firstName || c.email), c.mcNumber && `MC#${c.mcNumber}`].filter(Boolean).join(' · '),
        }))
      );
      return {
        title: `Reassign carrier — order #${order.orderNumber}`,
        description: order.carrier
          ? `Currently assigned to: ${order.carrier.companyName || order.carrier.firstName || order.carrier.email}`
          : 'No carrier currently assigned.',
        fields: [
          { name: 'carrierId', label: carriersLoading ? 'Loading carriers…' : 'New carrier', type: 'select', options, required: true },
          { name: 'note', label: 'Reason (optional)', type: 'textarea', placeholder: 'Why are you reassigning?' },
        ],
        confirmLabel: 'Reassign',
        confirmTone: 'primary',
        onConfirm: submit,
      };
    }
    if (type === 'cancel') {
      return {
        title: `Cancel order #${order.orderNumber}`,
        description: 'Admin cancellations bypass fee policy. The customer and carrier will see the order as cancelled.',
        destructive: true,
        fields: [
          { name: 'reason', label: 'Reason', type: 'text', required: true, placeholder: 'e.g. duplicate, customer request, fraud' },
          { name: 'notes', label: 'Internal notes (optional)', type: 'textarea' },
        ],
        confirmLabel: 'Cancel order',
        confirmTone: 'danger',
        onConfirm: submit,
      };
    }
    if (type === 'detention-approve') {
      return {
        title: `Approve detention fee — order #${order.orderNumber}`,
        description: `Requested amount: $${Number(order.detentionAmount || 50).toFixed(2)}. You can adjust before approving.`,
        fields: [
          { name: 'amount', label: 'Approved amount (USD)', type: 'number', initial: String(order.detentionAmount ?? 50), required: true },
          { name: 'notes', label: 'Notes (optional)', type: 'textarea' },
        ],
        confirmLabel: 'Approve',
        confirmTone: 'primary',
        onConfirm: submit,
      };
    }
    if (type === 'detention-deny') {
      return {
        title: `Deny detention request — order #${order.orderNumber}`,
        description: 'This clears the detention request. The carrier will see it as denied.',
        destructive: true,
        fields: [
          { name: 'notes', label: 'Reason (optional)', type: 'textarea', placeholder: 'Why are you denying?' },
        ],
        confirmLabel: 'Deny',
        confirmTone: 'danger',
        onConfirm: submit,
      };
    }
    if (type === 'cnp') {
      return {
        title: `Review "Could Not Pickup" — order #${order.orderNumber}`,
        description: order.couldNotPickupReason ? `Carrier reason: ${order.couldNotPickupReason}` : 'Carrier reported they could not complete pickup.',
        fields: [
          { name: 'resolution', label: 'Resolution', type: 'select', required: true, options: [
            { value: 'approve_tonu', label: 'Approve TONU — cancel order, carrier paid $75' },
            { value: 'reject', label: 'Reject — order resumes, carrier must attempt again' },
          ]},
          { name: 'notes', label: 'Notes (optional)', type: 'textarea' },
        ],
        confirmLabel: 'Apply resolution',
        confirmTone: 'warn',
        onConfirm: submit,
      };
    }
    return null;
  })();

  // Server is the source of truth — no more client-side filtering.
  const paginatedOrders = orders;
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));

  // Stats reflect the *filtered* result set returned by the server.
  // We can't compute per-bucket counts without another call, so we show
  // the filtered total + a count of in-page statuses as a lightweight summary.
  // Full per-status aggregates are Phase 5 (Analytics dashboard).
  const stats = useMemo(() => {
    const acc = { total, waiting: 0, assigned: 0, inTransit: 0, pickedUp: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      const s = normalizeStatus(o.status);
      if (s === SHIPMENT_STATUS.SCHEDULED) acc.waiting += 1;
      else if (s === SHIPMENT_STATUS.ASSIGNED) acc.assigned += 1;
      else if (s === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP || s === SHIPMENT_STATUS.ARRIVED_AT_PICKUP) acc.inTransit += 1;
      else if (s === SHIPMENT_STATUS.PICKED_UP) acc.pickedUp += 1;
      else if (s === SHIPMENT_STATUS.DELIVERED) acc.delivered += 1;
      else if (s === SHIPMENT_STATUS.CANCELLED) acc.cancelled += 1;
    }
    return acc;
  }, [orders, total]);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Orders</h1>
          <p>
            {loading ? 'Loading…' : `${total} ${total === 1 ? 'order' : 'orders'}${filtersActive ? ' matching filters' : ''}`}
          </p>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-num">{total}</span>
            <span className="stat-label">{filtersActive ? 'Matching' : 'Total'}</span>
          </div>
          <div className="stat-box scheduled">
            <span className="stat-num">{stats.waiting}</span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="stat-box assigned">
            <span className="stat-num">{stats.assigned}</span>
            <span className="stat-label">Assigned</span>
          </div>
          <div className="stat-box in-transit">
            <span className="stat-num">{stats.inTransit}</span>
            <span className="stat-label">In Transit</span>
          </div>
          <div className="stat-box picked-up">
            <span className="stat-num">{stats.pickedUp}</span>
            <span className="stat-label">Picked Up</span>
          </div>
          <div className="stat-box delivered">
            <span className="stat-num">{stats.delivered}</span>
            <span className="stat-label">Delivered</span>
          </div>
          <div className="stat-box cancelled">
            <span className="stat-num">{stats.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        </div>
      </header>

      <div className="admin-filters">
        <div className="search-box">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search order #, customer, carrier, city, VIN, vehicle, payment ref…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value={SHIPMENT_STATUS.SCHEDULED}>Scheduled</option>
          <option value={SHIPMENT_STATUS.ASSIGNED}>Assigned</option>
          <option value={SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP}>On the Way</option>
          <option value={SHIPMENT_STATUS.ARRIVED_AT_PICKUP}>Arrived at Pickup</option>
          <option value={SHIPMENT_STATUS.PICKED_UP}>Picked Up</option>
          <option value={SHIPMENT_STATUS.DELIVERED}>Delivered</option>
          <option value={SHIPMENT_STATUS.CANCELLED}>Cancelled</option>
        </select>
        <div className="date-filter">
          <label>
            <span>From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
        {filtersActive && (
          <button className="clear-filters-btn" onClick={clearFilters} title="Clear all filters">
            <X size={14} /> Clear
          </button>
        )}
        {/* Manual refresh button removed per admin UX request — the page already
            polls in the background every 30s (see the polling useEffect below). */}
      </div>

      {/* Secondary filter row — quick date chips + range/type filters */}
      <div className="admin-filters-secondary">
        <div className="quick-chips">
          <button type="button" className="quick-chip" onClick={() => setQuickRange('today')}>Today</button>
          <button type="button" className="quick-chip" onClick={() => setQuickRange('7d')}>Last 7 days</button>
          <button type="button" className="quick-chip" onClick={() => setQuickRange('30d')}>Last 30 days</button>
        </div>
        <div className="filter-inline">
          <label>
            <span>Price min</span>
            <input
              type="number"
              min={0}
              placeholder="$"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
          </label>
          <label>
            <span>Price max</span>
            <input
              type="number"
              min={0}
              placeholder="$"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </label>
          <label>
            <span>Transport</span>
            <select value={transportType} onChange={(e) => setTransportType(e.target.value)}>
              <option value="">Any</option>
              <option value="open">Open</option>
              <option value="enclosed">Enclosed</option>
            </select>
          </label>
          <label>
            <span>Vehicle type</span>
            <input
              type="text"
              placeholder="sedan, suv, truck…"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            />
          </label>
        </div>

        {/* Bulk + export actions */}
        <div className="bulk-actions">
          {selectedIds.size > 0 ? (
            <>
              <span className="selection-count">{selectedIds.size} selected</span>
              <button type="button" className="bulk-btn" onClick={() => setBulkModalOpen(true)}>
                Change status
              </button>
              <button type="button" className="bulk-btn" onClick={() => downloadCsv('selected')}>
                <FileDown size={14} /> Export selected
              </button>
              <button type="button" className="bulk-btn ghost" onClick={clearSelection}>
                Clear
              </button>
            </>
          ) : (
            <button type="button" className="bulk-btn" onClick={() => downloadCsv('filtered')}>
              <FileDown size={14} /> Export filtered
            </button>
          )}
        </div>
      </div>

      {(customerIdFilter || carrierIdFilter) && (
        <div className="filter-chips">
          {customerIdFilter && (
            <span className="filter-chip">
              Customer: <code>{customerIdFilter.slice(0, 8)}…</code>
              <button onClick={() => setCustomerIdFilter('')} aria-label="Remove customer filter">
                <X size={12} />
              </button>
            </span>
          )}
          {carrierIdFilter && (
            <span className="filter-chip">
              Carrier: <code>{carrierIdFilter.slice(0, 8)}…</code>
              <button onClick={() => setCarrierIdFilter('')} aria-label="Remove carrier filter">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {error ? (
        <div className="admin-error">
          <p>Error: {error}</p>
          <button onClick={fetchOrders}>Try Again</button>
        </div>
      ) : (
        <>
          {!loading && orders.length > 0 && (
            <div className="orders-select-all-bar">
              <button
                type="button"
                className="select-all-btn"
                onClick={toggleAllVisible}
                aria-label={allVisibleSelected ? 'Deselect all on this page' : 'Select all on this page'}
              >
                {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                <span>{allVisibleSelected ? 'Deselect' : 'Select'} all on this page</span>
              </button>
            </div>
          )}

          <div className="orders-list">
            {loading ? (
              <div className="admin-loading" style={{ padding: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw className="spin" size={18} />
                <span>Loading orders…</span>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="no-results">No orders found</div>
            ) : (
              paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`order-card ${expandedOrder === order.id ? 'expanded' : ''} ${selectedIds.has(order.id) ? 'selected' : ''}`}
                >
                  <div
                    className="order-card-header"
                    onClick={() => handleToggleExpand(order)}
                  >
                    <button
                      type="button"
                      className="row-select-btn"
                      onClick={(e) => { e.stopPropagation(); toggleRow(order.id); }}
                      aria-label={selectedIds.has(order.id) ? 'Deselect order' : 'Select order'}
                      title={selectedIds.has(order.id) ? 'Deselect' : 'Select'}
                    >
                      {selectedIds.has(order.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <div className="order-main">
                      <span className="order-num">#{order.orderNumber}</span>
                      {getStatusBadge(order)}
                      {order.paymentBucket && (
                        <span className={`payment-bucket-badge pb-${order.paymentBucket.bucket}`}>
                          {order.paymentBucket.label}
                        </span>
                      )}
                      <span className="order-price">{formatCurrency(order.price)}</span>
                      {order.alerts?.length > 0 && (
                        <span className="order-alerts" title={order.alerts.map((a) => a.label).join(' • ')}>
                          <AlertTriangle size={13} /> {order.alerts.length}
                        </span>
                      )}
                    </div>
                    <div className="order-route">
                      <MapPin size={14} />
                      <span className="route-text">
                        {order.pickupAddress?.city || order.fromCity || '-'}, {order.pickupAddress?.state || ''}
                      </span>
                      <span className="arrow">→</span>
                      <span className="route-text">
                        {order.dropoffAddress?.city || order.toCity || '-'}, {order.dropoffAddress?.state || ''}
                      </span>
                      <span className="miles">({order.miles} mi)</span>
                    </div>
                    <div className="order-vehicle">
                      <Car size={14} />
                      <span>{formatVehicleShort(order)}</span>
                    </div>
                    <div className="order-date">
                      <Calendar size={14} />
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                    <button className="expand-btn">
                      {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="order-details">
                      {/* Alerts banner — server-computed. Hidden when clean. */}
                      {order.alerts?.length > 0 && (
                        <div className="order-alerts-panel">
                          {order.alerts.map((a) => (
                            <div key={a.kind} className={`alert-chip sev-${a.severity}`}>
                              <AlertTriangle size={13} />
                              <strong>{a.label}</strong>
                              <span>{a.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Admin Actions toolbar — god-mode controls scoped to this order */}
                      <div className="admin-actions-bar">
                        <span className="admin-actions-label">Admin actions:</span>
                        <button type="button" className="admin-action-chip" onClick={() => openAction('status', order)}>
                          Change status
                        </button>
                        <button type="button" className="admin-action-chip" onClick={() => openAction('reassign', order)}>
                          Reassign carrier
                        </button>
                        {!order.cancelledAt && order.status !== SHIPMENT_STATUS.DELIVERED && (
                          <button type="button" className="admin-action-chip danger" onClick={() => openAction('cancel', order)}>
                            Cancel order
                          </button>
                        )}
                        {order.detentionRequestedAt && !order.detentionApprovedAt && (
                          <>
                            <button type="button" className="admin-action-chip primary" onClick={() => openAction('detention-approve', order)}>
                              Approve detention
                            </button>
                            <button type="button" className="admin-action-chip danger" onClick={() => openAction('detention-deny', order)}>
                              Deny detention
                            </button>
                          </>
                        )}
                        {order.couldNotPickupAt && (
                          <button type="button" className="admin-action-chip warn" onClick={() => openAction('cnp', order)}>
                            Review CNP claim
                          </button>
                        )}
                      </div>

                      {/* Full 6-step shipment timeline + cancellation branch */}
                      <div className="shipment-timeline-card">
                        <h4><Navigation size={16} /> Shipment Status Timeline</h4>
                        {order.cancelledAt ? (
                          <div className="timeline-cancelled">
                            <div className="timeline-cancelled-icon">
                              <Ban size={18} />
                            </div>
                            <div>
                              <div className="timeline-cancelled-label">Order Cancelled</div>
                              <div className="timeline-cancelled-ts">{formatDateTime(order.cancelledAt)}</div>
                              {order.cancelReason && (
                                <div className="timeline-cancelled-reason">{order.cancelReason}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="timeline-container">
                            {TIMELINE_STEPS.map((step, index) => {
                              const currentStepIndex = getStatusStepIndex(order.status);
                              const isCompleted = index <= currentStepIndex;
                              const isCurrent = index === currentStepIndex;
                              const StepIcon = step.icon;
                              const display = getStatusDisplay(step.key);
                              const timestamp = order[step.tsKey];

                              let description = '';
                              if (step.key === SHIPMENT_STATUS.SCHEDULED) description = 'Order placed by customer';
                              else if (step.key === SHIPMENT_STATUS.ASSIGNED) description = order.carrier ? `${order.carrier.companyName || order.carrier.firstName}` : 'Waiting for carrier';
                              else if (step.key === SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP) description = timestamp ? 'Carrier en route' : 'Awaiting dispatch';
                              else if (step.key === SHIPMENT_STATUS.ARRIVED_AT_PICKUP) description = timestamp ? 'Carrier arrived at pickup' : 'Awaiting arrival';
                              else if (step.key === SHIPMENT_STATUS.PICKED_UP) description = timestamp ? 'Vehicle loaded' : 'Pending pickup';
                              else if (step.key === SHIPMENT_STATUS.DELIVERED) description = timestamp ? 'Delivery confirmed' : 'Pending delivery';

                              return (
                                <div
                                  key={step.key}
                                  className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                                >
                                  <div className="timeline-connector">
                                    {index > 0 && (
                                      <div className={`connector-line ${index <= currentStepIndex ? 'active' : ''}`} />
                                    )}
                                    <div
                                      className="timeline-icon"
                                      style={{
                                        backgroundColor: isCompleted ? display.color : '#e2e8f0',
                                        color: isCompleted ? '#fff' : '#94a3b8',
                                      }}
                                    >
                                      {isCompleted ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                                    </div>
                                    {index < TIMELINE_STEPS.length - 1 && (
                                      <div className={`connector-line-after ${index < currentStepIndex ? 'active' : ''}`} />
                                    )}
                                  </div>
                                  <div className="timeline-content">
                                    <div className="timeline-header">
                                      <span className="timeline-label">{step.label}</span>
                                      {isCurrent && (
                                        <span
                                          className="current-badge"
                                          style={{ backgroundColor: display.bgColor, color: display.color }}
                                        >
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <div className="timeline-timestamp">
                                      {timestamp ? (
                                        <strong>{formatDateTime(timestamp)}</strong>
                                      ) : (
                                        <span className="pending">—</span>
                                      )}
                                    </div>
                                    <div className="timeline-description">{description}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="details-grid">
                        {/* Customer */}
                        <div className="detail-card customer">
                          <h4>
                            <User size={16} /> Customer
                            {order.customer?.id && (
                              <button
                                type="button"
                                className="filter-by-btn"
                                onClick={() => setCustomerIdFilter(order.customer.id)}
                                title="Show only this customer's orders"
                              >
                                <Filter size={12} /> Filter
                              </button>
                            )}
                          </h4>
                          <div className="detail-rows">
                            <div className="detail-row">
                              <span>Name:</span>
                              <strong>{order.customer?.firstName} {order.customer?.lastName}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Email:</span>
                              <a href={`mailto:${order.customer?.email}`}>
                                <Mail size={14} /> {order.customer?.email}
                              </a>
                            </div>
                            <div className="detail-row">
                              <span>Phone:</span>
                              <a href={`tel:${order.customer?.phone}`}>
                                <Phone size={14} /> {order.customer?.phone || '-'}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Carrier */}
                        <div className="detail-card carrier">
                          <h4>
                            <Truck size={16} /> Carrier
                            {order.carrier?.id && (
                              <button
                                type="button"
                                className="filter-by-btn"
                                onClick={() => setCarrierIdFilter(order.carrier.id)}
                                title="Show only this carrier's orders"
                              >
                                <Filter size={12} /> Filter
                              </button>
                            )}
                          </h4>
                          {order.carrier ? (
                            <div className="detail-rows">
                              <div className="detail-row">
                                <span>Name:</span>
                                <strong>{order.carrier?.firstName} {order.carrier?.lastName}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Company:</span>
                                <strong>{order.carrier?.companyName || '-'}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Email:</span>
                                <a href={`mailto:${order.carrier?.email}`}>
                                  <Mail size={14} /> {order.carrier?.email}
                                </a>
                              </div>
                              <div className="detail-row">
                                <span>Phone:</span>
                                <a href={`tel:${order.carrier?.phone}`}>
                                  <Phone size={14} /> {order.carrier?.phone || '-'}
                                </a>
                              </div>
                              <div className="detail-row">
                                <span>MC #:</span>
                                <strong>{order.carrier?.mcNumber || '-'}</strong>
                              </div>
                              <div className="detail-row">
                                <span>DOT #:</span>
                                <strong>{order.carrier?.dotNumber || '-'}</strong>
                              </div>
                            </div>
                          ) : (
                            <div className="no-carrier">
                              <Clock size={20} />
                              <p>Waiting for carrier to accept</p>
                            </div>
                          )}
                        </div>

                        {/* Vehicle Details */}
                        <div className="detail-card vehicle">
                          <h4><Car size={16} /> Vehicle Details</h4>
                          <div className="detail-rows">
                            {(order.vehicleYear || order.vehicleMake || order.vehicleModel) && (
                              <div className="detail-row">
                                <span>Vehicle:</span>
                                <strong>{formatVehicle(order)}</strong>
                              </div>
                            )}
                            {order.vehicleYear && (
                              <div className="detail-row">
                                <span>Year:</span>
                                <strong>{order.vehicleYear}</strong>
                              </div>
                            )}
                            {order.vehicleMake && (
                              <div className="detail-row">
                                <span>Make:</span>
                                <strong>{order.vehicleMake}</strong>
                              </div>
                            )}
                            {order.vehicleModel && (
                              <div className="detail-row">
                                <span>Model:</span>
                                <strong>{order.vehicleModel}</strong>
                              </div>
                            )}
                            {order.vin && (
                              <div className="detail-row">
                                <span>VIN:</span>
                                <strong className="mono">{order.vin}</strong>
                              </div>
                            )}
                            {order.vehicleColor && (
                              <div className="detail-row">
                                <span>Color:</span>
                                <strong>{order.vehicleColor}</strong>
                              </div>
                            )}
                            <div className="detail-row">
                              <span>Type:</span>
                              <strong>{order.vehicleType || order.vehicle || '-'}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Condition:</span>
                              <strong>{order.vehicleCondition || 'Running'}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Transport:</span>
                              <strong>{order.transportType || 'Open'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Pickup Details - Now shows BOTH scheduled and actual */}
                        <div className="detail-card pickup">
                          <h4><MapPin size={16} /> Pickup Details</h4>
                          <div className="detail-rows">
                            <div className="detail-row full-width">
                              <span>Address:</span>
                              <strong>{order.pickupAddress?.full || order.fromCity || '-'}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Scheduled Date:</span>
                              <strong>{formatDate(order.pickupDate)}</strong>
                            </div>
                            {formatTimeWindow(order.pickupWindowStart, order.pickupWindowEnd) && (
                              <div className="detail-row">
                                <span>Time Window:</span>
                                <strong>{formatTimeWindow(order.pickupWindowStart, order.pickupWindowEnd)}</strong>
                              </div>
                            )}
                            {/* ✅ NEW: Actual pickup time */}
                            <div className="detail-row">
                              <span>Actual Pickup:</span>
                              {order.pickedUpAt ? (
                                <strong className="timestamp-actual">{formatDateTime(order.pickedUpAt)}</strong>
                              ) : (
                                <span className="timestamp-pending">Not yet picked up</span>
                              )}
                            </div>
                            {order.pickupOriginType && (
                              <div className="detail-row">
                                <span>Location Type:</span>
                                <strong className="capitalize">{order.pickupOriginType}</strong>
                              </div>
                            )}
                            {order.pickupAddress?.contactName && (
                              <div className="detail-row">
                                <span>Contact:</span>
                                <strong>{order.pickupAddress.contactName}</strong>
                              </div>
                            )}
                            {order.pickupAddress?.contactPhone && (
                              <div className="detail-row">
                                <span>Contact Phone:</span>
                                <a href={`tel:${order.pickupAddress.contactPhone}`}>
                                  <Phone size={14} /> {order.pickupAddress.contactPhone}
                                </a>
                              </div>
                            )}
                            {(() => {
                              const contact = getContactInfo(order.pickupContact);
                              if (!contact) return null;
                              return (
                                <>
                                  {contact.name && (
                                    <div className="detail-row">
                                      <span>{contact.type}:</span>
                                      <strong>{contact.name}</strong>
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="detail-row">
                                      <span>Phone:</span>
                                      <a href={`tel:${contact.phone}`}>
                                        <Phone size={14} /> {contact.phone}
                                      </a>
                                    </div>
                                  )}
                                  {contact.buyerNumber && (
                                    <div className="detail-row">
                                      <span>Buyer #:</span>
                                      <strong>{contact.buyerNumber}</strong>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Dropoff Details - Now shows BOTH scheduled and actual */}
                        <div className="detail-card dropoff">
                          <h4><MapPin size={16} /> Delivery Details</h4>
                          <div className="detail-rows">
                            <div className="detail-row full-width">
                              <span>Address:</span>
                              <strong>{order.dropoffAddress?.full || order.toCity || '-'}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Scheduled Date:</span>
                              <strong>{formatDate(order.dropoffDate)}</strong>
                            </div>
                            {formatTimeWindow(order.dropoffWindowStart, order.dropoffWindowEnd) && (
                              <div className="detail-row">
                                <span>Time Window:</span>
                                <strong>{formatTimeWindow(order.dropoffWindowStart, order.dropoffWindowEnd)}</strong>
                              </div>
                            )}
                            {/* ✅ NEW: Actual delivery time */}
                            <div className="detail-row">
                              <span>Actual Delivery:</span>
                              {order.deliveredAt ? (
                                <strong className="timestamp-actual">{formatDateTime(order.deliveredAt)}</strong>
                              ) : (
                                <span className="timestamp-pending">Not yet delivered</span>
                              )}
                            </div>
                            {order.dropoffDestinationType && (
                              <div className="detail-row">
                                <span>Location Type:</span>
                                <strong className="capitalize">{order.dropoffDestinationType}</strong>
                              </div>
                            )}
                            {order.dropoffAddress?.contactName && (
                              <div className="detail-row">
                                <span>Contact:</span>
                                <strong>{order.dropoffAddress.contactName}</strong>
                              </div>
                            )}
                            {order.dropoffAddress?.contactPhone && (
                              <div className="detail-row">
                                <span>Contact Phone:</span>
                                <a href={`tel:${order.dropoffAddress.contactPhone}`}>
                                  <Phone size={14} /> {order.dropoffAddress.contactPhone}
                                </a>
                              </div>
                            )}
                            {(() => {
                              const contact = getContactInfo(order.dropoffContact);
                              if (!contact) return null;
                              return (
                                <>
                                  {contact.name && (
                                    <div className="detail-row">
                                      <span>{contact.type}:</span>
                                      <strong>{contact.name}</strong>
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="detail-row">
                                      <span>Phone:</span>
                                      <a href={`tel:${contact.phone}`}>
                                        <Phone size={14} /> {contact.phone}
                                      </a>
                                    </div>
                                  )}
                                  {contact.buyerNumber && (
                                    <div className="detail-row">
                                      <span>Buyer #:</span>
                                      <strong>{contact.buyerNumber}</strong>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="detail-card pricing">
                          <h4><DollarSign size={16} /> Pricing</h4>
                          <div className="detail-rows">
                            <div className="detail-row">
                              <span>Price:</span>
                              <strong className="price">{formatCurrency(order.price)}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Distance:</span>
                              <strong>{order.miles} miles</strong>
                            </div>
                            <div className="detail-row">
                              <span>Per Mile:</span>
                              <strong>{order.miles ? formatCurrency(order.price / order.miles) : '-'}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Market Avg:</span>
                              <strong>{formatCurrency(order.marketAvg)}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Likelihood:</span>
                              <strong>{order.likelihood ? `${order.likelihood}%` : '-'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Payment Information */}
                        <div className="detail-card payment">
                          <h4><CreditCard size={16} /> Payment Information</h4>
                          {order.payment ? (
                            <div className="detail-rows">
                              <div className="detail-row">
                                <span>Status:</span>
                                {getPaymentBadge(order.payment)}
                              </div>
                              <div className="detail-row">
                                <span>Transaction ID:</span>
                                <strong className="mono">{order.payment.id || '-'}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Reference:</span>
                                <strong>{order.payment.reference || '-'}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Cardholder:</span>
                                <strong>
                                  {order.payment.cardholderFirstName || order.payment.cardholderLastName 
                                    ? `${order.payment.cardholderFirstName || ''} ${order.payment.cardholderLastName || ''}`.trim()
                                    : '-'}
                                </strong>
                              </div>
                              <div className="detail-row">
                                <span>Card:</span>
                                <strong>
                                  {order.payment.cardBrand && order.payment.cardLast4 
                                    ? `${formatCardBrand(order.payment.cardBrand)} •••• ${order.payment.cardLast4}`
                                    : order.payment.cardLast4 
                                      ? `Card •••• ${order.payment.cardLast4}`
                                      : '-'}
                                </strong>
                              </div>
                              <div className="detail-row">
                                <span>Amount:</span>
                                <strong className="price">{formatCurrency(order.payment.amount)}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Payment Date:</span>
                                <strong>{formatDateTime(order.payment.paidAt)}</strong>
                              </div>
                            </div>
                          ) : (
                            <div className="no-payment">
                              <CreditCard size={20} />
                              <p>No payment recorded</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents — lazy-loaded from /api/admin/documents/order/:orderNumber */}
                      <div className="order-documents-card">
                        <h4><FileText size={16} /> Documents</h4>
                        {(() => {
                          const entry = docsByOrder[order.orderNumber];
                          if (!entry || entry.status === 'loading') {
                            return <div className="order-documents-loading"><RefreshCw size={14} className="spin" /> Loading documents…</div>;
                          }
                          if (entry.status === 'error') {
                            return <div className="order-documents-error">Couldn&apos;t load documents: {entry.error}</div>;
                          }
                          if (!entry.docs?.length) {
                            return <div className="order-documents-empty">No documents on file for this order.</div>;
                          }
                          return (
                            <ul className="order-documents-list">
                              {entry.docs.map((doc) => (
                                <li key={doc.id} className="order-doc-row">
                                  <div className="order-doc-icon">
                                    <FileText size={16} />
                                  </div>
                                  <div className="order-doc-info">
                                    <div className="order-doc-name">
                                      {doc.originalName || doc.fileName}
                                    </div>
                                    <div className="order-doc-meta">
                                      <span className="order-doc-type">{doc.typeLabel || doc.type}</span>
                                      <span>•</span>
                                      <span>{formatDateTime(doc.createdAt)}</span>
                                      <span>•</span>
                                      <span>{formatFileSize(doc.fileSize)}</span>
                                      {doc.sourceLabel && (
                                        <>
                                          <span>•</span>
                                          <span className={`source-badge source-${doc.source || 'unknown'}`}>
                                            {doc.sourceLabel}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="order-doc-actions">
                                    <button
                                      type="button"
                                      className="order-doc-btn"
                                      onClick={() => setViewerDoc(doc)}
                                      title="Preview"
                                    >
                                      <Eye size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="order-doc-btn"
                                      onClick={() => handleDocDownload(doc)}
                                      title="Download"
                                    >
                                      <Download size={15} />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>

                      {/* Admin internal notes — only visible to admin roles */}
                      <div className="admin-notes-card">
                        <h4><MessageSquare size={16} /> Admin Notes <span className="admin-only-pill">Internal</span></h4>
                        <div className="admin-note-compose">
                          <textarea
                            rows={2}
                            placeholder="Add an internal note (visible only to admins)…"
                            value={notesByOrder[order.id]?.draft || ''}
                            onChange={(e) => setNoteDraft(order.id, e.target.value)}
                          />
                          <button
                            type="button"
                            className="admin-note-submit"
                            disabled={!(notesByOrder[order.id]?.draft || '').trim()}
                            onClick={() => submitNewNote(order.id)}
                          >
                            Add note
                          </button>
                        </div>
                        {(() => {
                          const entry = notesByOrder[order.id];
                          if (!entry || entry.status === 'loading') return <div className="admin-notes-loading">Loading notes…</div>;
                          if (entry.status === 'error') return <div className="admin-notes-error">Couldn't load notes: {entry.error}</div>;
                          if (!entry.notes?.length) return <div className="admin-notes-empty">No admin notes yet.</div>;
                          return (
                            <ul className="admin-notes-list">
                              {entry.notes.map((n) => {
                                const isEditing = editingNoteId === n.id;
                                return (
                                  <li key={n.id} className="admin-note-row">
                                    <div className="admin-note-meta">
                                      <strong>{n.author?.name || 'Unknown'}</strong>
                                      <span>{formatDateTime(n.createdAt)}</span>
                                      {n.updatedAt && n.updatedAt !== n.createdAt && (
                                        <span className="admin-note-edited">(edited {formatDateTime(n.updatedAt)})</span>
                                      )}
                                    </div>
                                    {isEditing ? (
                                      <div className="admin-note-edit">
                                        <textarea
                                          rows={2}
                                          value={editingNoteBody}
                                          onChange={(e) => setEditingNoteBody(e.target.value)}
                                        />
                                        <div className="admin-note-edit-actions">
                                          <button type="button" onClick={() => saveEditingNote(order.id)}>Save</button>
                                          <button type="button" onClick={() => { setEditingNoteId(null); setEditingNoteBody(''); }}>Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="admin-note-body">{n.body}</div>
                                        <div className="admin-note-actions">
                                          <button type="button" onClick={() => { setEditingNoteId(n.id); setEditingNoteBody(n.body); }} title="Edit">
                                            <Edit3 size={13} />
                                          </button>
                                          <button type="button" onClick={() => removeNote(order.id, n.id)} title="Delete">
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        })()}
                      </div>

                      {/* Customer Notes */}
                      {(order.customerInstructions || order.notes || order.instructions) && (
                        <div className="customer-notes">
                          <h4>Notes & Instructions</h4>
                          <p>{order.customerInstructions || order.notes || order.instructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
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
                <ChevronLeft size={18} />
                Previous
              </button>
              <div className="pagination-info">
                <span>Page {currentPage} of {totalPages}</span>
                <span className="pagination-count">
                  ({(currentPage - 1) * ORDERS_PER_PAGE + 1}-{Math.min(currentPage * ORDERS_PER_PAGE, total)} of {total})
                </span>
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onDownload={handleDocDownload}
        />
      )}

      {actionModalConfig && (
        <AdminActionModal
          {...actionModalConfig}
          onClose={closeAction}
        />
      )}

      {bulkModalOpen && (
        <AdminActionModal
          title={`Change status for ${selectedIds.size} order${selectedIds.size === 1 ? '' : 's'}`}
          description="Applies to every selected order. Each row is updated individually and logged to the audit trail."
          fields={[
            { name: 'status', label: 'New status', type: 'select', required: true, options: [
              { value: SHIPMENT_STATUS.SCHEDULED,              label: 'Scheduled' },
              { value: SHIPMENT_STATUS.ASSIGNED,               label: 'Assigned' },
              { value: SHIPMENT_STATUS.ON_THE_WAY_TO_PICKUP,   label: 'On the Way' },
              { value: SHIPMENT_STATUS.ARRIVED_AT_PICKUP,      label: 'Arrived at Pickup' },
              { value: SHIPMENT_STATUS.PICKED_UP,              label: 'Picked Up' },
              { value: SHIPMENT_STATUS.DELIVERED,              label: 'Delivered' },
              { value: SHIPMENT_STATUS.CANCELLED,              label: 'Cancelled' },
            ]},
            { name: 'note', label: 'Admin note (optional)', type: 'textarea' },
          ]}
          confirmLabel="Apply to selection"
          confirmTone="primary"
          onConfirm={(v) => runBulkStatus(v.status, v.note)}
          onClose={() => setBulkModalOpen(false)}
        />
      )}
    </div>
  );
}