// src/components/booking/summary-card.jsx
import React from 'react';

export default function SummaryCard({ booking }) {
  if (!booking) return null;
  const { pickup, dropoff, vehicle, schedule, quote } = booking;

  const fmtAddr = (a) => a ? [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ') : '';
  const fmtWin = (w) => w ? [w.date, w.from && `from ${w.from}`, w.to && `to ${w.to}`, w.flex && `(${w.flex})`].filter(Boolean).join(' ') : '';

  return (
    <div className="summary-card">
      <h4>Summary</h4>
      <div className="sc-row"><strong>Pickup:</strong> {fmtAddr(pickup)} {fmtWin(schedule?.pickup)}</div>
      <div className="sc-row"><strong>Drop-off:</strong> {fmtAddr(dropoff)} {fmtWin(schedule?.dropoff)}</div>
      <div className="sc-row"><strong>Vehicle(s):</strong> {vehicle?.label || '—'}</div>
      {quote ? (
        <>
          <div className="sc-row"><strong>Miles:</strong> {quote.miles ?? '—'}</div>
          <div className="sc-row"><strong>Your offer:</strong> ${Number(quote.offer || 0).toFixed(2)}</div>
          <div className="sc-row"><strong>Transport:</strong> {quote.transportType || 'open'}</div>
        </>
      ) : null}
    </div>
  );
}
