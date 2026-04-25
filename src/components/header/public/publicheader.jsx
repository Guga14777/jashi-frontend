import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { IoChevronDown, IoPersonOutline, IoCarSportOutline } from "react-icons/io5";
import { useAuth } from "../../../store/auth-context.jsx";
import useIsMobile from "../../../hooks/use-is-mobile";
import MobileHomeHeader from "../../../pages/home/components/mobile-header";
import "./publicheader.css";

const PublicHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
  const isMobile = useIsMobile();

  const [activeMenu, setActiveMenu] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const headerRef = useRef(null);
  const loginRef = useRef(null);
  const createRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Publish the real rendered header height as a CSS variable so the hero
  // (and any other content that must sit below a fixed header) can clear it
  // regardless of zoom, font loading, or brand-name wrapping.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty('--real-header-height', `${h}px`);
      }
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

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        loginRef.current?.contains(e.target) ||
        createRef.current?.contains(e.target)
      ) {
        return;
      }
      setActiveMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const pendingQuote = sessionStorage.getItem('pendingQuotePayload');
      const authReturnTo = sessionStorage.getItem('authReturnTo');
      const hasAuthModal = location.search.includes('auth=');
      
      if (pendingQuote || authReturnTo || hasAuthModal) {
        console.log('⏭️ [PublicHeader] Skipping redirect - pending shipper flow detected');
        return;
      }
      
      console.log('🔄 [PublicHeader] User is authenticated, redirecting to dashboard...');
      const dashboardPath = user.role === 'carrier' ? '/carrier-dashboard' : '/dashboard';
      
      if (location.pathname === '/') {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, location.pathname, location.search, navigate]);

  const openMenu = (id) => {
    window.clearTimeout(closeTimer.current);
    setActiveMenu(id);
  };

  const closeMenusSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActiveMenu(null), 90);
  };

  const toggleMenu = (id) => {
    setActiveMenu((cur) => (cur === id ? null : id));
  };

  const openShipperLogin = () => {
    console.log('🔵 Opening shipper login');
    setActiveMenu(null);
    navigate(`${location.pathname}?auth=shipper-login`);
  };

  const openShipperSignup = () => {
    console.log('🔵 Opening shipper signup');
    setActiveMenu(null);
    navigate(`${location.pathname}?auth=shipper-signup`);
  };

  const openCarrierLogin = () => {
    console.log('🔵 Opening carrier login');
    setActiveMenu(null);
    navigate(`${location.pathname}?auth=carrier-login`);
  };

  const openCarrierSignup = () => {
    console.log('🔵 Opening carrier signup');
    setActiveMenu(null);
    navigate(`${location.pathname}?auth=carrier-signup`);
  };

  // On mobile, the public marketing chrome is the same simplified header
  // used by the homepage: brand + single "Account" sheet. Prevents the
  // dual login/create-account buttons from cramping the mobile viewport
  // and gives every public page the same navigation pattern.
  if (isMobile) {
    return <MobileHomeHeader />;
  }

  if (isLoading) {
    return (
      <header ref={headerRef} className="pub-header" data-scrolled={isScrolled}>
        <div className="pub-inner">
          <Link to="/" className="pub-brand">
            <span className="pub-badge">
              <img src="/images/logomercury1.png" alt="Jashi Logistics" />
            </span>
            <span className="pub-name">Jashi Logistics</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header ref={headerRef} className="pub-header" data-scrolled={isScrolled}>
      <div className="pub-inner">
        <Link to="/" className="pub-brand">
          <span className="pub-badge">
            <img src="/images/logomercury1.png" alt="Jashi Logistics" />
          </span>
          <span className="pub-name">Jashi Logistics</span>
        </Link>

        <div className="pub-actions">
          {/* Login Dropdown */}
          <div
            className="pub-dd-wrap"
            ref={loginRef}
            onMouseEnter={() => openMenu("login")}
            onMouseLeave={closeMenusSoon}
          >
            <button
              className="pub-btn ghost"
              onClick={() => toggleMenu("login")}
              aria-expanded={activeMenu === "login"}
              aria-haspopup="menu"
            >
              Log in 
              <IoChevronDown className="chev" size={12} />
            </button>

            <div className={`pub-dd ${activeMenu === "login" ? "open" : ""}`} role="menu">
              <button className="pub-dd-item" onClick={openShipperLogin}>
                <IoPersonOutline className="ico" size={18} aria-hidden="true" />
                Shipper login
              </button>
              <button className="pub-dd-item" onClick={openCarrierLogin}>
                <IoCarSportOutline className="ico" size={18} aria-hidden="true" />
                Carrier login
              </button>
            </div>
          </div>

          {/* Create Account Dropdown */}
          <div
            className="pub-dd-wrap"
            ref={createRef}
            onMouseEnter={() => openMenu("create")}
            onMouseLeave={closeMenusSoon}
          >
            <button
              className="pub-btn primary"
              onClick={() => toggleMenu("create")}
              aria-expanded={activeMenu === "create"}
              aria-haspopup="menu"
            >
              Create account 
              <IoChevronDown className="chev" size={12} />
            </button>

            <div className={`pub-dd ${activeMenu === "create" ? "open" : ""}`} role="menu">
              <button className="pub-dd-item" onClick={openShipperSignup}>
                <IoPersonOutline className="ico" size={18} aria-hidden="true" />
                Shipper signup
              </button>
              <button className="pub-dd-item" onClick={openCarrierSignup}>
                <IoCarSportOutline className="ico" size={18} aria-hidden="true" />
                Carrier signup
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;