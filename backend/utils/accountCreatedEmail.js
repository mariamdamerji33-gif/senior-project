const { sendSmtpMail } = require('./smtpMail');
const { isEmail } = require('./validate');
const { escapeHtml } = require('./emailHtml');

function roleLabel(roleKey) {
  const r = String(roleKey || '').trim().toLowerCase();
  const map = {
    super_admin: 'School Admin',
    manager: 'Coordinator',
    therapist: 'Teacher',
    parent: 'Family',
  };
  return map[r] || r || 'Member';
}

/**
 * Welcome email when a new user row is created. Does not include the password.
 */
async function sendAccountCreatedEmail({ to, name, role }) {
  const email = String(to || '').trim().toLowerCase();
  if (!isEmail(email)) return { skipped: true, reason: 'invalid_to' };

  const greeting = name && String(name).trim() ? `Hello ${String(name).trim()},` : 'Hello,';
  const label = roleLabel(role);
  const subject = 'Your account was created — Autism School Platform';

  const text = `${greeting}

Your Autism School Platform account is ready.

Email (sign-in): ${email}
Role: ${label}

Sign in on your school website with the password you chose.

If you did not create this account, contact your school administrator.

—
This is an automated message. Do not reply to this email.`;

  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const safeLabel = escapeHtml(label);

  const html = `<p>${safeGreeting}</p>
<p>Your <strong>Autism School Platform</strong> account is ready.</p>
<ul>
<li><strong>Sign-in email:</strong> ${safeEmail}</li>
<li><strong>Role:</strong> ${safeLabel}</li>
</ul>
<p>Sign in on your school website with the password you chose.</p>
<p>If you did <strong>not</strong> create this account, contact your school administrator.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
<p style="color:#6b7280;font-size:12px">This is an automated message. Do not reply to this email.</p>`;

  const result = await sendSmtpMail({ to: email, subject, text, html });
  if (result?.skipped) {
    console.warn('[email] account-created not sent:', { to: email, reason: result.reason || 'unknown' });
  }
  return result;
}

module.exports = { sendAccountCreatedEmail };
