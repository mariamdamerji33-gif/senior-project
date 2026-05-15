import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../controllers/AuthController'
import { api, API_BASE_URL } from '../../models/api'
import { colors } from '../../../theme/colors'
import type { Role } from '../../../types/auth'

function roleTitle(role: Role): string {
  switch (role) {
    case 'super_admin':
      return 'School Admin'
    case 'manager':
      return 'Coordinator'
    case 'therapist':
      return 'Teacher'
    case 'parent':
      return 'Family'
    default:
      return 'User'
  }
}

type Snapshot = {
  students: number
  sessionsTotal: number
  sessionsUpcoming: number
  usersTotal: number
  teachers: number
  families: number
  coordinators: number
  pendingRegistrations: number | null
  databaseOk: boolean | null
}

function countByRole(users: Array<{ role: string | null }>, r: string) {
  return users.filter((u) => String(u.role || '').toLowerCase() === r).length
}

function countUpcomingSessions(sessions: Array<{ date: string; status: string }>) {
  const now = Date.now()
  return sessions.filter((s) => {
    const t = new Date(s.date).getTime()
    if (Number.isNaN(t)) return false
    if (t < now) return false
    const st = String(s.status || '').toLowerCase()
    return st === 'scheduled' || st === 'confirmed'
  }).length
}

export function AdminManagerHomeScreen() {
  const { user, token } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setRefreshing(false)
      return
    }
    setError(null)
    try {
      const [health, childrenRes, usersRes, sessionsRes] = await Promise.all([
        api.health().catch(() => null),
        api.managerChildren(token),
        api.managerUsers(token),
        api.managerSessions(token),
      ])
      const users = usersRes.users || []
      const sessions = sessionsRes.sessions || []
      let pendingRegistrations: number | null = null
      if (user?.role === 'super_admin') {
        try {
          const reg = await api.adminRegistrationRequests(token, { status: 'pending' })
          pendingRegistrations = (reg.requests || []).length
        } catch {
          pendingRegistrations = null
        }
      }
      setSnapshot({
        students: (childrenRes.children || []).length,
        sessionsTotal: sessions.length,
        sessionsUpcoming: countUpcomingSessions(sessions),
        usersTotal: users.length,
        teachers: countByRole(users, 'therapist'),
        families: countByRole(users, 'parent'),
        coordinators: countByRole(users, 'manager') + countByRole(users, 'super_admin'),
        pendingRegistrations,
        databaseOk:
          health == null ? null : health.database === 'ok' ? true : health.database === 'error' ? false : null,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load summary')
      setSnapshot(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, user])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} colors={[colors.primary]} />
        }
      >
        <Text style={styles.title}>School snapshot</Text>
        <Text style={styles.subtitle}>Welcome, {user?.name || 'User'}.</Text>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Signed in as</Text>
          <Text style={styles.cardValue}>{user?.role ? roleTitle(user.role) : 'User'}</Text>
          <Text style={styles.cardHint}>Heavy workflows stay on the web dashboard. This screen is for a quick live pulse.</Text>
        </View>

        {loading && !snapshot && !error ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading school data…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not refresh</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void load() }}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {snapshot ? (
          <>
            <Text style={styles.sectionLabel}>Roster</Text>
            <View style={styles.grid}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.students}</Text>
                <Text style={styles.metricLabel}>Students</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.teachers}</Text>
                <Text style={styles.metricLabel}>Teachers</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.families}</Text>
                <Text style={styles.metricLabel}>Family accounts</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.coordinators}</Text>
                <Text style={styles.metricLabel}>Admin / coordinators</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Sessions</Text>
            <View style={styles.grid}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.sessionsTotal}</Text>
                <Text style={styles.metricLabel}>Total rows</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{snapshot.sessionsUpcoming}</Text>
                <Text style={styles.metricLabel}>Upcoming (scheduled)</Text>
              </View>
            </View>

            {user?.role === 'super_admin' ? (
              <>
                <Text style={styles.sectionLabel}>Registration</Text>
                <View style={styles.card}>
                  <Text style={styles.cardEyebrow}>Pending requests</Text>
                  <Text style={styles.cardValue}>
                    {snapshot.pendingRegistrations === null ? '—' : String(snapshot.pendingRegistrations)}
                  </Text>
                  <Text style={styles.cardHint}>Approve or reject on the web → Admin → Registration requests.</Text>
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Infrastructure</Text>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>API health</Text>
              <Text style={styles.cardValue}>
                {snapshot.databaseOk === null ? 'Unknown' : snapshot.databaseOk ? 'Database OK' : 'Database issue'}
              </Text>
              <Text style={styles.cardHint}>From GET /api/health (reachable at {API_BASE_URL}).</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: 20, paddingBottom: 32, gap: 6 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textTitle },
  subtitle: { color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  sectionLabel: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    padding: 14,
    gap: 6,
  },
  cardEyebrow: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  cardValue: { fontSize: 22, fontWeight: '900', color: colors.text },
  cardHint: { color: colors.textMuted, lineHeight: 20, fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flexGrow: 1,
    flexBasis: '44%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    padding: 14,
    gap: 4,
  },
  metricValue: { fontSize: 26, fontWeight: '900', color: colors.primaryDark },
  metricLabel: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loadingText: { color: colors.textMuted, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 14,
    gap: 8,
  },
  errorTitle: { color: colors.danger, fontWeight: '900', fontSize: 16 },
  errorBody: { color: '#7f1d1d', fontWeight: '600', lineHeight: 20 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 4,
  },
  retryText: { color: '#fff', fontWeight: '900' },
})
