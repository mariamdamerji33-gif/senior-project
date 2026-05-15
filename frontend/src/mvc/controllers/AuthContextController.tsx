import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser, Role } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'

type AuthContextValue = {
  user: AuthUser | null
  login: (params: { email: string; password: string; role?: Role }) => Promise<AuthUser>
  logout: () => void
  token: string | null
  loading: boolean
  refreshUser: () => Promise<void>
  /** Use after PATCH profile/photo so UI updates even if `/api/auth/me` fails afterward. */
  applyAuthUser: (next: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'a11y_autism_auth_user_v1'
const TOKEN_KEY = 'a11y_autism_auth_token_v1'
const TOKEN_EXPIRY_SKEW_MS = 30_000

function loadUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function loadToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
    if (!token || isJwtExpired(token)) {
      clearStoredSession()
      return null
    }
    return token
  } catch {
    return null
  }
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage may be unavailable in private browsing */
  }
}

function saveSession(user: AuthUser, token: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  sessionStorage.setItem(TOKEN_KEY, token)
  // Remove old persistent tokens from previous builds. Session storage limits exposure after browser close.
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return atob(padded)
}

function jwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown }
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function isJwtExpired(token: string) {
  const expiresAt = jwtExpiryMs(token)
  return !expiresAt || Date.now() + TOKEN_EXPIRY_SKEW_MS >= expiresAt
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser())
  const [token, setToken] = useState<string | null>(loadToken())
  /** True on first load when a token exists (until /api/auth/me finishes) or during login/sync. */
  const [loading, setLoading] = useState<boolean>(() => !!loadToken())

  useEffect(() => {
    let cancelled = false
    async function syncMe() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        if (isJwtExpired(token)) {
          setUser(null)
          setToken(null)
          clearStoredSession()
          return
        }
        const res = await api.me(token)
        if (cancelled) return
        setUser(res.user as AuthUser)
        saveSession(res.user as AuthUser, token)
      } catch {
        if (cancelled) return
        setUser(null)
        setToken(null)
        clearStoredSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    syncMe()
    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      token,
      loading,
      applyAuthUser: (next) => {
        setUser(next)
        if (token) saveSession(next, token)
      },
      refreshUser: async () => {
        if (!token || isJwtExpired(token)) return
        try {
          const res = await api.me(token)
          const nextUser = res.user as AuthUser
          setUser(nextUser)
          saveSession(nextUser, token)
        } catch {
          if (import.meta.env.DEV) {
            console.warn('[auth] refreshUser: /api/auth/me failed; keeping cached profile until retry.')
          }
        }
      },
      login: async ({ email, password, role }) => {
        setLoading(true)
        try {
          const res = await api.login({ email, password, role })
          if (isJwtExpired(res.token)) throw new Error('Login returned an expired session. Please try again.')
          const nextUser = res.user as AuthUser
          setToken(res.token)
          setUser(nextUser)
          saveSession(nextUser, res.token)
          return nextUser
        } finally {
          setLoading(false)
        }
      },
      logout: () => {
        void api.logout().catch(() => {
          /* ignore network failure while clearing client session */
        })
        setUser(null)
        setToken(null)
        clearStoredSession()
      },
    }
  }, [loading, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Fast refresh: hook is intentionally exported next to the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
