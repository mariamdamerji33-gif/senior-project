/**
 * Creates one user for each role (super_admin, manager, therapist, parent) if missing.
 * Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Optional env overrides:
 *   SEED_SCHOOL_ADMIN_EMAIL=schooladmin@asp.com
 *   SEED_SCHOOL_ADMIN_PASSWORD=AspAdmin123
 *   SEED_COORDINATOR_EMAIL=coordinator@asp.com
 *   SEED_COORDINATOR_PASSWORD=AspCoord123
 *   SEED_TEACHER_EMAIL=teacher@asp.com
 *   SEED_TEACHER_PASSWORD=AspTeach123
 *   SEED_FAMILY_EMAIL=family@asp.com
 *   SEED_FAMILY_PASSWORD=AspFamily123
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const userModel = require('../mvc/models/userModel');

async function ensureUser({ name, email, password, role }) {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) throw new Error('seed user email is required');

  const existing = await userModel.findByEmail(emailNorm);
  if (existing) {
    console.log(`✓ exists: ${emailNorm} (role: ${existing.role})`);
    return { email: emailNorm, password: null, created: false };
  }

  await userModel.createUser({
    name: String(name || '').trim() || null,
    email: emailNorm,
    password: String(password || ''),
    role,
    created_at: new Date().toISOString(),
  });

  console.log(`+ created: ${emailNorm} (role: ${role})`);
  return { email: emailNorm, password: String(password || ''), created: true };
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error('Missing SUPABASE_URL in backend/.env');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY — inserts often fail with RLS without it.');
    process.exit(1);
  }

  const out = [];

  out.push(
    await ensureUser({
      name: 'School Admin',
      email: process.env.SEED_SCHOOL_ADMIN_EMAIL || 'schooladmin@asp.com',
      password: process.env.SEED_SCHOOL_ADMIN_PASSWORD || 'AspAdmin123',
      role: 'super_admin',
    }),
  );
  out.push(
    await ensureUser({
      name: 'Coordinator',
      email: process.env.SEED_COORDINATOR_EMAIL || 'coordinator@asp.com',
      password: process.env.SEED_COORDINATOR_PASSWORD || 'AspCoord123',
      role: 'manager',
    }),
  );
  out.push(
    await ensureUser({
      name: 'Teacher',
      email: process.env.SEED_TEACHER_EMAIL || 'teacher@asp.com',
      password: process.env.SEED_TEACHER_PASSWORD || 'AspTeach123',
      role: 'therapist',
    }),
  );
  out.push(
    await ensureUser({
      name: 'Family',
      email: process.env.SEED_FAMILY_EMAIL || 'family@asp.com',
      password: process.env.SEED_FAMILY_PASSWORD || 'AspFamily123',
      role: 'parent',
    }),
  );

  console.log('\nAccounts you can log in with:');
  for (const r of out) {
    if (r.created) console.log(`  ${r.email}  /  ${r.password}`);
    else console.log(`  ${r.email}  /  (already existed — keep current password)`);
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

