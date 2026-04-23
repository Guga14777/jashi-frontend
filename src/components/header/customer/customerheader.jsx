// ============================================================
// FILE: src/components/header/customer/customerheader.jsx
// ✅ FIXED: Removed duplicate panel, fixed import
// ============================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

import { useAuth } from '../../../store/auth-context';
import { isAdmin } from '../../../utils/roles';
import { useCustomerNotifications } from '../../../store/customer-notifications-context.jsx';
// ✅ REMOVED: Don't import panel here - it's rendered in CustomerLayout (app.jsx)

import {
  IoCardOutline,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoChevronDown,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';

import { FiBell } from 'react-icons/fi';

import './customerheader.css';

const CustomerHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // ✅ Use the CUSTOMER notifications context (real API)
  const { 
    unreadCount, 
    isPanelOpen, 
    openPanel, 
    closePanel,
    togglePanel,
    refreshNotifications 
  } = useCustomerNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef(null);
  const avatarBtnRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const headerRef = useRef(null);

  const brandLabel = 'Shipper Portal';

  // ✅ Refresh notifications on mount
  useEffect(() => {
    if (refreshNotifications) {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    if (user?.firstName) return user.firstName.substring(0, 2).toUpperCase();
    if (user?.companyName) {
      const words = user.companyName.trim().split(/\s+/);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return user.companyName.substring(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.split('@')[0].substring(0, 2).toUpperCase();
    return 'SP';
  };

  const userInitials = getUserInitials();
  const displayName =
    user?.companyName ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName) ||
    'Shipper';
  const userIsAdmin = isAdmin(user);

  // ✅ FIXED: Use togglePanel for bell click
  const handleNotificationClick = useCallback(() => {
    togglePanel();
  }, [togglePanel]);

  const updateDropdownPosition = useCallback(() => {
    if (!showDropdown || !avatarBtnRef.current) return;
    const btnRect = avatarBtnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dropdownWidth = 280;
    const dropdownHeight = 400;

    let top = btnRect.bottom + 8;
    let right = vw - btnRect.right;

    if (top + dropdownHeight > vh) {
      top = Math.max(16, btnRect.top - dropdownHeight - 8);
    }
    if (right + dropdownWidth > vw) {
      right = Math.max(16, vw - dropdownWidth - 16);
    }
    setDropdownPosition({ top, right });
  }, [showDropdown]);

  useEffect(() => { updateDropdownPosition(); }, [updateDropdownPosition]);

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
      window.analytics.track(`header_${action}_clicked`, {
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
      window.analytics.track('header_logo_clicked', {
        current_path: location.pathname,
        destination: '/dashboard'
      });
    }
    setShowDropdown(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    if (window.analytics?.track) {
      window.analytics.track('header_sign_out_clicked', {
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
      case 'ArrowDown': {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
      case 'Tab': {
        const first = items[0];
        const last = items[items.length - 1];
        const shift = e.shiftKey;
        if (shift && document.activeElement === first) {
          e.preventDefault();
          setShowDropdown(false);
          avatarBtnRef.current?.focus();
        } else if (!shift && document.activeElement === last) {
          e.preventDefault();
          setShowDropdown(false);
          avatarBtnRef.current?.focus();
        }
        break;
      }
      default: {
        break;
      }
    }
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
        data-testid="user-dropdown"
        onKeyDown={handleMenuKeyDown}
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 9999
        }}
      >
        <div className="dropdown-header" aria-label={`Signed in as ${displayName}`}>
          <div className="dropdown-company" data-testid="dropdown-display-name">
            {displayName}
          </div>
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
            className={`dropdown-item ${isCurrentRoute('/dashboard/profile') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/dashboard/profile', 'nav_profile')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/dashboard/profile') ? 'page' : undefined}
            data-testid="menuitem-profile"
            type="button"
          >
            <IoPersonOutline className="ico" size={18} aria-hidden="true" />
            Profile
          </button>

          <button
            className={`dropdown-item ${isCurrentRoute('/dashboard/payments') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/dashboard/payments', 'nav_payments')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/dashboard/payments') ? 'page' : undefined}
            data-testid="menuitem-payments"
            type="button"
          >
            <IoCardOutline className="ico" size={18} aria-hidden="true" />
            Payments
          </button>
        </div>

        <div className="dropdown-divider" />

        <div className="dropdown-section">
          <button
            className={`dropdown-item dropdown-item-secondary ${isCurrentRoute('/dashboard/documents') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/dashboard/documents', 'nav_documents')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/dashboard/documents') ? 'page' : undefined}
            data-testid="menuitem-documents"
            type="button"
          >
            <IoDocumentTextOutline className="ico" size={18} aria-hidden="true" />
            Documents
          </button>

          <button
            className={`dropdown-item dropdown-item-secondary ${isCurrentRoute('/dashboard/help') ? 'current-route' : ''}`}
            onClick={() => handleMenuItemClick('/dashboard/help', 'nav_help')}
            role="menuitem"
            tabIndex={0}
            aria-current={isCurrentRoute('/dashboard/help') ? 'page' : undefined}
            data-testid="menuitem-help"
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
            data-testid="menuitem-signout"
            type="button"
          >
            <IoLogOutOutline className="ico" size={18} aria-hidden="true" />
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>,
      document.body
    );
  }, [
    showDropdown,
    dropdownPosition.top,
    dropdownPosition.right,
    isCurrentRoute,
    isLoading,
    displayName,
    user?.email,
    userIsAdmin
  ]);

  return (
    <>
      <header
        ref={headerRef}
        className="car-header"
        role="banner"
        data-scrolled={isScrolled.toString()}
        data-testid="customer-header"
      >
        <div className="car-inner">
          <button
            className="car-brand"
            onClick={handleBrandClick}
            aria-label="Go to Customer Dashboard"
            aria-current={isCurrentRoute('/dashboard') ? 'page' : undefined}
            data-testid="brand-button"
            type="button"
            disabled={isLoading}
          >
            <div className="car-badge" role="img" aria-label="Shipper Portal logo">
              <img
                src="/images/logomercury1.png"
                alt="Mercury Auto Transport Logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.setAttribute('data-fallback', 'true');
                }}
                onLoad={(e) => {
                  e.currentTarget.parentElement?.removeAttribute('data-fallback');
                }}
              />
              <span className="badge-fallback" aria-hidden="true">SP</span>
            </div>
            <span className="car-name">{brandLabel}</span>
          </button>

          <div className="car-actions">
            <button
              type="button"
              className={`car-header-bell ${isPanelOpen ? 'active' : ''}`}
              onClick={handleNotificationClick}
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
              aria-expanded={isPanelOpen}
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
                data-testid="avatar-button"
                type="button"
                disabled={isLoading}
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
      
      {/* ✅ REMOVED: Panel is now rendered in CustomerLayout (app.jsx) */}
      {/* <CustomerNotificationPanel /> */}
    </>
  );
};

export default CustomerHeader;