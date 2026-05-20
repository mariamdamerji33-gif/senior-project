/**
 * Small HTML fragments shared by transactional emails (Gmail-safe patterns).
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Table + bgcolor: works in Gmail and many Outlook builds. */
function emailButtonHtml(href, label) {
  const h = escapeHtml(href);
  const t = escapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0">
<tr><td bgcolor="#1d4ed8" style="border-radius:8px">
<a href="${h}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:bold">${t}</a>
</td></tr></table>`;
}

/**
 * FRONTEND_ORIGIN only when it is safe to put in recipient email (no localhost).
 * Local URLs do not work on users' phones and look unprofessional in mail.
 */
function publicFrontendOrigin() {
  const raw = String(process.env.FRONTEND_ORIGIN || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return '';
  } catch {
    return '';
  }
  return raw;
}

/** Web /login URL for transactional emails only when FRONTEND_ORIGIN is public (HTTPS deploy). */
function signInUrlFromEnv() {
  const o = publicFrontendOrigin();
  return o ? `${o}/login` : '';
}

module.exports = { escapeHtml, emailButtonHtml, signInUrlFromEnv, publicFrontendOrigin };
