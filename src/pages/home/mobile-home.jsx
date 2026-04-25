import React, { useCallback, useState } from 'react';
import {
  IoFlashOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoCardOutline,
  IoCarSportOutline,
  IoCashOutline,
  IoHeadsetOutline,
  IoLocateOutline,
} from 'react-icons/io5';

import QuoteWidget from '../../components/quote-widget/quote-widget';
import Footer from '../../components/footer/footer';

import MobileHomeHeader from './components/mobile-header';
import MobileComparison from './components/mobile-comparison';
import MobileChatSheet from './components/mobile-chat-sheet';

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
    body: 'Talk directly with carriers.',
  },
  {
    icon: IoFlashOutline,
    title: 'Set Your Price',
    body: 'Choose the price you want.',
  },
  {
    icon: IoHeadsetOutline,
    title: 'Dedicated Support',
    body: 'Help available 7 days.',
  },
  {
    icon: IoLocateOutline,
    title: 'Live Tracking',
    body: 'Track pickup to delivery.',
  },
];

function MobileHome() {
  // Comparison cards live below the form. We still mirror the QuoteWidget
  // state into mobile-home so the live numbers can update once the user
  // fills in ZIPs / vehicle. Same pattern as QuoteSection on desktop.
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

  return (
    <div className="mhome">
      <MobileHomeHeader />

      <main className="mhome-main">
        {/* ===== QUOTE WIDGET (above-the-fold) =====
            Page opens directly into the conversion surface — title +
            subtitle act as the hero, the form sits immediately below.
            No marketing CTAs above the form. */}
        <section
          id="mhome-quote-section"
          className="mhome-quote"
          aria-label="Get a quote"
        >
          <header className="mhome-quote-head">
            <h1 className="mhome-quote-title">
              Set Your Price.{' '}
              <span className="mhome-quote-title-accent">Ship On Your Terms.</span>
            </h1>
            <p className="mhome-quote-sub">
              Name your price and connect directly with verified carriers — transparent shipping, on your terms.
            </p>
          </header>
          <div className="mhome-quote-card">
            <QuoteWidget
              onStateChange={handleWidgetState}
              submitLabel="Check Dispatch Chance →"
              footerNote="No commitment required. Flat 6% fee only when you book."
            />
          </div>

          {/* Lightweight trust strip — sits immediately below the form
              for max conversion impact. Three micro-claims, no
              decoration. */}
          <ul className="mhome-trust-strip" aria-label="Trust">
            <li>FMCSA Verified</li>
            <li>No Hidden Fees</li>
            <li>Direct Carrier Access</li>
          </ul>
        </section>

        {/* ===== PRICING COMPARISON (below quote on mobile) ===== */}
        <MobileComparison form={form} />

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

      </main>

      {/* The shared <Footer> renders the full dark navy footer on every
          breakpoint now — its responsive CSS stacks the four columns into
          one on mobile and the global mobile-only rules below hide the
          phone row. Premium brand presence preserved end-to-end. */}
      <Footer />

      <MobileChatSheet />
    </div>
  );
}

export default MobileHome;
