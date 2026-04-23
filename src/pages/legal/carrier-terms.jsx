import React from 'react';
import { Link } from 'react-router-dom';
import CarrierHeader from '../../components/header/carrier/carrierheader.jsx';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import './carrier-terms.css';

export default function CarrierTerms() {
  return (
    <div className="page-shell carrier-terms">
      <CarrierHeader />

      <main className="page-main" role="main">
        <header className="page-header">
          <h1>Carrier Terms</h1>
          <p className="lead">
            These Terms govern a motor carrier’s use of the Guga platform and the hauling of loads
            tendered through Guga Brokerage (“Guga,” “we,” or “us”). By using the platform or
            accepting a load, you agree to these Terms.
          </p>

          <div className="action-row">
            <Link to="/legal/broker-carrier-agreement" className="btn_pill btn_ghost">
              Broker–Carrier Agreement
            </Link>
            <Link to="/legal/safety-insurance" className="btn_pill btn_ghost">
              Safety & Insurance
            </Link>
            <Link to="/policy/detention-tonu" className="btn_pill btn_ghost">
              Detention / TONU
            </Link>
          </div>
        </header>

        {/* 1 */}
        <section id="eligibility" className="card">
          <h2>1. Eligibility & Compliance</h2>
          <ul className="list">
            <li>Carrier holds active USDOT and, where required, MC/FF authority and is in good standing with the FMCSA and applicable state agencies.</li>
            <li>Carrier and drivers possess all licenses, medical cards, permits, and registrations necessary to lawfully perform transportation services.</li>
            <li>Carrier will comply with all applicable laws and regulations (including FMCSA safety regulations, HOS, hazmat, and environmental rules).</li>
            <li>Carrier agrees to Guga’s policies published in <Link to="/legal/safety-insurance">Safety & Insurance</Link> and <Link to="/policy/detention-tonu">Detention / TONU</Link>.</li>
          </ul>
        </section>

        {/* 2 */}
        <section id="accounts" className="card">
          <h2>2. Accounts, Credentials & Security</h2>
          <ul className="list">
            <li>Carrier is responsible for safeguarding logins and for activity under its account by employees, agents, and dispatchers.</li>
            <li>Carrier will maintain accurate profile data (legal name, tax info, insurance, VINs/drivers) and promptly update expirations.</li>
            <li>Use of bots, scraping, or attempts to circumvent platform controls is prohibited.</li>
          </ul>
        </section>

        {/* 3 */}
        <section id="tender" className="card">
          <h2>3. Load Tender, Acceptance & Performance</h2>
          <ul className="list">
            <li>Each load is a separate tender. Acceptance occurs by in-app confirmation, written confirmation, or by dispatch/performance.</li>
            <li>The signed rate confirmation (“RateCon”) controls load-specific price, equipment, pickup/delivery windows, and any special instructions.</li>
            <li>Carrier will pick up, protect, and deliver cargo using safe, road-worthy equipment and qualified drivers, following the RateCon.</li>
            <li>Carrier will not broker, re-broker, or interline any shipment without prior written consent from Guga.</li>
            <li>Carrier will provide ETA updates and notify Guga immediately of delays, exceptions, accidents, or cargo issues.</li>
          </ul>
        </section>

        {/* 4 */}
        <section id="equipment" className="card">
          <h2>4. Equipment, Safety & Insurance</h2>
          <ul className="list">
            <li>Minimum insurance: Auto Liability $1,000,000 CSL; General Liability $1,000,000 per occurrence / $2,000,000 aggregate; Cargo $50,000+ (higher limits may be required). <strong>Carriers transporting one car must maintain at least $50,000 cargo insurance.</strong></li>
            <li>Guga Brokerage must be listed as Certificate Holder, with Additional Insured wording where required by the RateCon.</li>
            <li>Carrier will secure vehicles appropriately, record pre/post-trip condition, and follow Safety & Insurance.</li>
          </ul>
        </section>

        {/* 5 */}
        <section id="rates" className="card">
          <h2>5. Rates, Accessorials & Payment</h2>
          <ul className="list">
            <li>Base rate is per RateCon. Accessorials require proof and approval. See <Link to="/policy/detention-tonu">Detention / TONU</Link> policy.</li>
            <li><strong>Standard flat accessorials:</strong> Detention / Layover / TONU <strong>$50 each</strong> unless the RateCon states otherwise.</li>
            <li>Carrier must submit POD/BOL and required documents within 7 days of delivery. Approved amounts are paid per the payout method on file.</li>
            <li>Chargebacks/setoffs may apply for documented claims, shortages, or overpayments.</li>
          </ul>
        </section>

        {/* 6 */}
        <section id="docs" className="card">
          <h2>6. Documents & Recordkeeping</h2>
          <ul className="list">
            <li>Carrier will keep BOLs, time-stamped arrival/departure, photos, and communications for at least 2 years and furnish copies on request.</li>
            <li>Electronic signatures and digital records are acceptable and binding where permitted by law.</li>
          </ul>
        </section>

        {/* 7 */}
        <section id="cancellations" className="card">
          <h2>7. Cancellations & TONU</h2>
          <ul className="list">
            <li>If a load is canceled on site or after dispatch and Carrier was ready/available, TONU may apply per policy and RateCon.</li>
            <li>Carrier cancellations after acceptance may result in removal from a load and platform actions.</li>
          </ul>
        </section>

        {/* 8 */}
        <section id="disputes" className="card">
          <h2>8. Disputes</h2>
          <ul className="list">
            <li>Disputes must be submitted with supporting documentation within 15 days of payment or denial notice.</li>
            <li>Guga may offset undisputed amounts while a dispute is under review.</li>
          </ul>
        </section>

        {/* 9 */}
        <section id="limits" className="card">
          <h2>9. Limits of Liability & Indemnity</h2>
          <ul className="list">
            <li>Carrier is liable for loss, damage, or delay while cargo is in its custody, subject to lawful defenses and agreed limits.</li>
            <li>Each party will indemnify the other from claims arising from its own negligence, willful misconduct, or breach of these Terms.</li>
            <li>Guga is not liable for indirect, incidental, or consequential damages except as prohibited by law.</li>
          </ul>
        </section>

        {/* 10 */}
        <section id="independent" className="card">
          <h2>10. Independent-Contractor Status</h2>
          <p>
            Carrier operates as an independent contractor and retains exclusive control over equipment, drivers,
            routes, and methods. Nothing herein creates an employment, partnership, or joint-venture relationship.
          </p>
        </section>

        {/* 11 */}
        <section id="confidentiality" className="card">
          <h2>11. Confidentiality & Non-Solicitation</h2>
          <ul className="list">
            <li>Rate, customer, lane, and platform data are confidential and may not be disclosed or used outside fulfilling loads.</li>
            <li>For 12 months after the last load, Carrier will not solicit Guga’s shipping customers for the purpose of bypassing Guga on the same lanes introduced by Guga.</li>
          </ul>
        </section>

        {/* 12 */}
        <section id="law" className="card">
          <h2>12. Governing Law, Notices & Changes</h2>
          <ul className="list">
            <li>Governing law and venue appear in the <Link to="/legal/broker-carrier-agreement">Broker–Carrier Agreement</Link>. Conflicts are resolved by the BCA text.</li>
            <li>Notices may be delivered through the platform, by email, or to the legal address on file.</li>
            <li>We may update these Terms with reasonable notice. Continued use of the platform after notice constitutes acceptance.</li>
          </ul>
        </section>

        {/* 13 */}
        <section id="definitions" className="card">
          <h2>13. Key Definitions</h2>
          <ul className="list">
            <li><strong>RateCon:</strong> Written rate confirmation listing load-specific terms.</li>
            <li><strong>Accessorials:</strong> Charges beyond the base rate (e.g., detention, layover, TONU).</li>
            <li><strong>TONU:</strong> Truck Ordered Not Used—load canceled or not ready after the driver is en-route/on-site with proof of readiness.</li>
          </ul>
          <p className="note">This summary is for convenience only. If there is any conflict, the signed Broker–Carrier Agreement controls.</p>
        </section>

        {/* 14 */}
        <section id="severability" className="card">
          <h2>14. Entire Agreement & Severability</h2>
          <p>
            These Terms, together with the signed <Link to="/legal/broker-carrier-agreement">Broker–Carrier Agreement</Link>
            , constitute the entire agreement regarding loads tendered through Guga. If any provision is found unenforceable,
            the remaining provisions remain in full force and effect.
          </p>
        </section>
      </main>

      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
