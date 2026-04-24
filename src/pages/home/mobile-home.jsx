import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import PublicHeader from '../../components/header/public/publicheader';
import QuoteWidget from '../../components/quote-widget/quote-widget';
import LiveChat from '../../components/live-chat/live-chat';

import './mobile-home.css';

function MobileHome() {
  const navigate = useNavigate();

  return (
    <div className="mhome">
      <PublicHeader />

      <main className="mhome-main">
        <section className="mhome-hero">
          <h1 className="mhome-hero-title">
            Ship your car <span className="mhome-accent">in seconds</span>
          </h1>
          <p className="mhome-hero-sub">
            Set your price. Skip the brokers. Only a 6% fee.
          </p>
        </section>

        <section className="mhome-quote" aria-label="Get a quote">
          <QuoteWidget />
        </section>

        <section className="mhome-trust" aria-label="Why Jashi Logistics">
          <div className="mhome-trust-item">
            <span className="mhome-trust-num">6%</span>
            <span className="mhome-trust-label">Flat fee</span>
          </div>
          <div className="mhome-trust-divider" aria-hidden="true" />
          <div className="mhome-trust-item">
            <span className="mhome-trust-num">0</span>
            <span className="mhome-trust-label">Brokers</span>
          </div>
          <div className="mhome-trust-divider" aria-hidden="true" />
          <div className="mhome-trust-item">
            <span className="mhome-trust-num">24/7</span>
            <span className="mhome-trust-label">Support</span>
          </div>
        </section>

        <section className="mhome-cta" aria-label="Already have an account">
          <button
            type="button"
            className="mhome-cta-btn"
            onClick={() => navigate('/?auth=shipper-login')}
          >
            I already have an account
          </button>
        </section>
      </main>

      <footer className="mhome-footer">
        <div className="mhome-footer-brand">Jashi Logistics</div>
        <div className="mhome-footer-tag">Transparent auto transport — your price, your way.</div>
        <nav className="mhome-footer-links" aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <a href="mailto:support@jashilogistics.com">Contact</a>
        </nav>
        <div className="mhome-footer-copy">© {new Date().getFullYear()} Jashi Logistics</div>
      </footer>

      <LiveChat />
    </div>
  );
}

export default MobileHome;
