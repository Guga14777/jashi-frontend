// src/lib/brand.js
// Frontend brand constants. Override per-environment via Vite env vars
// (VITE_COMPANY_NAME, VITE_SUPPORT_EMAIL, VITE_LOGO_URL).

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const COMPANY_NAME = env.VITE_COMPANY_NAME || 'Jashi Logistics';
export const SUPPORT_EMAIL =
  env.VITE_SUPPORT_EMAIL || 'support@jashilogistics.com';
export const LOGO_URL = env.VITE_LOGO_URL || '/images/logomercury1.png';
export const COMPANY_TAGLINE =
  env.VITE_COMPANY_TAGLINE || 'Reliable vehicle shipping, nationwide.';
