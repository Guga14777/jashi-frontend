import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoFlashOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoCardOutline,
  IoCarSportOutline,
  IoCashOutline,
  IoHeadsetOutline,
  IoLocateOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

import QuoteWidget from '../../components/quote-widget/quote-widget';
import LiveChat from '../../components/live-chat/live-chat';

import MobileHomeHeader from './components/mobile-header';
import MobileComparison from './components/mobile-comparison';

import './mobile-home.css';

const STEPS = [
  {
    icon: IoCashOutline,
    title: 'Set Your Price',
    body: "Name your offer — you're in control of the price.",
  },
  {
    icon: IoCarSportOutline,
    title: 'Carriers Bid',
    body: 'Verified drivers compete to win your shipping job.',
  },
  {
    icon: IoCalendarOutline,
    title: 'Schedule Pickup',
    body: 'Pick the time window that fits your schedule.',
  },
  {
    icon: IoCardOutline,
    title: 'Secure Payment',
    body: 'Pay upfront or on delivery — card, transfer, or cash.',
  },
];

const FEATURES = [
  {
    icon: IoPeopleOutline,
    title: 'Direct Driver Access',
    body: 'Talk directly with your carrier — no brokers, no hidden fees.',
  },
  {
    icon: IoFlashOutline,
    title: 'Set Your Price',
    body: "You're in control — set the price you want to pay.",
  },
  {
    icon: IoHeadsetOutline,
    title: 'Dedicated Support',
    body: 'Our team is available 7 days a week.',
  },
  {
    icon: IoLocateOutline,
    title: 'Live Tracking',
    body: 'Track your shipment from pickup through delivery.',
  },
];

function MobileHome() {
  const quoteRef = useRef(null);

  // Comparison cards live above the form, so we mirror the QuoteWidget state
  // up here. Same pattern as QuoteSection on desktop.
  const [form, setForm] = useState({
    pickupZip: '',
    dropoffZip: '',
    distanceMi: null,
    selectedVehicles: {},
    transportType: 'open',
    marketAvg: 0,
  });

  const handleWidgetState = useCallback((next) => {
    setForm((prev) => {
      if (
        prev.pickupZip === next.pickupZip &&
        prev.dropoffZip === next.dropoffZip &&
        prev.distanceMi === next.distanceMi &&
        prev.transportType === next.transportType &&
        prev.marketAvg === next.marketAvg &&
        prev.selectedVehicles === next.selectedVehicles
      ) {
        return prev;
      }
      return { ...prev, ...next };
    });
  }, []);

  const scrollToQuote = useCallback(() => {
    const el = document.getElementById('quote-widget') || quoteRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="mhome">
      <MobileHomeHeader onCtaClick={scrollToQuote} />

      <main className="mhome-main">
        {/* ===== HERO ===== */}
        <section className="mhome-hero" aria-label="Hero">
          <h1 className="mhome-hero-title">
            Ship Your Vehicle with{' '}
            <span className="mhome-hero-accent">Complete Control</span>
          </h1>
          <p className="mhome-hero-sub">
            Set your price. Direct carrier access. Only a 6% fee.
          </p>

          <div className="mhome-hero-ctas">
            <button
              type="button"
              className="mhome-btn mhome-btn--primary"
              onClick={scrollToQuote}
            >
              Get My Quote
            </button>
            <Link to="/how-dispatch-works" className="mhome-btn mhome-btn--ghost">
              How It Works
            </Link>
          </div>

          <ul className="mhome-trust" aria-label="Trust">
            <li>
              <IoShieldCheckmarkOutline aria-hidden="true" />
              FMCSA Verified
            </li>
            <li>Insured</li>
            <li>No Hidden Fees</li>
            <li>Direct Carrier Access</li>
          </ul>
        </section>

        {/* ===== PRICING COMPARISON (above quote form on mobile) ===== */}
        <MobileComparison form={form} />

        {/* ===== QUOTE WIDGET (product card) ===== */}
        <section
          ref={quoteRef}
          id="mhome-quote-section"
          className="mhome-quote"
          aria-label="Get a quote"
        >
          <header className="mhome-quote-head">
            <span className="mhome-quote-eyebrow">Step 1 · Tell us about your shipment</span>
            <h2 className="mhome-quote-title">Build your quote</h2>
            <p className="mhome-quote-sub">
              Enter your route and vehicle to see your dispatch chance instantly.
            </p>
          </header>
          <div className="mhome-quote-card">
            <QuoteWidget
              onStateChange={handleWidgetState}
              submitLabel="Check Dispatch Chance →"
              footerNote="No commitment required. Flat 6% fee only when you book."
            />
          </div>
        </section>

        {/* ===== HOW IT WORKS - 4-STEP TIMELINE ===== */}
        <section className="mhome-steps" aria-label="How it works">
          <header className="mhome-section-head">
            <span className="mhome-section-eyebrow">How it works</span>
            <h2 className="mhome-section-title">Four steps from quote to delivery</h2>
          </header>

          <ol className="mhome-timeline">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="mhome-timeline-item">
                  <div className="mhome-timeline-rail" aria-hidden="true">
                    <div className="mhome-timeline-dot">
                      <Icon aria-hidden="true" />
                    </div>
                    {i < STEPS.length - 1 && <div className="mhome-timeline-line" />}
                  </div>
                  <div className="mhome-timeline-body">
                    <span className="mhome-timeline-step">Step {i + 1}</span>
                    <h3 className="mhome-timeline-title">{step.title}</h3>
                    <p className="mhome-timeline-desc">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ===== FEATURE GRID ===== */}
        <section className="mhome-features" aria-label="Why Jashi">
          <header className="mhome-section-head">
            <span className="mhome-section-eyebrow">Why Jashi</span>
            <h2 className="mhome-section-title">Built for control and clarity</h2>
          </header>

          <div className="mhome-feature-grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="mhome-feature-card">
                  <div className="mhome-feature-ico" aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className="mhome-feature-title">{feature.title}</h3>
                  <p className="mhome-feature-desc">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== CLOSING CTA ===== */}
        <section className="mhome-closer" aria-label="Get started">
          <h2>Ready to set your price?</h2>
          <p>It takes about a minute. No account needed to see your dispatch chance.</p>
          <button
            type="button"
            className="mhome-btn mhome-btn--primary mhome-btn--block"
            onClick={scrollToQuote}
          >
            Start My Quote
          </button>
        </section>
      </main>

      {/* ===== MINIMAL FOOTER ===== */}
      <footer className="mhome-footer">
        <nav className="mhome-footer-links" aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <a href="mailto:support@jashilogistics.com">Contact</a>
        </nav>
        <div className="mhome-footer-copy">
          © {new Date().getFullYear()} Jashi Logistics
        </div>
      </footer>

      <LiveChat />
    </div>
  );
}

export default MobileHome;
