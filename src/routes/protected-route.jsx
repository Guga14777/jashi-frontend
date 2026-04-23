// src/routes/protected-route.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth-context.jsx';

const ProtectedRoute = ({ children, allow = [], roles, role }) => {
  const { isAuthenticated, isLoading, user, token } = useAuth();
  const location = useLocation();

  const allowList = Array.isArray(roles) && roles.length
    ? roles
    : role
    ? [role]
    : allow;

  // Wait for hydration — avoids flash of login page on refresh.
  if (isLoading && !user) return null;

  const intended = `${location.pathname}${location.search || ''}`;
  // Admin-gated routes bounce to a dedicated /admin/login page so the
  // branding and redirect logic stay separate from the shipper modal.
  const needsAdmin = allowList.some((r) => String(r).toUpperCase() === 'ADMIN');
  const loginWithRedirect = needsAdmin
    ? `/admin/login?redirect=${encodeURIComponent(intended)}`
    : `/?auth=shipper-login&redirect=${encodeURIComponent(intended)}`;

  if (!isAuthenticated || !user || !token) {
    return <Navigate to={loginWithRedirect} replace />;
  }

  // Normalize roles — backend may return array or legacy comma-string.
  const rawRoles = user?.roles ?? user?.role ?? [];
  const userRolesList = (Array.isArray(rawRoles) ? rawRoles : String(rawRoles).split(','))
    .map((r) => String(r).trim().toUpperCase())
    .filter(Boolean);

  if (allowList.length > 0) {
    const hasRequiredRole = allowList.some((requiredRole) =>
      userRolesList.includes(String(requiredRole).toUpperCase())
    );

    if (!hasRequiredRole) {
      if (userRolesList.includes('CARRIER')) return <Navigate to="/carrier-dashboard" replace />;
      if (userRolesList.includes('CUSTOMER')) return <Navigate to="/dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allow: PropTypes.arrayOf(PropTypes.string),
  roles: PropTypes.arrayOf(PropTypes.string),
  role: PropTypes.string,
};

export default ProtectedRoute;
