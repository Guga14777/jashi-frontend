import React from "react";
import { Link, useNavigate } from "react-router-dom";

import CarrierHeader from "../../components/header/carrier/carrierheader.jsx";
import CarrierDashboardFooter from "../../components/footer/carrier-dashboard-footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";

import "./safety-insurance.css";

export default function SafetyInsurance() {
  const navigate = useNavigate();

  const goDocs = (e) => {
    e.preventDefault();
    navigate("/documents", { replace: false });
  };

  return (
    <div className="page-shell safety-insurance">
      <CarrierHeader />

      <main className="page-main">
        <header className="page-header">
          <h1>Safety & Insurance</h1>
          <p>
            Standards and documentation required to haul loads on Guga. Keep
            your profile compliant to avoid payout delays and receive more
            matches.
          </p>
        </header>

        {/* Top grid: what we verify / how to stay compliant */}
        <section className="grid two">
          <div className="card">
            <h2>What we verify</h2>
            <ul className="list">
              <li>Active USDOT &amp; MC/FF operating authority</li>
              <li>Insurance limits that meet or exceed the minimums below</li>
              <li>Drivers’ licenses &amp; vehicle registrations (VINs)</li>
              <li>
                Certificate Holder &amp; Additional Insured wording on your COI
              </li>
            </ul>
          </div>

          <div className="card">
            <h2>How to stay compliant</h2>
            <ul className="list">
              <li>
                Upload current W-9, COI, and Authority letter under{" "}
                <strong>Profile → Documents</strong>
              </li>
              <li>
                Keep VIN list or “Any Auto” listed on the COI where applicable
              </li>
              <li>Update expiration dates before they lapse to avoid holds</li>
              <li>
                Confirm producer contact so we can verify quickly when needed
              </li>
            </ul>
          </div>
        </section>

        {/* Insurance minimums */}
        <section className="card">
          <h2>Insurance minimums</h2>

          <div className="limits">
            <div className="limit">
              <div className="kicker">Auto liability</div>
              <div className="amount">$1,000,000 CSL</div>
              <div className="sub">
                Combined single limit; primary &amp; non-contributory where
                required.
              </div>
            </div>

            <div className="limit">
              <div className="kicker">Cargo</div>
              <div className="amount">$50,000+</div>
              <div className="sub">
                Match typical loads &amp; equipment; higher limits recommended
                for high-value moves. <br />
                <strong>
                  Carriers transporting one car must maintain at least $50,000
                  cargo insurance.
                </strong>
              </div>
            </div>

            <div className="limit">
              <div className="kicker">General liability</div>
              <div className="amount">$1,000,000 / $2,000,000</div>
              <div className="sub">Per occurrence / aggregate.</div>
            </div>
          </div>

          {/* Removed the chip row here */}

          <p className="note">
            Your COI should list <strong>Guga Brokerage</strong> as Certificate
            Holder and include Additional Insured wording where required by the
            RateCon.
          </p>
        </section>

        {/* How to submit / What to expect */}
        <section className="grid two">
          <div className="card">
            <h2>How to submit</h2>
            <ol className="list-ol">
              <li>
                Go to <strong>Profile → Documents</strong>.
              </li>
              <li>Upload W-9, COI (PDF or clear photos), and Authority letter.</li>
              <li>Add vehicles &amp; drivers; verify VINs and license dates.</li>
              <li>Review and e-sign the Carrier Agreement.</li>
            </ol>

            <div className="actions">
              <button className="btn_primary" onClick={goDocs}>
                Open Documents
              </button>
            </div>
          </div>

          <div className="card">
            <h2>What to expect</h2>
            <ul className="list">
              <li>Most updates verified the <strong>same business day</strong>.</li>
              <li>Producer verification call may be required for insurance updates.</li>
              <li>You’ll receive an email &amp; in-app banner once approved.</li>
              <li>
                Expired or insufficient limits may place payouts on hold until
                resolved.
              </li>
            </ul>
            <p className="note tight">
              Questions? Call <strong>1-800-JASHI-CARRIERS</strong> or{" "}
              <a href="mailto:carrier-support@jashilogistics.com">
                carrier-support@jashilogistics.com
              </a>.
            </p>
          </div>
        </section>

        {/* Safety practices with consistent rounded buttons */}
        <section className="card">
          <h2>Safety practices</h2>
          <ul className="list">
            <li>
              Inspect units at pickup &amp; delivery; circle and initial damage on the
              BOL.
            </li>
            <li>
              Use secure tie-downs matched to vehicle weight &amp; attachment points.
            </li>
            <li>
              Photograph before/after (four corners + close-ups) and keep
              time-stamped copies.
            </li>
            <li>
              Report incidents or potential claims within <strong>24 hours</strong>.
            </li>
          </ul>

          <div className="actions row">
            <Link to="/carrier/claims" className="btn_primary btn_round">
              Open Safety &amp; Claims
            </Link>
            <Link to="/policy/detention-tonu" className="btn_ghost btn_round">
              View Detention / TONU
            </Link>
          </div>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
