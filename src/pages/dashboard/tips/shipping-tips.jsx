import React from "react";
import { Link } from "react-router-dom";
import CustomerHeader from "../../../components/header/customer/customerheader.jsx";
import CustomerDashboardFooter from "../../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../../components/live-chat/live-chat.jsx";
import "./shipping-tips.css";

const ShippingTips = () => {
  const beforePickup = [
    { title: "Clean the vehicle (inside & out)", desc: "Photos are clearer and inspections are faster." },
    { title: "Remove personal items", desc: "Carriers aren’t responsible for personal belongings." },
    { title: "Note existing damage", desc: "Take dated photos of all sides and close-ups." },
    { title: "Low fuel is ideal", desc: "¼ tank or less reduces vehicle weight." },
    { title: "Keys & access", desc: "Driver must be able to start, steer, and brake the vehicle." },
    { title: "Ground clearance / mods", desc: "Tell us about lowered cars, spoilers, or roof racks." },
  ];

  const dayOfPickup = [
    { title: "Be available", desc: "Drivers typically call 2–4 hours before arrival." },
    { title: "Prepare location", desc: "A wide, safe, legal spot helps load quickly." },
    { title: "Sign inspection", desc: "Review and keep a copy of the Bill of Lading (BOL)." },
  ];

  const duringTransit = [
    { title: "Tracking", desc: "You’ll see status updates in your dashboard." },
    { title: "ETAs", desc: "Arrival windows may shift with traffic or weather—updates will post automatically." },
    { title: "Need to coordinate?", desc: "Open Dashboard → Help to reach support or your carrier." },
  ];

  const delivery = [
    { title: "Inspect before signing", desc: "Walk around and compare with your pickup photos." },
    { title: "Note issues on the BOL", desc: "Mark anything that looks new before signing." },
    { title: "Payment & documents", desc: "Have any COD (if required) and IDs ready." },
  ];

  const faqs = [
    { q: "Can I ship personal items?", a: "Best to remove them—most carriers and policies exclude personal belongings." },
    { q: "What about inoperable vehicles?", a: "Yes—tell us in advance so we can dispatch a winch or specialty carrier." },
    { q: "Will the driver call me?", a: "Usually 2–4 hours ahead of both pickup and delivery." },
  ];

  return (
    <div className="st-page">
      <CustomerHeader />

      <main className="st-container">
        <header className="st-header">
          <h1>Shipping Tips & Resources</h1>
          <p className="st-subtitle">Practical prep to avoid delays and keep your shipment smooth.</p>
        </header>

        {/* Overview */}
        <section className="st-card st-overview">
          <h2 className="st-h2">Overview</h2>
          <p className="st-paragraph">
            A little preparation goes a long way. The steps below help drivers load safely, speed up inspections,
            and reduce surprises at pickup and delivery.
          </p>
          <div className="st-callout">
            <strong>Good to know:</strong> Status updates are posted as soon as carriers scan or confirm a milestone.
            Rural pickups, after-hours moves, or limited signal may cause brief delays between events and updates.
          </div>
        </section>

        {/* Tips in two neat rows */}
        <div className="st-grid">
          <section className="st-card">
            <h3 className="st-h3">Before Pickup</h3>
            <ul className="st-tiplist">
              {beforePickup.map((item, i) => (
                <li key={`bp-${i}`} className="st-tip">
                  <span className="st-check" aria-hidden>✓</span>
                  <div>
                    <div className="st-tip-title">{item.title}</div>
                    <div className="st-tip-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="st-card">
            <h3 className="st-h3">Day of Pickup</h3>
            <ul className="st-tiplist">
              {dayOfPickup.map((item, i) => (
                <li key={`dp-${i}`} className="st-tip">
                  <span className="st-check" aria-hidden>✓</span>
                  <div>
                    <div className="st-tip-title">{item.title}</div>
                    <div className="st-tip-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="st-grid">
          <section className="st-card">
            <h3 className="st-h3">During Transit</h3>
            <ul className="st-tiplist">
              {duringTransit.map((item, i) => (
                <li key={`dt-${i}`} className="st-tip">
                  <span className="st-check" aria-hidden>✓</span>
                  <div>
                    <div className="st-tip-title">{item.title}</div>
                    <div className="st-tip-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="st-card">
            <h3 className="st-h3">Delivery</h3>
            <ul className="st-tiplist">
              {delivery.map((item, i) => (
                <li key={`dl-${i}`} className="st-tip">
                  <span className="st-check" aria-hidden>✓</span>
                  <div>
                    <div className="st-tip-title">{item.title}</div>
                    <div className="st-tip-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* FAQs */}
        <section className="st-card st-faqs">
          <h2 className="st-h2">Common Questions</h2>
          <div className="st-accordion">
            {faqs.map((f, i) => (
              <details key={`fq-${i}`} className="st-faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Helpful Links */}
        <section className="st-card st-links">
          <h2 className="st-h2">Helpful Links</h2>
          <div className="st-linkgrid">
            <Link to="/dashboard/insurance" className="st-linkcard">
              <span className="st-linkarrow">↗</span>
              Insurance & Coverage
            </Link>
            <Link to="/dashboard/refunds" className="st-linkcard">
              <span className="st-linkarrow">↗</span>
              Refunds & Cancellations
            </Link>
            <Link to="/support" className="st-linkcard">
              <span className="st-linkarrow">↗</span>
              Vehicle Prep Checklist (Help Center)
            </Link>
          </div>
        </section>

        <p className="st-disclaimer">
          Guidance provided for convenience only. Always follow your carrier’s directions and local regulations.
        </p>
      </main>

      <LiveChat />
      <CustomerDashboardFooter />
    </div>
  );
};

export default ShippingTips;
