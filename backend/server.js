const path = require('path');

// Always load backend/.env (works when npm is run from repo root — cwd is not always backend/)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

// Fail-fast for JWT secret in production
const jwtSecret = String(process.env.JWT_SECRET || '').trim();
if (!jwtSecret) {
  const msg =
    'JWT_SECRET is missing in backend/.env. Set a strong random secret. (In production this is required.)';
  if (isProd) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  } else {
    console.warn(`⚠️  ${msg}`);
  }
} else if (isProd && jwtSecret.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
} else if (!isProd && jwtSecret && jwtSecret.length < 32) {
  console.warn('⚠️  JWT_SECRET is shorter than 32 characters. Use a longer random secret before production deploy.');
}

const srk = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  .trim()
  .replace(/^["']|["']$/g, '');
if (srk) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = srk;
  const looksJwt = srk.startsWith('eyJ');
  console.log(
    `✓ SUPABASE_SERVICE_ROLE_KEY loaded (${srk.length} chars${looksJwt ? ', JWT shape' : ' — WARNING: usually starts with eyJ; check you copied the service_role key'})`,
  );
} else {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY is missing or empty in backend/.env — POST writes (progress, reports, sessions, chat) return 500.',
  );
}

if (!String(process.env.SUPABASE_URL || '').trim()) {
  console.warn('⚠️  SUPABASE_URL is missing in backend/.env — API database calls will fail.');
}

const { isSmtpSendConfigured } = require('./utils/smtpMail');
if (!isSmtpSendConfigured()) {
  console.warn(
    'ℹ️  SMTP not fully configured (need SMTP_HOST and either SMTP_FROM or SMTP_USER as an email). Welcome / password emails are skipped until backend/.env is set; restart after edits.',
  );
}

const app = require('./app');

const PORT = process.env.PORT || 5000;
// Bind explicitly to IPv4 so real devices on LAN/hotspot can reach the API.
// (On some Windows setups, Node may bind IPv6-only by default.)
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`🚀 Server running on http://${HOST}:${PORT}`));
