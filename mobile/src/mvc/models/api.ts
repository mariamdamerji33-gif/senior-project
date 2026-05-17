import axios from 'axios'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { AuthUser, Role } from '../../types/auth'

/**
 * Resolve a reachable API base URL across common Expo development modes:
 * - Explicit app.json override (highest priority)
 * - Current Expo host IP + backend port 5000 (LAN mode)
 * - Emulator defaults: Android 10.0.2.2, iOS simulator 127.0.0.1
 * For a physical device without LAN discovery, set expo.extra.apiBaseUrl in app.json.
 */
const extraApiBaseUrl = String(Constants.expoConfig?.extra?.apiBaseUrl || '').trim()
const hostUri = String(
  Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
      ?.expoClient?.hostUri ||
    '',
).trim()
const expoHost = hostUri ? hostUri.split(':')[0] : ''
const inferredApiBaseUrl = expoHost ? `http://${expoHost}:5000` : ''
const platformFallback =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000'
const API_BASE_URL = extraApiBaseUrl || inferredApiBaseUrl || platformFallback

if (__DEV__) {
  console.log(`[api] API_BASE_URL=${API_BASE_URL}`)
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json', 'X-ASP-Client': 'mobile' },
  // Mobile uses Bearer token only; omit cookies to avoid CSRF/session edge cases with the API.
  withCredentials: false,
})

http.interceptors.request.use((config) => {
  const data = config.data as unknown
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const h = config.headers as Record<string, unknown> | undefined
    if (h) delete h['Content-Type']
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const noResponse = !err?.response
    if (noResponse) {
      return Promise.reject(new Error(`Cannot reach API at ${API_BASE_URL}. Check network/IP and backend server.`))
    }
    const status = err?.response?.status
    const serverMessage = err?.response?.data?.error || err?.response?.data?.message
    const fallback =
      status === 401
        ? 'Session expired. Please sign in again.'
        : status === 403
          ? 'You do not have permission for this action.'
          : status === 404
            ? 'Requested resource not found.'
            : status >= 500
              ? 'Server error. Please try again shortly.'
              : 'Request failed.'
    return Promise.reject(new Error(serverMessage || fallback))
  },
)

export const api = {
  async health() {
    const { data } = await http.get<{
      ok: boolean
      service: string
      database: 'ok' | 'error' | 'unknown'
      supabaseUrlConfigured: boolean
      serviceRoleKeyConfigured: boolean
      ts: string
    }>('/api/health')
    return data
  },
  async login(params: { email: string; password: string; role?: Role }) {
    const { data } = await http.post<{ token: string; user: AuthUser }>('/api/auth/login', params)
    return data
  },
  async forgotPassword(email: string) {
    const { data } = await http.post<{
      ok?: boolean
      message?: string
      devNotice?: string
      devResetLink?: string
      devResetToken?: string
    }>('/api/auth/forgot-password', { email: email.trim() })
    return data
  },
  async resetPassword(payload: { token: string; password: string }) {
    const { data } = await http.post<{ ok?: boolean; message?: string }>('/api/auth/reset-password', {
      token: payload.token.trim(),
      password: payload.password,
    })
    return data
  },
  async registerRequest(params: { name: string; email: string; password: string; requestedRole: Role }) {
    const { data } = await http.post<{ ok: boolean; message?: string; immediate?: boolean; user?: AuthUser }>(
      '/api/auth/register',
      params,
    )
    return data
  },
  async me(token: string) {
    const { data } = await http.get<{ user: AuthUser }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async logout(token: string) {
    const { data } = await http.post<{ ok: boolean }>(
      '/api/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )
    return data
  },
  async patchMyProfile(token: string, body: { phone?: string; birthDate?: string | null }) {
    const { data } = await http.patch<{ ok: boolean; user: AuthUser }>('/api/auth/profile', body, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async uploadOwnProfilePhoto(token: string, uri: string, mimeType: string, filename: string) {
    const form = new FormData()
    form.append('file', { uri, name: filename, type: mimeType } as unknown as Blob)
    const { data } = await http.post<{ ok: boolean; user: AuthUser }>('/api/auth/profile-photo', form, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async deleteOwnProfilePhoto(token: string) {
    const { data } = await http.delete<{ ok: boolean; user: AuthUser }>('/api/auth/profile-photo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async parentChildren(token: string) {
    const { data } = await http.get<{ children: Array<{ id: string; name: string; age: number }> }>('/api/parent/children', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async parentReports(token: string, childId: string) {
    const { data } = await http.get<{ reports: Array<{ id: string; notes: string; category?: string; progress_score: number; created_at: string }> }>(
      '/api/parent/reports',
      { params: { childId }, headers: { Authorization: `Bearer ${token}` } },
    )
    return data
  },
  async parentProgress(token: string, childId: string) {
    const { data } = await http.get<{ progress: Array<{ id: string; score: number; date: string; activityTitle?: string }> }>(
      '/api/parent/progress',
      { params: { childId }, headers: { Authorization: `Bearer ${token}` } },
    )
    return data
  },
  async parentSaveActivityProgress(
    token: string,
    params: { childId: string; activityTitle: string; score: number; date?: string },
  ) {
    const { data } = await http.post<{ progress: { id: string; score: number; date: string; activityTitle?: string } }>(
      '/api/parent/progress/activity',
      params,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    return data
  },
  async parentDailyCheckins(token: string, childId: string) {
    const { data } = await http.get<{
      checkins: Array<{
        id: string
        checkin_date: string
        mood?: string | null
        sleep_hours?: number | null
        appetite?: string | null
        meltdowns?: number | null
        notes?: string | null
        created_at?: string
      }>
    }>('/api/parent/daily-checkins', {
      params: { childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async parentUpsertDailyCheckin(
    token: string,
    params: {
      childId: string
      checkinDate: string
      mood?: string | null
      sleepHours?: number | null
      appetite?: string | null
      meltdowns?: number | null
      notes?: string | null
    },
  ) {
    const { data } = await http.post<{ checkin: Record<string, unknown> }>('/api/parent/daily-checkins', params, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async parentSteps(token: string, childId: string) {
    const { data } = await http.get<{
      steps: Array<{ id: string; childId: string; therapistId: string; title: string; body: string; category?: string | null; createdAt: string }>
    }>('/api/parent/parent-steps', {
      params: { childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async parentNotifications(token: string) {
    const { data } = await http.get<{
      notifications: Array<{
        id: string
        type: 'message' | 'step' | 'announcement' | 'report' | 'system'
        title: string
        body: string
        createdAt: string
        childId?: string | null
      }>
    }>('/api/parent/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async announcements(token: string) {
    const { data } = await http.get<{
      announcements: Array<{
        id: string
        title: string
        body: string
        audience: string
        priority: string
        createdAt: string
      }>
    }>('/api/announcements', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async sendSupportRequest(token: string, params: { subject: string; message: string; childId?: string | null }) {
    const { data } = await http.post<{
      request: {
        id: string
        userId: string | null
        role: string | null
        childId: string | null
        subject: string
        message: string
        status: string
        createdAt: string
      }
    }>('/api/support/requests', params, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async chatMessages(token: string, childId: string) {
    const { data } = await http.get<{
      messages: Array<{ id: string; senderId: string; senderRole: string; text: string; createdAt: string }>
    }>('/api/chat/messages', {
      params: { childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async sendChatMessage(token: string, params: { childId: string; text: string }) {
    const { data } = await http.post<{
      message: { id: string; senderId: string; senderRole: string; text: string; createdAt: string }
    }>('/api/chat/messages', params, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async deleteChatMessage(token: string, messageId: string, childId: string) {
    const { data } = await http.delete<{ ok: boolean }>(`/api/chat/messages/${encodeURIComponent(messageId)}`, {
      params: { childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async sendVoiceNote(token: string, params: { childId: string; uri: string; mimeType?: string }) {
    const form = new FormData()
    form.append('childId', params.childId)
    form.append('file', {
      uri: params.uri,
      name: `voice-note-${Date.now()}.m4a`,
      type: params.mimeType || 'audio/m4a',
    } as unknown as Blob)
    const { data } = await http.post<{
      message: { id: string; senderId: string; senderRole: string; text: string; createdAt: string }
    }>('/api/chat/voice-note', form, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  async voiceNoteUrl(token: string, params: { childId: string; path: string }) {
    const { data } = await http.get<{ url: string }>('/api/chat/voice-note-url', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async sendChatImage(token: string, params: { childId: string; uri: string; mimeType?: string; fileName?: string }) {
    const form = new FormData()
    form.append('childId', params.childId)
    form.append('file', {
      uri: params.uri,
      name: params.fileName || `chat-image-${Date.now()}.jpg`,
      type: params.mimeType || 'image/jpeg',
    } as unknown as Blob)
    const { data } = await http.post<{
      message: { id: string; senderId: string; senderRole: string; text: string; createdAt: string }
    }>('/api/chat/image', form, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  async chatImageUrl(token: string, params: { childId: string; path: string }) {
    const { data } = await http.get<{ url: string }>('/api/chat/image-url', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async teacherChildren(token: string) {
    const { data } = await http.get<{ children: Array<{ id: string; name: string; age: number }> }>('/api/teacher/children', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async teacherOverview(token: string) {
    const { data } = await http.get<{ counts: Record<string, number> }>('/api/teacher/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async teacherProgress(token: string, childId: string) {
    const { data } = await http.get<{ progress: Array<{ id: string; score: number; date: string; activityTitle?: string }> }>(
      '/api/teacher/progress',
      { params: { childId }, headers: { Authorization: `Bearer ${token}` } },
    )
    return data
  },

  /** Coordinator + School Admin: roster stats for mobile summary. */
  async managerChildren(token: string) {
    const { data } = await http.get<{ children: Array<{ id: string; name: string; age: number}> }>('/api/manager/children', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async managerUsers(token: string) {
    const { data } = await http.get<{ users: Array<{ id: string; role: string | null }> }>('/api/manager/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  async managerSessions(token: string) {
    const { data } = await http.get<{
      sessions: Array<{ id: string; childId?: string; therapistId?: string; date: string; status: string }>
    }>('/api/manager/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
  /** School Admin only — pending registration queue. */
  async adminRegistrationRequests(token: string, params?: { status?: string }) {
    const { data } = await http.get<{ requests: Array<{ id: string; status?: string }> }>('/api/admin/registration-requests', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
}

export { API_BASE_URL }

