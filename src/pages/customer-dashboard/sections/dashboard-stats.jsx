// ============================================================
// FILE: src/pages/customer-dashboard/sections/dashboard-stats.jsx
// Whole-account summary cards. Values come from the server-side
// DB aggregate endpoint GET /api/customer/dashboard-stats — NOT
// from the paginated Orders table. Page/search/filter changes in
// the Orders table must not affect these cards.
// ============================================================

import React from 'react';
import './dashboard-stats.css';

const formatCount = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) return '0';
  return new Intl.NumberFormat('en-US').format(Math.trunc(value));
};

const formatCurrency = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return '0%';
  // Defense-in-depth: backend already caps + rounds, but clamp here too
  // so a stale cached stat can't render 150%.
  const capped = Math.min(value, 100);
  return `${(Math.round(capped * 10) / 10).toFixed(1)}%`;
};

const DashboardStats = ({ stats, loading = false }) => {
  const totalQuotes            = Number(stats?.totalQuotes ?? 0);
  const totalOrders            = Number(stats?.totalOrders ?? 0);
  const totalOpenOrders        = Number(stats?.totalOpenOrders ?? 0);
  const totalDeliveredOrders   = Number(stats?.totalDeliveredOrders ?? 0);
  const totalCancelledOrders   = Number(stats?.totalCancelledOrders ?? 0);
  const totalSpend             = Number(stats?.totalSpend ?? 0);
  const conversionRate         = Number(stats?.conversionRate ?? 0);

  const cards = [
    {
      key: 'quotes',
      label: 'Total Quotes',
      value: formatCount(totalQuotes),
      helper: 'All time',
    },
    {
      key: 'orders',
      label: 'Total Orders',
      value: formatCount(totalOrders),
      helper: 'All statuses',
    },
    {
      key: 'open',
      label: 'Open Orders',
      value: formatCount(totalOpenOrders),
      helper: 'Waiting / assigned / in transit',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      value: formatCount(totalDeliveredOrders),
      helper: 'Completed shipments',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      value: formatCount(totalCancelledOrders),
      helper: 'Cancelled orders',
    },
    {
      key: 'spend',
      label: 'Total Spend',
      value: formatCurrency(totalSpend),
      helper: 'Sum of delivered prices',
    },
    {
      key: 'conversion',
      label: 'Conversion Rate',
      value: formatPercent(conversionRate),
      helper: 'Orders / quotes',
    },
  ];

  return (
    <section className="dashboard-stats" aria-label="Account summary">
      {cards.map((card) => (
        <div key={card.key} className="stat-card">
          <div
            className={`stat-card__value${loading ? ' stat-card__value--loading' : ''}`}
            aria-live="polite"
          >
            {loading ? '—' : card.value}
          </div>
          <div className="stat-card__label">{card.label}</div>
          <div className="stat-card__helper">{card.helper}</div>
        </div>
      ))}
    </section>
  );
};

export default DashboardStats;
