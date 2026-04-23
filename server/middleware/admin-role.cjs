// server/middleware/admin-role.cjs
//
// Sub-role authorization on top of requireAdmin.
//
// Tier model (least → most privilege):
//   ADMIN_SUPPORT  read-only access to everything
//   ADMIN_OPS      read + order write actions (status, reassign, cancel, docs, detention/CNP)
//   ADMIN_SUPER    ops + platform settings + role management
//
// Compatibility: any user with the bare ADMIN role is treated as ADMIN_SUPER.
// That lets existing admin users keep full access without a data migration;
// once you start creating sub-role users, the ADMIN role becomes redundant.

const prisma = require('../db.cjs');

const TIERS = {
  ADMIN_SUPPORT: 1,
  ADMIN_OPS:     2,
  ADMIN_SUPER:   3,
};

function tierFor(rolesString) {
  const roles = String(rolesString || '').toUpperCase();
  // Bare ADMIN implies super (back-compat).
  if (roles.includes('ADMIN_SUPER') || (roles.includes('ADMIN') && !roles.includes('ADMIN_SUPPORT') && !roles.includes('ADMIN_OPS'))) {
    return TIERS.ADMIN_SUPER;
  }
  if (roles.includes('ADMIN_OPS')) return TIERS.ADMIN_OPS;
  if (roles.includes('ADMIN_SUPPORT')) return TIERS.ADMIN_SUPPORT;
  return 0;
}

/**
 * Factory. Returns a middleware that only lets requests through when the
 * caller's sub-role is at or above the required tier.
 *
 *   requireAdminTier('ops')      // ops + super
 *   requireAdminTier('super')    // super only
 *   requireAdminTier('support')  // any admin sub-role or bare ADMIN
 */
function requireAdminTier(minTier) {
  const normalized = {
    support: TIERS.ADMIN_SUPPORT,
    ops:     TIERS.ADMIN_OPS,
    super:   TIERS.ADMIN_SUPER,
  }[String(minTier).toLowerCase()];

  if (!normalized) {
    throw new Error(`requireAdminTier: unknown tier "${minTier}"`);
  }

  return async function tierGuard(req, res, next) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { roles: true, isActive: true },
      });

      if (!user || user.isActive === false) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const userTier = tierFor(user.roles);
      if (userTier < normalized) {
        return res.status(403).json({
          error: 'Insufficient admin privilege',
          required: minTier,
          yourTier: Object.keys(TIERS).find((k) => TIERS[k] === userTier) || 'none',
        });
      }

      // Expose the resolved tier so downstream handlers can branch if needed.
      req.adminTier = userTier;
      next();
    } catch (err) {
      console.error('requireAdminTier error:', err);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireAdminTier, TIERS, tierFor };
