// src/pages/legal/carrier-cookies.jsx
import React from "react";
import "./carrier-cookies.css";

export default function CarrierCookies() {
  return (
    <div className="page-shell carrier-cookies">
      {/* Header/Chat/Footer come from CarrierLayout. Only render the page body here. */}
      <main className="page-main" role="main">
        <header className="page-header">
          <h1>Carrier Cookie Policy</h1>
          <p className="lead">
            How Guga uses cookies and similar technologies in the Carrier Portal.
          </p>
        </header>

        <section className="card">
          <h2>What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device. We use them to keep you
            signed in, secure the session, remember preferences, and understand feature usage.
          </p>
        </section>

        <section className="card">
          <h2>Types of cookies we use</h2>
          <div className="grid two">
            <div className="subcard">
              <h3>Essential (required)</h3>
              <ul className="list">
                <li>Authentication & session continuity</li>
                <li>Security & fraud prevention</li>
                <li>Load balancing & availability</li>
              </ul>
            </div>
            <div className="subcard">
              <h3>Functional & analytics</h3>
              <ul className="list">
                <li>Preferences (e.g., UI state, filters)</li>
                <li>Performance and usage insights</li>
                <li>Diagnostics & error reporting</li>
              </ul>
            </div>
          </div>
          <p className="note">
            Third-party tools (e.g., analytics, support, payments) may set their own cookies;
            see their policies for details.
          </p>
        </section>

        <section className="card">
          <h2>Managing preferences</h2>
          <ul className="list">
            <li>Browser controls let you block or delete cookies.</li>
            <li>Blocking essential cookies may break sign-in or portal features.</li>
            <li>You can review our privacy practices on the Carrier Privacy page.</li>
          </ul>
        </section>

        <section className="card">
          <h2>Contact</h2>
          <p>
            Questions? Email <strong>privacy@guga.com</strong> or call{" "}
            <strong>1-800-JASHI-CARRIERS</strong>.
          </p>
        </section>
      </main>
    </div>
  );
}
