// ============================================================
// FILE: src/pages/admin/adminheader.jsx
// Professional admin header - logo on blue, white nav links
// ============================================================

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth-context.jsx';
import './adminheader.css';

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        <div className="admin-header-logo">
          <div className="admin-logo-circle">
            <img 
              src="/images/logomercury1.png" 
              alt="Guga Auto Transport" 
            />
          </div>
          <span className="admin-header-title">Admin Portal</span>
        </div>

        <nav className="admin-header-nav">
          <NavLink
            to="/admin/orders"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Orders
          </NavLink>
          <NavLink
            to="/admin/documents"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Documents
          </NavLink>
          <NavLink
            to="/admin/customers"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Customers
          </NavLink>
          <NavLink
            to="/admin/carriers"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Carriers
          </NavLink>
          <NavLink
            to="/admin/analytics"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Analytics
          </NavLink>
          <NavLink
            to="/admin/activity"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Activity
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Settings
          </NavLink>
        </nav>

        <div className="admin-header-user">
          <span className="admin-user-name">{user?.firstName || 'Admin'}</span>
          <button onClick={handleLogout} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;