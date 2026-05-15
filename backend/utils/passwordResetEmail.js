const { sendSmtpMail } = require('./smtpMail');
const { isEmail } = require('./validate');
const { escapeHtml } = require('./emailHtml');

/**
 * Sends reset link + token (for mobile paste). Skips when SMTP is not configured (same as other mail).
 */
async function sendPasswordResetEmail({ to, name, resetUrl, token }) {
  const email = String(to || '').trim().toLowerCase();
  if (!isEmail(email)) return { skipped: true, reason: 'invalid_to' };

  const greeting = name && String(name).trim() ? `Hello ${String(name).trim()},` : 'Hello,';
  const subject = 'Reset your password — Autism School Platform';
  const safeUrl = String(resetUrl || '').trim();
  const tok = String(token || '').trim();

  const webPart = safeUrl
    ? `Open this link in your browser (valid about 1 hour):\n${safeUrl}\n\n`
    : '';
  const mobilePart = tok
    ? `On the mobile app: open “Reset password” and paste this token:\n${tok}\n\n`
    : '';

  const text = `${greeting}

We received a request to reset the password for ${email}.

${webPart}${mobilePart}Your password is not changed until you finish the form on the website after opening the link.

If you did not ask for this, you can ignore this email. Your password will stay the same.

—
This is an automated message. Do not reply to this email.`;

  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const linkHtml =
    safeUrl &&
    `<p>Open this link in your browser to choose a new password (valid about one hour):<br /><a href="${escapeHtml(
      safeUrl,
    )}">Reset your password</a></p>
<p style="font-size:13px;color:#4b5563;word-break:break-all">${escapeHtml(safeUrl)}</p>`;
  const tokenHtml =
    tok &&
    `<p><strong>Mobile app:</strong> open <em>Reset password</em> and paste this token:</p><pre style="word-break:break-all">${escapeHtml(
      tok,
    )}</pre>`;

  const html = `<p>${safeGreeting}</p>
<p>We received a request to reset the password for <strong>${safeEmail}</strong>.</p>
${linkHtml || ''}
${tokenHtml || ''}
<p style="font-size:13px;color:#374151">Your password is <strong>not</strong> changed until you finish the form on the next page.</p>
<p>If you did <strong>not</strong> ask for this, you can ignore this email.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
<p style="color:#6b7280;font-size:12px">This is an automated message. Do not reply to this email.</p>`;

  return sendSmtpMail({ to: email, subject, text, html });
}

module.exports = { sendPasswordResetEmail };
