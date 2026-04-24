// src/pages/auth/forgot-password.jsx
// Step 1 of link-based password recovery. User enters email; server always
// responds with a generic message (no existence leak). If the email matches,
// the user receives a branded reset link by email.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { validateEmail } from '../../utils/validation';
import { COMPANY_NAME, LOGO_URL, SUPPORT_EMAIL } from '../../lib/brand';
import { apiUrl, API_BASE } from '../../lib/api-url';
import './forgot-password.css';

const GENERIC_MESSAGE =
  'If an account with that email exists, we sent password reset instructions. Please check your inbox (and spam folder).';

async function requestResetLink(email) {
  const resolvedUrl = apiUrl('/api/auth/recovery/request-link');

  // Loud diagnostic logs so we can prove from the browser console
  // whether the request even leaves the page, and where it goes.
  // eslint-disable-next-line no-console
  console.log('[forgot-password] BEFORE fetch →', {
    url: resolvedUrl,
    method: 'POST',
    origin: typeof window !== 'undefined' ? window.location.origin : '(ssr)',
    payload: { email },
  });

  let res;
  try {
    res = await fetch(resolvedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch (networkErr) {
    // Surfaces CORS/DNS/offline/mixed-content failures that otherwise
    // look identical to a successful call.
    // eslint-disable-next-line no-console
    console.error('[forgot-password] fetch THREW (request never completed):', networkErr);
    throw new Error(`Network error: ${networkErr.message}. Check console for details.`);
  }

  // eslint-disable-next-line no-console
  console.log('[forgot-password] AFTER fetch →', {
    finalUrl: res.url,
    status: res.status,
    redirected: res.redirected,
    type: res.type,
  });

  // Server always returns 200 with a generic payload. We don't depend on it.
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}. Please try again.`);
  }
  return res.json();
}

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Print resolved API config once per page load so prod routing issues
  // are visible without opening the Network tab.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[forgot-password] mounted', {
      API_BASE: API_BASE || '(empty → relative / Vercel rewrite)',
      resolved: apiUrl('/api/auth/recovery/request-link'),
      origin: window.location.origin,
    });
  }, []);

  const handleChange = (value) => {
    setEmail(value.trim().toLowerCase());
    setEmailError('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log('[forgot-password] handleSubmit fired', { email, loading });
    if (loading) return;

    if (!email || !validateEmail(email)) {
      // eslint-disable-next-line no-console
      console.warn('[forgot-password] validation blocked submit', { email });
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await requestResetLink(email);
      // eslint-disable-next-line no-console
      console.log('[forgot-password] success response:', result);
      setSubmitted(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[forgot-password] submit failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-brand">
            <img src={LOGO_URL} alt={COMPANY_NAME} />
          </div>

          {!submitted ? (
            <>
              <div className="forgot-password-header">
                <h1>Forgot your password?</h1>
                <p className="forgot-subtitle">
                  Enter the email associated with your {COMPANY_NAME} account and
                  we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="recovery-form" noValidate>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="name@email.com"
                    autoFocus
                    autoComplete="email"
                    required
                    disabled={loading}
                    className={emailError ? 'error' : ''}
                  />
                  {emailError && <div className="field-error">{emailError}</div>}
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Sending link…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>

                <div className="form-footer">
                  <Link to="/?auth=shipper-login" className="back-link">
                    ← Back to login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="recovery-success">
              <h1>Check your email</h1>
              <p className="forgot-subtitle">{GENERIC_MESSAGE}</p>
              <p className="recovery-hint">
                The link will expire in 1 hour. If you don&apos;t see an email
                within a few minutes, check your spam folder.
              </p>

              <div className="form-footer form-footer-stacked">
                <button
                  type="button"
                  className="submit-btn secondary"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                >
                  Use a different email
                </button>
                <Link to="/?auth=shipper-login" className="back-link">
                  ← Back to login
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="help-text">
          <p>
            Having trouble?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
