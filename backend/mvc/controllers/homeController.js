const path = require('path');
const userModel = require('../models/userModel');
const { serviceRoleConfigured, supabaseUrl } = require('../../config/database');
const { renderHealthHtml, renderApiConsoleHtml } = require('../../lib/htmlSkin');

function frontendOrigin() {
  const explicit = process.env.FRONTEND_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:5173';
}

/** GET / — no DB hit; use `/api/health` to verify Supabase. */
function root(req, res) {
  res.json({
    ok: true,
    service: 'autism-platform-api',
    console: '/console',
    health: '/api/health',
    hint: 'Open /console for links, or /api/health for database status.',
  });
}

async function buildHealthPayload() {
  let database = 'unknown';
  try {
    await userModel.sampleUsers(1);
    database = 'ok';
  } catch {
    database = 'error';
  }
  return {
    ok: true,
    service: 'autism-platform-api',
    database,
    supabaseUrlConfigured: Boolean(supabaseUrl),
    serviceRoleKeyConfigured: serviceRoleConfigured,
    envFileHint: `Backend loads ${path.join(__dirname, '..', '..', '.env')}`,
    ts: new Date().toISOString(),
  };
}

async function health(req, res) {
  const payload = await buildHealthPayload();
  if (String(req.query.view || '').toLowerCase() === 'html') {
    return res.type('html').send(renderHealthHtml(payload));
  }
  res.json(payload);
}

/** Branded HTML page with API links (open in browser at http://localhost:5000/console). */
async function apiConsole(req, res) {
  res.type('html').send(
    renderApiConsoleHtml({
      frontendOrigin: frontendOrigin(),
    }),
  );
}

module.exports = { root, health, apiConsole };
