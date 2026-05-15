/**
 * Creates a super_admin row in `users` if that email does not exist yet.
 * Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (RLS-safe insert).
 *
 * Usage:
 *   cd backend && node scripts/seedSuperAdmin.js
 *
 * Optional env (defaults shown):
 *   SEED_SUPER_ADMIN_EMAIL=admin@example.com
 *   SEED_SUPER_ADMIN_PASSWORD=Admin123456
 *   SEED_SUPER_ADMIN_NAME=Super Admin
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const userModel = require('../mvc/models/userModel');

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error('Missing SUPABASE_URL in backend/.env');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY — inserts often fail with RLS without it.');
    process.exit(1);
  }

  const email = String(process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@example.com')
    .trim()
    .toLowerCase();
  const password = String(process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin123456');
  const name = String(process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin').trim() || 'Super Admin';

  const existing = await userModel.findByEmail(email);
  if (existing) {
    if (existing.role === 'super_admin') {
      console.log(`Super admin already exists: ${email} (role: super_admin)`);
      process.exit(0);
    }
    console.error(`Email ${email} exists with role "${existing.role}". Use another email or update the row in Supabase.`);
    process.exit(1);
  }

  await userModel.createUser({
    name,
    email,
    password,
    role: 'super_admin',
    created_at: new Date().toISOString(),
  });

  console.log('Created super admin user.');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  Log in on the app with Role: Super Admin. Change the password in Supabase after first login if needed.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
