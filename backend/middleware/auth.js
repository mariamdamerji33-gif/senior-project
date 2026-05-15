const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { familyLoginBlockedOnWeb } = require('../utils/clientChannel');

const JWT_SECRET = process.env.JWT_SECRET || '';
const AUTH_COOKIE_NAME = String(process.env.AUTH_COOKIE_NAME || 'asp_auth').trim() || 'asp_auth';
const JWT_ISSUER = String(process.env.JWT_ISSUER || '').trim();
const JWT_AUDIENCE = String(process.env.JWT_AUDIENCE || '').trim();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function authFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function authFromCookie(req) {
  const raw = String(req.headers.cookie || '');
  if (!raw) return null;
  const parts = raw.split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    const name = p.slice(0, i).trim();
    if (name !== AUTH_COOKIE_NAME) continue;
    const val = p.slice(i + 1).trim();
    if (!val) return null;
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }
  return null;
}

function jwtVerifyOptions() {
  return {
    algorithms: ['HS256'],
    ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
    ...(JWT_AUDIENCE ? { audience: JWT_AUDIENCE } : {}),
  };
}

function jwtSignOptions() {
  return {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
    ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
    ...(JWT_AUDIENCE ? { audience: JWT_AUDIENCE } : {}),
  };
}

function verifyAuthToken(token) {
  if (!JWT_SECRET) {
    const err = new Error('JWT secret is not configured');
    err.statusCode = 503;
    throw err;
  }
  const payload = jwt.verify(token, JWT_SECRET, jwtVerifyOptions());
  if (!payload || typeof payload !== 'object' || !payload.sub || !payload.email || !payload.role) {
    throw new Error('Invalid token payload');
  }
  return payload;
}

function signAuthToken(user) {
  if (!JWT_SECRET) {
    const err = new Error('JWT secret is not configured');
    err.statusCode = 503;
    throw err;
  }
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    jwtSignOptions(),
  );
}

function requireAuth(req, res, next) {
  try {
    const token = authFromHeader(req) || authFromCookie(req);
    if (!token) return res.status(401).json({ error: 'Missing token' });

    req.auth = verifyAuthToken(token);
    if (familyLoginBlockedOnWeb(req.auth.role, req)) {
      return res.status(403).json({
        error: 'Family accounts must use the mobile app.',
        code: 'FAMILY_USE_MOBILE_APP',
        hint: 'Sign in with Autism School Mobile, not this website.',
      });
    }
    return next();
  } catch (err) {
    if (err?.statusCode === 503) {
      return res.status(503).json({ error: 'Server misconfigured' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/** Super admin may call any role-scoped route (full access). */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (role === 'super_admin') return next();
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  authFromHeader,
  authFromCookie,
  requireAuth,
  requireRole,
  verifyAuthToken,
  signAuthToken,
  JWT_SECRET,
  AUTH_COOKIE_NAME,
};
