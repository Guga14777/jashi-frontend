import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth-context.jsx';
import CustomerSignupForm from './customersignupform.jsx';
import CustomerLoginForm from './customerloginform.jsx';
import CarrierSignupForm from './carriersignupform.jsx';
import CarrierLoginForm from './carrierloginform.jsx';
import './global-auth-modal.css';

/**
 * GlobalAuthModal - Handles both SHIPPER and CARRIER auth
 * ✅ FIXED: No longer interferes with form's own redirect logic
 */
function GlobalAuthModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const authMode = searchParams.get('auth');
  const redirectParam = searchParams.get('redirect');

  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ Track if the form itself handled the redirect
  const formHandledRedirect = useRef(false);

  // Determine if shipper or carrier
  const isShipper = authMode === 'shipper-login' || authMode === 'shipper-signup';
  const isCarrier = authMode === 'carrier-login' || authMode === 'carrier-signup';
  const isSignup = authMode === 'shipper-signup' || authMode === 'carrier-signup';

  // ✅ Open/close modal based on auth param
  useEffect(() => {
    if (isShipper || isCarrier) {
      console.log('✅ [MODAL] Opening for:', authMode);
      setIsOpen(true);
      formHandledRedirect.current = false;
    } else {
      setIsOpen(false);
    }
  }, [authMode, isShipper, isCarrier]);

  // ✅ FIXED: Only close modal when authenticated, DON'T redirect
  // The login form handles its own redirect logic
  useEffect(() => {
    if (isAuthenticated && isOpen && !isLoading) {
      console.log('🔐 [MODAL] User authenticated, closing modal');
      console.log('⏭️ [MODAL] NOT redirecting - form handles its own navigation');
      
      // Just close the modal - the form already navigated
      setIsOpen(false);
    }
  }, [isAuthenticated, isOpen, isLoading]);

  const handleClose = () => {
    console.log('❌ [MODAL] Closed by user');
    setIsOpen(false);

    // Navigate to current path without auth params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('auth');
    newParams.delete('redirect');

    const newSearch = newParams.toString();
    const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    
    navigate(newUrl, { replace: true });
  };

  const handleSwitchToLogin = () => {
    const params = new URLSearchParams(searchParams);
    params.set('auth', isCarrier ? 'carrier-login' : 'shipper-login');
    
    const newUrl = `${location.pathname}?${params.toString()}`;
    navigate(newUrl, { replace: true });
  };

  const handleSwitchToSignup = () => {
    const params = new URLSearchParams(searchParams);
    params.set('auth', isCarrier ? 'carrier-signup' : 'shipper-signup');
    
    const newUrl = `${location.pathname}?${params.toString()}`;
    navigate(newUrl, { replace: true });
  };

  // ✅ FIXED: Mark that form handled the redirect
  const handleAuthSuccess = () => {
    console.log('✅ [MODAL] Auth success - form will handle redirect');
    formHandledRedirect.current = true;
    setIsOpen(false);
  };

  // Don't show modal if user is already authenticated
  if (isAuthenticated) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="global-auth-modal-overlay" onClick={handleClose}>
      <div
        className="global-auth-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-modal-close-btn"
          onClick={handleClose}
          aria-label="Close authentication dialog"
          type="button"
        >
          ×
        </button>

        <div className="auth-modal-content">
          <div className="auth-modal-header">
            <span className="auth-modal-eyebrow">
              {isCarrier ? 'Carrier account' : 'Shipper account'}
            </span>
            <h2 className="auth-modal-title">
              {isSignup ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="auth-modal-subtitle">
              {isSignup
                ? isCarrier
                  ? 'Join our network of trusted carriers and start bidding on loads.'
                  : 'Sign up to save offers, book shipments, and track your vehicles.'
                : isCarrier
                ? 'Log in to view available loads and manage your deliveries.'
                : 'Log in to access your saved offers, shipments, and account settings.'}
            </p>
          </div>

          <div className="auth-modal-body">
            {isCarrier ? (
              isSignup ? (
                <CarrierSignupForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToLogin={handleSwitchToLogin}
                  showTitle={false}
                  inModal={true}
                />
              ) : (
                <CarrierLoginForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignup={handleSwitchToSignup}
                  showTitle={false}
                  inModal={true}
                />
              )
            ) : (
              isSignup ? (
                <CustomerSignupForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToLogin={handleSwitchToLogin}
                  showTitle={false}
                  inModal={true}
                />
              ) : (
                <CustomerLoginForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignup={handleSwitchToSignup}
                  showTitle={false}
                  inModal={true}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalAuthModal;