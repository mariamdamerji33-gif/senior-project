/** Magic-byte sniffing for common web image types (not a full parser). */
function imageKindFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

function isAllowedProfileImageBuffer(buf, claimedMime) {
  const kind = imageKindFromBuffer(buf);
  if (!kind) return null;
  const m = String(claimedMime || '').toLowerCase().trim();
  if (m === kind.mime) return kind;
  return null;
}

module.exports = { imageKindFromBuffer, isAllowedProfileImageBuffer };
