// src/services/auth.api.js
import { api } from '../utils/request.js';

export async function register(payload) {
  return api.post('/api/auth/register', payload);
}

export async function login({ email, password, loginAs }) { // ⭐ Accept loginAs
  return api.post('/api/auth/login', { email, password, loginAs });
}

export async function me(token) {
  return api.get('/api/auth/me', token);
}

export async function updateProfile(data, token) {
  return api.put('/api/auth/profile', data, token);
}

export async function updatePassword(data, token) {
  return api.put('/api/auth/password', data, token);
}

export async function forgotPassword(email) {
  return api.post('/api/auth/forgot-password', { email });
}

export async function resetPassword(data) {
  return api.post('/api/auth/reset-password', data);
}