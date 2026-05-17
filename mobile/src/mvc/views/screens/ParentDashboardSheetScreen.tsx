import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentDashboardSheet'>
type Child = { id: string; name: string }

export function ParentDashboardSheetScreen({ route, navigation }: Props) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reportScore, setReportScore] = useState<number | null>(null)
  const [avgProgress, setAvgProgress] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestEmotion, setLatestEmotion] = useState<string>('No data')
  const [latestCheckin, setLatestCheckin] = useState<string>('No check-in yet')

  const child = useMemo<Child>(() => ({ id: route.params.childId, name: route.params.childName || 'Selected student' }), [route.params.childId, route.params.childName])

  const loadSheet = async () => {
    if (!token) return
    setLoading(true)
    try {
      setLoadError(null)
      const [reportsRes, progressRes, chatRes, checkinRes] = await Promise.all([
        api.parentReports(token, child.id),
        api.parentProgress(token, child.id),
        api.chatMessages(token, child.id),
        api.parentDailyCheckins(token, child.id),
      ])

      const latestReport = reportsRes.reports?.[0]
      setReportScore(typeof latestReport?.progress_score === 'number' ? latestReport.progress_score : null)

      const recentScores = (progressRes.progress || []).slice(0, 7).map((item) => Number(item.score || 0))
      setAvgProgress(recentScores.length ? Math.round(recentScores.reduce((sum, n) => sum + n, 0) / recentScores.length) : null)

      setUnreadCount((chatRes.messages || []).length)

      const latestFeeling = (progressRes.progress || [])
        .filter((item) => String(item.activityTitle || '').toLowerCase().startsWith('feelings check-in:'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      if (latestFeeling?.activityTitle) {
        const emotion = latestFeeling.activityTitle.split(':')[1]?.split('(')[0]?.trim() || 'Unknown'
        setLatestEmotion(emotion)
      } else {
        setLatestEmotion('No data')
      }

      const lastCheckin = (checkinRes.checkins || [])
        .slice()
        .sort((a, b) => String(b.checkin_date).localeCompare(String(a.checkin_date)))[0]
      if (lastCheckin) {
        setLatestCheckin(
          `${lastCheckin.checkin_date} • mood: ${lastCheckin.mood || 'n/a'} • sleep: ${lastCheckin.sleep_hours ?? 'n/a'}h • meltdowns: ${lastCheckin.meltdowns ?? 'n/a'}`,
        )
      } else {
        setLatestCheckin('No check-in yet')
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSheet()
  }, [token, child.id])

  return (
    <ScreenScrollPage
      eyebrow="Child dashboard"
      title={child.name}
      subtitle="Progress, mood, messages, and check-in at a glance."
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel="← Today"
    >
      <Pressable style={appButton.outline} onPress={() => void loadSheet()}>
        <Text style={[appButton.outlineText, styles.refreshCenter]}>{loading ? 'Refreshing...' : 'Refresh dashboard'}</Text>
      </Pressable>

      {loadError ? (
        <InlineLoadError
          title="Could not load dashboard"
          message={loadError}
          onRetry={() => void loadSheet()}
          retrying={loading}
          loadingLabel="Refreshing..."
        />
      ) : null}

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, styles.statAccentPurple]} />
          <Text style={styles.statLabel}>Report score</Text>
          <Text style={styles.statValue}>{reportScore ?? '—'}</Text>
          <Text style={styles.statHint}>Teacher score</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, styles.statAccentTeal]} />
          <Text style={styles.statLabel}>Activity score</Text>
          <Text style={styles.statValue}>{avgProgress ?? '—'}</Text>
          <Text style={styles.statHint}>Average activity</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, styles.statAccentBlue]} />
          <Text style={styles.statLabel}>Messages</Text>
          <Text style={styles.statValue}>{unreadCount}</Text>
          <Text style={styles.statHint}>Child thread</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, styles.statAccentPink]} />
          <Text style={styles.statLabel}>Feeling</Text>
          <Text style={styles.statValueSmall}>{latestEmotion}</Text>
          <Text style={styles.statHint}>Latest check-in</Text>
        </View>
      </View>

      <ScreenCard>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Activity progress</Text>
          <Text style={styles.panelMeta}>{avgProgress ?? 0}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(avgProgress ?? 0, 100))}%` }]} />
        </View>
        <Text style={styles.line}>
          {avgProgress == null
            ? 'No activity progress yet. Open Child Mode and complete one activity.'
            : avgProgress >= 75
              ? 'Strong progress. Keep the same routine.'
              : avgProgress >= 50
                ? 'Improving. A short daily activity can help.'
                : 'Needs support. Try one simple activity today.'}
        </Text>
      </ScreenCard>

      <ScreenCard>
        <Text style={styles.panelTitle}>Latest daily check-in</Text>
        <Text style={styles.line}>{latestCheckin}</Text>
      </ScreenCard>

      <ScreenCard>
        <Text style={styles.panelTitle}>Suggested next step</Text>
        <Text style={styles.line}>
          {latestEmotion === 'No data'
            ? 'Start with a feelings check-in or daily check-in.'
            : `Based on ${latestEmotion}, keep instructions simple and use visual support.`}
        </Text>
      </ScreenCard>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  refreshCenter: { textAlign: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47.5%',
    minHeight: 118,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 15,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#1e1040',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  statAccentPurple: { backgroundColor: '#6d46d4' },
  statAccentTeal: { backgroundColor: '#0f766e' },
  statAccentBlue: { backgroundColor: '#2563eb' },
  statAccentPink: { backgroundColor: '#be185d' },
  statLabel: { color: '#6d6485', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { color: '#17131f', fontWeight: '900', fontSize: 30 },
  statValueSmall: { color: '#17131f', fontWeight: '900', fontSize: 18 },
  statHint: { color: '#7c7392', fontSize: 11 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: '#17131f', fontWeight: '900', fontSize: 16 },
  panelMeta: { color: '#6d46d4', fontWeight: '900' },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: '#efeafb', overflow: 'hidden', borderWidth: 1, borderColor: '#e3d9fb' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#6d46d4' },
  line: { color: '#534c62', lineHeight: 21, fontWeight: '600' },
})
