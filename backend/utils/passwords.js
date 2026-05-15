const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 10;

function looksLikeBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);
}

async function hashPassword(plain) {
  return await bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

async function verifyPassword(stored, provided) {
  const storedStr = stored == null ? '' : String(stored);
  const providedStr = provided == null ? '' : String(provided);
  if (!storedStr || !providedStr) return { ok: false, needsMigration: false };

  if (looksLikeBcryptHash(storedStr)) {
    const ok = await bcrypt.compare(providedStr, storedStr);
    return { ok, needsMigration: false };
  }

  // Backward compatibility: old prototype stored plain text.
  const ok = storedStr === providedStr;
  return { ok, needsMigration: ok };
}

module.exports = { hashPassword, verifyPassword, looksLikeBcryptHash };

