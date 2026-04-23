// src/components/auth/carrierloginform.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/auth-context';
import './carrier-login.css';

const CarrierLoginForm = ({ onSuccess, onSwitchToSignup, inModal = false }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(email.trim(), password, 'carrier');

      if (result?.success) {
        // Carrier login — always land on the carrier dashboard. Admin role
        // does NOT override this: admins reach /admin via its dedicated login.
        navigate('/carrier-dashboard', { replace: true });
        if (inModal) onSuccess?.();
      } else {
        setError(result?.error || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Carrier login exception:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="simple-login">
      <form className="simple-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="signup-error-banner" role="alert">{error}</div>}

        <div className="simple-field">
          <label htmlFor="carrier-email">Email address</label>
          <input
            id="carrier-email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="simple-field">
          <label htmlFor="carrier-password">Password</label>
          <div className="simple-password">
            <input
              id="carrier-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="simple-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="simple-forgot">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            disabled={isSubmitting}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className={`simple-submit ${isSubmitting ? 'loading' : ''}`}
          disabled={isSubmitting || !email || !password}
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className="simple-footer">
        <p>
          New to Guga?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={isSubmitting}
          >
            Create Carrier Account
          </button>
        </p>
        <p className="simple-legal">
          By logging in, you agree to Guga&apos;s{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

CarrierLoginForm.propTypes = {
  onSuccess: PropTypes.func,
  onSwitchToSignup: PropTypes.func,
  inModal: PropTypes.bool,
};

export default CarrierLoginForm;
