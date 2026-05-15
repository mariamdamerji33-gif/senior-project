/** Compare user/UUID ids from JWT vs Supabase (string normalization). */
function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

module.exports = { sameId };
