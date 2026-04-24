// src/pages/insurance/insurance.jsx
import React, { useEffect } from "react";
import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";
import "./insurance.css";

export default function Insurance() {
  useEffect(() => {
    document.title = "Insurance & Protection — Jashi Logistics Auto Transport";
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="static-page">
        <div className="static-page-container">
          <h1>Insurance & Protection</h1>
          <p>
            Every vehicle shipped through Jashi Logistics is covered by fully verified carrier insurance — backed by FMCSA regulations and transparent documentation. Your vehicle is always protected from pickup to delivery.
          </p>

          <div className="insurance-grid">
            <div className="insurance-card">
              <h3>Coverage Details</h3>
              <p>
                Each carrier in our network maintains active cargo insurance coverage. You're protected against physical damage during pickup, transit, and unloading — including theft, collision, and carrier negligence.
              </p>
              <p>
                Jashi Logistics verifies carrier insurance certificates regularly to ensure every partner remains compliant and up-to-date.
              </p>
            </div>

            <div className="insurance-card">
              <h3>Documentation</h3>
              <p>
                Your photos and signed Bill of Lading are your protection. We make it easy to upload and track them in the Jashi Logistics dashboard for claim support.
              </p>
              <p>
                The Bill of Lading and Proof of Delivery documents serve as your primary protection. Note any existing damage before transport and new damage upon delivery.
              </p>
            </div>

            <div className="insurance-card">
              <h3>Filing Claims</h3>
              <p>
                In the rare event of damage, file your claim within 48 hours. Include photos and details. Jashi Logistics will coordinate directly with the carrier's insurer and guide you step by step through resolution.
              </p>
              <p>
                Claims are processed directly through the carrier's insurance provider with full Jashi Logistics support throughout the process.
              </p>
            </div>
          </div>

          <div className="insurance-important">
            <h3>Important Protection Steps</h3>
            <ul>
              <li>Inspect your vehicle at both pickup and delivery</li>
              <li>Photograph all sides before and after transport</li>
              <li>Note all damage directly on the Bill of Lading before signing</li>
              <li>Report any concerns immediately via Jashi Logistics support or Live Chat</li>
              <li>Keep all documentation (photos, receipts, signed forms) for your records</li>
            </ul>
          </div>

          <p>
            At Jashi Logistics, transparency extends beyond pricing — it includes peace of mind. We partner only with licensed, insured carriers so every shipment stays protected from dispatch to delivery.
          </p>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </>
  );
}