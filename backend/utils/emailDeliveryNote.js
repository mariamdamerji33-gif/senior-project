/**
 * Short UI/API note after transactional email attempt.
 * @param {{ sent?: boolean, skipped?: boolean, reason?: string } | void} mailRes
 */
function emailDeliveryNote(mailRes, { sentLabel, skippedLabel } = {}) {
  if (mailRes?.sent) {
    return sentLabel || 'A confirmation email was sent to the user.';
  }
  if (mailRes?.skipped) {
    return (
      skippedLabel ||
      'Email was not sent. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to backend/.env and restart the API.'
    );
  }
  return null;
}

function signInHintForRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'parent') return 'They can sign in on the mobile app.';
  return 'They can sign in on the website.';
}

module.exports = { emailDeliveryNote, signInHintForRole };
