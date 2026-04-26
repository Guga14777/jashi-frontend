import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import './customer-dashboard-footer.css';

/**
 * Props:
 *   onRequestShipmentClick?: () => void
 */
function CustomerDashboardFooter({ onRequestShipmentClick }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Grid */}
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

          {/* Column 2 - Quick Actions */}
          <div className="footer-links-column">
            <h3 className="footer-heading">
              Quick Actions
              <span className="footer-heading-accent" />
            </h3>

            <ul className="footer-links">
              <li>
                <a
                  href="#request-shipment"
                  className="footer-quickaction-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onRequestShipmentClick?.();
                  }}
                >
                  Request Shipment
                </a>
              </li>
              <li>
                <Link to="/dashboard/track" className="footer-quickaction-link">
                  Track Shipment
                </Link>
              </li>
              <li>
                <Link to="/dashboard/payments" className="footer-quickaction-link">
                  Billing &amp; Invoices
                </Link>
              </li>
              <li>
                <Link to="/dashboard/help" className="footer-quickaction-link">
                  Support Tickets
                </Link>
              </li>
              {/* NEW: Insurance & Coverage moved here */}
              <li>
                <Link to="/dashboard/policies/insurance" className="footer-quickaction-link">
                  Insurance &amp; Coverage
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Support & Resources */}
          <div className="footer-why-column">
            <h3 className="footer-heading">
              Support &amp; Resources
              <span className="footer-heading-accent" />
            </h3>

            <ul className="footer-features">
              <li><strong>24/7</strong> customer support</li>
              <li><strong>Real-time</strong> shipment tracking</li>
              <li>Instant carrier communication</li>
              <li>Secure payment processing</li>
              <li>Comprehensive insurance coverage</li>
            </ul>
          </div>

          {/* Column 4 - Need Help */}
          <div className="footer-contact-column">
            <h3 className="footer-heading">
              Need Help?
              <span className="footer-heading-accent" />
            </h3>

            <ul className="footer-contact">
              {/* Phone row removed for now — placeholder will be
                  reinstated when the real business number is live. */}
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="footer-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>support@jashilogistics.com</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="footer-icon">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
                <span>Live Chat Support</span>
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
              <Link to="/dashboard/policies/privacy">Privacy Policy</Link>
              <span className="footer-separator">·</span>
              <Link to="/dashboard/policies/terms">Terms of Service</Link>
              <span className="footer-separator">·</span>
              <Link to="/dashboard/policies/cookies">Cookie Policy</Link>
              {/* Removed duplicate Insurance & Coverage link from here */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default CustomerDashboardFooter;
