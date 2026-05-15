/**
 * Verify SMTP + send one "account created" style test message.
 * Usage (from backend folder):  node scripts/smtpTestEmail.js recipient@gmail.com
 * Or:  npm run mail:test -- you@gmail.com
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { verifySmtpTransport } = require('../utils/smtpMail');
const { sendAccountCreatedEmail } = require('../utils/accountCreatedEmail');

async function main() {
  const to = String(process.argv[2] || process.env.TEST_MAIL_TO || '').trim();
  if (!to) {
    console.error('Usage: npm run mail:test -- <recipient@email.com>');
    console.error('   or: node scripts/smtpTestEmail.js <recipient@email.com>');
    process.exit(1);
  }

  console.log('1) Checking SMTP configuration…');
  const v = await verifySmtpTransport();
  if (!v.ok) {
    console.error('   FAILED:', v.reason);
    console.error('   Fix backend/.env: SMTP_HOST, SMTP_USER (full email), SMTP_PASS (16-char App password, no spaces).');
    console.error('   SMTP_FROM optional if SMTP_USER is an email.');
    process.exit(1);
  }
  console.log('   OK: SMTP server accepted login (verify).');

  console.log('2) Sending test “account created” email to', to, '…');
  try {
    const r = await sendAccountCreatedEmail({ to, name: 'SMTP test', role: 'parent' });
    if (r?.skipped) {
      console.error('   SKIPPED:', r.reason);
      process.exit(1);
    }
    console.log('   OK: message accepted by SMTP. Check inbox + Spam for', to);
  } catch (e) {
    console.error('   FAILED:', e?.message || e);
    process.exit(1);
  }
}

main();
