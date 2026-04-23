import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth-context.jsx';

export default function PostRegisterRedirect() {
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  let redirect = params.get('redirect');

  // If no explicit redirect but we have a pending quote,
  // send the user straight into the shipper offer flow.
  if (!redirect && typeof window !== 'undefined') {
    const pending = window.sessionStorage.getItem('pendingQuotePayload');
    if (pending) {
      redirect = '/shipper/offer';
    }
  }

  // Fallback if nothing else set
  if (!redirect) {
    redirect = '/shipper';
  }

  useEffect(() => {
    if (isAuthenticated) {
      nav(redirect, { replace: true });
    }
  }, [isAuthenticated, redirect, nav]);

  return null;
}
