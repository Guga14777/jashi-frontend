import React from "react";
import CarrierDashboardFooter from "../../components/footer/carrier-dashboard-footer.jsx";
import "./broker-carrier-agreement.css";

export default function BrokerCarrierAgreement() {
  return (
    <div className="page-shell bca">
      <main className="page-main bca-main">
        <header className="page-header bca-header">
          <h1>Broker–Carrier Agreement</h1>
          <p>
            This page summarizes and presents the key terms for loads tendered through
            Guga Brokerage (“Broker”) to a motor carrier (“Carrier”). This online copy is
            for convenience only; the signed Broker–Carrier Agreement (BCA) controls in
            case of any conflict.
          </p>
        </header>

        {/* 1 */}
        <section id="scope" className="card bca-section">
          <h2>1. Parties & Scope</h2>
          <p>
            Broker is licensed by the FMCSA to arrange transportation of property (49 U.S.C.
            §13102(2)). Carrier is duly authorized to provide motor-carrier services (49 U.S.C.
            §13102(14)). Broker arranges, and Carrier provides, over-the-road transportation of
            automobile/vehicle freight for Broker’s customers under individual rate confirmations
            (“Rate Confirmation” or “RateCon”). No exclusivity is created. Each load is a separate
            tender that Carrier accepts by electronic confirmation or by dispatching equipment to
            perform the shipment.
          </p>
          <ul className="dash-list">
            <li>RateCon controls load-specific price, equipment, pickup/delivery, and any special instructions.</li>
            <li>Conflicting terms on a bill of lading (BOL), invoice, or other document do not modify the BCA or RateCon.</li>
            <li>Carrier is responsible for routing, safety compliance, and performance of services.</li>
          </ul>
        </section>

        {/* 2 */}
        <section id="tender" className="card bca-section">
          <h2>2. Load Tender, Acceptance & Performance</h2>
          <p><strong>Tender.</strong> Broker issues a RateCon identifying the shipment, price, accessorials, service
            requirements, and special instructions.</p>
          <p><strong>Acceptance.</strong> Carrier accepts via the platform/app or by commencing performance. Conflicting
            terms on a BOL, invoice, or other document will not modify the BCA or RateCon.</p>
          <p><strong>Performance.</strong> Carrier will use safe, road-worthy equipment; ensure drivers are qualified and
            compliant; protect cargo from loss, damage, and theft; and follow pickup/delivery times and
            instructions in the RateCon.</p>
        </section>

        {/* 3 */}
        <section id="payment" className="card bca-section">
          <h2>3. Payment, Deductions & Setoff</h2>
          <ul className="dash-list">
            <li><strong>No platform fees.</strong> Loads moved through Guga have <strong>$0</strong> platform/payout fees.</li>
            <li><strong>Documents.</strong> To get paid, Carrier must submit signed BOL/POF and any required docs.</li>
            <li><strong>Timing.</strong> Standard ACH next business day, same-day ACH (cut-off applies), instant RTP/Zelle® minutes 24/7, or paper check (USPS First-Class). All are $0 fee.</li>
            <li><strong>Setoff.</strong> Broker may set off undisputed cargo claims, overpayments, advances, or fines against Carrier pay. Disputed amounts are handled under §9 (Disputes).</li>
            <li><strong>No double payment.</strong> Carrier will not seek payment from shipper/consignee for loads Broker already contracted.</li>
          </ul>
        </section>

        {/* 4 */}
        <section id="qualifications" className="card bca-section">
          <h2>4. Qualifications, Safety & Operating Compliance</h2>
          <ul className="dash-list">
            <li>Maintain active USDOT/MC/FF authority, safety rating “Satisfactory” or not rated, and all permits.</li>
            <li>Comply with FMCSA regs, applicable state laws, HOS, drug/alcohol testing, and equipment maintenance.</li>
            <li>Drivers must be properly licensed and trained; no unauthorized passengers or team changes without notice.</li>
            <li>No co-brokering, re-brokering, or double brokering without Broker’s written consent.</li>
          </ul>
        </section>

        {/* 5 */}
        <section id="insurance" className="card bca-section">
          <h2>5. Insurance & Indemnity</h2>
          <p><strong>Minimum limits (from $50,000 and up):</strong></p>
          <ul className="dash-list">
            <li>Auto Liability: $1,000,000 combined single limit.</li>
            <li>Cargo: <strong>$50,000+</strong> (match equipment & typical loads).</li>
            <li>General Liability: $1,000,000 / $2,000,000 aggregate.</li>
          </ul>
          <p><strong>COI must show:</strong> Guga Brokerage as Certificate Holder; policy numbers/effective dates; VIN list or
            “Any Auto” where applicable; producer contact for verification. Carrier indemnifies, defends, and
            holds Broker and its customers harmless from claims arising out of Carrier’s performance, except to the
            extent caused by Broker’s sole negligence or willful misconduct.</p>
        </section>

        {/* 6 */}
        <section id="cargo" className="card bca-section">
          <h2>6. Cargo Handling, Loss & Damage</h2>
          <ul className="dash-list">
            <li>Carrier is responsible for cargo while in its custody, including loading securement, transport, and delivery.</li>
            <li>Shortage, loss, or damage are Carrier’s responsibility subject to standard defenses under Carmack.</li>
            <li>Concealed or late-reported damage is handled in good faith using photos, delivery notations, and inspection.</li>
            <li>Claims process and timelines follow the BCA and applicable law; Carrier will cooperate fully.</li>
          </ul>
        </section>

        {/* 7 */}
        <section id="confidentiality" className="card bca-section">
          <h2>7. Confidentiality, Non-Solicitation & Status</h2>
          <ul className="dash-list">
            <li><strong>Confidentiality.</strong> Rates, customer lists, and platform data are confidential.</li>
            <li><strong>Non-solicitation.</strong> No direct solicitation of Broker’s customers for shipments tendered by Broker for 12 months after the last load, except for ordinary course work unrelated to Broker’s tenders.</li>
            <li><strong>Independent contractor.</strong> Carrier controls its operations, personnel, and taxes.</li>
          </ul>
        </section>

        {/* 8 */}
        <section id="law" className="card bca-section">
          <h2>8. Governing Law, Disputes & Notices</h2>
          <ul className="dash-list">
            <li><strong>Law/venue.</strong> Governing law and venue are those stated in the signed BCA; if none, the state of Broker’s principal office.</li>
            <li><strong>Good-faith resolution.</strong> Parties will confer in good faith before litigation or arbitration.</li>
            <li><strong>Notices.</strong> Electronic notices to the contacts on file (including platform notices) are valid.</li>
          </ul>
        </section>

        {/* 9 */}
        <section id="term" className="card bca-section">
          <h2>9. Term, Suspension & Termination</h2>
          <p>
            The BCA is continuing and may be suspended or terminated immediately for safety, authority,
            insurance lapse, fraud, or material breach. Termination does not affect obligations for already-tendered
            loads, indemnity, confidentiality, or payment/setoff rights.
          </p>
        </section>

        {/* 10 */}
        <section id="misc" className="card bca-section">
          <h2>10. Miscellaneous</h2>
          <ul className="dash-list">
            <li>No assignment or subcontracting without Broker’s written consent.</li>
            <li>Severability: unenforceable provisions are modified to the minimum extent necessary.</li>
            <li>Entire agreement: the signed BCA + applicable RateCons constitute the entire agreement.</li>
          </ul>
        </section>

        <section className="card bca-section bca-ack">
          <h2>Carrier Acknowledgment</h2>
          <p>
            By accepting and performing loads, Carrier acknowledges the terms above and agrees the signed
            Broker–Carrier Agreement and each RateCon govern. Please contact{" "}
            <a href="mailto:carrier-support@guga.com">carrier-support@guga.com</a> with any questions.
          </p>
        </section>
      </main>

      <CarrierDashboardFooter />
    </div>
  );
}
