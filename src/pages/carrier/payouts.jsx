import React from 'react';
import CarrierHeader from '../../components/header/carrier/carrierheader';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer';
import LiveChat from '../../components/live-chat/live-chat';
import './payouts.css';

export default function Payouts() {
  return (
    <div className="page-shell payouts">
      <CarrierHeader />

      <main className="page-main">
        {/* Page intro */}
        <header className="page-header">
          <h1>Payments & Payouts</h1>
          <p>View payout schedules, payment methods, fees, and how to get paid faster.</p>
        </header>

        {/* How customers can pay */}
        <section className="card">
          <h2>How customers can pay</h2>
          <div className="apps-grid three">
            <article className="apps-feature">
              <h3>Online card / ACH</h3>
              <p>
                Customers can pay on the website using credit/debit cards or ACH. Payments are secured and confirmed
                instantly.
              </p>
              <ul>
                <li>Card (Visa, Mastercard, Amex, Discover)</li>
                <li>ACH bank transfer</li>
                <li>Receipts generated automatically</li>
              </ul>
            </article>

            <article className="apps-feature">
              <h3>Cash on pickup / delivery</h3>
              <p>
                If the shipment is marked as cash, the driver collects the balance at pickup or delivery. You’ll see the
                cash note in the load details.
              </p>
              <ul>
                <li>Exact cash recommended</li>
                <li>Driver confirms payment in the app</li>
                <li>Receipt issued to customer</li>
              </ul>
            </article>

            <article className="apps-feature">
              <h3>Digital (Zelle®, Cash App)</h3>
              <p>
                For cash-style jobs, customers may also pay the driver via Zelle® or Cash App — confirmed in-app with a
                photo of the confirmation screen.
              </p>
              <ul>
                <li>Real-time confirmation</li>
                <li>No exchange of card numbers</li>
                <li>Works even on the road</li>
              </ul>
            </article>
          </div>
        </section>

        {/* How you get paid (no fees) */}
        <section className="card">
          <h2>How you get paid (no fees)</h2>
          <p className="subtle">Choose the speed that fits your cash-flow. All options below are $0 fee.</p>

          <div className="table-wrap">
            <table className="payouts-table">
              <thead>
                <tr>
                  <th>Payout method</th>
                  <th>Speed</th>
                  <th className="fee">Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard ACH</td>
                  <td>Next business day</td>
                  <td className="fee">$0</td>
                </tr>
                <tr>
                  <td>Same-day ACH</td>
                  <td>Same business day (cut-off applies)</td>
                  <td className="fee">$0</td>
                </tr>
                <tr>
                  <td>Instant (RTP / Zelle®)</td>
                  <td>Minutes, 24/7</td>
                  <td className="fee">$0</td>
                </tr>
                <tr>
                  <td>Paper Check</td>
                  <td>USPS First-Class Mail</td>
                  <td className="fee">$0</td>
                </tr>
                <tr>
                  <td>Cash payout</td>
                  <td>Collected by driver; handed to you/office</td>
                  <td className="fee">$0</td>
                </tr>
                <tr>
                  <td>Check payout (on site)</td>
                  <td>Handed to driver or picked up at office</td>
                  <td className="fee">$0</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="apps-grid two">
            <article className="apps-feature">
              <h3>Schedule</h3>
              <ul>
                <li>Daily auto-payouts at 6pm ET (ACH)</li>
                <li>Instant payouts available 24/7 (RTP/Zelle®)</li>
                <li>Cut-off for same-day ACH: 2pm local bank time</li>
              </ul>
            </article>

            <article className="apps-feature">
              <h3>What’s included</h3>
              <ul>
                <li>Card & ACH processing</li>
                <li>Dispute handling and receipts</li>
                <li>Bank verification & fraud screening</li>
              </ul>
            </article>
          </div>
        </section>

        {/* Support (no FAQ; email not clickable) */}
        <section className="card support-cta">
          <div className="support-copy">
            <h3>Need help with a payout?</h3>
            <p>We can review payment status, bank verifications, or transfer delays.</p>
          </div>

          <div className="support-actions">
            <div className="apps-btn primary not-link" aria-disabled="true">
              <span className="email-text">carrier-support@guga.com</span>
            </div>
            <a className="apps-btn ghost" href="tel:1800GUGACARRIERS">
              1-800-GUGA-CARRIERS
            </a>
          </div>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
