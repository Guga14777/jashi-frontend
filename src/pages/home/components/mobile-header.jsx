import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoClose, IoCallOutline, IoPersonOutline, IoCarSportOutline, IoHelpCircleOutline } from 'react-icons/io5';

import './mobile-header.css';

const SUPPORT_PHONE_E164 = '+18001234567';
const SUPPORT_PHONE_LABEL = '1 (800) 123-4567';

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
              <div className="mh-sheet-section-label">Account</div>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('shipper-login')}>
                <IoPersonOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Shipper login</span>
              </button>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('carrier-login')}>
                <IoCarSportOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Carrier login</span>
              </button>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('shipper-signup')}>
                <IoPersonOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Create shipper account</span>
              </button>
              <button type="button" className="mh-sheet-row" onClick={() => goAuth('carrier-signup')}>
                <IoCarSportOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Create carrier account</span>
              </button>
            </div>

            <div className="mh-sheet-section">
              <div className="mh-sheet-section-label">Support</div>
              <a className="mh-sheet-row" href={`tel:${SUPPORT_PHONE_E164}`} onClick={closeMenu}>
                <IoCallOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Call {SUPPORT_PHONE_LABEL}</span>
              </a>
              <Link className="mh-sheet-row" to="/help" onClick={closeMenu}>
                <IoHelpCircleOutline className="mh-sheet-ico" aria-hidden="true" />
                <span>Help center</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileHomeHeader;
