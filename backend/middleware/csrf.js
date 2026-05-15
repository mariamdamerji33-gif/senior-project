const crypto = require('crypto');

const AUTH_COOKIE_ENABLED = String(process.env.AUTH_COOKIE_ENABLED || '').toLowerCase() === 'true';
const CSRF_COOKIE_NAME = String(process.env.CSRF_COOKIE_NAME || 'asp_csrf').trim() || 'asp_csrf';
const CSRF_HEADER_NAME = String(process.env.CSRF_HEADER_NAME || 'x-csrf-token').trim().toLowerCase() || 'x-csrf-token';

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  if (!raw) return null;
  const parts = raw.split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    const n = p.slice(0, i).trim();
    if (n !== name) continue;
    const v = p.slice(i + 1).trim();
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

function writeCsrfCookie(res, token) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const parts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
    'HttpOnly',
    `Max-Age=${60 * 60 * 8}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function issueCsrfToken(req, res) {
  const existing = readCookie(req, CSRF_COOKIE_NAME);
  const token = existing || crypto.randomBytes(24).toString('hex');
  writeCsrfCookie(res, token);
  return token;
}

function csrfGuard(req, res, next) {
  if (!AUTH_COOKIE_ENABLED) return next();
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
  const pathname = String(req.originalUrl || req.url || '').split('?')[0];
  /** Match both `req.path` (may be mount-stripped) and full pathname when behind `app.use('/api', ...)`. */
  const publicAuthEnds = [
    '/auth/login',
    '/auth/logout',
    '/auth/register',
    '/auth/registration-status',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];
  for (const suf of publicAuthEnds) {
    if (pathname === suf || pathname.endsWith(suf)) return next();
  }

  // If client sent Bearer token explicitly, keep current API behavior (legacy token mode).
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) return next();

  const cookieToken = readCookie(req, CSRF_COOKIE_NAME);
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || '').trim();
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  return next();
}

module.exports = { csrfGuard, issueCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
