// src/pages/dashboard/policies/customer-terms.jsx
import React from 'react';
import CustomerHeader from '../../../components/header/customer/customerheader.jsx';
// Footer intentionally omitted (dashboard provides one)
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import { Link } from 'react-router-dom';
import './customer-terms.css';

const CustomerTerms = () => {
  return (
    <div className="customer-terms-page">
      <CustomerHeader />

      <div className="terms-container">
        <div className="terms-content">
          <h1>Terms of Service</h1>
          <p className="intro-text">
            These Terms of Service govern your use of Guga’s shipping platform and services.
          </p>

          <section className="terms-section">
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing or using our platform, you agree to be bound by these Terms of Service and our Privacy Policy.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="terms-section">
            <h2>Description of Services</h2>
            <p>
              Guga provides a digital platform that connects customers with carriers for shipping services. Our platform facilitates:
            </p>
            <ul>
              <li>Quote requests and pricing comparisons</li>
              <li>Shipment booking and management</li>
              <li>Real-time tracking and updates</li>
              <li>Payment processing and billing</li>
              <li>Customer support and dispute resolution</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>User Accounts</h2>
            <p>
              To use our services, you must create an account and provide accurate, complete information. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Keeping your account information current and accurate</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>Acceptable Use</h2>
            <p>You agree to use our platform only for lawful purposes and in accordance with these terms. You may not:</p>
            <ul>
              <li>Ship prohibited, illegal, or hazardous materials</li>
              <li>Provide false or misleading information</li>
              <li>Interfere with the platform’s operation or security</li>
              <li>Use the service for any fraudulent activities</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          {/* NEW: Customer Responsibilities */}
          <section className="terms-section">
            <h2>Customer Responsibilities</h2>
            <ul>
              <li>
                <strong>Accurate Information:</strong> Provide complete and accurate pickup/delivery addresses, contact names,
                access instructions, vehicle details (year/make/model/VIN), operability, and special conditions (e.g., low
                clearance, modified suspension).
              </li>
              <li>
                <strong>Access &amp; Readiness:</strong> Ensure the vehicle and keys are available during the confirmed window
                and that the pickup/delivery locations allow safe commercial access.
              </li>
              <li>
                <strong>Inspection:</strong> You (or your designee) will inspect the vehicle with the driver at pickup and
                delivery and note any exceptions on the BOL. Photos before release and at delivery are recommended.
              </li>
              <li>
                <strong>No Personal Items:</strong> Vehicles must be free of personal items or undeclared cargo. Carriers may
                decline transport or require removal before loading.
              </li>
              <li>
                <strong>Compliance:</strong> You agree to follow reasonable instructions from Guga and the assigned carrier to
                facilitate safe loading/unloading.
              </li>
            </ul>
          </section>

          {/* NEW: Vehicle Condition & Preparation */}
          <section className="terms-section">
            <h2>Vehicle Condition &amp; Preparation</h2>
            <ul>
              <li>
                <strong>Operability:</strong> Unless declared in advance, vehicles are assumed to roll/steer/brake. Undisclosed
                inoperable status may delay service.
              </li>
              <li>
                <strong>Preparation:</strong> Disable alarms/immobilizers, secure loose parts, provide keys, and ensure sufficient
                battery/fuel to load/unload.
              </li>
              <li>
                <strong>Low/Modified Vehicles:</strong> Disclose ground-clearance issues; carriers may require special equipment
                or decline unsafe loads.
              </li>
              <li>
                <strong>Fluids/Leaks:</strong> Repair significant leaks prior to pickup; excessive leaks can result in refusal.
              </li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>Shipping and Delivery</h2>

            <h3>Booking and Quotes</h3>
            <p>
              Quotes are estimates based on the information you provide. Final pricing may vary based on actual shipment details
              and any approved add-ons or accessorials described below.
            </p>

            <h3>Packaging and Preparation</h3>
            <p>
              You are responsible for preparing the vehicle or items for transport and ensuring compliance with carrier requirements.
            </p>

            <h3>Delivery Times</h3>
            <p>
              Delivery estimates are provided in good faith but are not guaranteed. Delays may occur due to weather, traffic,
              carrier availability, or other circumstances beyond our control.
            </p>
          </section>

          {/* NEW: Scheduling, Access & Missed Appointments */}
          <section className="terms-section">
            <h2>Scheduling, Access &amp; Missed Appointments</h2>
            <p>Pickup/delivery times are windows and may vary due to traffic, weather, or facility constraints.</p>
            <ul>
              <li>
                <strong>Access:</strong> You are responsible for arranging site/facility access (gates, permits, docks). If
                inaccessible, the carrier may request an alternate meet-point.
              </li>
              <li>
                <strong>Missed Appointment:</strong> If the driver arrives within the window and the vehicle/location is not
                ready or accessible, re-delivery/re-attempt may be required. (<em>Your accessorials remain capped at $50 per
                qualifying event.</em>)
              </li>
              <li>
                <strong>Storage:</strong> Storage or auction fees are your responsibility when caused by inaccessibility or
                missed windows.
              </li>
            </ul>
          </section>

          {/* Customer Fees & Accessorials ($50 flat max) */}
          <section className="terms-section highlight">
            <h2>Customer Fees &amp; Accessorials — Flat <span className="price">$50</span> Max</h2>
            <p className="note">
              Guga keeps accessorials simple and predictable. The <strong>maximum fee is $50 per event</strong>.
            </p>

            <h3>When fees may apply</h3>
            <ul>
              <li>
                <strong>Cancellation when the driver is dispatched or on-site (TONU):</strong> If you cancel after the driver
                is en-route or has arrived, a <strong>$50 flat</strong> fee may apply.
              </li>
              <li>
                <strong>Detention (after free time):</strong> If loading/unloading exceeds the free-time window, a
                <strong> $50 flat</strong> detention may apply.
              </li>
              <li>
                <strong>Layover (not caused by the carrier):</strong> If pickup or delivery is pushed to the next day,
                a <strong>$50 flat</strong> layover may apply.
              </li>
            </ul>

            <p>
              These fees mirror our carrier policy for clarity. See the detailed policy at{' '}
              <Link to="/policy/detention-tonu">Detention / TONU</Link>.
            </p>

            <h3>Proof &amp; review</h3>
            <ul>
              <li>Time-stamped check-in/out on BOL or facility slip, gate photo, or in-app timer</li>
              <li>Dispatch/arrival confirmation and cancellation messages (for TONU)</li>
            </ul>

            <h3>Examples</h3>
            <ul>
              <li><strong>Cancel at door:</strong> Driver arrives, shipment canceled → <strong>$50</strong> TONU fee.</li>
              <li><strong>Long wait:</strong> Free time exceeded before loading → <strong>$50</strong> detention fee.</li>
              <li><strong>Next-day load:</strong> Facility pushes to tomorrow (not carrier’s fault) → <strong>$50</strong> layover fee.</li>
            </ul>

            <p className="smallprint">
              No per-hour billing, no stacked extras: <strong>$50 is the maximum per qualifying event</strong>, unless a signed
              Rate Confirmation states otherwise.
            </p>
          </section>

          {/* Cancellations (customer-facing) */}
          <section className="terms-section">
            <h2>Cancellations</h2>
            <ul>
              <li><strong>Before Dispatch:</strong> Typically refundable (minus processor fees, if applicable).</li>
              <li>
                <strong>After Dispatch/On-Site:</strong> May incur a <strong>$50</strong> Truck Ordered Not Used (TONU) fee
                (see <Link to="/policy/detention-tonu">Detention / TONU</Link>).
              </li>
            </ul>
          </section>

          {/* Prohibited Items & Legal Compliance */}
          <section className="terms-section">
            <h2>Prohibited Items &amp; Legal Compliance</h2>
            <ul>
              <li>No hazardous materials, contraband, or illegal goods inside vehicles.</li>
              <li>You warrant lawful ownership/authority to ship the vehicle and agree to comply with applicable laws/regulations.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>Payment Terms</h2>
            <p>Payment is due upon booking confirmation unless other arrangements are made.</p>

            <h3>Pricing and Fees</h3>
            <ul>
              <li>All prices are shown in USD unless otherwise noted.</li>
              <li>
                Accessorials follow the <strong>flat $50 max</strong> rules described above (Detention, Layover, TONU, and
                cancellation after dispatch/arrival).
              </li>
              <li>Any exceptions must be stated on the signed Rate Confirmation.</li>
            </ul>
          </section>

          {/* Payment Authorization & Chargebacks */}
          <section className="terms-section">
            <h2>Payment Authorization &amp; Chargebacks</h2>
            <ul>
              <li>
                <strong>Authorization:</strong> You authorize Guga to place a pre-authorization/hold and capture payment upon booking
                and completion as applicable.
              </li>
              <li>
                <strong>Disputes:</strong> Contact us promptly to resolve billing issues. Filing a chargeback without first providing
                documentation may delay resolution.
              </li>
              <li>
                <strong>Responsibility:</strong> You are responsible for amounts reversed by your bank if the service was rendered per
                the Rate Confirmation and these Terms.
              </li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>Liability and Insurance</h2>
            <p>
              Guga is a technology platform connecting customers with independent motor carriers. Carriers are responsible
              for transportation services and hold their own insurance. We recommend appropriate coverage for your shipment.
            </p>

            <h3>Platform Limitation</h3>
            <p>Guga is not the carrier and does not physically handle your shipment.</p>

            <h3>Carrier Responsibility</h3>
            <p>Carriers are independent contractors responsible for safe handling and delivery according to their terms.</p>
          </section>

          {/* Claims, Inspection & Timelines */}
          <section className="terms-section">
            <h2>Claims, Inspection &amp; Timelines</h2>
            <ul>
              <li>
                <strong>At Delivery:</strong> Note any damage on the BOL before signing; take photos. “Clean” signatures without
                exceptions may affect claim outcomes.
              </li>
              <li>
                <strong>Timeline:</strong> Report issues to Guga and the carrier promptly (ideally within 24 hours) and provide supporting
                evidence (BOL with notes, photos, estimates).
              </li>
              <li>
                <strong>Carrier Insurance:</strong> Damage claims are processed under the carrier’s policy subject to its terms, limits,
                and defenses.
              </li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>Intellectual Property</h2>
            <p>
              All content, features, and functionality of our platform are owned by Guga and protected by applicable laws.
            </p>
          </section>

          <section className="terms-section">
            <h2>Privacy and Data Protection</h2>
            <p>
              Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          {/* Arbitration – Class Action Waiver; Small-Claims Carve-Out */}
          <section className="terms-section">
            <h2>Dispute Resolution; Class Action Waiver</h2>
            <p>
              Disputes will be resolved by binding arbitration (American Arbitration Association) on an individual basis. <strong>You waive
              any right to participate in a class, collective, or representative action.</strong> Either party may bring an eligible claim
              in small-claims court instead of arbitration.
            </p>
          </section>

          <section className="terms-section">
            <h2>Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violations of these terms or for other reasons at our discretion.
            </p>
          </section>

          <section className="terms-section">
            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms periodically. We will notify you of significant changes through the platform or by email. Continued
              use constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Effective Date */}
          <section className="terms-section">
            <h2>Effective Date</h2>
            <p>These Terms are effective as of <strong>November 7, 2025</strong> and supersede prior versions.</p>
          </section>

          <section className="terms-section">
            <h2>Contact Information</h2>
            <p>If you have questions about these Terms of Service, please contact us:</p>
            <ul>
              <li>Email: legal@guga.com</li>
              <li>Phone: 1-800-JASHI-HELP</li>
              <li>Address: [Your Company Address]</li>
            </ul>
          </section>
        </div>
      </div>

      <LiveChat />
    </div>
  );
};

export default CustomerTerms;
