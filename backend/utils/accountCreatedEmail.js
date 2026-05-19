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
 * @param {{ to: string, name?: string|null, role?: string|null, registrationRequestApproved?: boolean }} opts
 * When registrationRequestApproved is true (School Admin approved a sign-up request), subject and intro say so.
 */
async function sendAccountCreatedEmail({ to, name, role, registrationRequestApproved = false }) {
  const email = String(to || '').trim().toLowerCase();
  if (!isEmail(email)) return { skipped: true, reason: 'invalid_to' };

  const greeting = name && String(name).trim() ? `Hello ${String(name).trim()},` : 'Hello,';
  const label = roleLabel(role);
  const roleKey = String(role || '').trim().toLowerCase();
  const signInLine =
    roleKey === 'parent'
      ? 'Sign in on the Autism School Mobile app with the password you chose.'
      : 'Sign in on your school website with the password you chose.';
  const subject = registrationRequestApproved
    ? 'Your account request was approved — Autism School Platform'
    : 'Your account was created — Autism School Platform';

  const introApproved = `Good news: your account registration request was approved by your school.
Your Autism School Platform account is now active.`;
  const introCreated = `Your Autism School Platform account is ready.`;

  const text = `${greeting}

${registrationRequestApproved ? introApproved : introCreated}

Email (sign-in): ${email}
Role: ${label}

${signInLine}

If you did not request this account, contact your school administrator.

—
This is an automated message. Do not reply to this email.`;

  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const safeLabel = escapeHtml(label);
  const introHtml = registrationRequestApproved
    ? `<p><strong>Your account registration request was approved</strong> by your school.</p>
<p>Your <strong>Autism School Platform</strong> account is now active.</p>`
    : `<p>Your <strong>Autism School Platform</strong> account is ready.</p>`;

  const html = `<p>${safeGreeting}</p>
${introHtml}
<ul>
<li><strong>Sign-in email:</strong> ${safeEmail}</li>
<li><strong>Role:</strong> ${safeLabel}</li>
</ul>
<p>${escapeHtml(signInLine)}</p>
<p>If you did <strong>not</strong> request this account, contact your school administrator.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
<p style="color:#6b7280;font-size:12px">This is an automated message. Do not reply to this email.</p>`;

  const result = await sendSmtpMail({ to: email, subject, text, html });
  if (result?.skipped) {
    console.warn('[email] account-created not sent:', { to: email, reason: result.reason || 'unknown' });
  }
  return result;
}

module.exports = { sendAccountCreatedEmail };
