import React from "react";
import "./post-truck.css";

export default function PostTruck() {
  return (
    <div className="pt-page" role="main">
      <section className="pt-hero" aria-labelledby="pt-title">
        <h1 id="pt-title" className="pt-title">Capacity & Availability</h1>
        <p className="pt-subtitle">
          Tell us where/when you’re free and what you can haul. We’ll match you
          with the most relevant loads.
        </p>
      </section>

      <section className="pt-setup" aria-labelledby="pt-setup-title">
        <h2 id="pt-setup-title" className="pt-section-title">Quick Setup</h2>
        <p className="pt-section-subtext">
          Complete these three steps to start receiving better matches.
        </p>

        <div className="pt-cards">
          <article className="pt-card" aria-labelledby="pt-lanes-title">
            <h3 id="pt-lanes-title" className="pt-card-title">
              Operating Lanes & Radius
            </h3>
            <p className="pt-card-text">
              Pick your primary lanes and preferred deadhead distance for auto-matching.
            </p>
          </article>

          <article className="pt-card" aria-labelledby="pt-equip-title">
            <h3 id="pt-equip-title" className="pt-card-title">
              Equipment & Capacity
            </h3>
            <p className="pt-card-text">
              Choose equipment type and current capacity so we only send what fits.
            </p>
          </article>

          <article className="pt-card" aria-labelledby="pt-hours-title">
            <h3 id="pt-hours-title" className="pt-card-title">
              Schedule & Hours
            </h3>
            <p className="pt-card-text">
              Set days and hours you want to run so brokers know when to dispatch.
            </p>
          </article>
        </div>
      </section>

      <section className="pt-cta" aria-labelledby="pt-cta-title">
        <h2 id="pt-cta-title" className="pt-cta-title">Ready to Start Matching?</h2>
        <p className="pt-cta-text">
          Save your availability to receive relevant load offers instantly.
        </p>
        <button type="button" className="pt-button" aria-label="Save Availability">
          Save Availability
        </button>
      </section>
    </div>
  );
}
