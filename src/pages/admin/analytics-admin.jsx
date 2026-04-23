// src/pages/admin/analytics-admin.jsx
// Admin analytics dashboard — totals, revenue, cancellation/conversion rates,
// 6-step status distribution, and time-windowed counts. No charts for now;
// just clean numeric cards so the signal is legible at a glance.

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth-context.jsx';
import { AdminStatsAPI } from '../../services/admin.api.js';
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, Truck,
  CheckCircle, XCircle, Clock, Navigation, MapPin, PackageCheck,
  RefreshCw, Percent, AlertCircle
} from 'lucide-react';
import './analytics-admin.css';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}
function formatPercent(n) {
  const pct = (Number(n) || 0) * 100;
  return `${pct.toFixed(1)}%`;
}

export default function AnalyticsAdmin() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true); setError(null);
    try {
      const data = await AdminStatsAPI.get(token);
      setStats(data.stats);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchStats(); }, [token]);

  if (loading && !stats) {
    return <div className="analytics-loading"><RefreshCw className="spin" size={20} /> Loading analytics…</div>;
  }
  if (error && !stats) {
    return <div className="analytics-error"><AlertCircle size={20} /> {error} <button onClick={fetchStats}>Retry</button></div>;
  }
  if (!stats) return null;

  const { bookings, revenue, rates, quotes, users } = stats;

  return (
    <div className="admin-page analytics-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Analytics</h1>
          <p>Operational metrics across orders, revenue, and customers</p>
        </div>
        <button className="refresh-btn" onClick={fetchStats} title="Refresh">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {/* Top-level KPIs */}
      <section className="metrics-row">
        <div className="metric-card primary">
          <div className="metric-icon"><Package size={22} /></div>
          <div className="metric-body">
            <div className="metric-label">Total Orders</div>
            <div className="metric-value">{bookings.total.toLocaleString()}</div>
            <div className="metric-sub">+{bookings.last7Days} last 7d · +{bookings.today} today</div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon"><DollarSign size={22} /></div>
          <div className="metric-body">
            <div className="metric-label">Revenue</div>
            <div className="metric-value">{formatCurrency(revenue.total)}</div>
            <div className="metric-sub">
              {revenue.paidCount} paid · {formatCurrency(revenue.today)} today
            </div>
          </div>
        </div>

        <div className="metric-card warn">
          <div className="metric-icon"><XCircle size={22} /></div>
          <div className="metric-body">
            <div className="metric-label">Cancellation Rate</div>
            <div className="metric-value">{formatPercent(rates.cancellationRate)}</div>
            <div className="metric-sub">{bookings.cancelled} of {bookings.total}</div>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon"><Percent size={22} /></div>
          <div className="metric-body">
            <div className="metric-label">Conversion Rate</div>
            <div className="metric-value">{formatPercent(rates.conversionRate)}</div>
            <div className="metric-sub">{bookings.total} orders / {quotes.total} quotes</div>
          </div>
        </div>
      </section>

      {/* Status distribution */}
      <section className="analytics-section">
        <h2>Status distribution</h2>
        <div className="status-grid">
          <StatusCell icon={Clock}        label="Scheduled"   value={bookings.scheduled}   color="#d97706" />
          <StatusCell icon={Users}        label="Assigned"    value={bookings.assigned}    color="#2563eb" />
          <StatusCell icon={Navigation}   label="On the Way"  value={bookings.onTheWay}    color="#b45309" />
          <StatusCell icon={MapPin}       label="At Pickup"   value={bookings.arrived}     color="#b45309" />
          <StatusCell icon={PackageCheck} label="Picked Up"   value={bookings.pickedUp}    color="#7c3aed" />
          <StatusCell icon={CheckCircle}  label="Delivered"   value={bookings.delivered}   color="#16a34a" />
          <StatusCell icon={XCircle}      label="Cancelled"   value={bookings.cancelled}   color="#dc2626" />
        </div>
      </section>

      {/* Time-windowed counts */}
      <section className="analytics-section">
        <h2>Volume (by window)</h2>
        <div className="window-grid">
          <WindowCell label="Orders today"      value={bookings.today} />
          <WindowCell label="Orders last 7d"    value={bookings.last7Days} />
          <WindowCell label="Orders last 30d"   value={bookings.last30Days} />
          <WindowCell label="Quotes today"      value={quotes.today} />
          <WindowCell label="Quotes last 7d"    value={quotes.last7Days} />
          <WindowCell label="Quotes total"      value={quotes.total} />
        </div>
      </section>

      {/* Users */}
      <section className="analytics-section">
        <h2>Users</h2>
        <div className="window-grid">
          <WindowCell label="Total customers"      value={users.customers} icon={Users} />
          <WindowCell label="Total carriers"       value={users.carriers}  icon={Truck} />
          <WindowCell label="New customers (7d)"   value={users.newCustomersLast7Days} icon={TrendingUp} />
          <WindowCell label="New carriers (7d)"    value={users.newCarriersLast7Days}  icon={TrendingUp} />
        </div>
      </section>
    </div>
  );
}

function StatusCell({ icon: Icon, label, value, color }) {
  return (
    <div className="status-cell">
      <div className="status-cell-icon" style={{ color }}><Icon size={18} /></div>
      <div className="status-cell-value">{value.toLocaleString()}</div>
      <div className="status-cell-label">{label}</div>
    </div>
  );
}

function WindowCell({ label, value, icon: Icon }) {
  return (
    <div className="window-cell">
      {Icon && <Icon size={16} className="window-cell-icon" />}
      <div className="window-cell-body">
        <div className="window-cell-value">{value?.toLocaleString?.() ?? value}</div>
        <div className="window-cell-label">{label}</div>
      </div>
    </div>
  );
}
