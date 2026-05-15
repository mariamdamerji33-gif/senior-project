import { deleteSiteCookie, setSiteCookie, SITE_COOKIE } from './siteCookies'

/** Email we should poll for School Admin approval / rejection (localStorage + cookie flag). */

const LS_EMAIL = 'asp_reg_watch_email'
const SS_DISMISS = 'asp_reg_banner_dismiss'

export function getRegistrationWatchEmail(): string | null {
  try {
    const e = localStorage.getItem(LS_EMAIL)?.trim()
    return e || null
  } catch {
    return null
  }
}

/** Call when user submits a pending School Admin registration. */
export function setRegistrationWatch(email: string) {
  try {
    const e = email.trim().toLowerCase()
    if (!e) return
    localStorage.setItem(LS_EMAIL, e)
    setSiteCookie(SITE_COOKIE.REG_WATCH_FLAG, '1', { maxAgeSeconds: 60 * 60 * 24 * 90, sameSite: 'Lax' })
    sessionStorage.removeItem(SS_DISMISS)
  } catch {
    /* ignore private mode / blocked storage */
  }
}

export function clearRegistrationWatch() {
  try {
    localStorage.removeItem(LS_EMAIL)
    deleteSiteCookie(SITE_COOKIE.REG_WATCH_FLAG)
    sessionStorage.removeItem(SS_DISMISS)
  } catch {
    /* ignore */
  }
}

export function isBannerDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SS_DISMISS) === '1'
  } catch {
    return false
  }
}

export function dismissBannerThisSession() {
  try {
    sessionStorage.setItem(SS_DISMISS, '1')
  } catch {
    /* ignore */
  }
}
