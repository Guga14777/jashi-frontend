// src/pages/service-areas/service-areas.jsx
import React, { useEffect } from "react";
import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";
import "./service-areas.css";

export default function ServiceAreas() {
  useEffect(() => {
    document.title = "Service Areas — Guga Auto Transport (Continental U.S.)";
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="static-page">
        <div className="static-page-container">
          <h1>Service Areas</h1>
          <p>
            Guga operates across the <strong>continental United States</strong>, connecting shippers and
            verified carriers in major metros, suburbs, and many rural corridors.
          </p>

          <div className="coverage-highlights">
            <div className="coverage-section">
              <h3>Popular Routes</h3>
              <ul>
                <li>Coast-to-coast transport (California ⇄ Florida, New York ⇄ California)</li>
                <li>Regional corridors (Texas Triangle, Northeast Corridor, Pacific Northwest)</li>
                <li>Seasonal migration routes (snowbird lanes to/within the Southeast & Southwest)</li>
                <li>Major metropolitan connections (NYC, Los Angeles, Chicago, Houston, Phoenix)</li>
              </ul>
            </div>

            <div className="coverage-section">
              <h3>Specialized Coverage</h3>
              <ul>
                <li>Suburban and rural pickups with truck-friendly meeting points</li>
                <li>Military base and government facility access (where permitted)</li>
                <li>University and college campus delivery (designated zones)</li>
                <li>Dealer, auction, and fleet moves (by appointment)</li>
              </ul>
            </div>
          </div>

          <p>
            Our carrier network provides competitive pricing and reliable timelines across these lanes.
            Get a quote to see dispatch likelihood for your exact route.
          </p>

          <div className="carrier-invitation">
            <h3>Carriers Welcome</h3>
            <p>
              Licensed and insured carriers can join Guga to access steady loads across preferred
              regions. We're expanding coverage continuously to improve service for shippers and carriers.
            </p>
          </div>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </>
  );
}