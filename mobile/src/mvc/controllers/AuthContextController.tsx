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
    setUser(null)
    setToken(null)
    await AsyncStorage.removeItem(STORAGE_USER)
    await SecureStore.deleteItemAsync(STORAGE_TOKEN)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [u, t] = await Promise.all([AsyncStorage.getItem(STORAGE_USER), SecureStore.getItemAsync(STORAGE_TOKEN)])
        if (!mounted) return
        if (t && isJwtExpired(t)) {
          await AsyncStorage.removeItem(STORAGE_USER)
          await SecureStore.deleteItemAsync(STORAGE_TOKEN)
          setUser(null)
          setToken(null)
          return
        }
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
        if (cancelled) return
        setUser(res.user)
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
      } catch {
        if (cancelled) return
        await clearSession()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clearSession, token])

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'inactive' || nextState === 'background') {
        lastBackgroundAtRef.current = Date.now()
        return
      }
      if (nextState !== 'active' || !token) return
      void (async () => {
        if (isJwtExpired(token)) {
          await clearSession()
          return
        }
        const timeoutMinutes = await getInactivityTimeoutMinutes()
        const inactivityLogoutMs = timeoutMinutes * 60 * 1000
        const lastBackgroundAt = lastBackgroundAtRef.current
        if (lastBackgroundAt && Date.now() - lastBackgroundAt > inactivityLogoutMs) {
          await clearSession()
        }
      })()
    }
    const sub = AppState.addEventListener('change', onAppStateChange)
    return () => sub.remove()
  }, [clearSession, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      refreshUser: async () => {
        if (!token) return
        try {
          if (isJwtExpired(token)) {
            await clearSession()
            return
          }
          const res = await api.me(token)
          setUser(res.user)
          await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
        } catch {
          /* keep existing user */
        }
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
        setUser(res.user)
        setToken(res.token)
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
        await SecureStore.setItemAsync(STORAGE_TOKEN, res.token)
      },
      logout: () => {
        const t = tokenRef.current
        void (async () => {
          if (t) {
            try {
              await api.logout(t)
            } catch {
              /* ignore network failure while clearing local session */
            }
          }
          await clearSession()
        })()
      },
    }),
    [clearSession, loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

