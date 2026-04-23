import React from 'react';
import PublicHeader from '../../components/header/public/publicheader.jsx';
import Footer from '../../components/footer/footer.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import { Link } from 'react-router-dom';
import './privacy.css';

export default function Privacy() {
  const effectiveDate = 'November 7, 2025';

  return (
    <div className="privacy-page" data-page="privacy-public">
      <PublicHeader />

      <main className="privacy-container" role="main" aria-labelledby="privacyTitle">
        <article className="privacy-content" itemScope itemType="https://schema.org/PrivacyPolicy">
          {/* HERO */}
          <header className="privacy-hero" role="banner">
            <h1 id="privacyTitle" itemProp="name">Privacy Policy</h1>
            <p className="effective">Effective: <strong>{effectiveDate}</strong></p>
            <p className="lede">
              This Privacy Policy explains how Guga Brokerage LLC (“Guga”, “we”, “us”, or “our”)
              collects, uses, shares, and safeguards personal information when you use our website,
              applications, and services (the “Services”).
            </p>
          </header>

          {/* --- SECTIONS (no TOC) --- */}
          <section id="info-we-collect" className="privacy-section">
            <h2>1. Information We Collect</h2>
            <p>We collect personal information in the following categories:</p>
            <div className="grid two">
              <div className="card">
                <h3>Identifiers &amp; Contact</h3>
                <ul>
                  <li>Name, email address, phone number</li>
                  <li>Account credentials (hashed), user IDs</li>
                  <li>Government IDs for carrier compliance (where required)</li>
                </ul>
              </div>
              <div className="card">
                <h3>Shipment &amp; Operational</h3>
                <ul>
                  <li>Pickup/drop-off addresses and scheduling windows</li>
                  <li>Vehicle details (year/make/model/VIN, operability, clearance)</li>
                  <li>Order notes, photos, Bill of Lading (BOL) details</li>
                </ul>
              </div>
              <div className="card">
                <h3>Payment &amp; Billing</h3>
                <ul>
                  <li>Payment method tokens from our processors</li>
                  <li>Transaction history and invoices</li>
                  <li>Tax or remittance information, where applicable</li>
                </ul>
              </div>
              <div className="card">
                <h3>Device &amp; Usage</h3>
                <ul>
                  <li>IP address, browser type, device identifiers</li>
                  <li>Log data (pages viewed, actions taken)</li>
                  <li>App telemetry and crash diagnostics</li>
                </ul>
              </div>
            </div>
            <p className="note">We collect information you provide directly and information gathered automatically when you use the Services.</p>
          </section>

          <section id="how-we-use" className="privacy-section">
            <h2>2. How We Use Information</h2>
            <ul>
              <li>Provide, operate, and improve the Services (booking, dispatch, tracking).</li>
              <li>Facilitate communication between customers and carriers.</li>
              <li>Process payments and manage billing/fraud prevention.</li>
              <li>Provide support, handle claims, and improve service quality.</li>
              <li>Send service notices (status updates, policy changes).</li>
              <li>Conduct analytics to enhance performance and user experience.</li>
              <li>Comply with legal obligations and enforce our <Link to="/terms">Terms of Service</Link>.</li>
            </ul>
          </section>

          <section id="legal-bases" className="privacy-section">
            <h2>3. Legal Bases (where applicable)</h2>
            <ul>
              <li><strong>Contract</strong> – to provide the Services you request.</li>
              <li><strong>Legitimate Interests</strong> – to secure, improve, and grow our Services.</li>
              <li><strong>Consent</strong> – for optional features/marketing when required.</li>
              <li><strong>Legal Obligation</strong> – to comply with laws and regulations.</li>
            </ul>
          </section>

          <section id="sharing" className="privacy-section">
            <h2>4. How We Share Information</h2>
            <div className="grid two">
              <div className="card">
                <h3>Service Delivery</h3>
                <ul>
                  <li>Verified carriers to perform your shipment</li>
                  <li>Payment processors to handle transactions securely</li>
                  <li>Vetted vendors (IT, analytics, communications) under contract</li>
                </ul>
              </div>
              <div className="card">
                <h3>Protection &amp; Compliance</h3>
                <ul>
                  <li>To comply with law, legal process, or lawful requests</li>
                  <li>To protect the rights, property, and safety of users and the public</li>
                  <li>In connection with corporate transactions (e.g., merger or acquisition)</li>
                </ul>
              </div>
            </div>
            <p className="note">We do <strong>not</strong> sell personal information for third-party marketing.</p>
          </section>

          <section id="cookies" className="privacy-section">
            <h2>5. Cookies &amp; Tracking</h2>
            <p>
              We use cookies and similar technologies to enable core functionality (e.g., login), remember preferences,
              and perform analytics. You can adjust browser settings to refuse some cookies; the Services may not function
              properly without essential cookies. See our <Link to="/cookies">Cookies Policy</Link>.
            </p>
          </section>

          <section id="retention" className="privacy-section">
            <h2>6. Data Retention</h2>
            <p>
              We retain personal information for as long as needed to provide the Services, comply with legal obligations,
              resolve disputes, and enforce agreements. When no longer needed, we delete or de-identify information in a
              reasonable timeframe.
            </p>
          </section>

          <section id="security" className="privacy-section">
            <h2>7. Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect personal information against
              unauthorized access, alteration, disclosure, or destruction. No method of transmission or storage is 100% secure,
              but we continually monitor and improve our safeguards.
            </p>
          </section>

          <section id="your-rights" className="privacy-section">
            <h2>8. Your Privacy Rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, delete, or download your data, and to opt out
              of certain processing. To make a request, contact us using the details below. We may take steps to verify your identity.
            </p>
            <ul>
              <li>Access a copy of your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your data, subject to legal obligations</li>
              <li>Portability (download a copy in a portable format)</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section id="intl" className="privacy-section">
            <h2>9. International Transfers</h2>
            <p>
              If personal information is transferred to countries with different data-protection standards, we implement
              appropriate safeguards (e.g., Standard Contractual Clauses) where required by law.
            </p>
          </section>

          <section id="children" className="privacy-section">
            <h2>10. Children’s Privacy</h2>
            <p>
              Our Services are not directed to children under 13 (or the applicable age of consent in your jurisdiction).
              We do not knowingly collect personal information from children. If you believe a child provided personal data,
              please contact us and we will take appropriate steps.
            </p>
          </section>

          <section id="changes" className="privacy-section">
            <h2>11. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes to our practices or legal requirements. We will post the
              updated version with a new effective date and, where appropriate, provide additional notice.
            </p>
          </section>

          {/* Contact section is kept (not listed in any TOC) */}
          <section id="contact" className="privacy-section">
            <h2>Contact Us</h2>
            <ul>
              <li>Email: <a href="mailto:privacy@guga.com">privacy@guga.com</a></li>
              <li>Phone: 1-800-GUGA-HELP</li>
             
            </ul>
          </section>
        </article>
      </main>

      <Footer />
      <LiveChat />
    </div>
  );
}
