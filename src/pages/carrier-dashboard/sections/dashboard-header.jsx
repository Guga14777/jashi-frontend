// src/pages/carrier-dashboard/sections/dashboard-header.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth-context";
import "./dashboard-header.css";

const DashboardHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications] = useState(3);
  const scrollTimeoutRef = useRef(null);
  const profileRef = useRef(null);

  const navLinks = [
    { label: "Loads", path: "/carrier/loads" },
    { label: "Documents", path: "/carrier/documents" },
    { label: "Payments", path: "/carrier/payments" },
    { label: "Help", path: "/carrier/help" },
  ];

  // Scroll state
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(
        () => setIsScrolled(window.scrollY > 12),
        100
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Close dropdown on click outside / Esc
  useEffect(() => {
    const onDocClick = (e) => {
      // Check if click is outside the profile wrapper
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setShowProfileMenu(false);
        setIsMobileMenuOpen(false);
      }
    };
    
    if (showProfileMenu) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onEsc);
    }
    
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showProfileMenu]);

  const handleSignOut = useCallback(() => {
    console.log("Sign out clicked!");
    console.log("Logout function:", logout);
    
    if (logout) {
      logout();
      navigate("/");
    } else {
      // Fallback if logout is not available
      console.error("Logout function not available");
      // Clear any stored auth data manually
      localStorage.removeItem("authToken");
      localStorage.removeItem("userType");
      sessionStorage.clear();
      navigate("/");
    }
  }, [logout, navigate]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setShowProfileMenu(false);
  }, []);

  const toggleProfileMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Profile button clicked, current state:", showProfileMenu);
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <>
      <header
        className={`cdh-header ${isScrolled ? "cdh-header--scrolled" : ""}`}
        data-scrolled={isScrolled}
      >
        <div className="cdh-header__inner">
          {/* Logo */}
          <Link
            to="/carrier/loads"
            className="cdh-header__logo-link"
            aria-label="Guga Carrier Portal Home"
          >
            <span className="cdh-header__logo-badge">
              <img
                src="/images/logomercury1.png"
                alt="Guga"
                className="cdh-header__logo-img"
                width="44"
                height="44"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </span>
            <div className="cdh-header__brand-text">
              <span className="cdh-header__company-name">Guga</span>
              <span className="cdh-header__portal-subtitle">Carrier Portal</span>
            </div>
          </Link>

          {/* Nav - Desktop */}
          <nav
            className="cdh-header__nav cdh-desktop-only"
            role="navigation"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`cdh-header__nav-link ${
                  location.pathname === link.path
                    ? "cdh-header__nav-link--active"
                    : ""
                }`}
                aria-current={
                  location.pathname === link.path ? "page" : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions - Desktop */}
          <div className="cdh-header__actions cdh-desktop-only">
            {/* Notifications */}
            <button
              className="cdh-header__icon-btn cdh-header__notification-btn"
              aria-label={`${notifications} notifications`}
              title="Notifications"
              type="button"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications > 0 && (
                <span className="cdh-header__notification-badge">
                  {notifications}
                </span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="cdh-header__profile-wrapper" ref={profileRef}>
              <button
                className="cdh-header__profile-btn"
                onClick={toggleProfileMenu}
                aria-label="Profile menu"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
                type="button"
              >
                <div className="cdh-header__avatar">U</div>
                <svg
                  className={`cdh-header__dropdown-arrow ${
                    showProfileMenu ? "cdh-header__dropdown-arrow--open" : ""
                  }`}
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                >
                  <path
                    d="M2.5 4L5 6.5L7.5 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="cdh-header__dropdown" role="menu">
                  <div className="cdh-header__dropdown-header">
                    <div className="cdh-header__dropdown-company">Account</div>
                  </div>
                  <div className="cdh-header__dropdown-divider" />
                  <Link
                    to="/carrier/profile"
                    className="cdh-header__dropdown-item"
                    onClick={() => setShowProfileMenu(false)}
                    role="menuitem"
                  >
                    <svg className="cdh-header__dropdown-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/carrier/settings"
                    className="cdh-header__dropdown-item"
                    onClick={() => setShowProfileMenu(false)}
                    role="menuitem"
                  >
                    <svg className="cdh-header__dropdown-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
                    </svg>
                    <span>Settings</span>
                  </Link>
                  <div className="cdh-header__dropdown-divider" />
                  <button
                    className="cdh-header__dropdown-item cdh-header__logout"
                    onClick={handleSignOut}
                    role="menuitem"
                    type="button"
                  >
                    <svg className="cdh-header__dropdown-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="cdh-header__mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            type="button"
          >
            <span className="cdh-header__hamburger-line" />
            <span className="cdh-header__hamburger-line" />
            <span className="cdh-header__hamburger-line" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="cdh-mobile-overlay" 
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div className="cdh-mobile-menu">
            <div className="cdh-mobile-menu__content">
              {/* Mobile Navigation Links */}
              <nav className="cdh-mobile-nav">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`cdh-mobile-nav-link ${
                      location.pathname === link.path
                        ? "cdh-mobile-nav-link--active"
                        : ""
                    }`}
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="cdh-mobile-divider" />

              {/* Mobile Account Links */}
              <div className="cdh-mobile-links">
                <Link
                  to="/carrier/profile"
                  className="cdh-mobile-link"
                  onClick={closeMobileMenu}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Profile</span>
                </Link>
                <Link
                  to="/carrier/settings"
                  className="cdh-mobile-link"
                  onClick={closeMobileMenu}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>

              <div className="cdh-mobile-divider" />

              {/* Mobile Sign Out Button */}
              <button
                className="cdh-mobile-signout"
                onClick={handleSignOut}
                type="button"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DashboardHeader;