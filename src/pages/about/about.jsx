// src/pages/about/about.jsx
import React, { useEffect } from "react";
import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";
import "./about.css";

export default function About() {
  useEffect(() => {
    document.title = "About Jashi Logistics — Transparent, Fair Auto Transport Platform";
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="static-page">
        <div className="static-page-container">
          <div className="about-eyebrow">ABOUT JASHI LOGISTICS</div>
          <h1>The first auto transport platform where customers set their own price</h1>

          <p className="about-subheading">
            Jashi Logistics combines transparent pricing, verified carriers, and instant communication tools to give
            you complete control over your vehicle transport experience.
          </p>

          <p>
            We're redefining auto transport by giving customers full control over pricing and carrier selection.
            Our platform shows real-time dispatch likelihood so you can make informed decisions about your offer.
          </p>

          <div className="about-section">
            <h2 className="about-section-title">Built from Real Experience</h2>
            <p>
              At Jashi Logistics, our mission is to make vehicle shipping fair, transparent, and empowering for everyone. After years of experience in logistics and transport, I saw how traditional brokers overcharged customers, hid real carrier rates, and complicated a process that should be simple and honest. Jashi Logistics was created to change that — giving people the power to set their own price, connect directly with verified carriers, and ship with confidence. Every feature of our platform was designed with one goal in mind: to create a smarter, more transparent, and customer-driven auto transport experience.
            </p>
            <p className="founder-signature">
              — Founder, Giorgi Jashi
            </p>
          </div>

          <div className="about-benefits">
            <h2>Why Choose Jashi Logistics</h2>
            <ul className="benefit-list">
              <li>Set your own price and see real-time dispatch probability</li>
              <li>Connect directly with verified, licensed carriers</li>
              <li>Transparent pricing with no hidden fees or markups</li>
              <li>Real-time tracking and communication throughout transport</li>
              <li>Fair market rates that benefit both shippers and carriers</li>
            </ul>
          </div>
        </div>
      </main>

      {/* 👉 LiveChat must be mounted before the footer */}
      <LiveChat />
      <Footer />
    </>
  );
}