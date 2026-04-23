// src/components/auth/customerloginform.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/auth-context';
import { api } from '../../utils/request';
import './customer-login.css';

const CustomerLoginForm = ({ onSuccess, onSwitchToSignup, showTitle = true, inModal = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
      const result = await login(email.trim(), password, 'customer');

      if (!result?.success) {
        setError(result?.error || 'Invalid email or password.');
        return;
      }

      const urlRedirect = searchParams.get('redirect');
      const returnTo = sessionStorage.getItem('authReturnTo');
      const pendingQuoteStr = sessionStorage.getItem('pendingQuotePayload');

      // URL redirect param takes priority (except when it points at shipper flow).
      if (urlRedirect && !urlRedirect.includes('/shipper')) {
        sessionStorage.removeItem('authReturnTo');
        navigate(urlRedirect, { replace: true });
        if (inModal) onSuccess?.();
        return;
      }

      // Pending quote: create it server-side, then redirect to shipper portal with quoteId.
      if (returnTo && returnTo.includes('/shipper') && pendingQuoteStr && result.token) {
        try {
          const pendingQuote = JSON.parse(pendingQuoteStr);

          // Clear pending quote immediately to prevent the quote-widget useEffect
          // from racing us and creating a duplicate.
          sessionStorage.removeItem('pendingQuotePayload');
          sessionStorage.removeItem('authReturnTo');

          const quotePayload = {
            fromZip: pendingQuote.fromZip,
            toZip: pendingQuote.toZip,
            miles: pendingQuote.miles,
            vehicle: pendingQuote.vehicle,
            vehicles: pendingQuote.vehicles,
            transportType: pendingQuote.transportType,
            offer: pendingQuote.offer,
            likelihood: pendingQuote.likelihood,
            marketAvg: pendingQuote.marketAvg,
            recommendedMin: pendingQuote.recommendedMin,
            recommendedMax: pendingQuote.recommendedMax,
            source: 'quote-widget',
          };

          const createdQuote = await api.post('/api/quotes', quotePayload, result.token);
          const savedQuoteId = createdQuote?.quote?.id || createdQuote?.id;

          if (savedQuoteId) {
            sessionStorage.setItem('lastQuoteId', savedQuoteId);

            const params = new URLSearchParams();
            params.set('quoteId', savedQuoteId);
            params.set('fromZip', pendingQuote.fromZip);
            params.set('toZip', pendingQuote.toZip);
            params.set('miles', `${pendingQuote.miles}`);
            params.set('offer', `${pendingQuote.offer}`);
            params.set('transportType', pendingQuote.transportType);
            params.set('likelihood', `${pendingQuote.likelihood}`);
            params.set('vehicle', pendingQuote.vehicle);
            params.set('marketAvg', `${pendingQuote.marketAvg}`);
            params.set('recommendedMin', `${pendingQuote.recommendedMin}`);
            params.set('recommendedMax', `${pendingQuote.recommendedMax}`);

            navigate(`/shipper/offer?${params.toString()}`, { replace: true });
            if (inModal) onSuccess?.();
            return;
          }
        } catch (quoteErr) {
          console.error('Failed to create pending quote:', quoteErr);
          // Fall through to default redirect.
        }
      }

      // Shipper login — always land on the customer dashboard. Admin role
      // does NOT override this: admins reach /admin via its dedicated login,
      // not by hijacking the normal website login.
      if (returnTo) {
        sessionStorage.removeItem('authReturnTo');
        navigate(returnTo, { replace: true });
      } else if (urlRedirect) {
        navigate(urlRedirect, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

      if (inModal) onSuccess?.();
    } catch (err) {
      console.error('Customer login exception:', err);
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
          <label htmlFor="customer-email">Email address</label>
          <input
            id="customer-email"
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
          <label htmlFor="customer-password">Password</label>
          <div className="simple-password">
            <input
              id="customer-password"
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
            Create Shipper Account
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

CustomerLoginForm.propTypes = {
  onSuccess: PropTypes.func,
  onSwitchToSignup: PropTypes.func,
  showTitle: PropTypes.bool,
  inModal: PropTypes.bool,
};

export default CustomerLoginForm;
