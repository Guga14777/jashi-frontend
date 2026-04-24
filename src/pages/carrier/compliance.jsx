import React from 'react';
import CarrierHeader from '../../components/header/carrier/carrierheader';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer';
import LiveChat from '../../components/live-chat/live-chat';
import './compliance.css';

export default function Compliance() {
  return (
    <div className="page-shell compliance">
      <CarrierHeader />

      <main className="page-main">
        {/* PAGE HEADER */}
        <header className="page-header">
          <h1>Compliance Docs</h1>
          <p>Access standard carrier onboarding and safety documentation.</p>
        </header>

        {/* COMMON DOCUMENTS */}
        <section className="card">
          <h2>Common Documents</h2>
          <ul className="list">
            <li>W-9</li>
            <li>COI (Certificate of Insurance)</li>
            <li>Operating Authority (MC/FF)</li>
          </ul>
        </section>

        {/* ONBOARDING REQUIREMENTS */}
        <section className="card grid two">
          <div className="card-sub">
            <h3>Company &amp; Authority</h3>
            <ul className="list">
              <li>USDOT and MC/FF number (active)</li>
              <li>W-9 (current tax year, signed)</li>
              <li>Operating Authority letter</li>
              <li>Voided check or bank letter (for payouts)</li>
            </ul>
          </div>

          <div className="card-sub">
            <h3>Insurance &amp; Safety</h3>
            <ul className="list">
              <li>COI with required limits and additional insured</li>
              <li>Driver’s license(s) for active drivers</li>
              <li>Vehicle registration(s) and VINs</li>
              <li>Carrier agreement (e-sign in portal)</li>
            </ul>
          </div>
        </section>

        {/* INSURANCE REQUIREMENTS */}
        <section className="card grid two">
          <div className="card-sub">
            <h3>Minimum limits (from $50,000 and up)</h3>
            <ul className="list">
              <li>Auto Liability: $1,000,000 combined single limit</li>
              <li>Cargo: <b>$50,000+</b> (match equipment &amp; typical loads)</li>
              <li>General Liability: $1,000,000 / $2,000,000 aggregate</li>
            </ul>
          </div>

          <div className="card-sub">
            <h3>COI must show</h3>
            <ul className="list">
              <li>Guga Brokerage listed as Certificate Holder</li>
              <li>Policy number(s) and effective dates</li>
              <li>VIN list or “Any Auto” where applicable</li>
              <li>Producer contact for verification</li>
            </ul>
          </div>
        </section>

        {/* HOW TO SUBMIT */}
        <section className="card grid two">
          <div className="card-sub">
            <h3>How to submit</h3>
            <ol className="list ordered">
              <li>Go to <b>Profile → Documents</b>.</li>
              <li>Upload W-9, COI, and Authority letter (PDF or clear photos).</li>
              <li>Add vehicles &amp; drivers; verify VINs and license dates.</li>
              <li>Review and e-sign the carrier agreement.</li>
            </ol>
          </div>

          <div className="card-sub">
            <h3>What to expect</h3>
            <ul className="list">
              <li>Most carriers verified same day (business hours).</li>
              <li>Insurance verification may require a quick producer call.</li>
              <li>You’ll receive an email and in-app banner once approved.</li>
            </ul>
          </div>
        </section>

        {/* SUPPORT CTA (non-clickable labels) */}
        <section className="card support-cta">
          <div className="support-copy">
            <h2>Questions about compliance?</h2>
            <p>We can help review documents, insurance limits, or account approvals.</p>
          </div>

          <div className="support-actions">
            <span className="apps-btn email" role="text">carrier-support@jashilogistics.com</span>
            <span className="apps-btn phone" role="text">1-800-JASHI-CARRIERS</span>
          </div>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
