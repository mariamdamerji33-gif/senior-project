/** Matches backend `isPasswordPolicyCompliant` (`backend/utils/validate.js`). */
export function meetsRegisterPasswordRules(pw: string) {
  if (pw.length < 8 || pw.length > 128) return false
  if (!/[a-zA-Z]/.test(pw)) return false
  if (!/[0-9]/.test(pw)) return false
  return true
}

export const REGISTER_PASSWORD_HINT =
  'Use 8–128 characters with at least one letter and one number (same rule as on the server).'
