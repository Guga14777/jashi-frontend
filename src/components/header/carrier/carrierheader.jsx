import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

import { useAuth } from '../../../store/auth-context';
import { isAdmin } from '../../../utils/roles';
import { useNotifications } from '../../../store/notifications-context.jsx';

import {
  IoCarSportOutline, IoCardOutline, IoTrendingUpOutline, IoPersonOutline,
  IoDocumentTextOutline, IoHelpCircleOutline, IoLogOutOutline, IoChevronDown,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';
import { FiBell } from 'react-icons/fi';

import './carrierheader.css';

const CarrierHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount = 0, openPanel } = useNotifications() || {};

  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef(null);
  const avatarBtnRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const headerRef = useRef(null);

  const brandLabel = 'Carrier Portal';

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
    if (user?.firstName) return user.firstName.substring(0, 2).toUpperCase();
    if (user?.companyName) {
      const words = user.companyName.trim().split(/\s+/);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return user.companyName.substring(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.split('@')[0].substring(0, 2).toUpperCase();
    return 'CP';
  };

  const userInitials = getUserInitials();
  const displayName =
    user?.companyName ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName) ||
    'Carrier';
  const userIsAdmin = isAdmin(user);

  // ✅ FIXED: Bell only opens panel, does NOT navigate
  const handleNotificationClick = useCallback(() => {
    if (openPanel) openPanel();
    if (window.analytics?.track) {
      window.analytics.track('carrier_header_notifications_clicked', {
        current_path: location.pathname
      });
    }
  }, [openPanel, location.pathname]);

  const updateDropdownPosition = useCallback(() => {
    if (!showDropdown || !avatarBtnRef.current) return;
    const btnRect = avatarBtnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dropdownWidth = 280;
    const dropdownHeight = 400;

    let top = btnRect.bottom + 8;
    let right = vw - btnRect.right;

    if (top + dropdownHeight > vh) top = Math.max(16, btnRect.top - dropdownHeight - 8);
    if (right + dropdownWidth > vw) right = Math.max(16, vw - dropdownWidth - 16);
    setDropdownPosition({ top, right });
  }, [showDropdown]);

  useEffect(() => {
    updateDropdownPosition();
  }, [updateDropdownPosition]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition);
    };
  }, [showDropdown, updateDropdownPosition]);

  useEffect(() => {
    if (showDropdown && firstMenuItemRef.current) {
      const t = setTimeout(() => firstMenuItemRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown) setShowDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0;
      if (isScrolled !== scrolled) {
        setIsScrolled(scrolled);
        headerRef.current?.setAttribute('data-scrolled', String(scrolled));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  // Publish real header height — same rationale as customer/public headers.
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
    if (!showDropdown) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        avatarBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (event) => {
      const inMenu = dropdownRef.current?.contains(event.target);
      const inBtn = avatarBtnRef.current?.contains(event.target);
      if (!inMenu && !inBtn) {
        setShowDropdown(false);
        avatarBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown]);

  const isCurrentRoute = useCallback((path) => location.pathname === path, [location.pathname]);

  const handleMenuItemClick = async (path, action) => {
    if (window.analytics?.track) {
      window.analytics.track(`carrier_header_${action}_clicked`, {
        current_path: location.pathname,
        destination: path
      });
    }
    setIsLoading(true);
    setShowDropdown(false);
    try {
      navigate(path);
    } finally {
      setTimeout(() => {
        avatarBtnRef.current?.focus();
        setIsLoading(false);
      }, 100);
    }
  };

  const handleBrandClick = () => {
    if (window.analytics?.track) {
      window.analytics.track('carrier_header_logo_clicked', {
        current_path: location.pathname,
        destination: '/carrier-dashboard'
      });
    }
    setShowDropdown(false);
    navigate('/carrier-dashboard');
  };

  const handleLogout = async () => {
    if (window.analytics?.track) {
      window.analytics.track('carrier_header_sign_out_clicked', {
        current_path: location.pathname,
        user_id: user?.id
      });
    }
    setIsLoading(true);
    setShowDropdown(false);
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => setShowDropdown((v) => !v);

  const handleMenuKeyDown = (e) => {
    if (!dropdownRef.current) return;
    const menuItems = dropdownRef.current.querySelectorAll('[role="menuitem"]');
    const items = Array.from(menuItems);
    const currentIndex = items.findIndex((el) => el === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Tab': {
        const first = items[0];
        const last = items[items.length - 1];
        const shift = e.shiftKey;
        if ((shift && document.activeElement === first) || (!shift && document.activeElement === last)) {
          e.preventDefault();
          setShowDropdown(false);
          avatarBtnRef.current?.focus();
        }
        break;
      }
      default:
        break;
    }
  };

  // ✅ Inline style to forcefully remove any ring/outline on avatar button
  const avatarBtnStyle = {
    outline: 'none',
    boxShadow: 'none',
  };

  const dropdown = useMemo(() => {
    if (!showDropdown) return null;
    return createPortal(
      <div
        className="car-dd user-dropdown-menu-portal"
        ref={dropdownRef}
        role="menu"
        id="user-menu"
        aria-labelledby="user-menu-button"
        tabIndex={-1}
        data-testid="carrier-user-dropdown"
        onKeyDown={handleMenuKeyDown}
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 9999
        }}
      >
        <div className="dropdown-header" aria-label={`Signed in as ${displayName}`}>
          <div className="dropdown-company">{displayName}</div>
          {user?.email && <div className="dropdown-email">{user.email}</div>}
        </div>

        {userIsAdmin && (
          <>
            <div className="dropdown-section">
              <button
                className={`dropdown-item dropdown-item-admin ${isCurrentRoute('/admin') ? 'current-route' : ''}`}
                onClick={() => handleMenuItemClick('/admin', 'nav_admin')}
                role="menuitem"
                tabIndex={0}
                data-testid="menuitem-admin-portal"
                type="button"
              >
                <IoShieldCheckmarkOutline className="ico" size={18} aria-hidden="true" />
                Admin Portal
              </button>
            </div>
            <div className="dropdown-divider" />
          </>
        )}

        <div className="dropdown-section">
          <button
            ref={firstMenuItemRef}
            className={`dropdown-item ${isCurrentRoute('/carrier/loads') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/carrier/loads', 'nav_loads')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/carrier/loads') ? 'page' : undefined}
            type="button"
          >
            <IoCarSportOutline className="ico" size={18} aria-hidden="true" />
            My Loads
          </button>

          <button
            className={`dropdown-item ${isCurrentRoute('/payments') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/payments', 'nav_payments')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/payments') ? 'page' : undefined}
            type="button"
          >
            <IoCardOutline className="ico" size={18} aria-hidden="true" />
            Payments
          </button>

          <button
            className={`dropdown-item ${isCurrentRoute('/analytics') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/analytics', 'nav_analytics')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/analytics') ? 'page' : undefined}
            type="button"
          >
            <IoTrendingUpOutline className="ico" size={18} aria-hidden="true" />
            Analytics
          </button>

          <button
            className={`dropdown-item ${isCurrentRoute('/profile') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/profile', 'nav_profile')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/profile') ? 'page' : undefined}
            type="button"
          >
            <IoPersonOutline className="ico" size={18} aria-hidden="true" />
            Profile
          </button>
        </div>

        <div className="dropdown-divider" />

        <div className="dropdown-section">
          <button
            className={`dropdown-item dropdown-item-secondary ${
              isCurrentRoute('/documents') ? 'current-route' : ''
            }`}
            onClick={() => handleMenuItemClick('/documents', 'nav_documents')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/documents') ? 'page' : undefined}
            type="button"
          >
            <IoDocumentTextOutline className="ico" size={18} aria-hidden="true" />
            Documents
          </button>

          <button
            className={`dropdown-item dropdown-item-secondary ${isCurrentRoute('/help') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/help', 'nav_help')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/help') ? 'page' : undefined}
            type="button"
          >
            <IoHelpCircleOutline className="ico" size={18} aria-hidden="true" />
            Help
          </button>
        </div>

        <div className="dropdown-divider" />

        <div className="dropdown-section">
          <button
            className="dropdown-item dropdown-item-signout"
            onClick={handleLogout}
            role="menuitem"
            tabIndex={0}
            disabled={isLoading}
            type="button"
          >
            <IoLogOutOutline className="ico" size={18} aria-hidden="true" />
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>,
      document.body
    );
  }, [showDropdown, dropdownPosition.top, dropdownPosition.right, isCurrentRoute, isLoading, displayName, user?.email, userIsAdmin]);

  return (
    <>
      <header
        ref={headerRef}
        className="car-header"
        role="banner"
        data-scrolled={isScrolled.toString()}
        data-testid="carrier-header"
      >
        <div className="car-inner">
          <button
            className="car-brand"
            onClick={handleBrandClick}
            aria-label="Go to Carrier Dashboard"
            aria-current={isCurrentRoute('/carrier-dashboard') ? 'page' : undefined}
            type="button"
            disabled={isLoading}
          >
            <div className="car-badge" role="img" aria-label="Carrier Portal logo">
              <img
                src="/images/logomercury1.png"
                alt="Mercury Auto Transport Logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.setAttribute('data-fallback', 'true');
                }}
                onLoad={(e) => e.currentTarget.parentElement?.removeAttribute('data-fallback')}
              />
              <span className="badge-fallback" aria-hidden="true">CP</span>
            </div>
            <span className="car-name">{brandLabel}</span>
          </button>

          <div className="car-actions">
            <button
              type="button"
              className="car-header-bell"
              onClick={handleNotificationClick}
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
              title="Open notifications"
            >
              <span className="bell-icon">
                <FiBell />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
            </button>

            <div className="user-dropdown">
              <button
                ref={avatarBtnRef}
                id="user-menu-button"
                className="car-avatar-btn"
                onClick={toggleDropdown}
                aria-label={`User menu for ${displayName}`}
                aria-expanded={showDropdown}
                aria-haspopup="menu"
                aria-controls={showDropdown ? 'user-menu' : undefined}
                title={`Account menu for ${displayName}`}
                type="button"
                disabled={isLoading}
                style={avatarBtnStyle}
              >
                <div className="car-avatar">
                  <span aria-hidden="true">{userInitials}</span>
                </div>
                <IoChevronDown
                  className={`avatar-chevron ${showDropdown ? 'rotated' : ''}`}
                  size={14}
                  aria-hidden="true"
                />
                {isLoading && (
                  <div className="loading-indicator" aria-hidden="true">
                    <div className="loading-spinner" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {dropdown}
    </>
  );
};

export default CarrierHeader;