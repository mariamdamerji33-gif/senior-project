/**
 * Applies supabase/password_reset_columns.sql via direct Postgres (required for DDL).
 * Set DATABASE_URL or SUPABASE_DB_URL in backend/.env:
 * Supabase → Project Settings → Database → URI (direct or pool).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const repoRoot = path.join(__dirname, '..', '..');
const sqlPath = path.join(repoRoot, 'supabase', 'password_reset_columns.sql');

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url || typeof url !== 'string' || !url.trim()) {
    console.error(
      'Missing DATABASE_URL (or SUPABASE_DB_URL).\n'
        + 'In Supabase: Project Settings → Database → Connection string → URI;\n'
        + 'paste it into backend/.env as DATABASE_URL (no quotes), then rerun:\n'
        + '  npm run sql:apply-password-reset --prefix backend',
    );
    process.exit(1);
  }

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const ssl =
    /\.supabase\.co/i.test(url) || String(process.env.DATABASE_SSL || '').toLowerCase() !== 'false'
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new Client({ connectionString: url.trim(), ssl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log('OK: applied supabase/password_reset_columns.sql');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
