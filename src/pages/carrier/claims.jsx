import React from 'react';
import CarrierHeader from '../../components/header/carrier/carrierheader';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer';
import LiveChat from '../../components/live-chat/live-chat';
import './claims.css';

export default function Claims() {
  return (
    <div className="page-shell claims">
      <CarrierHeader />

      <main className="page-main">
        <header className="page-header">
          <h1>Safety & Claims</h1>
          <p>
            Report, track, and resolve cargo or incident claims quickly. Keep evidence, report promptly,
            and we’ll help you through each step.
          </p>
        </header>

        {/* Row 1 */}
        <section className="grid two">
          <div className="card">
            <h2>Start a Claim</h2>
            <ol className="list-ol">
              <li>Gather evidence: BOL, clear photos (before/after), and notes.</li>
              <li>Submit details in the portal or email <strong>carrier-support@jashilogistics.com</strong>.</li>
              <li>We confirm coverage and next steps in 1–2 business days.</li>
            </ol>

            <div className="cta-row">
              {/* Action button with white text @ 90% opacity */}
              <a className="btn_primary" href="/carrier/claims/new">
                Start claim in portal
              </a>

              {/* Email shown as NON-clickable pill — forced to its own line */}
              <span className="btn_email" aria-label="Carrier support email">
                carrier-support@jashilogistics.com
              </span>
            </div>
          </div>

          <div className="card">
            <h3>When to File</h3>
            <ul className="list">
              <li>Cargo damage or shortage noted on delivery BOL.</li>
              <li>Load canceled on-site after arrival (TONU) or extended detention.</li>
              <li>Property/incident involving another party (police report if applicable).</li>
              <li>Any safety event you want documented on the shipment.</li>
            </ul>
            <p className="hint">Report within <strong>24 hours</strong> of delivery or incident when possible.</p>
          </div>
        </section>

        {/* Row 2 */}
        <section className="grid two">
          <div className="card">
            <h3>Evidence checklist</h3>
            <ul className="list">
              <li>BOL with clear notes (in/out times; damages circled and initialed).</li>
              <li>Photos of unit(s): wide shots + close-ups; VIN stickers; odometer where relevant.</li>
              <li>Facility slips or time-stamped gate photos for detention/TONU.</li>
              <li>Messages/emails confirming delay, cancellation, or not-ready status.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Claim types</h3>
            <ul className="list">
              <li><strong>Cargo damage</strong> (scratches, dents, glass, mechanical noted at delivery).</li>
              <li><strong>Loss / shortage</strong> (unit missing or parts removed).</li>
              <li><strong>Delay accessorials</strong> (Detention, Layover, TONU).</li>
              <li><strong>Incident report</strong> (property/third-party event; police report if applicable).</li>
            </ul>
          </div>
        </section>

        {/* Row 3 – flat $50 accessorials */}
        <section className="card">
          <h3>Accessorials (flat $50 each)</h3>
          <ul className="list">
            <li>Detention (after free time), Layover, TONU (“Truck Ordered Not Used”).</li>
            <li>Submit within 7 days with proof (BOL times, gate photos, or cancellation message).</li>
          </ul>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
