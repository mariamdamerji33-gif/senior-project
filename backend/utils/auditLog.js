const fs = require('fs');
const path = require('path');

const AUDIT_LOG_ENABLED = String(process.env.AUDIT_LOG_ENABLED || 'true').toLowerCase() !== 'false';
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH
  ? path.resolve(process.env.AUDIT_LOG_PATH)
  : path.join(__dirname, '..', 'logs', 'audit.log');

function sanitize(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v);
    return out;
  }
  return value;
}

async function writeAuditLog(event) {
  if (!AUDIT_LOG_ENABLED) return;
  try {
    await fs.promises.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...sanitize(event) }) + '\n';
    await fs.promises.appendFile(AUDIT_LOG_PATH, line, 'utf8');
  } catch {
    // Never block business logic because of audit log write failures.
  }
}

function baseActor(req) {
  return {
    actorId: req?.auth?.sub || null,
    actorRole: req?.auth?.role || null,
    ip: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  };
}

module.exports = { writeAuditLog, baseActor };
