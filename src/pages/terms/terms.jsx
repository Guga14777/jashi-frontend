// src/pages/terms/terms.jsx
import React from 'react';
import PublicHeader from '../../components/header/public/publicheader.jsx';
import Footer from '../../components/footer/footer.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import { Link } from 'react-router-dom';
import './terms.css';

export default function Terms() {
  return (
    <div className="terms-page" data-page="terms-public">
      <PublicHeader />

      <main className="terms-container" role="main" aria-labelledby="termsTitle">
        <article className="terms-content" itemScope itemType="https://schema.org/Article">
          <header className="terms-hero" role="banner">
            <h1 id="termsTitle" itemProp="headline">Terms of Service</h1>
            <p className="effective">Effective: <strong>November 7, 2025</strong></p>
            <p className="lede">
              These Terms of Service ("Terms") are a binding agreement between you and Guga Brokerage LLC ("Guga").
              By creating an account, clicking <em>I agree</em>, or using the platform, you accept these Terms,
              including the <a href="#arbitration">Arbitration &amp; Class Action Waiver</a>.
            </p>
          </header>

          <section className="terms-section" id="overview">
            <h2>1. Overview &amp; Platform Role</h2>
            <p>
              Guga operates a technology platform that connects shipping customers ("Customers") with independent motor
              carriers ("Carriers"). Guga is not a motor carrier and does not transport cargo. Transportation is provided
              by Carriers under their own authority and insurance.
            </p>
          </section>

          <section className="terms-section" id="accounts">
            <h2>2. Eligibility, Accounts &amp; Security</h2>
            <ul>
              <li>You must be at least 18 and able to contract. Business users warrant they can bind the company.</li>
              <li>Provide accurate information; keep credentials confidential. You're responsible for account activity.</li>
              <li>We may refuse, suspend, or terminate accounts for policy, fraud, or compliance reasons.</li>
            </ul>
          </section>

          <section className="terms-section" id="acceptable-use">
            <h2>3. Acceptable Use</h2>
            <ul>
              <li>No unlawful/fraudulent activity or prohibited/hazardous items in violation of law.</li>
              <li>No scraping, reverse engineering, or attempts to bypass platform security.</li>
              <li>Maintain professional, non-abusive communications.</li>
            </ul>
          </section>

          <section className="terms-section" id="customers">
            <h2>4. Customer Responsibilities</h2>
            <ul>
              <li>Provide accurate shipment details (addresses, contacts, vehicle year/make/model/VIN, operability, clearance).</li>
              <li>Ensure safe access; have vehicle and keys ready within the confirmed window.</li>
              <li>Inspect with driver; note exceptions on BOL at pickup/delivery; take photos.</li>
              <li>No personal items/undeclared cargo in vehicles.</li>
            </ul>
          </section>

          <section className="terms-section" id="carriers">
            <h2>5. Carrier Responsibilities</h2>
            <ul>
              <li>Maintain active USDOT and, where required, MC/FF authority; comply with FMCSA/state rules.</li>
              <li>Insurance: Auto Liability $1,000,000 CSL; General Liability $1,000,000 per occurrence / $2,000,000 aggregate; Cargo $50,000+ (higher limits may be required).</li>
              <li>Use safe equipment/qualified drivers; secure cargo; document pre/post-trip condition.</li>
              <li>Accept loads via app or signed Rate Confirmation ("RateCon"); follow load instructions.</li>
              <li>No brokering/re-brokering/interlining without written consent from Guga.</li>
            </ul>
          </section>

          <section className="terms-section" id="rates">
            <h2>6. Quotes, Rates &amp; Fees</h2>
            <ul>
              <li><strong>Quotes:</strong> Estimates; final charges may change with actual details or approved add-ons.</li>
              <li><strong>Customer fee:</strong> 6% service fee on completed transactions unless stated otherwise.</li>
              <li><strong>Carrier fee:</strong> No commission unless expressly agreed in writing.</li>
              <li><strong>Accessorials:</strong> Detention/Layover/TONU typically capped at <strong>$50 per qualifying event</strong> unless the RateCon states otherwise.</li>
            </ul>
          </section>

          <section className="terms-section" id="scheduling">
            <h2>7. Scheduling, Access &amp; Missed Appointments</h2>
            <ul>
              <li>Times are windows; delays may occur from traffic, weather, or facilities.</li>
              <li>If a site is inaccessible, carrier may request a nearby meet-point.</li>
              <li>Missed windows/inaccessibility may incur flat accessorials; storage/auction fees caused by inaccessibility are the customer's responsibility.</li>
            </ul>
          </section>

          <section className="terms-section" id="payments">
            <h2>8. Payments, Authorization &amp; Chargebacks</h2>
            <ul>
              <li>You authorize pre-authorizations and captures for booked services.</li>
              <li>You authorize Guga to charge your saved payment method for applicable accessorials, including the $50 On-Site Cancellation Fee (TONU), detention, or layover fee, in accordance with these Terms and posted policies. These fees are non-refundable once incurred.</li>
              <li>Dispute billing promptly and provide documentation for review.</li>
              <li>You remain responsible for amounts reversed by your bank if service was rendered per the RateCon and these Terms.</li>
            </ul>
          </section>

          <section className="terms-section" id="cancellations">
            <h2>9. Cancellations &amp; Refunds</h2>

            <h3>Definition of Dispatch and Arrival</h3>
            <p>
              For purposes of these fees, a shipment is considered "dispatched" when a carrier has been assigned and has 
              marked the shipment as <strong>Arrived at Pickup</strong> in the Guga platform. The platform timestamp is the controlling record.
            </p>

            <h3>Cancellation Policy</h3>
            <ul>
              <li><strong>Free cancellation (before arrival):</strong> You may cancel a booking at no charge until the carrier has marked the shipment as Arrived at Pickup in the platform.</li>
              <li>
                <strong>On-site cancellation fee ($50 TONU):</strong> If you cancel after the carrier has arrived at the pickup location (i.e., the status is Arrived at Pickup) but before the vehicle is picked up, you authorize a $50 flat cancellation fee ("On-Site Cancellation Fee" or "TONU").
                <ul>
                  <li>The $50 TONU fee is paid directly to the carrier to compensate for time, fuel, and opportunity cost.</li>
                </ul>
              </li>
              <li><strong>No cancellation after pickup:</strong> Once the carrier marks the shipment as Picked Up, customer cancellation is not permitted through the platform. Any post-pickup issues must be handled through support and may result in additional charges.</li>
            </ul>

            <h3>Payment Authorization</h3>
            <p>
              By placing an order, you authorize Guga (and our payment processor) to charge your saved payment method for 
              any applicable cancellation fee and related charges authorized by these Terms and the posted policies. 
              Fees are non-refundable once incurred.
            </p>

            <h3>Proof &amp; Dispute Resolution</h3>
            <p>
              Platform event logs, timestamps, and carrier check-in records take precedence in the event of a dispute. 
              Supporting documentation includes time-stamped check-in/out on BOL or facility slip, gate photo or in-app 
              arrival timer, and dispatch/arrival/cancellation logs within the platform.
            </p>

            <h3>Refund Timing</h3>
            <p>
              Refunds (if applicable) are processed to the original payment method. Timing depends on your bank or payment provider.
            </p>

            <h3>Misuse &amp; Restrictions</h3>
            <p>
              Repeated cancellations or fee disputes may result in booking restrictions, required prepayment, or account suspension.
            </p>
          </section>

          <section className="terms-section" id="liability">
            <h2>10. Liability &amp; Insurance</h2>
            <ul>
              <li>Guga is a platform/broker; we do not physically handle cargo.</li>
              <li>Carriers are independent contractors with their own insurance.</li>
              <li>Damage claims are processed under the carrier's policy, subject to its terms/limits/exclusions.</li>
            </ul>
          </section>

          <section className="terms-section" id="claims">
            <h2>11. Claims, Inspection &amp; Timelines</h2>
            <ul>
              <li>At delivery, note damage on the BOL before signing; take photos.</li>
              <li>Report issues within a reasonable time (ideally 24 hours) with BOL, photos, and estimates.</li>
            </ul>
          </section>

          <section className="terms-section" id="ip">
            <h2>12. Intellectual Property</h2>
            <p>All platform content and functionality are owned by Guga and protected by law. No rights are granted except as stated.</p>
          </section>

          <section className="terms-section" id="privacy">
            <h2>13. Privacy</h2>
            <p>
              See our <Link to="/privacy">Privacy Policy</Link> for how we collect, use, and protect personal data.
            </p>
          </section>

          <section className="terms-section highlight" id="arbitration">
            <h2>14. Dispute Resolution; Arbitration &amp; Class Action Waiver</h2>
            <p>
              Except for eligible small-claims matters, disputes will be resolved by binding individual arbitration under the
              rules of the American Arbitration Association. <strong>You waive any right to participate in a class,
              collective, or representative action.</strong>
            </p>
          </section>

          <section className="terms-section" id="changes">
            <h2>15. Changes, Notices &amp; Governing Law</h2>
            <ul>
              <li>We may update these Terms with reasonable notice via the platform or by email; continued use after notice is acceptance.</li>
              <li>These Terms are governed by the laws of [State/Country]. Venue lies in [Jurisdiction], except as preempted by arbitration.</li>
              <li>Notices may be delivered through the platform, by email, or to the legal address on file.</li>
            </ul>
          </section>

          <section className="terms-section" id="entire">
            <h2>16. Entire Agreement &amp; Severability</h2>
            <p>These Terms are the entire agreement for platform use. If any provision is unenforceable, the remainder stays in effect.</p>
          </section>

          <section className="terms-section" id="contact">
            <h2>Contact</h2>
            <ul>
              <li>Email: legal@guga.com</li>
              <li>Phone: 1-800-JASHI-HELP</li>
              <li>Address: [Your Company Address]</li>
            </ul>
          </section>
        </article>
      </main>

      <Footer />
      <LiveChat />
    </div>
  );
}