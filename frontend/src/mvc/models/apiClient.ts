/**
 * Dev: empty string → same origin + Vite proxy (`/api` → localhost:5000).
 * Deployed builds: set origin only — e.g. `https://api.school.edu` — not `…/api`
 * (every request path below already starts with `/api/…`).
 */
function normalizeApiBase(raw: unknown): string {
  let base = String(raw ?? '').trim()
  if (!base) return ''
  base = base.replace(/\/+$/, '')
  /** e.g. `VITE_API_BASE_URL=http://localhost:5000/api` would otherwise yield `/api/api/…`. */
  if (base.endsWith('/api')) {
    base = base.slice(0, -4).replace(/\/+$/, '')
  }
  return base
}

const resolvedBase =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:5000')
const normalizedApiBaseUrl = normalizeApiBase(resolvedBase)

const networkHint =
  ' Start the backend on port 5000, then use the Vite dev server (`npm run dev`) or preview with the same /api proxy (`npm run preview` — see vite.config). If you opened a built `index.html` from disk or use a static host without a proxy, set VITE_API_BASE_URL to your API origin before building. In deployment, set VITE_API_BASE_URL to the public backend URL.'
const CSRF_HEADER = 'x-csrf-token'
const CLIENT_CHANNEL_HEADER = 'X-ASP-Client'
const WEB_CLIENT_CHANNEL = 'web'
let csrfTokenCache: string | null = null

function fallbackHttpMessage(status: number): string {
  if (status === 401) return 'Your session expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested resource was not found.'
  if (status === 429) return 'Too many requests. Please wait and try again.'
  if (status >= 500) return 'Server error. Please try again in a moment.'
  return `Request failed (${status})`
}

async function request<T>(path: string, options?: RequestInit, csrfAttempt = 0): Promise<T> {
  const method = String(options?.method || 'GET').toUpperCase()
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const callerHeaders = new Headers(options?.headers || {})
  if (!callerHeaders.has(CLIENT_CHANNEL_HEADER)) {
    callerHeaders.set(CLIENT_CHANNEL_HEADER, WEB_CLIENT_CHANNEL)
  }
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const hasBearer = /^Bearer\s+/i.test(callerHeaders.get('Authorization') || '')

  if (isWrite && !hasBearer && !path.endsWith('/api/auth/csrf-token')) {
    if (!csrfTokenCache) {
      const csrfRes = await fetch(`${normalizedApiBaseUrl}/api/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      })
      if (csrfRes.ok) {
        const payload = (await csrfRes.json()) as { token?: string }
        csrfTokenCache = payload?.token || null
      }
    }
    if (csrfTokenCache) callerHeaders.set(CSRF_HEADER, csrfTokenCache)
  }

  let res: Response
  try {
    res = await fetch(`${normalizedApiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...Object.fromEntries(callerHeaders.entries()),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    throw new Error(`${msg}.${networkHint}`)
  }

  const text = await res.text()
  const json = text ? safeJsonParse(text) : null
  const looksLikeHtml = /^\s*</.test(text)

  if (!res.ok) {
    const errPiece = json?.error || json?.message || ''
    const errStr = typeof errPiece === 'string' ? errPiece : ''
    if (
      res.status === 403 &&
      csrfAttempt < 1 &&
      isWrite &&
      /csrf/i.test(errStr)
    ) {
      csrfTokenCache = null
      return request<T>(path, options, csrfAttempt + 1)
    }
    const message =
      errPiece ||
      (res.status === 404 && looksLikeHtml
        ? `Request failed (${res.status}): got HTML, not the API. Use Vite dev (npm run dev) so /api is proxied, or set VITE_API_BASE_URL to your Express server (e.g. http://localhost:5000).`
        : fallbackHttpMessage(res.status))
    const hint = json?.hint ? ` ${json.hint}` : ''
    throw new Error(`${message}${hint}`.trim())
  }

  return json as T
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export const api = {
  /** Public health check (no auth). */
  async health() {
    return request<{ ok: boolean; service?: string; database?: string; ts?: string }>('/api/health', {
      method: 'GET',
    })
  },
  async login(params: { email: string; password: string; role?: string }) {
    csrfTokenCache = null
    return request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  async logout() {
    csrfTokenCache = null
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
  },
  /** Public: register (website staff roles pending until School Admin approves; family is mobile-only). */
  async registerRequest(params: {
    name: string
    email: string
    password: string
    requestedRole: 'super_admin' | 'manager' | 'therapist' | 'parent'
    registrationSource?: 'mobile' | 'website'
  }) {
    return request<{ ok: boolean; message?: string; immediate?: boolean; user?: unknown }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          password: params.password,
          requestedRole: params.requestedRole,
          registrationSource: params.registrationSource ?? 'website',
        }),
      },
    )
  },
  /** Public: status of School Admin registration for an email (for return-visit banner). */
  async registrationStatus(email: string) {
    return request<{
      status: 'active' | 'none' | 'pending' | 'rejected' | 'approved' | 'unknown'
      message?: string
      reject_reason?: string | null
    }>('/api/auth/registration-status', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    })
  },
  /** Public: request password reset email (staff only on server). */
  async forgotPassword(email: string) {
    return request<{
      ok?: boolean
      message?: string
      devNotice?: string
      devResetLink?: string
      devResetToken?: string
    }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    })
  },
  /** Public: complete reset with token from email (or dev link). */
  async resetPassword(payload: { token: string; password: string }) {
    return request<{ ok?: boolean; message?: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: payload.token.trim(),
        password: payload.password,
      }),
    })
  },
  async me(token: string) {
    return request<{ user: any }>('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async patchMyProfile(token: string, body: { phone?: string; birthDate?: string | null }) {
    return request<{ ok: boolean; user: unknown }>('/api/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async uploadMyProfilePhoto(token: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ ok: boolean; user: unknown }>('/api/auth/profile-photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
  },
  async deleteMyProfilePhoto(token: string) {
    return request<{ ok: boolean; user: unknown }>('/api/auth/profile-photo', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async studentProfile(token: string, studentId: string) {
    return request<{ student: any; teacher: any | null; family: any | null }>(
      `/api/student/${encodeURIComponent(studentId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async studentUploadProfilePhoto(token: string, studentId: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ ok: boolean; profilePhotoUrl?: string | null }>(
      `/api/student/${encodeURIComponent(studentId)}/profile-photo`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      },
    )
  },
  async studentDeleteProfilePhoto(token: string, studentId: string) {
    return request<{ ok: boolean }>(
      `/api/student/${encodeURIComponent(studentId)}/profile-photo`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async studentOverview(token: string, studentId: string) {
    return request<{ reports: any[]; sessions: any[]; steps: any[]; plans: any[] }>(
      `/api/student/${encodeURIComponent(studentId)}/overview`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async studentContacts(token: string, studentId: string) {
    return request<{ contacts: any[] }>(`/api/student/${encodeURIComponent(studentId)}/contacts`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async studentCreateContact(
    token: string,
    studentId: string,
    payload: { name: string; relation?: string; phone?: string; email?: string; notes?: string; isEmergency?: boolean },
  ) {
    return request<{ contact: any }>(`/api/student/${encodeURIComponent(studentId)}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async studentDeleteContact(token: string, studentId: string, contactId: string) {
    return request<{ ok: boolean }>(
      `/api/student/${encodeURIComponent(studentId)}/contacts/${encodeURIComponent(contactId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async studentDocuments(token: string, studentId: string) {
    return request<{ documents: any[] }>(`/api/student/${encodeURIComponent(studentId)}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async studentDocumentDownloadUrl(token: string, studentId: string, docId: string) {
    return request<{ url: string }>(
      `/api/student/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(docId)}/download`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async studentDeleteDocument(token: string, studentId: string, docId: string) {
    return request<{ ok: boolean }>(`/api/student/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async adminAnalytics(token: string) {
    return request<{ counts: Record<string, number> }>('/api/admin/analytics', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async adminRegistrationRequests(token: string, status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
    const q = status === 'pending' ? '' : `?status=${encodeURIComponent(status)}`
    return request<{
      requests: any[]
      meta?: { counts?: { pending: number; approved: number; rejected: number; all: number } }
    }>(
      `/api/admin/registration-requests${q}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async adminApproveRegistrationRequest(
    token: string,
    requestId: string,
    payload?: { role?: 'super_admin' | 'manager' | 'therapist' | 'parent' },
  ) {
    return request<{ user: any; message?: string }>(
      `/api/admin/registration-requests/${encodeURIComponent(requestId)}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload || {}),
      },
    )
  },
  async adminReopenRegistrationRequest(token: string, requestId: string) {
    return request<{ request: unknown }>(
      `/api/admin/registration-requests/${encodeURIComponent(requestId)}/reopen`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
    )
  },
  async adminRejectRegistrationRequest(token: string, requestId: string, payload?: { reason?: string }) {
    return request<{ ok: boolean }>(
      `/api/admin/registration-requests/${encodeURIComponent(requestId)}/reject`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload || {}),
      },
    )
  },
  async adminUsers(token: string) {
    return request<{ users?: any[]; admins?: any[] }>('/api/admin/admin-users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async adminCreateUser(
    token: string,
    payload: { name?: string; email: string; password: string; role: 'super_admin' | 'manager' | 'therapist' | 'parent' },
  ) {
    return request<{ user: any }>('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async adminUpdateUser(
    token: string,
    userId: string,
    payload: {
      name?: string
      email?: string
      role?: 'super_admin' | 'manager' | 'therapist' | 'parent'
      password?: string
    },
  ) {
    return request<{ user: any }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async adminDeleteUser(token: string, userId: string) {
    return request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async supportRequests(token: string, status: 'all' | 'sent' | 'in_progress' | 'resolved' = 'all') {
    const q = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`
    return request<{ requests: any[] }>(`/api/support/requests${q}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async updateSupportRequestStatus(
    token: string,
    requestId: string,
    status: 'sent' | 'in_progress' | 'resolved',
  ) {
    return request<{ request: any }>(`/api/support/requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
  },
  async deleteSupportRequest(token: string, requestId: string) {
    const path = `/api/support/requests/${encodeURIComponent(requestId)}`
    const authHeaders = { Authorization: `Bearer ${token}` }
    try {
      return await request<{ ok: boolean }>(path, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ action: 'delete' }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!/API route not found/i.test(msg) && !/invalid support request status/i.test(msg)) throw e
      return request<{ ok: boolean }>(path, {
        method: 'DELETE',
        headers: authHeaders,
      })
    }
  },

  async managerUsers(token: string) {
    return request<{ users: any[] }>('/api/manager/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  /** Coordinator / School Admin: parent (family) account + linked students. */
  async managerParentProfile(token: string, parentUserId: string) {
    return request<{ user: unknown; children: { id: string; name: string; age: number; diagnosis: string | null; therapistId: string | null }[] }>(
      `/api/manager/users/${encodeURIComponent(parentUserId)}/parent-profile`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async managerPatchParentProfile(token: string, parentUserId: string, body: { phone?: string; birthDate?: string | null }) {
    return request<{ ok: boolean; user: unknown }>(`/api/manager/users/${encodeURIComponent(parentUserId)}/parent-profile`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async managerUploadParentProfilePhoto(token: string, parentUserId: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ ok: boolean; user: unknown }>(`/api/manager/users/${encodeURIComponent(parentUserId)}/parent-profile-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
  },
  async managerDeleteParentProfilePhoto(token: string, parentUserId: string) {
    return request<{ ok: boolean; user: unknown }>(`/api/manager/users/${encodeURIComponent(parentUserId)}/parent-profile-photo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async managerChildren(token: string) {
    return request<{ children: any[] }>('/api/manager/children', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async managerCreateChild(
    token: string,
    payload: { name: string; age: number; diagnosis?: string; parentId: string; therapistId: string },
  ) {
    return request<{ child: any }>('/api/manager/children', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async managerPatchChild(
    token: string,
    childId: string,
    payload: { parentId?: string; therapistId?: string },
  ) {
    return request<{ child: any }>(`/api/manager/children/${encodeURIComponent(childId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async managerDeleteChild(token: string, childId: string) {
    return request<{ ok: boolean }>(`/api/manager/children/${encodeURIComponent(childId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async managerSessions(token: string) {
    return request<{ sessions: any[] }>('/api/manager/sessions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async managerAddSession(
    token: string,
    payload: { childId: string; therapistId: string; date: string; status?: string },
  ) {
    return request<{ session: any }>('/api/manager/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async managerPatchSession(
    token: string,
    sessionId: string,
    payload: { date?: string; status?: string },
  ) {
    return request<{ session: any }>(`/api/manager/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async managerDeleteSession(token: string, sessionId: string) {
    return request<{ ok: boolean }>(`/api/manager/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async managerReports(token: string) {
    return request<{ reports: any[] }>('/api/manager/reports', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherOverview(token: string) {
    return request<{ counts: { children: number; activities: number; reports: number; sessions: number } }>(
      '/api/teacher/overview',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  },
  async teacherSessions(token: string) {
    return request<{ sessions: any[] }>('/api/teacher/sessions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherAddSession(token: string, payload: { childId: string; date: string; status?: string }) {
    return request<{ session: any }>('/api/teacher/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchSession(token: string, sessionId: string, payload: { date?: string; status?: string }) {
    return request<{ session: any }>(`/api/teacher/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteSession(token: string, sessionId: string) {
    return request<{ ok: boolean }>(`/api/teacher/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherChildren(token: string) {
    return request<{ children: any[] }>('/api/teacher/children', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherProgress(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ progress: any[] }>(`/api/teacher/progress?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherAddProgress(
    token: string,
    payload: { childId: string; activityId: string; score: number; date?: string },
  ) {
    return request<{ progress: any }>('/api/teacher/progress', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchProgress(token: string, progressId: string, payload: { score?: number; date?: string }) {
    return request<{ progress: any }>(`/api/teacher/progress/${encodeURIComponent(progressId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteProgress(token: string, progressId: string) {
    return request<{ ok: boolean }>(`/api/teacher/progress/${encodeURIComponent(progressId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherReports(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ reports: any[] }>(`/api/teacher/reports?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherAddReport(token: string, payload: { childId: string; notes: string; progressScore: number; category?: string }) {
    return request<{ report: any }>('/api/teacher/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchReport(
    token: string,
    reportId: string,
    payload: { notes?: string; progressScore?: number; category?: string },
  ) {
    return request<{ report: any }>(`/api/teacher/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteReport(token: string, reportId: string) {
    return request<{ ok: boolean }>(`/api/teacher/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherActivities(token: string) {
    return request<{ activities: any[] }>('/api/teacher/activities', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherAddActivity(token: string, payload: { title: string; description: string }) {
    return request<{ activity: any }>('/api/teacher/activities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchActivity(token: string, activityId: string, payload: { title?: string; description?: string }) {
    return request<{ activity: any }>(`/api/teacher/activities/${encodeURIComponent(activityId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteActivity(token: string, activityId: string) {
    return request<{ ok: boolean }>(`/api/teacher/activities/${encodeURIComponent(activityId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async parentChildren(token: string) {
    return request<{ children: any[] }>('/api/parent/children', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentReports(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ reports: any[] }>(`/api/parent/reports?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentProgress(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ progress: any[] }>(`/api/parent/progress?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentTreatment(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ plans: any[] }>(`/api/parent/treatment?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentDailyCheckins(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ checkins: any[] }>(`/api/parent/daily-checkins?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentUpsertDailyCheckin(
    token: string,
    payload: {
      childId: string
      checkinDate: string
      mood?: string | null
      sleepHours?: number | null
      appetite?: string | null
      meltdowns?: number | null
      notes?: string | null
    },
  ) {
    return request<{ checkin: any }>('/api/parent/daily-checkins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async parentSteps(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ steps: any[] }>(`/api/parent/parent-steps?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async parentNotifications(token: string) {
    return request<{ notifications: any[] }>('/api/parent/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async teacherTreatmentPlans(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ plans: any[] }>(`/api/teacher/treatment/plans?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherCreateTreatmentPlan(
    token: string,
    payload: { childId: string; title: string; notes?: string; status?: string; startDate?: string },
  ) {
    return request<{ plan: any }>('/api/teacher/treatment/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchTreatmentPlan(
    token: string,
    planId: string,
    payload: { title?: string; notes?: string | null; status?: string; startDate?: string | null },
  ) {
    return request<{ plan: any }>(`/api/teacher/treatment/plans/${encodeURIComponent(planId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteTreatmentPlan(token: string, planId: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ ok: boolean }>(`/api/teacher/treatment/plans/${encodeURIComponent(planId)}?${qs.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async teacherTreatmentGoals(token: string, planId: string, childId: string) {
    const qs = new URLSearchParams({ planId, childId })
    return request<{ goals: any[] }>(`/api/teacher/treatment/goals?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherCreateTreatmentGoal(
    token: string,
    payload: {
      planId: string
      childId: string
      title: string
      target?: string
      baseline?: string
      status?: string
      dueDate?: string
    },
  ) {
    return request<{ goal: any }>('/api/teacher/treatment/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherPatchTreatmentGoal(
    token: string,
    goalId: string,
    childId: string,
    payload: { title?: string; target?: string | null; baseline?: string | null; status?: string; dueDate?: string | null },
  ) {
    const qs = new URLSearchParams({ childId })
    return request<{ goal: any }>(`/api/teacher/treatment/goals/${encodeURIComponent(goalId)}?${qs.toString()}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteTreatmentGoal(token: string, goalId: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ ok: boolean }>(`/api/teacher/treatment/goals/${encodeURIComponent(goalId)}?${qs.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherDailyCheckins(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ checkins: any[] }>(`/api/teacher/daily-checkins?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherParentSteps(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ steps: any[] }>(`/api/teacher/parent-steps?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async teacherCreateParentStep(
    token: string,
    payload: { childId: string; title: string; body: string; category?: string | null },
  ) {
    return request<{ step: any }>('/api/teacher/parent-steps', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async teacherDeleteParentStep(token: string, id: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ ok: boolean }>(`/api/teacher/parent-steps/${encodeURIComponent(id)}?${qs.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async chatMessages(token: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ messages: any[] }>(`/api/chat/messages?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async chatSend(token: string, payload: { childId: string; text: string }) {
    return request<{ message: any }>('/api/chat/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },
  async chatDeleteMessage(token: string, messageId: string, childId: string) {
    const qs = new URLSearchParams({ childId })
    return request<{ ok: boolean }>(`/api/chat/messages/${encodeURIComponent(messageId)}?${qs.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async chatVoiceNoteUrl(token: string, payload: { childId: string; path: string }) {
    const qs = new URLSearchParams(payload)
    return request<{ url: string }>(`/api/chat/voice-note-url?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async chatSendVoiceNote(token: string, payload: { childId: string; file: Blob }) {
    const form = new FormData()
    form.append('childId', payload.childId)
    form.append('file', payload.file, `voice-note-${Date.now()}.webm`)
    return request<{ message: any }>('/api/chat/voice-note', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  },
  async chatSendImage(token: string, payload: { childId: string; file: File }) {
    const form = new FormData()
    form.append('childId', payload.childId)
    form.append('file', payload.file)
    return request<{ message: any }>('/api/chat/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  },
  async chatImageUrl(token: string, payload: { childId: string; path: string }) {
    const qs = new URLSearchParams(payload)
    return request<{ url: string }>(`/api/chat/image-url?${qs.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

