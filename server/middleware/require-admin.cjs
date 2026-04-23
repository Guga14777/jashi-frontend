// server/middleware/require-admin.cjs
const prisma = require('../db.cjs');

/**
 * Admin authorization middleware.
 *
 * Assumes authMiddleware has already run and populated req.userId.
 * Looks up the current User row and rejects unless roles contains 'ADMIN'
 * and the account is still active. We check the DB (not the JWT) so that
 * revoking admin access takes effect on the next request instead of
 * whenever the token happens to expire.
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { roles: true, isActive: true },
    });

    if (!user || user.isActive === false || !user.roles || !user.roles.includes('ADMIN')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = requireAdmin;
