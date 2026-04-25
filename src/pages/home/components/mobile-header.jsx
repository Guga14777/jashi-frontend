import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoClose } from 'react-icons/io5';

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

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMenuOpen]);

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

            <div className="mh-sheet-section">
              <div className="mh-sheet-section-label">For Shippers</div>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('shipper-login')}>
                <span>Log In</span>
              </button>
              <button type="button" className="mh-sheet-row mh-sheet-row--primary" onClick={() => goAuth('shipper-signup')}>
                <span>Create Account</span>
              </button>
            </div>

            <div className="mh-sheet-divider" aria-hidden="true" />

            <div className="mh-sheet-section">
              <div className="mh-sheet-section-label">For Carriers</div>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('carrier-login')}>
                <span>Carrier Login</span>
              </button>
              <button type="button" className="mh-sheet-row mh-sheet-row--primary" onClick={() => goAuth('carrier-signup')}>
                <span>Join as Carrier</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileHomeHeader;
