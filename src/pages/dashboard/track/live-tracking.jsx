import React from "react";
import { Link } from "react-router-dom";
import LiveChat from "../../../components/live-chat/live-chat.jsx";
import "./live-tracking.css";

export default function LiveTracking() {
  return (
    <div className="lt-page">
      <main className="lt-container">
        <header className="lt-header">
          <h1>Live Tracking</h1>
          <p className="lt-subtitle">
            How shipment status, ETA, and alerts work in your dashboard.
          </p>
        </header>

        <section className="lt-card lt-overview">
          <h2 className="lt-h2">Overview</h2>
          <p>
            Live Tracking keeps you informed from pickup to delivery. Your
            status is updated by the carrier and our operations team. When a new
            event is posted, you’ll see it reflected on your dashboard and—if
            you opt in—via email/SMS alerts.
          </p>
          <div className="lt-callout">
            <strong>Good to know:</strong> Status updates are posted as soon as
            carriers scan or confirm a milestone. Rural pickups, after-hours
            moves, or limited signal may cause brief delays between events and
            updates.
          </div>
        </section>

        <div className="lt-grid">
          <section className="lt-card lt-status">
            <h3 className="lt-h3">Status Lifecycle</h3>
            <ol className="lt-timeline">
              <li className="lt-step lt-waiting">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">Waiting</div>
                  <div className="lt-step-desc">
                    We're confirming a carrier for your route.
                  </div>
                </div>
              </li>
              <li className="lt-step lt-dispatched">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">Dispatched</div>
                  <div className="lt-step-desc">
                    A driver is assigned and heading to pickup.
                  </div>
                </div>
              </li>
              <li className="lt-step lt-picked">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">Picked Up</div>
                  <div className="lt-step-desc">
                    Your vehicle has been loaded at origin.
                  </div>
                </div>
              </li>
              <li className="lt-step lt-intransit">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">In Transit</div>
                  <div className="lt-step-desc">
                    On the road between cities.
                  </div>
                </div>
              </li>
              <li className="lt-step lt-out">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">Out for Delivery</div>
                  <div className="lt-step-desc">
                    Driver is approaching your destination.
                  </div>
                </div>
              </li>
              <li className="lt-step lt-delivered">
                <div className="lt-dot" />
                <div className="lt-step-content">
                  <div className="lt-step-title">Delivered</div>
                  <div className="lt-step-desc">Completed and verified.</div>
                </div>
              </li>
            </ol>
          </section>

          <section className="lt-card lt-right-col">
            <div className="lt-box">
              <h3 className="lt-h3">What You’ll See</h3>
              <ul className="lt-list">
                <li>
                  <strong>Latest update</strong> — event, time, city, and any
                  notes from the driver.
                </li>
                <li>
                  <strong>ETA window</strong> — narrows as your shipment
                  advances.
                </li>
                <li>
                  <strong>Status timeline</strong> — shows completed and
                  upcoming steps.
                </li>
              </ul>
            </div>

            <div className="lt-box">
              <h3 className="lt-h3">Where Updates Come From</h3>
              <ul className="lt-list">
                <li>Driver mobile app scans and GPS pings.</li>
                <li>Dispatch confirmations (pickup &amp; delivery appts).</li>
                <li>
                  Operations review for accuracy (time zone &amp; notes).
                </li>
              </ul>
            </div>

            <div className="lt-callout lt-eta-note">
              <h4>About ETAs</h4>
              <p>
                ETAs account for hours-of-service rules, traffic, weather, and
                multi-stop routes. The window may widen during storms/holidays
                and tighten once your vehicle is <em>In Transit</em> or{" "}
                <em>Out for Delivery</em>.
              </p>
            </div>
          </section>
        </div>

        <section className="lt-card">
          <h3 className="lt-h3">Alerts &amp; Notifications</h3>
          <p className="lt-paragraph">
            Turn on SMS/email to be notified when your status changes or your
            ETA is adjusted. You can change alert types any time in{" "}
            <Link to="/dashboard/settings" className="lt-inline-link">
              Settings
            </Link>{" "}
            and contact our team in{" "}
            <Link to="/dashboard/help" className="lt-inline-link">
              Help
            </Link>
            .
          </p>
        </section>

        <section className="lt-card">
          <h3 className="lt-h3">Common Questions</h3>
          <details className="lt-faq">
            <summary>How often is tracking updated?</summary>
            <p>
              As soon as carriers scan or confirm milestones. Rural/low-signal
              areas may cause brief delays.
            </p>
          </details>
          <details className="lt-faq">
            <summary>Why did my ETA shift?</summary>
            <p>
              Traffic, weather, added stops, and appointment availability can
              adjust arrival windows.
            </p>
          </details>
          <details className="lt-faq">
            <summary>Will I get a call before delivery?</summary>
            <p>
              Yes. Drivers typically provide a heads-up call/text with an
              estimated arrival window.
            </p>
          </details>
          <details className="lt-faq">
            <summary>What if my status seems stuck?</summary>
            <p>
              Long highway legs can show the same status for several hours. If
              it looks stale, reach out via{" "}
              <Link to="/dashboard/help" className="lt-inline-link">
                Help
              </Link>
              .
            </p>
          </details>
        </section>

        <p className="lt-disclaimer">
          Tracking data is provided by carriers and partner systems. Times are
          estimates and may vary.
        </p>
      </main>

      <LiveChat />
    </div>
  );
}
