import React from 'react';
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import { Link } from 'react-router-dom';
import './customer-privacy.css';

const CustomerPrivacy = () => {
  return (
    <div className="customer-privacy-page">
      {/* Header & Footer are provided by CustomerLayout in app.jsx */}

      <div className="privacy-container">
        <div className="privacy-content">
          <h1>Privacy Policy</h1>
          <p className="intro-text">
            This Privacy Policy explains how Guga (“we,” “us,” or “our”) collects, uses, and protects
            your information when you use our platform.
          </p>

          {/* Quick choices panel */}
          <section className="privacy-section panel highlight">
            <h2>Your Privacy Choices</h2>
            <ul className="compact-list">
              <li><strong>Access / Download:</strong> Request a copy of your data at <a href="mailto:privacy@guga.com">privacy@guga.com</a>.</li>
              <li><strong>Delete:</strong> Ask us to delete your account/data (subject to legal retention).</li>
              <li><strong>Correct:</strong> Update inaccurate profile info in-app or by contacting support.</li>
              <li><strong>Opt-Out of Marketing:</strong> Use email unsubscribe links or contact us.</li>
              <li><strong>Do Not Sell/Share (US-CA):</strong> Submit a request at <Link to="/privacy/choices">Privacy Choices</Link> (we do not sell personal information).</li>
              <li><strong>Appeal a Decision:</strong> If we deny a request, you may appeal at <a href="mailto:privacy@guga.com">privacy@guga.com</a>.</li>
            </ul>
            <p className="smallprint">
              We’ll verify your identity before fulfilling requests. Authorized agents may act on your behalf where permitted by law.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Information We Collect</h2>
            <p>We collect information that you provide directly, information collected automatically, and information from service providers.</p>

            <h3>Personal Information You Provide</h3>
            <ul>
              <li>Name, email, phone, company details</li>
              <li>Addresses for pickup/delivery, shipment details</li>
              <li>Payment and billing information (handled by certified processors)</li>
              <li>Support messages and preferences</li>
            </ul>

            <h3>Automatically Collected</h3>
            <ul>
              <li>Device/browser, IP address, general location</li>
              <li>Usage logs (pages viewed, actions taken)</li>
              <li>Cookies and similar technologies</li>
            </ul>

            <h3>From Service Providers</h3>
            <ul>
              <li>Fraud-prevention, payments, analytics, cloud hosting</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>How We Use Information</h2>
            <ul>
              <li>Provide, secure, and improve our platform and services</li>
              <li>Process payments, bookings, and shipment communications</li>
              <li>Customer support, troubleshooting, and safety/compliance</li>
              <li>Analytics to understand features and performance</li>
              <li>Legal compliance and fraud prevention</li>
              <li>With consent, to send service updates and marketing</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Sharing of Information</h2>
            <p>We share only what’s necessary to run the service:</p>
            <ul>
              <li><strong>Carriers:</strong> Shipment details needed to perform transport and provide tracking.</li>
              <li><strong>Service Providers:</strong> Payments, cloud hosting, analytics, communications.</li>
              <li><strong>Legal / Safety:</strong> To comply with law, protect rights, or prevent fraud/abuse.</li>
            </ul>
            <p className="note">We do <strong>not sell</strong> personal information. We do not allow third parties to use data for their own advertising without your consent.</p>
          </section>

          <section className="privacy-section">
            <h2>Cookies, Analytics & Advertising</h2>
            <p>
              We use cookies and similar technologies for core functionality (e.g., login) and analytics (e.g., performance metrics).
              You can manage cookies in your browser settings. Disabling some cookies may limit functionality.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Data Security</h2>
            <p>
              We use appropriate technical and organizational measures to protect data (encryption in transit/at rest where applicable,
              access controls, logging, regular updates). No method is 100% secure; we notify users of material incidents as required by law.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Data Retention</h2>
            <p>
              We keep data only as long as necessary for the purposes above and to meet legal, tax, and compliance obligations.
              Typical operational records are retained while your account remains active and for a limited period thereafter.
            </p>
          </section>

          <section className="privacy-section">
            <h2>International Transfers</h2>
            <p>
              Your information may be processed in countries other than your own. Where required, we use appropriate safeguards
              (e.g., contractual clauses) consistent with applicable law.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Your Rights</h2>
            <p>
              Depending on your region, you may have rights to access, correct, delete, restrict, object, or port your data.
              Residents of the EU/EEA (GDPR) and California (CCPA/CPRA) have additional rights, including opt-out of sale/share and
              limited use of sensitive data. Use the options in <em>Your Privacy Choices</em> above.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Children’s Privacy</h2>
            <p>
              Our services are not intended for individuals under 18, and we do not knowingly collect their personal information.
              If we learn we have, we will delete it.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Subprocessors</h2>
            <p>
              We use third-party processors to deliver the service (e.g., hosting, analytics, email). For transparency, we publish
              a current list at <Link to="/legal/subprocessors">/legal/subprocessors</Link>.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We’ll post updates here and, if changes are material, provide
              additional notice (e.g., in-app banner or email). Your continued use means you accept the updated policy.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Contact Us</h2>
            <p>Questions or requests?</p>
            <ul>
              <li>Email: <a href="mailto:privacy@guga.com">privacy@guga.com</a></li>
              <li>Phone: 1-800-GUGA-HELP</li>
              <li>Address: [Your Company Address]</li>
            </ul>
            <p className="effective">Effective date: November 7, 2025</p>
          </section>
        </div>
      </div>

      {/* Chat is not provided by layout, so keep it here if desired */}
      <LiveChat />
    </div>
  );
};

export default CustomerPrivacy;
