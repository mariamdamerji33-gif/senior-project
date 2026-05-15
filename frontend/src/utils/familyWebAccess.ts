import type { AuthUser } from '@/types/auth'

export const FAMILY_WEB_SIGN_IN_MESSAGE =
  'Family accounts use the mobile app. Download Autism School Mobile or open the link from your school.'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return atob(padded)
}

function roleFromToken(token: string | null | undefined): string | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(decodeBase64Url(payload)) as { role?: unknown }
    return typeof decoded.role === 'string' ? decoded.role.toLowerCase() : null
  } catch {
    return null
  }
}

export function isFamilyWebUser(user: AuthUser | null | undefined, token?: string | null): boolean {
  const role = String(user?.role || roleFromToken(token) || '').toLowerCase()
  if (role === 'parent') return true
  const label = String(user?.roleLabel || '').toLowerCase()
  return label === 'family' || label === 'parent'
}
