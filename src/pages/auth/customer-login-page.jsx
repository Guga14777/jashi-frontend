import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerLoginForm from '../../components/auth/customerloginform.jsx';
import { useAuth } from '../../store/auth-context.jsx';
import * as quotesApi from '../../services/quotes.api.js';

export default function CustomerLoginPage() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;

      // ⭐ After successful auth, check if there's a quote payload
      const payload = sessionStorage.getItem('quotePayload');

      if (payload) {
        try {
          const data = JSON.parse(payload);
          console.log('✅ Creating draft with payload:', data);

          // Create durable server draft
          const draft = await quotesApi.createDraft(data, token);
          const draftId = draft.id || draft.draftId;

          console.log('✅ Draft created:', draftId);

          // Clean up and redirect to portal
          sessionStorage.removeItem('quotePayload');
          navigate(`/shipper/offer?draftId=${draftId}`, { replace: true });
        } catch (err) {
          console.error('Failed to create draft after login:', err);
          navigate('/dashboard', { replace: true });
        }
      } else {
        // No payload, just go to dashboard
        navigate('/dashboard', { replace: true });
      }
    })();
  }, [isAuthenticated, token, navigate]);

  if (isAuthenticated) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Redirecting...</div>;
  }

  return (
    <div className="auth-page">
      <h2>Log In</h2>
      <CustomerLoginForm />
    </div>
  );
}