// server/config/jwt.cjs
// Single source of truth for JWT signing + verification.
// All sign() and verify() calls across the backend must use these constants.

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET) {
  console.warn('[jwt] JWT_SECRET not set — using insecure dev fallback. Set JWT_SECRET in .env for production.');
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
