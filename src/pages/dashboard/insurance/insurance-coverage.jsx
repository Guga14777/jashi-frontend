import React from "react";
import CustomerHeader from "../../../components/header/customer/customerheader.jsx";
import CustomerDashboardFooter from "../../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../../components/live-chat/live-chat.jsx";
import "./insurance-coverage.css";

const InsuranceCoverage = () => {
  const coverageInclusions = [
    "Exterior damage directly caused during transport",
    "Damage during loading and unloading",
    "Weather-related damage during transport",
    "Theft while in carrier possession",
  ];

  const coverageExclusions = [
    "Personal items left in the vehicle",
    "Mechanical issues unrelated to transport",
    "Pre-existing damage not noted at pickup",
    "Acts of God (varies by policy)",
    "Normal wear and tear",
  ];

  const optionalCoverageOptions = [
    {
      title: "Higher Coverage Limits",
      description:
        "Ask us if you need extended coverage beyond standard carrier limits.",
    },
    {
      title: "Enclosed Transport",
      description: "Added protection for high-value or classic vehicles.",
    },
    {
      title: "Gap Coverage",
      description:
        "Additional protection for vehicles with outstanding loans.",
    },
  ];

  const claimSteps = [
    {
      step: 1,
      title: "Document at delivery",
      description: "Note issues on the Bill of Lading before signing.",
    },
    {
      step: 2,
      title: "Take photos/videos",
      description: "Capture multiple angles and close-ups.",
    },
    {
      step: 3,
      title: "Report within 24–48 hours",
      description: "Use Dashboard → Help to open a support case.",
    },
    {
      step: 4,
      title: "Provide paperwork",
      description:
        "Pickup and delivery inspections, your photos, and any additional details.",
    },
    {
      step: 5,
      title: "Resolution",
      description:
        "We coordinate with the carrier/insurer and keep you updated.",
    },
  ];

  const commonQuestions = [
    {
      question: "Is my vehicle covered in bad weather?",
      answer:
        "It depends on policy terms; contact support for specifics on your dispatch.",
    },
    {
      question: "What if the car won't start at delivery?",
      answer:
        "Mechanical failures unrelated to transport are typically not covered.",
    },
    {
      question: "Can I add extra coverage?",
      answer: "Yes—contact us before pickup to discuss options.",
    },
    {
      question: "How long do I have to file a claim?",
      answer:
        "Report damage within 24–48 hours after delivery for the best results.",
    },
  ];

  return (
    <div className="ic-page">
      <CustomerHeader />

      <main className="ic-container">
        <header className="ic-header">
          <h1>Insurance & Coverage</h1>
          <p className="ic-subtitle">
            What’s included, what’s optional, and how to file a claim.
          </p>
        </header>

        {/* Overview */}
        <section className="ic-card ic-overview">
          <h2 className="ic-h2">Overview</h2>
          <p className="ic-paragraph">
            Every carrier we dispatch must maintain active cargo liability
            insurance. Coverage applies while your vehicle is in the carrier’s
            possession—typically from loading to delivery—and is supported by
            inspections performed at pickup and drop-off.
          </p>
          <div className="ic-callout">
            <strong>Good to know:</strong> Status updates are posted as soon as
            carriers scan or confirm a milestone. Rural pickups, after-hours
            moves, or limited signal may cause brief delays between events and
            updates.
          </div>
        </section>

        {/* What’s covered by carriers */}
        <section className="ic-card">
          <h2 className="ic-h2">What’s Covered by Carriers</h2>
          <div className="ic-infogrid">
            <article className="ic-infocard">
              <span className="ic-badge ic-badge-blue" aria-hidden="true" />
              <div className="ic-infocopy">
                <h3>Carrier Liability Coverage</h3>
                <p>
                  All dispatched carriers hold active cargo liability insurance
                  as part of onboarding and ongoing compliance.
                </p>
              </div>
            </article>

            <article className="ic-infocard">
              <span className="ic-badge ic-badge-indigo" aria-hidden="true" />
              <div className="ic-infocopy">
                <h3>While in Possession</h3>
                <p>
                  Coverage applies from the moment your vehicle is loaded until
                  delivery and sign-off at destination.
                </p>
              </div>
            </article>

            <article className="ic-infocard">
              <span className="ic-badge ic-badge-slate" aria-hidden="true" />
              <div className="ic-infocopy">
                <h3>Documentation Matters</h3>
                <p>
                  Accurate pickup and delivery inspections (BOL) help validate
                  and expedite any claim.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Limits & exclusions */}
        <section className="ic-card">
          <h2 className="ic-h2">Coverage Limits & Exclusions</h2>

          <div className="ic-2col">
            <div className="ic-listcard ic-green">
              <h3>Typical Inclusions</h3>
              <ul className="ic-list ic-list-check">
                {coverageInclusions.map((item, i) => (
                  <li key={`inc-${i}`}>
                    <span className="ic-dot ic-dot-check" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ic-listcard ic-red">
              <h3>Typical Exclusions</h3>
              <ul className="ic-list ic-list-x">
                {coverageExclusions.map((item, i) => (
                  <li key={`exc-${i}`}>
                    <span className="ic-dot ic-dot-x" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ic-note">
            <span className="ic-note-icon" aria-hidden="true">!</span>
            <div>
              <strong>Special vehicles:</strong> Oversized, modified, or low-clearance
              vehicles may require special equipment. Please notify us in advance.
            </div>
          </div>
        </section>

        {/* Optional coverage */}
        <section className="ic-card">
          <h2 className="ic-h2">Optional Coverage</h2>
          <div className="ic-3grid">
            {optionalCoverageOptions.map((opt, i) => (
              <article key={`opt-${i}`} className="ic-option">
                <h3>{opt.title}</h3>
                <p>{opt.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Claims */}
        <section className="ic-card">
          <h2 className="ic-h2">Filing a Claim</h2>

          <div className="ic-alert">
            <span className="ic-alert-icon" aria-hidden="true">!</span>
            <div>
              <strong>Need to file a claim?</strong> Follow the steps below to
              ensure your claim is processed quickly.
            </div>
          </div>

          <div className="ic-steps">
            {claimSteps.map((s, i) => (
              <div key={`step-${i}`} className="ic-step">
                <div className="ic-stepnum">{s.step}</div>
                <div className="ic-stepcopy">
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="ic-card">
          <h2 className="ic-h2">Common Questions</h2>
          <div className="ic-faqgrid">
            {commonQuestions.map((f, i) => (
              <article key={`faq-${i}`} className="ic-faq">
                <h3>{f.question}</h3>
                <p>{f.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <p className="ic-disclaimer">
          Coverage terms are determined by the carrier policy and any optional
          plan you purchase. This page is a summary and not a contractual
          document.
        </p>
      </main>

      <LiveChat />
      <CustomerDashboardFooter />
    </div>
  );
};

export default InsuranceCoverage;
