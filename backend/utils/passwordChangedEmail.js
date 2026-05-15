const { sendSmtpMail } = require('./smtpMail');
const { isEmail } = require('./validate');
const { escapeHtml, emailButtonHtml, signInUrlFromEnv } = require('./emailHtml');

/**
 * Security notice: account password was changed (self-service reset, or admin-set password).
 * Fire-and-forget from handlers; failures are logged only.
 */
async function sendPasswordChangedEmail({ to, name }) {
  const email = String(to || '').trim().toLowerCase();
  if (!isEmail(email)) return { skipped: true, reason: 'invalid_to' };

  const greeting = name && String(name).trim() ? `Hello ${String(name).trim()},` : 'Hello,';
  const subject = 'Password updated — sign in to Autism School Platform';

  const loginUrl = signInUrlFromEnv();

  const text = `${greeting}

Your password was updated for this email address: ${email}

Sign in on the school website with your new password.${loginUrl ? `\n\nLogin page: ${loginUrl}` : ''}

If you did not reset your password, contact your school administrator immediately.

—
This is an automated security message. Do not reply to this email.`;

  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const signInBlock = loginUrl
    ? `<p>Open the website and sign in with your new password:</p>
${emailButtonHtml(loginUrl, 'Sign in')}
<p style="margin:8px 0 0 0;font-size:13px;color:#4b5563">Or copy: <span style="word-break:break-all">${escapeHtml(
        loginUrl,
      )}</span></p>`
    : '';

  const html = `<p>${safeGreeting}</p>
<p><strong>Your password was updated.</strong> Use this email to sign in:</p>
<p style="font-size:16px"><strong>${safeEmail}</strong></p>
<p>Click below to open the <strong>login</strong> page and use your <strong>new password</strong>.</p>
${signInBlock}
<p>If you did <strong>not</strong> reset your password, contact your school administrator right away.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
<p style="color:#6b7280;font-size:12px">This is an automated security message. Do not reply to this email.</p>`;

  return sendSmtpMail({ to: email, subject, text, html });
}

module.exports = { sendPasswordChangedEmail };
