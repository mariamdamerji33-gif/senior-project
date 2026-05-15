const { createClient } = require('@supabase/supabase-js');

/** Strip surrounding quotes/whitespace from .env values (common copy-paste issues). */
function envTrim(v) {
  if (v == null) return '';
  return String(v).trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = envTrim(process.env.SUPABASE_URL);
const anonKey = envTrim(process.env.SUPABASE_ANON_KEY);
const serviceRoleKey = envTrim(process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabasePublic = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function db() {
  return supabaseAdmin || supabasePublic;
}

module.exports = { db, supabaseAdmin, supabaseUrl, serviceRoleConfigured: !!supabaseAdmin };
