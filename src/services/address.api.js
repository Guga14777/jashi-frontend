// ============================================================
// FILE: src/services/address.api.js (NEW FILE)
// ============================================================

import { api } from '../utils/request.js';

export function listMyAddresses(token) {
  return api.get('/api/addresses', token);
}

export function createAddress(address, token) {
  return api.post('/api/addresses', address, token);
}

export function updateAddress(addressId, updates, token) {
  return api.put(`/api/addresses/${addressId}`, updates, token);
}

export function deleteAddress(addressId, token) {
  return api.delete(`/api/addresses/${addressId}`, token);
}