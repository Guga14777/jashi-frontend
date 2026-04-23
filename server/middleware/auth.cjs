// server/middleware/auth.cjs
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt.cjs');

/**
 * Authentication Middleware
 *
 * Verifies JWT token from Authorization header.
 * On success, populates req.user, req.userId, req.userEmail, req.userRole, req.userRoles.
 *
 * Usage: router.post('/api/protected', authenticateToken, handler)
 */
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        hint: 'Include Authorization: Bearer YOUR_TOKEN in request headers',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // JWT payloads may carry userId, id, or sub — normalize all three.
    const userId = decoded.userId || decoded.id || decoded.sub;

    req.user = {
      ...decoded,
      id: userId,
      userId,
    };
    req.userId = userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.userRoles = decoded.roles || decoded.role || '';

    next();
  } catch (err) {
    let errorMsg = 'Invalid or expired token';
    if (err.name === 'TokenExpiredError') errorMsg = 'Token has expired';
    else if (err.name === 'JsonWebTokenError') errorMsg = 'Invalid token';

    return res.status(401).json({
      error: errorMsg,
      hint: 'Provide a valid, non-expired JWT token',
    });
  }
}

module.exports = authenticateToken;
