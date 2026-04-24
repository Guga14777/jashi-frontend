// src/pages/shipping-guide/shipping-guide.jsx
import React, { useEffect } from "react";
import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";
import "./shipping-guide.css";

export default function ShippingGuide() {
  useEffect(() => {
    document.title = "Shipping Guide — Guga Auto Transport";
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="static-page">
        <div className="static-page-container">
          <h1>Shipping Guide</h1>
          <p>
            Move vehicles with confidence. Use this checklist to prep your car, know what to expect in transit, and finish delivery without surprises.
          </p>

          <section>
            <h2>Before Pickup (Required)</h2>
            <ul>
              <li>Clean the vehicle exterior so inspection photos show detail</li>
              <li>Remove all personal items and loose accessories (toll tags, EZ-passes, phone mounts, spare fuel cans, etc.)</li>
              <li>Leave ≤ ¼ tank of fuel; note odometer reading</li>
              <li>Photograph the vehicle (sunlight if possible) — all sides, corners, roof, interior, close-ups of existing damage, and VIN</li>
              <li>Provide keys/remotes and disable alarms/immobilizers</li>
              <li>Verify the car starts, steers, and brakes; tires properly inflated and battery charged</li>
              <li>Choose a pickup spot a truck can reach (wide street or open lot). If your street is tight, plan to meet at a nearby accessible location</li>
            </ul>
            
            <div className="info-callout">
              <strong>Prohibited items:</strong> firearms, aerosols/flammables, perishables, cash, or valuables. Carriers can refuse pickup if the vehicle is loaded.
            </div>
          </section>

          <section>
            <h2>During Transit (What to Expect)</h2>
            <ul>
              <li>Your order shows live status in Guga; we'll notify you of pickup/ETA changes</li>
              <li>Long-haul timing depends on distance, weather, and DOT rules. Delays happen — we'll keep you posted and escalate if needed</li>
              <li>Keep your phone available for quick coordination; you may get a 2–4 hour delivery window the day prior</li>
              <li>Tip: If you can't be there, designate an adult contact in your order with their phone and name</li>
            </ul>
          </section>

          <section>
            <h2>Upon Delivery (Finish Strong)</h2>
            <ul>
              <li>Meet at a truck-friendly spot. Walk around the vehicle before signing</li>
              <li>Compare to your pickup photos. Take new photos (same angles + any new concerns)</li>
              <li>Note issues on the Bill of Lading (BOL) before signing. Your signed BOL becomes the official Proof of Delivery (POD)</li>
              <li>Start the vehicle; check lights, windows, and basic functions</li>
              <li>Complete the short POD steps in Guga to close out the shipment</li>
              <li>If something doesn't look right: note it on the BOL, take photos, and contact Jashi Support from the order page. We'll guide you on next steps</li>
            </ul>
          </section>

          <section>
            <h2>Insurance & Protection (Quick Facts)</h2>
            <div className="info-callout">
              <ul>
                <li>Your assigned carrier provides cargo coverage per FMCSA rules</li>
                <li>Coverage requires that any damage is documented on the BOL/POD at delivery and supported with photos</li>
                <li>Report concerns to Guga within 48 hours so we can help coordinate</li>
              </ul>
            </div>
          </section>

          <section>
            <h2>Helpful Extras (Optional)</h2>
            <ul>
              <li>Aftermarket/low-clearance cars: tell us in advance; special equipment may be needed</li>
              <li>Inoperable vehicles: allowed with prior notice; winch fees and extra gear may apply</li>
              <li>Seasonal/weather routes: winter corridors and holidays can extend ETAs</li>
            </ul>
          </section>

          <div className="help-section">
            <h2>Need Help?</h2>
            <p>
              Questions about pricing, dispatch odds, or timing? Live chat from the bottom-right bubble or email support@jashilogistics.com
            </p>
            <p>
              Ready to book? Get a quote and see your dispatch likelihood instantly.
            </p>
          </div>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </>
  );
}