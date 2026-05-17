/** E.164-style phone: optional empty, or + followed by 8–15 digits (country code included). */

function normalizePhoneToE164(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: null };

  s = s.replace(/[\s().\-/]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) s = `+${s.replace(/^0+/, '')}`;

  if (!/^\+[1-9]\d{7,14}$/.test(s)) {
    return {
      ok: false,
      error: 'Phone must start with + and country code (example: +961 81/ 075 838).',
    };
  }

  return { ok: true, value: s };
}

module.exports = { normalizePhoneToE164 };
