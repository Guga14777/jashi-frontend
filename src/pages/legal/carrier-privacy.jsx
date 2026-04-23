// src/pages/legal/carrier-privacy.jsx
import React from "react";
import "./carrier-privacy.css";

export default function CarrierPrivacy() {
  return (
    <main className="carrier-privacy">
      <header className="cp-header">
        <h1>Carrier Privacy Policy</h1>
        <p className="cp-subtitle">
          This policy explains how we collect, use, disclose, and safeguard information related to motor carriers and their authorized personnel.
        </p>
        <p className="cp-effective">Effective date: November 6, 2025</p>
      </header>

      {/* Removed the TOC block */}

      <section id="scope" className="cp-section">
        <h2>Scope</h2>
        <p>
          This Carrier Privacy Policy (“Policy”) applies to information we process about motor carriers,
          owner-operators, dispatchers, drivers, and other personnel acting on behalf of a carrier entity
          (collectively, “Carriers”) when using our websites, applications, and related services
          (the “Services”). If you engage with us as a shipper or end-customer, please review our general Privacy Policy.
        </p>
      </section>

      <section id="info-we-collect" className="cp-section">
        <h2>Information We Collect</h2>
        <ul>
          <li><strong>Account and Company Details:</strong> Legal business name, DBA, MC/FF/DOT numbers, EIN (where provided), business addresses, contacts, carrier authority status, safety rating, service areas.</li>
          <li><strong>Compliance and Documentation:</strong> W-9, insurance/COI, broker–carrier agreement, certificates, permits, equipment lists, other compliance materials.</li>
          <li><strong>Operations and Transaction Data:</strong> Capacity, lane preferences, bids/offers, load history, status updates, timestamps, PODs, invoices, chargebacks, payout records.</li>
          <li><strong>Location and Telematics (if enabled):</strong> GPS/route/telematics from devices or integrations, subject to settings and law.</li>
          <li><strong>Device/Usage:</strong> IP, device/browser, pages viewed, referrers, interactions; cookies and similar tech.</li>
          <li><strong>Support/Communications:</strong> Messages, attachments, call recordings where permitted with notice.</li>
          <li><strong>Payments/Factoring:</strong> Tokenized payout details, factoring assignments, transaction metadata from payment partners.</li>
        </ul>
      </section>

      <section id="sources" className="cp-section">
        <h2>Sources of Information</h2>
        <ul>
          <li><strong>You</strong> (forms, uploads, communications)</li>
          <li><strong>Your organization</strong> (admins/personnel)</li>
          <li><strong>Shippers/partners</strong> (tenders, updates, claims)</li>
          <li><strong>Public/industry databases</strong> (FMCSA/SAFER/DOT, insurance registries)</li>
          <li><strong>Service providers</strong> (ID verification, telematics, payments, analytics, fraud)</li>
        </ul>
      </section>

      <section id="use-of-info" className="cp-section">
        <h2>How We Use Information</h2>
        <ul>
          <li>Verify identity/authority/insurance and compliance eligibility.</li>
          <li>Operate and improve the Services (matching, dispatch, tracking, payments).</li>
          <li>Facilitate communications among Carriers, shippers, and support.</li>
          <li>Detect/prevent fraud, abuse, and security incidents; enforce terms.</li>
          <li>Analytics, quality assurance, and product development.</li>
          <li>Comply with legal, regulatory, and tax obligations.</li>
          <li>Provide service announcements/marketing as permitted by law and preferences.</li>
        </ul>
      </section>

      <section id="legal-bases" className="cp-section">
        <h2>Legal Bases (GDPR/UK GDPR)</h2>
        <ul>
          <li><strong>Contract</strong> (to perform our agreements)</li>
          <li><strong>Legitimate interests</strong> (secure, operate, improve; fraud prevention)</li>
          <li><strong>Legal obligations</strong> (compliance with law/regulators)</li>
          <li><strong>Consent</strong> (e.g., certain marketing/location; withdraw anytime)</li>
        </ul>
      </section>

      <section id="sharing" className="cp-section">
        <h2>How We Share Information</h2>
        <ul>
          <li><strong>Shippers:</strong> Only what’s needed to evaluate bids, plan loads, fulfill shipments.</li>
          <li><strong>Service providers:</strong> ID/compliance, telematics, hosting, analytics, support, payments/factoring (under confidentiality).</li>
          <li><strong>Affiliates:</strong> For operations consistent with this Policy.</li>
          <li><strong>Legal/safety:</strong> To comply with law, protect rights/safety, prevent fraud/abuse.</li>
          <li><strong>Business transfers:</strong> As part of mergers, acquisitions, financing, or sale of assets.</li>
        </ul>
        <p className="cp-note">We do not sell or “share” personal information for cross-context behavioral advertising as defined by certain US state laws.</p>
      </section>

      <section id="retention" className="cp-section">
        <h2>Data Retention</h2>
        <p>We retain information as needed to provide the Services, meet legal obligations, resolve disputes, enforce agreements, and for legitimate business purposes, then delete or de-identify it.</p>
      </section>

      <section id="security" className="cp-section">
        <h2>Security</h2>
        <p>We use technical/organizational safeguards against unauthorized access, disclosure, alteration, and destruction. No method is perfect; use strong passwords, updated devices, and limit access.</p>
      </section>

      <section id="international-transfers" className="cp-section">
        <h2>International Data Transfers</h2>
        <p>Where data is transferred internationally, we use appropriate safeguards (e.g., standard contractual clauses) and protect your information per this Policy.</p>
      </section>

      <section id="rights" className="cp-section">
        <h2>Your Privacy Rights</h2>
        <p>Depending on your jurisdiction, you may request access, correction, deletion, restriction/objection, portability, or withdraw consent. Contact us below; we’ll verify and respond under applicable law.</p>
      </section>

      <section id="ccpa" className="cp-section">
        <h2>California & US State Disclosures</h2>
        <ul>
          <li><strong>Categories:</strong> Identifiers, professional/commercial info, internet/activity data, geolocation (if enabled), financial transaction data, limited inferences.</li>
          <li><strong>Purposes:</strong> As above (“How We Use Information”).</li>
          <li><strong>Sensitive information:</strong> Not used/disclosed beyond permitted purposes (e.g., security, service provision).</li>
          <li><strong>Sale/Sharing:</strong> We do not sell or share personal information under CCPA/CPRA.</li>
          <li><strong>Appeals:</strong> If we deny a request, reply “Appeal” to our decision; we’ll respond per law.</li>
        </ul>
      </section>

      <section id="cookies" className="cp-section">
        <h2>Cookies and Similar Technologies</h2>
        <p>We and partners use cookies/SDKs to operate features, remember preferences, and run analytics. Manage cookies in your browser/device; some features may not work without them.</p>
      </section>

      <section id="children" className="cp-section">
        <h2>Children’s Privacy</h2>
        <p>The Services are not directed to children and we do not knowingly collect personal information from anyone under 16.</p>
      </section>

      <section id="changes" className="cp-section">
        <h2>Changes to This Policy</h2>
        <p>We may update this Policy. We’ll post the new effective date and, for material changes, provide additional notice.</p>
      </section>

      <section id="contact" className="cp-section">
        <h2>Contact Us</h2>
        <p>Questions or requests? Email privacy@yourdomain.com or write to Privacy Officer, Your Company, 123 Business Rd, City, State ZIP.</p>
      </section>

      <footer className="cp-footer" role="contentinfo">
        <p className="cp-disclaimer">
          This Policy is intended to meet applicable privacy laws, including GDPR/UK GDPR and certain US state laws.
        </p>
      </footer>
    </main>
  );
}
