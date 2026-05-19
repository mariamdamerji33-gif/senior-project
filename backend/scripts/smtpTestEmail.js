/**
 * Verify SMTP + send test transactional emails.
 *
 * Usage (from backend folder):
 *   npm run mail:test -- you@gmail.com
 *   npm run mail:test -- you@gmail.com both
 *   npm run mail:test -- you@gmail.com password
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { verifySmtpTransport } = require('../utils/smtpMail');
const { sendAccountCreatedEmail } = require('../utils/accountCreatedEmail');
const { sendPasswordChangedEmail } = require('../utils/passwordChangedEmail');

async function main() {
  const to = String(process.argv[2] || process.env.TEST_MAIL_TO || '').trim();
  const mode = String(process.argv[3] || 'both').trim().toLowerCase();
  if (!to) {
    console.error('Usage: npm run mail:test -- <recipient@email.com> [both|created|password]');
    process.exit(1);
  }

  const sendCreated = mode === 'both' || mode === 'created' || mode === 'account';
  const sendPassword = mode === 'both' || mode === 'password' || mode === 'changed';

  console.log('1) Checking SMTP configuration…');
  const v = await verifySmtpTransport();
  if (!v.ok) {
    console.error('   FAILED:', v.reason);
    console.error('   Fix backend/.env: SMTP_HOST, SMTP_USER (full email), SMTP_PASS (16-char App password, no spaces).');
    console.error('   SMTP_FROM optional if SMTP_USER is an email.');
    process.exit(1);
  }
  console.log('   OK: SMTP server accepted login (verify).');

  if (sendCreated) {
    console.log('2) Sending test “account created” email to', to, '…');
    try {
      const r = await sendAccountCreatedEmail({ to, name: 'SMTP test', role: 'parent' });
      if (r?.skipped) {
        console.error('   SKIPPED:', r.reason);
        process.exit(1);
      }
      console.log('   OK: account-created message accepted by SMTP.');
    } catch (e) {
      console.error('   FAILED:', e?.message || e);
      process.exit(1);
    }
  }

  if (sendPassword) {
    console.log(`${sendCreated ? '3' : '2'}) Sending test “password updated” email to`, to, '…');
    try {
      const r = await sendPasswordChangedEmail({ to, name: 'SMTP test' });
      if (r?.skipped) {
        console.error('   SKIPPED:', r.reason);
        process.exit(1);
      }
      console.log('   OK: password-changed message accepted by SMTP.');
    } catch (e) {
      console.error('   FAILED:', e?.message || e);
      process.exit(1);
    }
  }

  console.log('Done. Check inbox and Spam for', to);
}

main();

