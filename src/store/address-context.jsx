// ============================================================
// FILE: src/store/address-context.jsx (NEW FILE)
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context.jsx';
import * as addressApi from '../services/address.api.js';

const AddressContext = createContext(null);

export const useAddresses = () => {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddresses must be used within AddressProvider');
  return ctx;
};

export function AddressProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load addresses when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadAddresses();
    } else {
      setAddresses([]);
    }
  }, [isAuthenticated, token]);

  const loadAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await addressApi.listMyAddresses(token);
      setAddresses(data.items || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (address) => {
    try {
      const data = await addressApi.createAddress(address, token);
      setAddresses([...addresses, data.address]);
      return data.address;
    } catch (err) {
      console.error('Failed to create address:', err);
      throw err;
    }
  };

  const updateAddress = async (addressId, updates) => {
    try {
      const data = await addressApi.updateAddress(addressId, updates, token);
      setAddresses(addresses.map((a) => (a.id === addressId ? data.address : a)));
      return data.address;
    } catch (err) {
      console.error('Failed to update address:', err);
      throw err;
    }
  };

  const removeAddress = async (addressId) => {
    try {
      await addressApi.deleteAddress(addressId, token);
      setAddresses(addresses.filter((a) => a.id !== addressId));
    } catch (err) {
      console.error('Failed to delete address:', err);
      throw err;
    }
  };

  return (
    <AddressContext.Provider
      value={{
        addresses,
        loading,
        error,
        loadAddresses,
        addAddress,
        updateAddress,
        removeAddress,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export default AddressProvider;