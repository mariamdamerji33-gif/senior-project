/**
 * First-party cookies (prefix asp_) — only flags that need cross-tab / server-visible persistence.
 * Auth JWT stays in localStorage (see AuthContext).
 */
export const SITE_COOKIE = {
  /** School-admin registration watch flag (value "1"); email stays in localStorage. */
  REG_WATCH_FLAG: 'asp_reg_watch',
} as const

export type SetSiteCookieOptions = {
  maxAgeSeconds: number
  sameSite?: 'Lax' | 'Strict'
}

function secureSuffix(): string {
  if (typeof window === 'undefined') return ''
  return window.location.protocol === 'https:' ? '; Secure' : ''
}

export function setSiteCookie(name: string, value: string, options: SetSiteCookieOptions): void {
  try {
    const sameSite = options.sameSite ?? 'Lax'
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${options.maxAgeSeconds}; SameSite=${sameSite}${secureSuffix()}`
  } catch {
    /* ignore */
  }
}

export function deleteSiteCookie(name: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0${secureSuffix()}`
  } catch {
    /* ignore */
  }
}
