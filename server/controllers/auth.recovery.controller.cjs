// server/controllers/auth.recovery.controller.cjs
// Forgot-password / account-recovery flow:
//   1. /recovery/request  — user provides email or phone → create a 6-digit code, store hash, send via email/SMS stub.
//   2. /recovery/verify   — user submits code → we issue a short-lived resetToken.
//   3. /recovery/reset-password — user submits resetToken + new password → password updated.
//   4. /recovery/resend   — same as request.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../db.cjs');
const { JWT_SECRET } = require('../config/jwt.cjs');
const emailService = require('../services/email.service.cjs');
const brand = require('../config/brand.cjs');

const CODE_TTL_MINUTES = 10;
const RESET_TOKEN_TTL = '15m';
const MAX_ATTEMPTS = 5;

// Link-based flow (new): how long the URL token is valid.
const LINK_TTL_MINUTES = 60;

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function generateUrlToken() {
  // 48 bytes of entropy → 96-char hex string. Not guessable.
  return crypto.randomBytes(48).toString('hex');
}

// --- helpers ---------------------------------------------------------------

function detectIdentifierType(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.includes('@')) return 'email';
  if (/^[\d()\-+\s]+$/.test(trimmed)) return 'phone';
  return null;
}

function normalizeIdentifier(raw, type) {
  if (type === 'email') return String(raw).trim().toLowerCase();
  // Strip all non-digit chars for phone comparison.
  return String(raw).replace(/\D/g, '');
}

function maskIdentifier(value, type) {
  if (type === 'email') {
    const [user, domain] = String(value).split('@');
    const head = user.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  if (type === 'phone') {
    const digits = String(value).replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return `***-***-${last4}`;
  }
  return value;
}

async function findUserByIdentifier(identifier, type) {
  if (type === 'email') {
    return prisma.user.findUnique({ where: { email: identifier } });
  }
  // Phone: try exact match first, then by normalized digits.
  const exact = await prisma.user.findUnique({ where: { phone: identifier } }).catch(() => null);
  if (exact) return exact;

  // Fallback: scan candidates. Phone isn't stored normalized, so we match by digits.
  const candidates = await prisma.user.findMany({
    where: { phone: { contains: identifier.slice(-7) } },
  });
  return candidates.find((u) => String(u.phone).replace(/\D/g, '') === identifier) || null;
}

function generateCode() {
  // Cryptographically strong 6-digit code (000000–999999, zero-padded).
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

async function issueResetCode(user, identifier, identifierType) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  // Invalidate any pending resets for this user before creating a new one.
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordReset.create({
    data: { userId: user.id, codeHash, expiresAt },
  });

  await emailService.sendPasswordResetCode({
    identifier,
    identifierType,
    code,
  });
}

// --- handlers --------------------------------------------------------------

exports.requestCode = async (req, res) => {
  try {
    const { identifier: raw } = req.body;
    const type = detectIdentifierType(raw);

    console.log(`[recovery] request received for: ${raw} (detected type: ${type})`);

    if (!type) {
      return res.status(400).json({ error: 'Please provide a valid email or phone number' });
    }

    const identifier = normalizeIdentifier(raw, type);
    const user = await findUserByIdentifier(identifier, type);

    // Always respond success to the client — we don't leak whether an account
    // exists. Server-side logs tell the dev why no code was sent.
    if (user) {
      console.log(`[recovery] matched user id=${user.id} email=${user.email}; issuing code.`);
      await issueResetCode(user, identifier, type);
    } else {
      console.log(`[recovery] NO USER FOUND for "${identifier}". No code issued. Client will still get a 200 (by design). Register this identifier first or use an existing one.`);
    }

    return res.json({
      success: true,
      identifierType: type,
      maskedIdentifier: maskIdentifier(identifier, type),
    });
  } catch (err) {
    console.error('[recovery] request error:', err);
    return res.status(500).json({ error: 'Failed to send recovery code' });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { identifier: raw, code } = req.body;
    const type = detectIdentifierType(raw);

    if (!type || !code) {
      return res.status(400).json({ error: 'Identifier and code are required' });
    }

    const identifier = normalizeIdentifier(raw, type);
    const user = await findUserByIdentifier(identifier, type);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (reset.attempts >= MAX_ATTEMPTS) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });
      return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    }

    const ok = await bcrypt.compare(String(code), reset.codeHash);

    if (!ok) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Code is valid — burn it immediately, then issue a short-lived reset JWT.
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    const resetToken = jwt.sign(
      { purpose: 'password_reset', userId: user.id, resetId: reset.id },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_TTL }
    );

    return res.json({ success: true, resetToken });
  } catch (err) {
    console.error('Recovery verify error:', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset link expired. Request a new code.' });
    }

    if (payload.purpose !== 'password_reset' || !payload.userId || !payload.resetId) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Confirm the reset record is still the one we verified, and was used recently.
    const reset = await prisma.passwordReset.findUnique({ where: { id: payload.resetId } });
    if (!reset || reset.userId !== payload.userId || !reset.usedAt) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(400).json({ error: 'Invalid reset token' });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, updatedAt: new Date() },
    });

    // Clean up any remaining resets for this user to prevent replay.
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    await prisma.accountEvent.create({
      data: {
        userId: user.id,
        eventType: 'password_reset',
        eventData: { timestamp: new Date().toISOString(), method: 'recovery_code' },
      },
    }).catch((e) => console.error('Failed to log account event:', e));

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Recovery reset-password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

exports.resendCode = async (req, res) => {
  // Same behavior as requestCode — generate a new code, invalidate old ones.
  return exports.requestCode(req, res);
};

// ---------------------------------------------------------------------------
// LINK-BASED FLOW (the one the UI now uses)
//
// POST /api/auth/recovery/request-link  { email }
//   → Always responds 200 with a generic message. If the email matches a
//     user, a reset link is emailed out. We never leak existence.
//
// POST /api/auth/recovery/reset-with-token  { token, newPassword }
//   → Verifies the token hash against PasswordReset, checks expiry, updates
//     the user's bcrypt password, and burns the token.
// ---------------------------------------------------------------------------

const GENERIC_RESPONSE = {
  success: true,
  message:
    'If an account with that email exists, we sent password reset instructions.',
};

exports.requestLink = async (req, res) => {
  // Send the generic response FIRST so no downstream failure (DB, SMTP,
  // anything) can bubble up as a 5xx to the browser. After we respond,
  // the rest of this function is a background job.
  console.log('[RECOVERY] start', { bodyKeys: Object.keys(req.body || {}), path: req.originalUrl });
  console.log('[recovery] request-link: start');

  let email;
  try {
    const rawEmail = (req.body && req.body.email) || '';
    console.log('[RECOVERY] received email', { typeof: typeof rawEmail, length: String(rawEmail).length });
    console.log('[recovery] request-link: received email typeof=', typeof rawEmail);
    if (typeof rawEmail === 'string' && rawEmail.trim()) {
      email = rawEmail.trim().toLowerCase();
    }
  } catch (e) {
    console.error('[RECOVERY] body parse failed', e);
    console.error('[recovery] request-link: body parse failed:', e);
  }

  // Unconditional generic success — matches the public contract.
  if (!res.headersSent) res.json(GENERIC_RESPONSE);

  if (!email) {
    console.log('[recovery] request-link: no email in body; nothing to do.');
    return;
  }

  // ---- Background work starts here ----
  try {
    console.log(`[recovery] request-link: looking up user by email=${email}`);
    let user = null;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (dbErr) {
      console.error('[recovery] user lookup failed:', dbErr);
      return;
    }

    console.log('[RECOVERY] user lookup', { email, found: !!user, userId: user?.id || null });
    if (!user) {
      console.log(`[recovery] request-link: no user for ${email} (generic 200 already sent).`);
      return;
    }
    console.log(`[recovery] request-link: matched user id=${user.id}`);

    // Invalidate any outstanding resets for this user.
    try {
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    } catch (e) {
      console.error('[recovery] invalidate prior resets failed:', e);
    }

    let rawToken;
    let codeHash;
    let expiresAt;
    try {
      rawToken = generateUrlToken();
      codeHash = hashToken(rawToken);
      expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60 * 1000);
      console.log(`[recovery] token generated (len=${rawToken.length}), expiresAt=${expiresAt.toISOString()}`);
    } catch (e) {
      console.error('[recovery] token generation failed:', e);
      return;
    }

    try {
      console.log('[RECOVERY] creating reset token', { userId: user.id, expiresAt: expiresAt.toISOString() });
      await prisma.passwordReset.create({
        data: { userId: user.id, codeHash, expiresAt },
      });
      console.log('[recovery] passwordReset row created');
    } catch (e) {
      console.error('[RECOVERY] token create failed', e);
      console.error('[recovery] passwordReset.create failed:', e);
      return;
    }

    const appUrl = (brand && brand.APP_URL) || 'http://localhost:5177';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ');

    console.log('[RECOVERY] sending email', { to: user.email, resetUrl });
    console.log(`[recovery] dispatching email to ${user.email}`);
    try {
      const result = await emailService.sendPasswordResetLink({
        to: user.email,
        resetUrl,
        recipientName,
      });
      console.log('[RECOVERY] email result', {
        ok: result?.ok,
        stub: result?.stub,
        messageId: result?.messageId || null,
        error: result?.error || null,
      });
      if (result?.stub) {
        console.log(`[recovery] (stub) reset link for ${user.email}: ${resetUrl}`);
      } else if (result?.ok) {
        console.log(`[recovery] reset email sent to ${user.email}`);
      } else {
        console.error(`[recovery] reset email failed for ${user.email}:`, result?.error);
      }
    } catch (e) {
      console.error('[RECOVERY] email failed', e);
      console.error('[recovery] sendPasswordResetLink threw:', e);
    }

    try {
      await prisma.accountEvent.create({
        data: {
          userId: user.id,
          eventType: 'password_reset_requested',
          eventData: {
            method: 'email_link',
            timestamp: new Date().toISOString(),
          },
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });
    } catch (e) {
      console.error('[recovery] account event failed:', e);
    }

    console.log('[recovery] request-link: done');
  } catch (err) {
    // True safety net — we already responded; only log here.
    console.error('[recovery] request-link background error:', err && err.stack ? err.stack : err);
  }
};

exports.resetWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password is required.' });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
    }

    const codeHash = hashToken(token);

    const reset = await prisma.passwordReset.findFirst({
      where: {
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) {
      return res.status(400).json({
        error:
          'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: reset.userId } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset link.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, updatedAt: new Date() },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Burn any other outstanding resets for safety.
      prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null, id: { not: reset.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    await prisma.accountEvent
      .create({
        data: {
          userId: user.id,
          eventType: 'password_reset',
          eventData: {
            method: 'email_link',
            timestamp: new Date().toISOString(),
          },
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
        },
      })
      .catch((e) => console.error('[recovery] account event failed:', e));

    return res.json({
      success: true,
      message: 'Your password has been reset. You can now log in.',
    });
  } catch (err) {
    console.error('[recovery] reset-with-token error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
};

// Utility: verify a token without consuming it (used by the reset page to
// show an "expired link" state before the user types a password).
exports.verifyLink = async (req, res) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) return res.status(400).json({ valid: false });

    const codeHash = hashToken(token);
    const reset = await prisma.passwordReset.findFirst({
      where: {
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return res.json({ valid: Boolean(reset) });
  } catch (err) {
    console.error('[recovery] verify-link error:', err);
    return res.status(500).json({ valid: false });
  }
};
