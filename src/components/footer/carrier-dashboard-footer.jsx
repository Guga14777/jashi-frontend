// src/components/footer/carrier-dashboard-footer.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaInstagram, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import './carrier-dashboard-footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const goToCarrierApps = (e) => {
    e.preventDefault();
    navigate('/carrier/apps', { replace: false });
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-main">
          {/* Brand */}
          <div className="footer-brand-column">
            <div className="footer-brand">
              <img
                src="/images/logomercury1.png"
                alt="Jashi Logistics — freight platform for carriers"
                className="footer-logo"
              />
              <span className="footer-brand-name">Jashi Logistics</span>
            </div>
            <p className="footer-tagline">Book loads. Get paid. Stay moving.</p>
            <div className="footer-social">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="Jashi Logistics on LinkedIn" className="footer-social-link"><FaLinkedinIn /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Jashi Logistics on Instagram" className="footer-social-link"><FaInstagram /></a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Jashi Logistics on X" className="footer-social-link"><FaXTwitter /></a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Jashi Logistics on Facebook" className="footer-social-link"><FaFacebookF /></a>
            </div>
          </div>

          {/* For Carriers */}
          <div className="footer-links-column">
            <h3 className="footer-heading">For Carriers<span className="footer-heading-accent" /></h3>
            <ul className="footer-links">
              <li><Link to="/carrier/post-truck">Post Truck / Preferences</Link></li>
              <li><a href="/carrier/apps" onClick={goToCarrierApps}>Mobile App (iOS / Android)</a></li>
              <li><Link to="/carrier/payouts">Payments & Payouts</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="footer-why-column">
            <h3 className="footer-heading">Resources<span className="footer-heading-accent" /></h3>
            <ul className="footer-features">
              <li><Link to="/carrier/compliance">Compliance Docs</Link></li>
              <li><Link to="/legal/broker-carrier-agreement">Broker–Carrier Agreement</Link></li>
              <li><Link to="/policy/detention-tonu">Detention / TONU</Link></li>
              <li><Link to="/carrier/claims">Safety & Claims</Link></li>
              <li><Link to="/legal/safety-insurance">Safety & Insurance</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="footer-contact-column">
            <h3 className="footer-heading">Support<span className="footer-heading-accent" /></h3>
            <ul className="footer-contact">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="footer-icon">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.19 19a19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.33 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {/* Unclickable phone text */}
                <span className="footer-contact-text" role="text">1-800-JASHI-CARRIERS</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="footer-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                {/* Unclickable email text */}
                <span className="footer-contact-text" role="text">carrier-support@jashilogistics.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">© {currentYear} Jashi Logistics. All rights reserved.</div>
            <div className="footer-legal">
              <Link to="/legal/carrier-terms">Carrier Terms</Link><span className="footer-separator">·</span>
              <Link to="/legal/carrier-privacy">Carrier Privacy</Link><span className="footer-separator">·</span>
              <Link to="/legal/carrier-cookies">Carrier Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
