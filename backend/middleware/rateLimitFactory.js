/**
 * Friendly defaults for demos: skip rate limiting in development unless FORCE_RATE_LIMIT=true.
 * Production: always enforced unless DISABLE_API_RATE_LIMIT=true (never on public-facing deploy).
 */
const rateLimit = require('express-rate-limit');

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function bypassRateLimits() {
  if (String(process.env.DISABLE_API_RATE_LIMIT || '').toLowerCase() === 'true') return true;
  if (!isProd && String(process.env.FORCE_RATE_LIMIT || '').toLowerCase() !== 'true') return true;
  return false;
}

function createRateLimiter(options) {
  if (bypassRateLimits()) return (req, res, next) => next();
  return rateLimit(options);
}

module.exports = { createRateLimiter, bypassRateLimits, isProd };
