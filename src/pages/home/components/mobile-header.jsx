import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoClose, IoPersonOutline, IoCarSportOutline } from 'react-icons/io5';

import useBodyScrollLock from '../../../hooks/use-body-scroll-lock';
import './mobile-header.css';

function MobileHomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Publish real header height — keeps the page below the fixed header
  // independent of font load / zoom.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--real-header-height', `${h}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener('resize', publish);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, []);

  // Lock the page behind the sheet — iOS-friendly (fixes body in place
   // and restores the original scrollY on close).
  useBodyScrollLock(isMenuOpen);

  const closeMenu = () => setIsMenuOpen(false);

  const goAuth = (mode) => {
    closeMenu();
    navigate(`${location.pathname}?auth=${mode}`);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="mh-header"
        data-scrolled={isScrolled}
        role="banner"
      >
        <div className="mh-header-inner">
          <Link to="/" className="mh-brand" aria-label="Jashi Logistics — home">
            <span className="mh-brand-badge" aria-hidden="true">
              <img src="/images/logomercury1.png" alt="" />
            </span>
            <span className="mh-brand-name">Jashi Logistics</span>
          </Link>

          <div className="mh-actions">
            <button
              type="button"
              className="mh-cta"
              aria-expanded={isMenuOpen}
              aria-controls="mh-menu-sheet"
              onClick={() => setIsMenuOpen(true)}
            >
              Account
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div
          id="mh-menu-sheet"
          className="mh-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Account and support menu"
        >
          <button
            type="button"
            className="mh-sheet-scrim"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="mh-sheet-card">
            <div className="mh-sheet-handle" aria-hidden="true" />
            <div className="mh-sheet-header">
              <div className="mh-sheet-title">Account</div>
              <button
                type="button"
                className="mh-sheet-close"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <IoClose aria-hidden="true" />
              </button>
            </div>

            <div className="mh-portal-card">
              <div className="mh-portal-head">
                <span className="mh-portal-ico" aria-hidden="true">
                  <IoPersonOutline />
                </span>
                <div className="mh-portal-meta">
                  <div className="mh-portal-title">For Shippers</div>
                  <div className="mh-portal-sub">Book and track your shipment</div>
                </div>
              </div>
              <div className="mh-portal-actions">
                <button type="button" className="mh-sheet-row" onClick={() => goAuth('shipper-login')}>
                  Log In
                </button>
                <button type="button" className="mh-sheet-row mh-sheet-row--primary" onClick={() => goAuth('shipper-signup')}>
                  Create Account
                </button>
              </div>
            </div>

            <div className="mh-portal-card">
              <div className="mh-portal-head">
                <span className="mh-portal-ico" aria-hidden="true">
                  <IoCarSportOutline />
                </span>
                <div className="mh-portal-meta">
                  <div className="mh-portal-title">For Carriers</div>
                  <div className="mh-portal-sub">Bid on loads and grow your business</div>
                </div>
              </div>
              <div className="mh-portal-actions">
                <button type="button" className="mh-sheet-row" onClick={() => goAuth('carrier-login')}>
                  Carrier Login
                </button>
                <button type="button" className="mh-sheet-row mh-sheet-row--primary" onClick={() => goAuth('carrier-signup')}>
                  Join as Carrier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileHomeHeader;
