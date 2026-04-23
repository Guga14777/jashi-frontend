// src/pages/auth/reset-password.jsx
// Step 2 of link-based password recovery. User lands here from the branded
// email link with ?token=<hex>. They set a new password. On success, we send
// them back to the login screen.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '../../utils/validation';
import { COMPANY_NAME, LOGO_URL, SUPPORT_EMAIL } from '../../lib/brand';
import { apiUrl } from '../../lib/api-url';
import './reset-password.css';

const PASSWORD_RULES = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUpperCase', label: 'One uppercase letter' },
  { key: 'hasLowerCase', label: 'One lowercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSpecialChar', label: 'One special character' },
];

async function verifyToken(token) {
  const res = await fetch(
    apiUrl(`/api/auth/recovery/verify-link?token=${encodeURIComponent(token)}`)
  );
  if (!res.ok) return { valid: false };
  return res.json();
}

async function submitReset(token, newPassword) {
  const res = await fetch(apiUrl('/api/auth/recovery/reset-with-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not reset your password.');
  }
  return data;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [tokenState, setTokenState] = useState('checking'); // checking | valid | invalid
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rules = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = rules.isValid && passwordsMatch && !loading;

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setTokenState('invalid');
      return;
    }
    verifyToken(token).then((result) => {
      if (cancelled) return;
      setTokenState(result?.valid ? 'valid' : 'invalid');
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rules.isValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await submitReset(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/?auth=shipper-login&reset=success', { replace: true });
      }, 2200);
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
      // If the server says the token is dead, flip the UI state so the user
      // can request a new one.
      if (/expired|invalid/i.test(err.message || '')) {
        setTokenState('invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-brand">
            <img src={LOGO_URL} alt={COMPANY_NAME} />
          </div>

          {tokenState === 'checking' && (
            <div className="reset-loading">
              <span className="spinner" />
              <p>Verifying your reset link…</p>
            </div>
          )}

          {tokenState === 'invalid' && !success && (
            <div className="reset-invalid">
              <h1>This link won&apos;t work</h1>
              <p className="reset-subtitle">
                Your password reset link is invalid or has expired. Reset links
                are single-use and expire after 1 hour for your security.
              </p>
              <Link to="/forgot-password" className="submit-btn">
                Request a new link
              </Link>
              <div className="form-footer">
                <Link to="/?auth=shipper-login" className="back-link">
                  ← Back to login
                </Link>
              </div>
            </div>
          )}

          {tokenState === 'valid' && !success && (
            <>
              <div className="reset-password-header">
                <h1>Set a new password</h1>
                <p className="reset-subtitle">
                  Choose a strong password you haven&apos;t used before.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="recovery-form" noValidate>
                <div className="form-group">
                  <label htmlFor="new-password">New password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      autoFocus
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    className={
                      confirm && passwordsMatch
                        ? 'success'
                        : confirm && !passwordsMatch
                          ? 'error'
                          : ''
                    }
                  />
                  {confirm && !passwordsMatch && (
                    <div className="field-error">Passwords do not match.</div>
                  )}
                </div>

                <ul className="password-rules-list">
                  {PASSWORD_RULES.map((rule) => (
                    <li
                      key={rule.key}
                      className={rules[rule.key] ? 'met' : 'unmet'}
                    >
                      <span className="rule-dot" aria-hidden="true" />
                      {rule.label}
                    </li>
                  ))}
                </ul>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Saving…
                    </>
                  ) : (
                    'Save new password'
                  )}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="reset-success">
              <h1>Password updated</h1>
              <p className="reset-subtitle">
                Your {COMPANY_NAME} password has been changed. Redirecting you
                to login…
              </p>
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

export default ResetPassword;
