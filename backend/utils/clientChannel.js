/** Identifies web vs mobile clients (`X-ASP-Client: web | mobile`). */
const CLIENT_HEADER = 'x-asp-client';

function clientChannel(req) {
  const raw = String(req.get?.(CLIENT_HEADER) || req.headers?.[CLIENT_HEADER] || '')
    .trim()
    .toLowerCase();
  if (raw === 'mobile') return 'mobile';
  if (raw === 'web') return 'web';
  return 'unknown';
}

function isMobileClient(req) {
  return clientChannel(req) === 'mobile';
}

/** Family (parent) accounts may only obtain a session from the mobile app. */
function familyLoginBlockedOnWeb(userRole, req) {
  return String(userRole || '').toLowerCase() === 'parent' && !isMobileClient(req);
}

/** Signed profile photo URLs: longer on mobile (cached offline) vs web (1h). */
function profilePhotoSignedUrlExpiresSec(req) {
  return isMobileClient(req) ? 60 * 60 * 24 * 7 : 3600;
}

module.exports = {
  CLIENT_HEADER,
  clientChannel,
  isMobileClient,
  familyLoginBlockedOnWeb,
  profilePhotoSignedUrlExpiresSec,
};
