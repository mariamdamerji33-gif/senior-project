const path = require('path');
const { supabaseAdmin } = require('../config/database');

let validated = false;
let validationError = null;

async function validateServiceRoleOnce() {
  if (validated) return { ok: !validationError, error: validationError };
  if (!supabaseAdmin) return { ok: false, error: new Error('MISSING_SERVICE_ROLE') };
  try {
    // Lightweight call to verify the key is accepted.
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (error) throw error;
    validated = true;
    validationError = null;
    return { ok: true, error: null };
  } catch (e) {
    validated = true;
    validationError = e;
    return { ok: false, error: e };
  }
}

function requireServiceRole(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server is not configured for database writes (service role missing or invalid).',
      hint: `Put SUPABASE_SERVICE_ROLE_KEY in ${path.join(__dirname, '..', '.env')} (the service_role secret from Supabase → Project Settings → API). No spaces or quotes around the value. Restart the backend after saving.`,
    });
  }
  Promise.resolve()
    .then(validateServiceRoleOnce)
    .then((r) => {
      if (r.ok) return next();
      const msg = String(r.error?.message || r.error || '');
      return res.status(503).json({
        error: 'Server is not configured for database writes (service role key is invalid).',
        details: msg,
        hint: `Re-copy the service_role key from Supabase → Project Settings → API into ${path.join(__dirname, '..', '.env')} as SUPABASE_SERVICE_ROLE_KEY, then restart the backend.`,
      });
    })
    .catch(() => {
      return res.status(503).json({
        error: 'Server is not configured for database writes (service role check failed).',
        hint: `Re-copy the service_role key from Supabase → Project Settings → API into ${path.join(__dirname, '..', '.env')} as SUPABASE_SERVICE_ROLE_KEY, then restart the backend.`,
      });
    });
}

module.exports = { requireServiceRole };
