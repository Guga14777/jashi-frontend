import React from "react";
import { Link } from "react-router-dom";

import CustomerHeader from "../../components/header/customer/customerheader.jsx";
import CustomerDashboardFooter from "../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";

import "./insurance.css";

export default function InsurancePolicy() {
  return (
    <div className="ins-shell">
      <CustomerHeader />

      <main className="ins-main" role="main">
        {/* HERO */}
        <header className="ins-hero" aria-labelledby="insTitle">
          <div className="ins-container">
            <h1 id="insTitle">Insurance &amp; Coverage</h1>
            <p className="ins-sub">
              Every carrier booked on Jashi Logistics must maintain active Motor Truck
              Cargo Insurance with a <strong>minimum limit of $50,000</strong>.
              Your vehicle is protected while it's in the carrier's care,
              custody, and control. Higher limits are common for high-value
              vehicles.
            </p>
          </div>
        </header>

        <div className="ins-container">
          {/* QUICK FACTS */}
          <section className="card">
            <h2 className="section-title">Quick Facts</h2>
            <ul className="bullets">
              <li>
                <strong>Required:</strong> Motor Truck Cargo ≥ <strong>$50,000</strong> per shipment.
              </li>
              <li>Coverage applies while your vehicle is under carrier control.</li>
              <li>
                Jashi Logistics verifies active coverage before dispatch via Certificate of Insurance (COI).
              </li>
              <li>COI copies are available upon request.</li>
            </ul>
          </section>

          {/* COVERAGE SNAPSHOT */}
          <section className="card">
            <h2 className="section-title">Coverage at a Glance</h2>
            <ul className="bullets">
              <li>
                <strong>Motor Truck Cargo:</strong> Covers your vehicle for covered loss/damage in transit.
              </li>
              <li>
                <strong>Auto Liability:</strong> Third-party injury/property coverage carried by the carrier.
              </li>
              <li>
                <strong>General Liability:</strong> Non-auto business liability carried by the carrier.
              </li>
              <li>
                <strong>COI &amp; endorsements:</strong> Available on request for your order.
              </li>
            </ul>
          </section>

          {/* INSURANCE MINIMUMS */}
          <section className="card">
            <h2 className="section-title">Insurance Minimums</h2>

            <div className="min-grid">
              <div className="min-item">
                <div className="kicker">Auto Liability</div>
                <div className="amount">$1,000,000 CSL</div>
                <p className="muted">
                  Combined single limit; primary &amp; non-contributory where required.
                </p>
              </div>

              <div className="min-item">
                <div className="kicker">Cargo</div>
                <div className="amount">$50,000+</div>
                <p className="muted">
                  Match typical loads &amp; equipment; higher limits recommended for high-value moves. <strong>Carriers transporting one car must maintain at least $50,000 cargo insurance.</strong>
                </p>
              </div>

              <div className="min-item">
                <div className="kicker">General Liability</div>
                <div className="amount">$1,000,000 / $2,000,000</div>
                <p className="muted">Per occurrence / aggregate.</p>
              </div>
            </div>

            <p className="note">
              Your COI should list <strong>Guga Brokerage</strong> as Certificate Holder and include
              Additional Insured wording where required by the RateCon.
            </p>
          </section>

          {/* COI VERIFICATION */}
          <section className="card">
            <h2 className="section-title">How We Verify Insurance (COI)</h2>
            <div className="cols-2">
              <ul className="bullets">
                <li>Named insured matches the assigned carrier.</li>
                <li>Effective/expiration dates cover your shipping window.</li>
                <li>Motor Truck Cargo limit ≥ <strong>$50,000</strong> (higher recommended for luxury/specialty units).</li>
                <li>Auto Liability and, if applicable, General Liability are active.</li>
              </ul>
              <ul className="bullets">
                <li>Insurer and agent/broker contact shown.</li>
                <li>Endorsements/deductibles listed when applicable.</li>
                <li>Order reference and dispatch details attached to the COI review.</li>
                <li>COI copy available upon request.</li>
              </ul>
            </div>
          </section>

          {/* CUSTOMER PREP */}
          <section className="card">
            <h2 className="section-title">Customer Prep Checklist</h2>
            <ol className="steps">
              <li>Photograph exterior/interior + odometer at pickup and delivery.</li>
              <li>Remove personal items and valuables; disclose fixed accessories.</li>
              <li>Note pre-existing damage on the Bill of Lading (BOL) at pickup.</li>
              <li>Share important notes (alarm, air suspension, low clearance, immobile, etc.).</li>
              <li>At delivery, re-inspect and note any new damage on the BOL before signing.</li>
            </ol>
          </section>

          {/* CLAIMS */}
          <section className="card">
            <h2 className="section-title">If Something Happens: Filing a Claim</h2>
            <div className="claims">
              <div className="claim">
                <span className="badge">1</span>
                <div>
                  <h3>Document</h3>
                  <p>Take clear photos/videos at delivery and compare to pickup photos &amp; BOL.</p>
                </div>
              </div>
              <div className="claim">
                <span className="badge">2</span>
                <div>
                  <h3>Notify</h3>
                  <p>
                    Contact <Link to="/dashboard/help">Jashi Support</Link> within 24 hours. We coordinate with the
                    carrier/insurer.
                  </p>
                </div>
              </div>
              <div className="claim">
                <span className="badge">3</span>
                <div>
                  <h3>Submit</h3>
                  <p>Provide the BOL, photos, repair estimate, and any requested forms. We'll help facilitate the claim.</p>
                </div>
              </div>
            </div>

            <div className="ins-cta-row">
              <Link to="/dashboard/help" className="btn btn-primary">Start Claim</Link>
            </div>
          </section>

          {/* DISCLAIMER */}
          <section className="disclaimer card">
            <p className="muted">
              This page is for general information only and does not alter or replace the carrier's insurance policy.
              Coverage, limits, exclusions, and deductibles are determined solely by the carrier's policy and insurer.
              Jashi Logistics is not an insurance producer or advisor. For specific policy questions, request the carrier's COI and
              policy details.
            </p>
          </section>
        </div>
      </main>

      <LiveChat />
    </div>
  );
}