// src/pages/admin/activity-admin.jsx
// Activity log viewer backed by AccountEvent.
// Filter by event-type prefix ("admin_*", "login", "password_reset", …).

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../store/auth-context.jsx';
import { AdminActivityAPI } from '../../services/admin.api.js';
import { RefreshCw, Activity, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import './activity-admin.css';

const PAGE_SIZE = 50;

// Curated filter set — admins probably care about these categories most.
const QUICK_FILTERS = [
  { label: 'All',              value: '' },
  { label: 'Admin actions',    value: 'admin_*' },
  { label: 'Orders',           value: 'admin_order_*' },
  { label: 'Detention',        value: 'admin_detention_*' },
  { label: 'CNP',              value: 'admin_cnp_*' },
  { label: 'Auth / login',     value: 'login' },
  { label: 'Signups',          value: 'user_registered' },
  { label: 'Role changes',     value: 'role_added' },
  { label: 'Password',         value: 'password_reset' },
];

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function humanizeEventType(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActivityAdmin() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('admin_*');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchActivity = async () => {
    setLoading(true); setError(null);
    try {
      const data = await AdminActivityAPI.list({ type: filter || undefined, page, limit: PAGE_SIZE }, token);
      setEvents(data.events || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchActivity(); }, [token, filter, page]);
  useEffect(() => { setPage(1); }, [filter]);

  const eventBadgeClass = (type) => {
    if (type?.startsWith('admin_')) return 'ev-badge admin';
    if (type?.includes('login')) return 'ev-badge auth';
    if (type?.includes('cancel')) return 'ev-badge danger';
    if (type?.includes('registered') || type?.includes('added')) return 'ev-badge success';
    return 'ev-badge neutral';
  };

  return (
    <div className="admin-page activity-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Activity Log</h1>
          <p>{loading ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}</p>
        </div>
        <button className="refresh-btn" onClick={fetchActivity} title="Refresh">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="activity-filters">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`activity-chip ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="activity-error">Error: {error}</div>
      ) : events.length === 0 && !loading ? (
        <div className="activity-empty">
          <Activity size={28} />
          <p>No events match this filter.</p>
        </div>
      ) : (
        <>
          <div className="activity-list">
            {events.map((e) => {
              const isOpen = expandedId === e.id;
              return (
                <div key={e.id} className={`activity-row ${isOpen ? 'open' : ''}`}>
                  <div className="activity-row-main" onClick={() => setExpandedId(isOpen ? null : e.id)}>
                    <div className="activity-time">
                      <Clock size={13} />
                      {formatTs(e.createdAt)}
                    </div>
                    <div className="activity-type-col">
                      <span className={eventBadgeClass(e.eventType)}>{humanizeEventType(e.eventType)}</span>
                    </div>
                    <div className="activity-actor">
                      <User size={13} />
                      {e.actor?.name || e.actor?.email || 'Unknown'}
                      {e.actor?.roles && <span className="activity-roles">({e.actor.roles})</span>}
                    </div>
                    <button type="button" className="activity-expand-btn" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="activity-row-body">
                      <pre>{JSON.stringify(e.eventData ?? {}, null, 2)}</pre>
                      {(e.ipAddress || e.userAgent) && (
                        <div className="activity-meta">
                          {e.ipAddress && <span>IP: {e.ipAddress}</span>}
                          {e.userAgent && <span className="activity-ua">{e.userAgent}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="pagination-info">
                Page {page} of {totalPages} <span className="pagination-count">({(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total})</span>
              </div>
              <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
