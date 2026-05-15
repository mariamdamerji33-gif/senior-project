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

/** Web login URL from FRONTEND_ORIGIN (production must set it). */
function signInUrlFromEnv() {
  let o = String(process.env.FRONTEND_ORIGIN || '').trim().replace(/\/$/, '');
  if (!o && String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    o = 'http://localhost:5173';
  }
  return o ? `${o}/login` : '';
}

module.exports = { escapeHtml, emailButtonHtml, signInUrlFromEnv };
