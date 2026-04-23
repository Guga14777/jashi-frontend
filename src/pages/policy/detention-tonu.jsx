import React from 'react';
import CarrierHeader from '../../components/header/carrier/carrierheader';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer';
import LiveChat from '../../components/live-chat/live-chat';
import './detention-tonu.css';

export default function DetentionTONU() {
  return (
    <div className="page-shell detention-tonu">
      <CarrierHeader />

      <main className="page-main">
        <header className="page-header">
          <h1>Detention / TONU</h1>
          <p className="page-subtitle">
            All accessorials on Guga are <strong>$50 flat</strong> — simple, predictable, and fast to process.
          </p>
        </header>

        {/* Standard Policy */}
        <section className="card">
          <h2>Standard Policy</h2>
          <ul className="list">
            <li>Detention, Layover, and TONU are all <strong>$50 flat</strong>.</li>
            <li>Detention still begins after <strong>2 hours</strong> of free time (unless RateCon says otherwise), but the charge is flat $50.</li>
            <li>All accessorials must be documented on the BOL (or equivalent) and approved by Guga before invoicing.</li>
          </ul>
        </section>

        {/* Definitions */}
        <section className="card">
          <h2>Definitions</h2>
          <ul className="list">
            <li><strong>Detention:</strong> Paid when a driver waits after the free-time window expires.</li>
            <li><strong>Layover:</strong> Delay that requires an overnight hold not caused by the carrier.</li>
            <li><strong>TONU (“Truck Ordered Not Used”):</strong> Load canceled or not ready after the driver is dispatched or on-site.</li>
          </ul>
        </section>

        {/* What starts the clock */}
        <section className="card">
          <h2>What starts the clock?</h2>
          <ul className="list">
            <li>Check-in timestamp at shipper/receiver, or a gate-in photo with time/location.</li>
            <li>Free time: <strong>2 hours</strong> unless the RateCon specifies a different window.</li>
            <li>Clock stops at the start of loading/unloading or at departure time if never loaded.</li>
          </ul>
        </section>

        {/* Rates (All $50 Flat) */}
        <section className="card">
          <h2>Rates</h2>

          <div className="rates-table-wrap">
            <table className="rates-table" aria-label="Accessorial rates">
              <thead>
                <tr>
                  <th>Accessorial</th>
                  <th>Standard</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Detention (after free time)</td>
                  <td><strong>$50 flat</strong></td>
                  <td>One-time charge once detention applies.</td>
                </tr>
                <tr>
                  <td>Layover</td>
                  <td><strong>$50 flat</strong></td>
                  <td>Overnight hold not caused by the carrier.</td>
                </tr>
                <tr>
                  <td>TONU</td>
                  <td><strong>$50 flat</strong></td>
                  <td>Load canceled/not ready after dispatch/arrival.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="examples">
            <div className="example">
              <div className="example-title">Detention example</div>
              <p>Check-in 9:00, loaded 12:15 → free time expired → <strong>$50</strong> detention.</p>
            </div>
            <div className="example">
              <div className="example-title">Layover example</div>
              <p>Facility pushes loading to next day → <strong>$50</strong> layover.</p>
            </div>
            <div className="example">
              <div className="example-title">TONU example</div>
              <p>Driver arrived on site, shipper canceled → <strong>$50</strong> TONU (with proof).</p>
            </div>
          </div>
        </section>

        {/* Required proof */}
        <section className="card">
          <h2>Required proof</h2>
          <ul className="list">
            <li>Check-in/out times on BOL or facility time-stamped ticket.</li>
            <li>Photos of gate/in-app timer with visible time &amp; location (GPS).</li>
            <li>Messages/emails showing cancellation or “not ready” status (for TONU).</li>
            <li>Dispatcher notes in the Guga app with timestamps.</li>
          </ul>
        </section>

        {/* How to request payment */}
        <section className="card">
          <h2>How to request payment</h2>
          <ol className="steps">
            <li>Open the load in the app or portal and choose <strong>Request Accessorial</strong>.</li>
            <li>Attach photos/BOL and enter in/out times with a brief note.</li>
            <li>Submit within <strong>7 days</strong> of delivery or cancellation.</li>
            <li>We review within <strong>1–2 business days</strong>; approved items show on your statement.</li>
          </ol>
        </section>

        {/* Tips */}
        <section className="card">
          <h2>Disputes &amp; best practices</h2>
          <ul className="list">
            <li>If times are missing, we may contact the facility for verification.</li>
            <li>Always obtain a stamp/signature or slip with check-in/out times.</li>
            <li>Call support from the app if you expect a long delay so we can note the file.</li>
          </ul>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
