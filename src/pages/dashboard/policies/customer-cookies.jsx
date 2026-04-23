// src/pages/dashboard/policies/customer-cookies.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./customer-cookies.css";

export default function CustomerCookies() {
  const openPreferences = (e) => {
    e.preventDefault();
    // If you still want a preferences modal elsewhere, keep this event.
    window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
  };

  return (
    <div className="page-shell customer-cookies">
      {/* Header/Chat/Footer come from CustomerLayout */}
      <main className="page-main" role="main">
        <header className="page-header">
          <h1>Cookie Policy</h1>
          <p className="intro">
            How Guga uses cookies and similar technologies on the Shipper Portal.
          </p>
        </header>

        <section className="section">
          <h2>What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device. We use cookies and similar
            technologies (local storage, pixels, SDKs, tags) to keep you signed in, secure
            sessions, remember preferences, and understand how features are used so we can
            improve your experience.
          </p>
        </section>

        <section className="section">
          <h2>Types of cookies we use</h2>
          <ul>
            <li><strong>Essential:</strong> Authentication, security, availability.</li>
            <li><strong>Functional:</strong> Preferences like language and saved filters.</li>
            <li><strong>Analytics:</strong> Performance and usage insights.</li>
            <li><strong>Marketing (where allowed):</strong> Relevance and measurement.</li>
          </ul>
          <p className="note">
            Some features use third-party providers (analytics, payments, support) that may set
            their own cookies. See our <Link to="/privacy">Privacy Policy</Link> for details.
          </p>
        </section>

        <section className="section">
          <h2>Managing preferences</h2>
          <ul>
            <li>
              <strong>In-product:</strong> You can adjust non-essential categories in Cookie
              Preferences <a href="#prefs" onClick={openPreferences}>here</a>.
            </li>
            <li>
              <strong>Browser:</strong> Most browsers let you block or delete cookies in settings.
            </li>
            <li>
              <strong>Global Privacy Control (GPC):</strong> We honor supported GPC signals where applicable.
            </li>
          </ul>
          <p className="muted">
            Blocking essential cookies may prevent sign-in or core functionality.
          </p>
        </section>

        <section className="section">
          <h2>Effective date</h2>
          <p>November 7, 2025</p>
        </section>

        <section className="section">
          <h2>Contact</h2>
          <p>
            Questions? Email <a href="mailto:privacy@guga.com">privacy@guga.com</a> or call
            <span> </span><strong>1-800-GUGA-HELP</strong>.
          </p>
        </section>
      </main>
    </div>
  );
}
