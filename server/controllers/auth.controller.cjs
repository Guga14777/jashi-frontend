// server/controllers/auth.controller.cjs
/**
 * Auth Controller - Multi-Role Support
 * Allows same email/phone for CUSTOMER and CARRIER roles
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db.cjs');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt.cjs');
const { classifyPrismaError } = require('../utils/prisma-error.cjs');

// ============================================================
// ROLE HELPERS
// ✅ FIXED: Supports both array roles and comma-separated string roles
// ============================================================

const normalizeRoles = (rolesValue) => {
  if (!rolesValue) return [];

  if (Array.isArray(rolesValue)) {
    return rolesValue
      .map((r) => String(r).trim().toUpperCase())
      .filter(Boolean);
  }

  if (typeof rolesValue === 'string') {
    return rolesValue
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
  }

  return [];
};

const serializeRoles = (rolesArray, originalValue) => {
  // Preserve original DB shape if possible
  if (Array.isArray(originalValue)) {
    return rolesArray;
  }
  return rolesArray.join(',');
};

const parseRoles = (rolesValue) => normalizeRoles(rolesValue);

const hasRole = (user, role) => {
  const roles = normalizeRoles(user?.roles);
  return roles.includes(String(role).toUpperCase());
};

const addRole = (user, newRole) => {
  const roles = normalizeRoles(user?.roles);
  const roleUpper = String(newRole).toUpperCase();

  if (!roles.includes(roleUpper)) {
    roles.push(roleUpper);
  }

  return serializeRoles(roles, user?.roles);
};

const getPrimaryRole = (rolesValue) => {
  const roles = normalizeRoles(rolesValue);
  return roles[0] || 'CUSTOMER';
};

const getRolesForResponse = (rolesValue) => normalizeRoles(rolesValue);

// ============================================================
// REGISTER
// POST /api/auth/register
// ============================================================
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role = 'CUSTOMER',
      ...carrierData
    } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName', 'phone'],
      });
    }

    const requestedRole = String(role).toUpperCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      const isSameUser =
        String(existingUser.email).toLowerCase() === String(email).toLowerCase() &&
        String(existingUser.phone) === String(phone);

      if (!isSameUser) {
        if (String(existingUser.email).toLowerCase() === String(email).toLowerCase()) {
          return res.status(409).json({
            error: 'Email already registered to a different account'
          });
        }

        if (String(existingUser.phone) === String(phone)) {
          return res.status(409).json({
            error: 'Phone number already registered to a different account'
          });
        }
      }

      if (!existingUser.password) {
        return res.status(500).json({
          error: 'Account password record is missing'
        });
      }

      const isValidPassword = await bcrypt.compare(password, existingUser.password);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'This email is already registered. Please use the correct password or login instead.'
        });
      }

      if (hasRole(existingUser, requestedRole)) {
        return res.status(409).json({
          error: `You already have a ${requestedRole.toLowerCase()} account. Please login instead.`
        });
      }

      const updatedRoles = addRole(existingUser, requestedRole);

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          roles: updatedRoles,
          ...(requestedRole === 'CARRIER' && {
            companyName: carrierData.companyName || existingUser.companyName,
            dotNumber: carrierData.dotNumber || existingUser.dotNumber,
            mcNumber: carrierData.mcNumber || existingUser.mcNumber,
            hasCargoInsurance:
              carrierData.hasCargoInsurance ?? existingUser.hasCargoInsurance ?? false,
          }),
        },
      });

      await prisma.accountEvent.create({
        data: {
          userId: updatedUser.id,
          eventType: 'role_added',
          eventData: {
            newRole: requestedRole,
            allRoles: getRolesForResponse(updatedRoles),
            timestamp: new Date().toISOString()
          },
        },
      }).catch(err => console.error('Failed to log account event:', err));

      await prisma.notification.create({
        data: {
          userId: updatedUser.id,
          type: 'account',
          title: `${requestedRole === 'CARRIER' ? 'Carrier' : 'Shipper'} Account Added!`,
          message: `Your ${requestedRole.toLowerCase()} account has been successfully added to your existing profile.`,
          category: 'account',
          meta: {
            timestamp: new Date().toISOString(),
            newRole: requestedRole
          }
        }
      }).catch(err => console.error('Failed to create notification:', err));

      const token = jwt.sign(
        {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: requestedRole,
          roles: getRolesForResponse(updatedUser.roles)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const { password: _, ...userWithoutPassword } = updatedUser;

      return res.status(200).json({
        success: true,
        message: `${requestedRole === 'CARRIER' ? 'Carrier' : 'Shipper'} account added successfully! You can now access both dashboards.`,
        token,
        user: {
          ...userWithoutPassword,
          role: requestedRole,
          roles: getRolesForResponse(updatedUser.roles)
        },
        roleAdded: true,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const rolesForCreate = ['CUSTOMER', 'CARRIER', 'ADMIN'].includes(requestedRole)
      ? requestedRole
      : 'CUSTOMER';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        roles: rolesForCreate,
        ...(requestedRole === 'CARRIER' && {
          companyName: carrierData.companyName || null,
          dotNumber: carrierData.dotNumber || null,
          mcNumber: carrierData.mcNumber || null,
          hasCargoInsurance: carrierData.hasCargoInsurance ?? false,
        }),
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: requestedRole,
        roles: getRolesForResponse(user.roles)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        ...userWithoutPassword,
        role: requestedRole,
        roles: getRolesForResponse(user.roles)
      },
    });

  } catch (error) {
    const classified = classifyPrismaError(error);
    console.error('[auth.register] failed:', classified.reason, '-', classified.detail, error);

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];

      if (field === 'phone') {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      if (field === 'email') {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    res.status(500).json({
      error: 'Failed to register user',
      reason: classified.reason,
      detail: classified.detail,
      code: classified.code,
    });
  }
};

// ============================================================
// LOGIN
// POST /api/auth/login
// Response is sent before any side-effect writes (account events,
// reactivation update, welcome notification) so logging never blocks
// the login round-trip.
// ============================================================
exports.login = async (req, res) => {
  try {
    const { email, password, loginAs } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'Account password record is missing' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const normalizedUserRoles = normalizeRoles(user.roles);

    if (loginAs) {
      const requestedRole = String(loginAs).toUpperCase().trim();
      const userHasRequestedRole = normalizedUserRoles.includes(requestedRole);

      if (!userHasRequestedRole) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }
    }

    const wasDeactivated = user.isActive === false;

    const roleForToken = loginAs
      ? String(loginAs).toUpperCase().trim()
      : getPrimaryRole(user.roles);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: roleForToken,
        roles: normalizedUserRoles
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = user;

    // Capture request metadata BEFORE sending the response. Express keeps req
    // alive across the async tail, but reading eagerly is the safe pattern.
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'];

    res.json({
      success: true,
      message: wasDeactivated
        ? 'Welcome back! Your account has been reactivated.'
        : 'Login successful',
      token,
      user: {
        ...userWithoutPassword,
        isActive: true,
        role: roleForToken,
        roles: normalizedUserRoles
      },
      reactivated: wasDeactivated
    });

    // ---- Fire-and-forget side effects (after response is sent) ----
    if (wasDeactivated) {
      prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          updatedAt: new Date()
        }
      }).catch(err => console.error('Failed to reactivate user:', err));

      prisma.accountEvent.create({
        data: {
          userId: user.id,
          eventType: 'account_reactivated',
          eventData: {
            timestamp: new Date().toISOString(),
            method: 'login'
          },
        },
      }).catch(err => console.error('Failed to log reactivation event:', err));

      prisma.notification.create({
        data: {
          userId: user.id,
          type: 'account',
          title: 'Welcome Back!',
          message: 'Your account has been reactivated. Welcome back to Jashi Logistics!',
          category: 'account',
          meta: {
            timestamp: new Date().toISOString()
          }
        }
      }).catch(err => console.error('Failed to create welcome notification:', err));
    }

    prisma.accountEvent.create({
      data: {
        userId: user.id,
        eventType: 'login',
        eventData: {
          timestamp: new Date().toISOString(),
          method: 'email',
          reactivated: wasDeactivated,
          loginAs: loginAs || null
        },
        ipAddress,
        userAgent,
      },
    }).catch(err => console.error('Failed to log account event:', err));

  } catch (error) {
    const classified = classifyPrismaError(error);
    console.error('[auth.login] failed:', classified.reason, '-', classified.detail, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to login',
        reason: classified.reason,
        detail: classified.detail,
        code: classified.code,
      });
    }
  }
};

// ============================================================
// GET CURRENT USER
// ============================================================
exports.getMe = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roles: true,
        companyName: true,
        dotNumber: true,
        mcNumber: true,
        hasCargoInsurance: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const primaryRole = getPrimaryRole(user.roles);

    res.json({
      success: true,
      user: {
        ...user,
        role: primaryRole,
        roles: getRolesForResponse(user.roles)
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// ============================================================
// UPDATE PROFILE
// ============================================================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { firstName, lastName, phone, companyName, dotNumber, mcNumber } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(companyName && { companyName }),
        ...(dotNumber && { dotNumber }),
        ...(mcNumber && { mcNumber }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roles: true,
        companyName: true,
        dotNumber: true,
        mcNumber: true,
        hasCargoInsurance: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      },
    });

    await prisma.accountEvent.create({
      data: {
        userId,
        eventType: 'profile_update',
        eventData: { updatedFields: Object.keys(req.body) },
      },
    }).catch(err => console.error('Failed to log account event:', err));

    const primaryRole = getPrimaryRole(updatedUser.roles);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        role: primaryRole,
        roles: getRolesForResponse(updatedUser.roles)
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'Account password record is missing' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.accountEvent.create({
      data: {
        userId,
        eventType: 'password_change',
        eventData: { timestamp: new Date().toISOString() },
      },
    }).catch(err => console.error('Failed to log account event:', err));

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    res.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent',
    });

    if (user) {
      await prisma.accountEvent.create({
        data: {
          userId: user.id,
          eventType: 'password_reset_requested',
          eventData: { timestamp: new Date().toISOString() },
        },
      }).catch(err => console.error('Failed to log account event:', err));
    }

  } catch (error) {
    const classified = classifyPrismaError(error);
    console.error('[auth.forgotPassword] failed:', classified.reason, '-', classified.detail, error);
    res.status(500).json({
      error: 'Failed to process request',
      reason: classified.reason,
      detail: classified.detail,
      code: classified.code,
    });
  }
};

// ============================================================
// RESET PASSWORD
// ============================================================
exports.resetPassword = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Password reset functionality coming soon'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// ============================================================
// VERIFY OTP
// ============================================================
exports.verifyOTP = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'OTP verification coming soon'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// ============================================================
// DEACTIVATE ACCOUNT
// ============================================================
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    await prisma.accountEvent.create({
      data: {
        userId,
        eventType: 'account_deactivated',
        eventData: {
          timestamp: new Date().toISOString(),
          reason: 'user_requested'
        },
      },
    }).catch(err => console.error('Failed to log account event:', err));

    res.json({
      success: true,
      message: 'Account deactivated successfully. You can reactivate by logging in again.'
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
};

// ============================================================
// REACTIVATE ACCOUNT
// ============================================================
exports.reactivateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'Account password record is missing' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isActive !== false) {
      return res.status(400).json({ error: 'Account is already active' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    });

    await prisma.accountEvent.create({
      data: {
        userId: user.id,
        eventType: 'account_reactivated',
        eventData: {
          timestamp: new Date().toISOString()
        },
      },
    }).catch(err => console.error('Failed to log account event:', err));

    const primaryRole = getPrimaryRole(user.roles);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: primaryRole,
        roles: getRolesForResponse(user.roles)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Account reactivated successfully',
      token,
      user: {
        ...userWithoutPassword,
        isActive: true,
        role: primaryRole,
        roles: getRolesForResponse(user.roles)
      },
    });

  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
};

// ============================================================
// DELETE ACCOUNT
// ============================================================
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'Account password record is missing' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = exports;