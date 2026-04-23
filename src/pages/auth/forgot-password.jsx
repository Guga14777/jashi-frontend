// src/pages/auth/forgot-password.jsx
// Step 1 of link-based password recovery. User enters email; server always
// responds with a generic message (no existence leak). If the email matches,
// the user receives a branded reset link by email.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { validateEmail } from '../../utils/validation';
import { COMPANY_NAME, LOGO_URL, SUPPORT_EMAIL } from '../../lib/brand';
import { apiUrl } from '../../lib/api-url';
import './forgot-password.css';

const GENERIC_MESSAGE =
  'If an account with that email exists, we sent password reset instructions. Please check your inbox (and spam folder).';

async function requestResetLink(email) {
  const res = await fetch(apiUrl('/api/auth/recovery/request-link'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  // Server always returns 200 with a generic payload. We don't depend on it.
  if (!res.ok) {
    throw new Error('Something went wrong. Please try again.');
  }
  return res.json();
}

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (value) => {
    setEmail(value.trim().toLowerCase());
    setEmailError('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await requestResetLink(email);
      setSubmitted(true);
    } catch (err) {
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
