// src/utils/roles.js
// Role detection helpers used by login redirect + nav gating.

/**
 * Normalize a user's roles into an uppercase string array.
 * Handles the three shapes the backend may return:
 *   - array of strings  →  ['CUSTOMER', 'ADMIN']
 *   - comma string      →  'CUSTOMER,ADMIN'
 *   - single role field →  user.role
 */
export function getUserRoles(user) {
  if (!user) return [];
  const raw = user.roles ?? user.role ?? [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',');
  return arr.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
}

export function hasRole(user, role) {
  return getUserRoles(user).includes(String(role).toUpperCase());
}

export const isAdmin = (user) => hasRole(user, 'ADMIN');

/**
 * Resolve the default landing page for a user.
 *
 * NOTE: Admin role alone does NOT send users to /admin — that would
 * override a shipper logging in through the website and dump them into
 * the ops portal unexpectedly. The Admin Portal is reached explicitly
 * via /admin (which itself bounces unauthed visitors to /admin/login).
 *
 * Use this as a *fallback* when no explicit redirect URL is supplied.
 * Login forms should prefer an explicit hardcoded destination that
 * matches the form's role context (customer form → /dashboard, carrier
 * form → /carrier-dashboard, admin login → /admin).
 */
export function resolveRoleHome(user) {
  const roles = getUserRoles(user);
  if (roles.includes('CARRIER') && !roles.includes('CUSTOMER')) return '/carrier-dashboard';
  return '/dashboard';
}
