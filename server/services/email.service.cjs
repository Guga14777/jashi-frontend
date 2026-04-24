// server/services/email.service.cjs
// Real email delivery via SMTP (nodemailer). If SMTP env vars are not set,
// falls back to a console stub so development keeps working.
//
// Provider-agnostic — works with Gmail, Resend SMTP, Brevo, SendGrid, SES,
// Postmark, Mailgun, or any other SMTP server.

const nodemailer = require('nodemailer');
const brand = require('../config/brand.cjs');

// Logo rendering: ALWAYS a standard <img src="..."> pointing at a public
// absolute URL. No CIDs, no MIME attachments, no text fallback. If you
// need to move the logo to a different CDN, set LOGO_URL in .env.

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE =
  process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

let transporter = null;
let transporterVerified = false;

function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

// Log current mode once on module load so it's obvious from the very first
// server boot whether emails will actually go out.
console.log('[EMAIL] smtp config', {
  host: SMTP_HOST || '(empty)',
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  user: SMTP_USER || '(empty)',
  hasPass: !!SMTP_PASS,
  mode: hasSmtpConfig() ? 'REAL' : 'STUB',
});
if (hasSmtpConfig()) {
  console.log(
    `[email] Mode: REAL SMTP  (host=${SMTP_HOST}:${SMTP_PORT} secure=${SMTP_SECURE} user=${SMTP_USER})`
  );
} else {
  console.log(
    '[email] Mode: STUB  — SMTP_HOST/SMTP_USER/SMTP_PASS not set. Emails will be printed to the server terminal, not delivered to inboxes.'
  );
}

function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // Verify once at startup — surfaces auth/host issues immediately in logs.
  transporter
    .verify()
    .then(() => {
      transporterVerified = true;
      console.log(`[email] SMTP ready (${SMTP_HOST}:${SMTP_PORT})`);
    })
    .catch((err) => {
      console.error('[email] SMTP verification failed:', err.message);
    });

  return transporter;
}

// ---------------------------------------------------------------------------
// Branded HTML template (mobile-friendly, no external CSS)
// ---------------------------------------------------------------------------

function renderPasswordResetEmail({ resetUrl, recipientName }) {
  const hello = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi there,';
  const year = new Date().getFullYear();
  const primary = brand.BRAND_PRIMARY;
  const dark = brand.BRAND_DARK;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Reset your ${escapeHtml(brand.COMPANY_NAME)} password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f36;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      Use this link to reset your ${escapeHtml(brand.COMPANY_NAME)} password. It expires in 1 hour.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(10,31,68,0.06);overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #eef1f7;" align="center">
                <img src="${escapeAttr(brand.LOGO_URL)}" alt="${escapeAttr(brand.COMPANY_NAME)}" width="120" style="display:block; margin:0 auto 16px; width:120px; max-width:120px; height:auto; border:0; outline:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:${dark};font-weight:700;">
                  Reset your password
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#384257;">
                  ${hello}
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#384257;">
                  We received a request to reset the password for your ${escapeHtml(brand.COMPANY_NAME)} account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px auto;">
                  <tr>
                    <td align="center" bgcolor="${primary}" style="border-radius:8px;">
                      <a href="${escapeAttr(resetUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${primary};">
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#6b7487;">
                  Button not working? Paste this link into your browser:
                </p>
                <p style="margin:0 0 24px 0;font-size:13px;line-height:1.5;word-break:break-all;">
                  <a href="${escapeAttr(resetUrl)}" style="color:${primary};text-decoration:underline;">${escapeHtml(resetUrl)}</a>
                </p>
                <div style="margin:24px 0;padding:16px;background-color:#f8f9fc;border-left:3px solid ${primary};border-radius:4px;">
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#384257;">
                    <strong style="color:${dark};">Didn't request this?</strong><br />
                    You can safely ignore this email - your password won't change unless you click the link above. For extra security, consider changing your password if you suspect unauthorized access.
                  </p>
                </div>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#384257;">
                  Need help? Contact us at
                  <a href="mailto:${escapeAttr(brand.SUPPORT_EMAIL)}" style="color:${primary};text-decoration:underline;">${escapeHtml(brand.SUPPORT_EMAIL)}</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #eef1f7;background-color:#fafbfd;">
                <p style="margin:0 0 4px 0;font-size:12px;line-height:1.5;color:#6b7487;">
                  ${escapeHtml(brand.COMPANY_NAME)} - ${escapeHtml(brand.COMPANY_TAGLINE)}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8b93a7;">
                  &copy; ${year} ${escapeHtml(brand.COMPANY_NAME)}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${hello}`,
    '',
    `We received a request to reset the password for your ${brand.COMPANY_NAME} account.`,
    'Use the link below to choose a new password. This link expires in 1 hour.',
    '',
    resetUrl,
    '',
    `If you didn't request this, you can safely ignore this email - your password won't change.`,
    '',
    `Need help? Contact ${brand.SUPPORT_EMAIL}.`,
    '',
    `The ${brand.COMPANY_NAME} team`,
  ].join('\n');

  return { html, text };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

// ---------------------------------------------------------------------------
// Low-level senders
// ---------------------------------------------------------------------------

async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const tx = getTransporter();
  console.log('[EMAIL] sending', { to, from: brand.FROM_EMAIL, subject, hasHtml: !!html, hasText: !!text, stubMode: !tx });

  if (!tx) {
    // Loud, impossible-to-miss banner so nobody thinks an email was sent.
    const missing = [
      !SMTP_HOST && 'SMTP_HOST',
      !SMTP_USER && 'SMTP_USER',
      !SMTP_PASS && 'SMTP_PASS',
    ]
      .filter(Boolean)
      .join(', ');

    console.log('');
    console.log('████████████████████████████████████████████████████████████████');
    console.log('██                                                            ██');
    console.log('██   ⚠️   EMAIL NOT SENT — STUB MODE (no SMTP configured)      ██');
    console.log('██                                                            ██');
    console.log('████████████████████████████████████████████████████████████████');
    console.log(`   To:       ${to}`);
    console.log(`   Subject:  ${subject}`);
    console.log(`   From:     ${brand.FROM_EMAIL}`);
    console.log(`   Missing:  ${missing || '(none detected — unexpected)'}`);
    console.log('   Add these to .env to turn real email ON:');
    console.log('     SMTP_HOST=smtp.resend.com');
    console.log('     SMTP_PORT=465');
    console.log('     SMTP_SECURE=true');
    console.log('     SMTP_USER=resend          # (or your provider login)');
    console.log('     SMTP_PASS=<api key>');
    console.log(`     EMAIL_FROM=${brand.COMPANY_NAME} <you@your-verified-domain.com>`);
    console.log('────────────────────────────────────────────────────────────────');
    if (text) {
      console.log('   Plain-text body below (copy the link to continue testing):');
      console.log('');
      console.log(text);
    }
    console.log('████████████████████████████████████████████████████████████████');
    console.log('');
    return { ok: true, stub: true };
  }

  try {
    const info = await tx.sendMail({
      from: brand.FROM_EMAIL,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || brand.SUPPORT_EMAIL,
      attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
    });
    console.log('[EMAIL] delivered', { to, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });
    console.log(
      `[email] ✅ delivered to ${to} (messageId=${info.messageId}, response="${info.response || ''}")`
    );
    if (Array.isArray(info.accepted) && info.accepted.length) {
      console.log(`[email]    accepted: ${info.accepted.join(', ')}`);
    }
    if (Array.isArray(info.rejected) && info.rejected.length) {
      console.warn(`[email]    rejected: ${info.rejected.join(', ')}`);
    }
    return { ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (err) {
    console.error('[EMAIL] failed', { to, code: err.code, command: err.command, response: err.response, message: err.message });
    // Full diagnostic dump — we want the cause visible.
    console.error('');
    console.error('████████████████████████████████████████████████████████████████');
    console.error('██   ❌   SMTP SEND FAILED                                     ██');
    console.error('████████████████████████████████████████████████████████████████');
    console.error(`   Host/Port:  ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);
    console.error(`   User:       ${SMTP_USER}`);
    console.error(`   To:         ${to}`);
    console.error(`   From:       ${brand.FROM_EMAIL}`);
    console.error(`   Code:       ${err.code || '(none)'}`);
    console.error(`   Command:    ${err.command || '(none)'}`);
    console.error(`   Response:   ${err.response || '(none)'}`);
    console.error(`   Message:    ${err.message}`);
    if (err.stack) console.error(err.stack);
    console.error('████████████████████████████████████████████████████████████████');
    return { ok: false, error: err.message, code: err.code };
  }
}

async function sendSMS({ to, text }) {
  console.log('\n========== [SMS STUB] ==========');
  console.log(`To:   ${to}`);
  console.log(`Body: ${text}`);
  console.log('================================\n');
  return { ok: true, stub: true };
}

// ---------------------------------------------------------------------------
// High-level helpers used by controllers
// ---------------------------------------------------------------------------

async function sendPasswordResetLink({ to, resetUrl, recipientName }) {
  const { html, text } = renderPasswordResetEmail({ resetUrl, recipientName });
  console.log(`[email] logo url=${brand.LOGO_URL}`);
  // Attachment-free by contract: the template references the logo via an
  // absolute https URL. Nothing is attached to the MIME message.
  return sendEmail({
    to,
    subject: `Reset your ${brand.COMPANY_NAME} password`,
    html,
    text,
  });
}

// Legacy: code-based reset (kept for backward compatibility with the old
// /api/auth/recovery/request OTP flow). New flows should use sendPasswordResetLink.
async function sendPasswordResetCode({ identifier, identifierType, code }) {
  console.log('');
  console.log('########################################################');
  console.log(`##   RESET CODE: ${code}                              ##`);
  console.log(`##   FOR:        ${String(identifier).padEnd(36)} ##`);
  console.log('##   EXPIRES IN: 10 minutes                           ##');
  console.log('########################################################');
  console.log('');

  const subject = `Your ${brand.COMPANY_NAME} password reset code`;
  const text = `Your ${brand.COMPANY_NAME} password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this message.`;

  if (identifierType === 'email') {
    return sendEmail({ to: identifier, subject, text });
  }
  return sendSMS({ to: identifier, text });
}

module.exports = {
  sendEmail,
  sendSMS,
  sendPasswordResetCode,
  sendPasswordResetLink,
  renderPasswordResetEmail,
  hasSmtpConfig,
};
