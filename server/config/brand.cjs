// server/config/brand.cjs
// Single source of truth for brand-related values used in emails, headers,
// and any server-rendered content. Override via env vars in production.

const APP_URL =
  process.env.APP_URL ||
  process.env.VITE_APP_URL ||
  'http://localhost:5177';

const COMPANY_NAME = process.env.COMPANY_NAME || 'Jashi Logistics';
const COMPANY_TAGLINE =
  process.env.COMPANY_TAGLINE || 'Reliable vehicle shipping, nationwide.';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@jashilogistics.com';
const FROM_EMAIL =
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  `${COMPANY_NAME} <${SUPPORT_EMAIL}>`;

// Public absolute URL to the logo — used in outgoing emails so the image
// actually loads in Gmail / Outlook / Apple Mail. Defaults to the
// GitHub-hosted copy. Override via LOGO_URL in .env when you move to your
// own CDN / Supabase Storage.
const LOGO_URL =
  process.env.LOGO_URL ||
  'https://raw.githubusercontent.com/Guga14777/logo-host/main/logomercury1.png';

// Treat any localhost-ish URL as "not publicly reachable". Anything else we
// trust as a genuine CDN / prod asset URL.
function isPublicUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    return !(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

const LOGO_IS_PUBLIC = isPublicUrl(LOGO_URL);

const BRAND_PRIMARY = process.env.BRAND_PRIMARY_COLOR || '#0b5fff';
const BRAND_DARK = process.env.BRAND_DARK_COLOR || '#0a1f44';

module.exports = {
  APP_URL: APP_URL.replace(/\/$/, ''),
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SUPPORT_EMAIL,
  FROM_EMAIL,
  LOGO_URL,
  LOGO_IS_PUBLIC,
  BRAND_PRIMARY,
  BRAND_DARK,
};
