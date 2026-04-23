// src/components/booking/auth-redirect.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth-context.jsx';

export default function AuthRedirect({ children }) {
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      const params = new URLSearchParams();
      params.set('redirect', loc.pathname + loc.search);
      // send users to register first so you can test sign up flow
      nav(`/customer/register?${params.toString()}`, { replace: true });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return children;
}
