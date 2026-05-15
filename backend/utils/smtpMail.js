const nodemailer = require('nodemailer');
const { isEmail } = require('./validate');

/** Trim and strip a single pair of surrounding quotes (common in .env on Windows). */
function smtpEnv(name) {
  let v = String(process.env[name] || '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * From header: explicit SMTP_FROM, else if SMTP_USER looks like an email use
 * `Autism School Platform <user@...>` (matches typical Gmail SMTP setup).
 */
function resolveFromAddress() {
  const explicit = smtpEnv('SMTP_FROM');
  if (explicit) return explicit;
  const user = smtpEnv('SMTP_USER');
  if (isEmail(user)) {
    return `Autism School Platform <${user}>`;
  }
  return '';
}

/** True when host is set and we can build a valid From (explicit or from SMTP_USER). */
function isSmtpSendConfigured() {
  return Boolean(smtpEnv('SMTP_HOST') && resolveFromAddress());
}

function mailTransport() {
  const host = smtpEnv('SMTP_HOST');
  if (!host) return null;
  const portParsed = Number(smtpEnv('SMTP_PORT'));
  const port = Number.isFinite(portParsed) && portParsed > 0 ? portParsed : 587;
  const secure =
    String(smtpEnv('SMTP_SECURE') || '').toLowerCase() === 'true' || port === 465;
  const user = smtpEnv('SMTP_USER');
  const pass = smtpEnv('SMTP_PASS');
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: user ? { user, pass } : undefined,
  });
}

/**
 * Send one transactional email when SMTP_* env vars are set.
 * @returns {Promise<{ sent?: true, skipped?: true, reason?: string }>}
 */
async function sendSmtpMail({ to, subject, text, html }) {
  const from = resolveFromAddress();
  if (!from) {
    console.warn('[smtp] No From address: set SMTP_FROM or SMTP_USER to a full email (e.g. you@gmail.com).');
    return { skipped: true, reason: 'no_from' };
  }
  const t = mailTransport();
  if (!t) {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      console.log('[smtp] SMTP_HOST not set; email skipped:', { to, subject });
    } else {
      console.warn('[smtp] SMTP_HOST not set; email skipped (production).');
    }
    return { skipped: true, reason: 'no_transport' };
  }
  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    console.log('[smtp] sent ok:', { to, subject, messageId: info?.messageId || null });
    return { sent: true };
  } catch (err) {
    console.error('[smtp] sendMail failed:', err?.message || err);
    throw err;
  }
}

/** Verifies SMTP login (Gmail app password etc.). Use `npm run mail:test`. */
async function verifySmtpTransport() {
  if (!isSmtpSendConfigured()) {
    return { ok: false, reason: 'SMTP_HOST missing or no From (set SMTP_FROM or SMTP_USER as a full email).' };
  }
  const t = mailTransport();
  if (!t) return { ok: false, reason: 'no_transport' };
  try {
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

module.exports = { sendSmtpMail, isSmtpSendConfigured, verifySmtpTransport };
