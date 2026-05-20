import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { AppState, type AppStateStatus } from 'react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../models/api'
import type { AuthUser, Role } from '../../types/auth'
import { getInactivityTimeoutMinutes } from '../../security/sessionSecurity'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (params: { email: string; password: string; role?: Role }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const STORAGE_USER = 'asp_mobile_auth_user_v1'
const STORAGE_TOKEN = 'asp_mobile_auth_token_v1'
const TOKEN_EXPIRY_SKEW_MS = 30_000
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return globalThis.atob(padded)
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

/** `/api/auth/me` failed: only drop the session when the server rejected the token (401), not on network blips. */
function shouldClearSessionAfterMeFailure(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('session expired') ||
    msg.includes('sign in again') ||
    msg.includes('invalid token') ||
    msg.includes('missing token')
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const lastBackgroundAtRef = useRef<number | null>(null)
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  const clearSession = useCallback(async () => {
    tokenRef.current = null
    setUser(null)
    setToken(null)
    await AsyncStorage.removeItem(STORAGE_USER)
    await SecureStore.deleteItemAsync(STORAGE_TOKEN)
  }, [])

  /** Ignore /me or refresh results that finish after logout or a newer login. */
  const isSessionTokenCurrent = useCallback((requestToken: string) => tokenRef.current === requestToken, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [u, t] = await Promise.all([AsyncStorage.getItem(STORAGE_USER), SecureStore.getItemAsync(STORAGE_TOKEN)])
        if (!mounted) return
        if (t && isJwtExpired(t)) {
          await AsyncStorage.removeItem(STORAGE_USER)
          await SecureStore.deleteItemAsync(STORAGE_TOKEN)
          tokenRef.current = null
          setUser(null)
          setToken(null)
          return
        }
        tokenRef.current = t || null
        setUser(u ? (JSON.parse(u) as AuthUser) : null)
        setToken(t || null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!token) return
    ;(async () => {
      try {
        if (isJwtExpired(token)) {
          await clearSession()
          return
        }
        const res = await api.me(token)
        if (cancelled || !isSessionTokenCurrent(token)) return
        setUser(res.user)
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
      } catch (e) {
        if (cancelled) return
        if (shouldClearSessionAfterMeFailure(e)) await clearSession()
        /* else: keep user/token from storage so profile still works offline or when API is briefly unreachable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clearSession, isSessionTokenCurrent, token])

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'inactive' || nextState === 'background') {
        lastBackgroundAtRef.current = Date.now()
        return
      }
      const activeToken = tokenRef.current
      if (nextState !== 'active' || !activeToken) return
      void (async () => {
        if (isJwtExpired(activeToken)) {
          await clearSession()
          return
        }
        const timeoutMinutes = await getInactivityTimeoutMinutes()
        const inactivityLogoutMs = timeoutMinutes * 60 * 1000
        const lastBackgroundAt = lastBackgroundAtRef.current
        if (lastBackgroundAt && Date.now() - lastBackgroundAt > inactivityLogoutMs) {
          await clearSession()
          return
        }
        try {
          const res = await api.me(activeToken)
          if (!isSessionTokenCurrent(activeToken)) return
          setUser(res.user)
          await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
        } catch {
          /* keep session; profile refresh is best-effort */
        }
      })()
    }
    const sub = AppState.addEventListener('change', onAppStateChange)
    return () => sub.remove()
  }, [clearSession, isSessionTokenCurrent])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      refreshUser: async () => {
        const t = tokenRef.current
        if (!t) throw new Error('Not signed in')
        if (isJwtExpired(t)) {
          await clearSession()
          throw new Error('Session expired. Please sign in again.')
        }
        const res = await api.me(t)
        if (!isSessionTokenCurrent(t)) return
        setUser(res.user)
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
      },
      login: async ({ email, password, role }) => {
        const res = await api.login({ email, password, role })
        if (isJwtExpired(res.token)) throw new Error('Login returned an expired session. Please try again.')
        const staffSummaryRoles: Role[] = ['super_admin', 'manager']
        if (res.user.role !== 'parent' && !staffSummaryRoles.includes(res.user.role)) {
          throw new Error(
            'This mobile app is for family accounts, School Admin, and Coordinator (summary). Teachers and other staff should use the website.',
          )
        }
        tokenRef.current = res.token
        setUser(res.user)
        setToken(res.token)
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
        await SecureStore.setItemAsync(STORAGE_TOKEN, res.token)
      },
      logout: () => {
        const t = tokenRef.current
        // Clear local session first so the UI returns to login immediately.
        // Server logout is best-effort (Render cold start can take many seconds).
        void clearSession()
        if (t) {
          void api.logout(t).catch(() => {
            /* ignore network failure — user is already signed out locally */
          })
        }
      },
    }),
    [clearSession, isSessionTokenCurrent, loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

