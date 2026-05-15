/**
 * Reset seeded school demo passwords to README defaults (or SEED_* env overrides).
 * Use when accounts exist but login fails with "Invalid credentials".
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const userModel = require('../mvc/models/userModel');

const USERS = [
  { email: process.env.SEED_SCHOOL_ADMIN_EMAIL || 'schooladmin@asp.com', password: process.env.SEED_SCHOOL_ADMIN_PASSWORD || 'AspAdmin123' },
  { email: process.env.SEED_COORDINATOR_EMAIL || 'coordinator@asp.com', password: process.env.SEED_COORDINATOR_PASSWORD || 'AspCoord123' },
  { email: process.env.SEED_TEACHER_EMAIL || 'teacher@asp.com', password: process.env.SEED_TEACHER_PASSWORD || 'AspTeach123' },
  { email: process.env.SEED_FAMILY_EMAIL || 'family@asp.com', password: process.env.SEED_FAMILY_PASSWORD || 'AspFamily123' },
];

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    process.exit(1);
  }

  for (const { email, password } of USERS) {
    const emailNorm = String(email).trim().toLowerCase();
    const row = await userModel.findByEmail(emailNorm);
    if (!row) {
      console.log(`✗ missing: ${emailNorm} — run: npm run seed:school-users --prefix backend`);
      continue;
    }
    await userModel.updateUser(row.id, { password });
    console.log(`✓ password reset: ${emailNorm}`);
  }

  console.log('\nTry login again with README passwords (e.g. family@asp.com / AspFamily123).');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
