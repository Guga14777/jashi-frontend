// src/pages/admin/admin-login.jsx
// Dedicated admin login surface. Only way to reach /admin — the shipper and
// carrier modals never redirect here. Keeps admin auth cleanly branded and
// separated from the customer-facing auth flow.

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import { isAdmin } from '../../utils/roles.js';
import './admin-login.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, user, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Where to send the user once they're authed. Defaults to /admin.
  // If the URL carried ?redirect=/admin/... (from ProtectedRoute), respect it
  // but only when it stays under /admin — we won't let this form send users
  // into the customer/carrier dashboards.
  const intended = (() => {
    const r = searchParams.get('redirect');
    if (r && r.startsWith('/admin')) return r;
    return '/admin';
  })();

  // Already authed with admin role? Skip the form, go straight in.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isAdmin(user)) {
      navigate(intended, { replace: true });
    }
  }, [isAuthenticated, user, isLoading, intended, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const result = await login(email.trim(), password, 'admin');

      if (!result?.success) {
        setError(result?.error || 'Invalid email or password.');
        return;
      }

      // Server returned a valid session. Verify the account actually carries
      // admin role — the API doesn't restrict login by role, so a shipper
      // hitting this form would otherwise get a session but 403 on /admin.
      if (!isAdmin(result.user)) {
        setError('This account does not have admin access.');
        return;
      }

      navigate(intended, { replace: true });
    } catch (err) {
      console.error('Admin login exception:', err);
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-panel">
        <div className="admin-login-brand">
          <div className="admin-login-logo">
            <ShieldCheck size={28} />
          </div>
          <h1>Admin Portal</h1>
          <p>Sign in with an admin account to access operations.</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="admin-login-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <label className="admin-login-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          <label className="admin-login-field">
            <span>Password</span>
            <div className="admin-login-password">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="admin-login-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="admin-login-submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'Signing in…' : 'Sign in to Admin Portal'}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/" className="admin-login-secondary">← Back to website</Link>
          <span className="admin-login-hint">
            Not an admin? Use the <Link to="/?auth=shipper-login">Shipper</Link>
            {' '}or{' '}
            <Link to="/?auth=carrier-login">Carrier</Link> login instead.
          </span>
        </div>
      </div>
    </div>
  );
}
