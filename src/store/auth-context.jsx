// src/store/auth-context.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Auth from '../services/auth.api.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [isLoading, setIsLoading] = useState(() => {
    const hasToken = !!localStorage.getItem(TOKEN_KEY);
    const hasUser = !!localStorage.getItem(USER_KEY);
    return hasToken && !hasUser;
  });

  const [error, setError] = useState(null);

  const saveSession = (u, t) => {
    setUser(u || null);
    setToken(t || null);
    setError(null);

    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  const register = async (form) => {
    try {
      const payload = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || form.phoneNumber,
        role: form.role || 'customer',
        ...(form.role === 'carrier' && {
          companyName: form.companyName,
          dotNumber: form.dotNumber,
          mcNumber: form.mcNumber,
          hasCargoInsurance: form.hasCargoInsurance,
        }),
      };

      const result = await Auth.register(payload);
      const { user, token, roleAdded } = result;

      if (user.role === 'customer' || user.role === 'CUSTOMER') {
        sessionStorage.removeItem('shipperPortalDraftCache');
        sessionStorage.removeItem('lastQuoteId');
      }

      saveSession(user, token);
      return { success: true, user, token, roleAdded };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password, loginAs = null) => {
    try {
      const response = await Auth.login({ email, password, loginAs });
      const { user, token, reactivated } = response;

      if (user.role === 'customer' || user.role === 'CUSTOMER') {
        sessionStorage.removeItem('shipperPortalDraftCache');
        sessionStorage.removeItem('lastQuoteId');
      }

      saveSession(user, token);

      if (reactivated) sessionStorage.setItem('justReactivated', 'true');

      return { success: true, user, token, reactivated };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const { user: updatedUser, token: newToken } = await Auth.updateProfile(profileData, token);

      const merged = { ...user, ...updatedUser };
      setUser(merged);

      if (newToken && newToken !== token) {
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
      }

      localStorage.setItem(USER_KEY, JSON.stringify(merged));

      return { success: true, user: updatedUser };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updatePassword = async (passwordData) => {
    try {
      await Auth.updatePassword(passwordData, token);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('shipperPortalDraftCache');
    sessionStorage.removeItem('lastQuoteId');
    sessionStorage.removeItem('pendingQuotePayload');
    sessionStorage.removeItem('justReactivated');
    saveSession(null, null);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!token || user) {
          if (mounted) setIsLoading(false);
          return;
        }

        try {
          const { user: fetchedUser } = await Auth.me(token);
          if (mounted) {
            setUser(fetchedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(fetchedUser));
          }
        } catch (fetchError) {
          // Token failed verification — clear session so UI redirects to login.
          if (mounted) {
            setToken(null);
            setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAuthed: !!user && !!token,
        isLoading,
        error,
        register,
        login,
        logout,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
