import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import './footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Main 4-Column Grid */}
        <div className="footer-main">
          {/* Column 1 - Brand */}
          <div className="footer-brand-column">
            <div className="footer-brand">
              <img
                src="/images/logomercury1.png"
                alt="Jashi Logistics — vehicle shipping"
                className="footer-logo"
              />
              <span className="footer-brand-name">Jashi Logistics</span>
            </div>

            <p className="footer-tagline">
              Transparent auto transport, your price — your way.
            </p>

            <div className="footer-social">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Jashi Logistics on Instagram"
                className="footer-social-link"
              >
                <FaInstagram />
              </a>

              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Jashi Logistics on X"
                className="footer-social-link"
              >
                <FaXTwitter />
              </a>

              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Jashi Logistics on Facebook"
                className="footer-social-link"
              >
                <FaFacebookF />
              </a>

              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Jashi Logistics on LinkedIn"
                className="footer-social-link"
              >
                <FaLinkedinIn />
              </a>
            </div>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="footer-links-column">
            <h3 className="footer-heading">
              Quick Links
              <span className="footer-heading-accent"></span>
            </h3>

            <ul className="footer-links">
              <li><Link to="/about">About Jashi Logistics</Link></li>
              <li><Link to="/how-dispatch-works">How Dispatch Works</Link></li>
              <li><Link to="/shipping-guide">Shipping Guide</Link></li>
              <li><Link to="/insurance">Insurance &amp; Protection</Link></li>
              <li><Link to="/service-areas">Service Areas</Link></li>
            </ul>
          </div>

          {/* Column 3 - Why Shippers Choose Jashi Logistics */}
          <div className="footer-why-column">
            <h3 className="footer-heading">
              Why Shippers Choose Jashi Logistics
              <span className="footer-heading-accent"></span>
            </h3>

            <ul className="footer-features">
              <li>Only <strong>6%</strong> platform fee</li>
              <li><strong>Set your price</strong> &amp; see dispatch odds instantly</li>
              <li>Direct carrier access — no middlemen</li>
              <li>Real-time tracking &amp; updates</li>
              <li>Dedicated support, 7 days a week</li>
            </ul>
          </div>

          {/* Column 4 - Get in Touch */}
          <div className="footer-contact-column">
            <h3 className="footer-heading">
              Get in Touch
              <span className="footer-heading-accent"></span>
            </h3>

            <ul className="footer-contact">
              <li className="footer-contact-item--phone">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="footer-icon"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span>1-800-JASHI-GO</span>
              </li>

              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="footer-icon"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>support@jashilogistics.com</span>
              </li>

              <li className="footer-contact-item--chat">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="footer-icon"
                >
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
                <span>Live Chat</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              © {currentYear} Jashi Logistics. All rights reserved.
            </div>

            <div className="footer-legal">
              <Link to="/privacy">Privacy Policy</Link>
              <span className="footer-separator">·</span>
              <Link to="/terms">Terms of Service</Link>
              <span className="footer-separator footer-separator--cookie" aria-hidden="true">·</span>
              <Link to="/cookies" className="footer-legal-link--cookie">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
