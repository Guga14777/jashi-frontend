import React from "react";
import CustomerHeader from "../../../components/header/customer/customerheader.jsx";
import CustomerDashboardFooter from "../../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../../components/live-chat/live-chat.jsx";
import "./carrier-ratings.css";

const CarrierRatings = () => {
  const whatYoullSee = [
    "A 1–5 star overall rating for the carrier on your shipment.",
    "Your written comment (once submitted) next to the star rating.",
    "A verification badge indicating the review came from a completed delivery.",
    "An edit option (for a short window) on the shipment’s delivery screen."
  ];

  const reviewGuidance = [
    "Rate overall experience on a 1–5 star scale.",
    "Comment on communication, timeliness, vehicle condition, and professionalism.",
    "If issues occurred, note what happened and how it was resolved.",
    "Be constructive and respectful—your feedback helps other shippers."
  ];

  const ratingUsage = [
    "We continuously monitor on-time performance and customer feedback.",
    "Carriers with strong records are prioritized for future dispatches.",
    "Serious or repeated issues trigger quality reviews and corrective actions."
  ];

  const faqs = [
    { q: "Where do I leave a review?", a: "Open your shipment’s delivery screen in the dashboard. Reviews are submitted there after delivery." },
    { q: "Can I edit my review?", a: "Yes. You can edit within a short time window after submission from the same delivery screen." },
    { q: "Are reviews verified?", a: "Yes. Only customers with completed deliveries can submit reviews for that shipment." },
    { q: "How are carrier ratings calculated?", a: "We combine verified customer ratings, on-time performance, and safety/compliance records." }
  ];

  return (
    <div className="cr-page">
      <CustomerHeader />

      <main className="cr-container">
        <header className="cr-header">
          <h1>Carrier Ratings &amp; Reviews</h1>
          <p className="cr-subtitle">
            How ratings work at Guga and what you’ll see after delivery.
          </p>
        </header>

        {/* Overview */}
        <section className="cr-card">
          <h2 className="cr-h2">Overview</h2>
          <p className="cr-paragraph">
            Carrier ratings help keep quality high across our network. After your vehicle
            is delivered, you can leave a verified review from the shipment’s delivery
            screen in your dashboard. Reviews use a 1–5 star scale with an optional
            written comment.
          </p>
          <div className="cr-callout">
            <strong>Note:</strong> This page is informational. Submissions and edits are
            done from the delivery screen of the specific shipment.
          </div>
        </section>

        {/* How we calculate */}
        <section className="cr-card">
          <h2 className="cr-h2">How We Calculate Ratings</h2>
          <div className="cr-infogrid">
            <article className="cr-infocard">
              <span className="cr-badge cr-badge-blue" aria-hidden="true" />
              <div className="cr-infocopy">
                <h3>Customer Feedback</h3>
                <p>Verified 1–5 star ratings and comments from completed deliveries.</p>
              </div>
            </article>
            <article className="cr-infocard">
              <span className="cr-badge cr-badge-amber" aria-hidden="true" />
              <div className="cr-infocopy">
                <h3>On-Time Performance</h3>
                <p>Driver punctuality at pickup and delivery over time.</p>
              </div>
            </article>
            <article className="cr-infocard">
              <span className="cr-badge cr-badge-slate" aria-hidden="true" />
              <div className="cr-infocopy">
                <h3>Safety &amp; Compliance</h3>
                <p>Insurance, safety audits, and incident history.</p>
              </div>
            </article>
          </div>
        </section>

        {/* What you’ll see */}
        <section className="cr-card">
          <h2 className="cr-h2">What You’ll See After Delivery</h2>
          <ul className="cr-list cr-list-dots">
            {whatYoullSee.map((item, i) => (
              <li key={`see-${i}`}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Tips */}
        <section className="cr-card">
          <h2 className="cr-h2">Tips for Helpful Reviews</h2>
          <ul className="cr-list cr-list-dots">
            {reviewGuidance.map((t, i) => (
              <li key={`tip-${i}`}>{t}</li>
            ))}
          </ul>
        </section>

        {/* How ratings are used */}
        <section className="cr-card">
          <h2 className="cr-h2">How Ratings Are Used</h2>
          <div className="cr-usagegrid">
            {ratingUsage.map((t, i) => (
              <article key={`use-${i}`} className="cr-usage">
                <span className="cr-pill" aria-hidden="true" />
                <p>{t}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="cr-card">
          <h2 className="cr-h2">FAQs</h2>
          <div className="cr-faqgrid">
            {faqs.map((f, i) => (
              <article key={`faq-${i}`} className="cr-faq">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </article>
            ))}
          </div>
        </section>

        <p className="cr-disclaimer">
          Ratings are informational. Guga may review, moderate, or remove content that
          violates policy or cannot be verified.
        </p>
      </main>

      <LiveChat />
      <CustomerDashboardFooter />
    </div>
  );
};

export default CarrierRatings;
