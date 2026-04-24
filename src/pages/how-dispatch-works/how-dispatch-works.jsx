// src/pages/how-dispatch-works/how-dispatch-works.jsx
import React, { useEffect } from "react";
import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";
import "./how-dispatch-works.css";

export default function HowDispatchWorks() {
  useEffect(() => {
    document.title = "How Dispatch Works — Jashi Logistics Auto Transport";
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="static-page">
        <div className="static-page-container">
          <h1>How Dispatch Works</h1>
          <p>
            Understanding how Jashi Logistics dispatch works helps you get results faster. Here's a step-by-step 
            look at our transparent process from start to finish.
          </p>
          
          <div className="dispatch-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Submit Offer</h3>
                <p>Enter your route details, vehicle information, and offer your price. Our system shows you the likelihood of dispatch based on current market conditions.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Carrier Match</h3>
                <p>Verified carriers view your offer and route details. Higher offers typically dispatch faster, but fair market pricing ensures optimal results.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Pickup Coordination</h3>
                <p>Once a carrier accepts your offer, they'll contact you directly to confirm pickup window and location details.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Transit & Delivery</h3>
                <p>Track your vehicle's progress through the Jashi Logistics platform and stay in contact with your carrier throughout transport.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>Proof of Delivery & Payment</h3>
                <p>Upon delivery, complete the proof of delivery process. Payment releases to the carrier within 24-48 hours after verified delivery.</p>
              </div>
            </div>
          </div>
          
          <p>
            This transparent process ensures fair pricing and reliable service for both shippers and carriers.
          </p>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </>
  );
}