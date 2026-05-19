import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { useFocusEffect } from '@react-navigation/native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'

type WeeklySummary = {
  childName: string
  reportAverage: number | null
  progressAverage: number | null
  totalCheckins: number
  latestMood: string
  averageSleep: number | null
  totalMeltdowns: number
  hardMoodDays: number
  totalMessages: number
  totalSteps: number
  generatedAt: string
}

function avg(values: number[]) {
  if (!values.length) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function extractMood(checkin: { mood?: string | null; notes?: string | null } | undefined) {
  if (!checkin) return 'n/a'
  if (checkin.mood) return checkin.mood
  const match = String(checkin.notes || '').match(/^Mood:\s*([^\n]+)/i)
  return match?.[1]?.trim() || 'n/a'
}

function summaryHtml(summary: WeeklySummary) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #1f1630; padding: 24px; }
        h1 { color: #1e40af; margin: 0 0 12px; }
        .meta { color: #64748b; margin-bottom: 16px; }
        .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #f8fafc; }
        .title { font-size: 14px; color: #475569; margin-bottom: 4px; }
        .value { font-size: 22px; font-weight: 700; color: #0f172a; }
      </style>
    </head>
    <body>
      <h1>Weekly Parent Summary</h1>
      <div class="meta">Child: ${escapeHtml(summary.childName)}<br/>Generated: ${escapeHtml(new Date(summary.generatedAt).toLocaleString())}</div>
      <div class="card"><div class="title">Report average</div><div class="value">${summary.reportAverage ?? 'n/a'}</div></div>
      <div class="card"><div class="title">Activity progress average</div><div class="value">${summary.progressAverage ?? 'n/a'}</div></div>
      <div class="card"><div class="title">Daily check-ins this week</div><div class="value">${summary.totalCheckins}</div></div>
      <div class="card"><div class="title">Latest mood</div><div class="value">${escapeHtml(summary.latestMood)}</div></div>
      <div class="card"><div class="title">Average sleep</div><div class="value">${summary.averageSleep ?? 'n/a'}</div></div>
      <div class="card"><div class="title">Meltdowns logged</div><div class="value">${summary.totalMeltdowns}</div></div>
      <div class="card"><div class="title">Hard mood days</div><div class="value">${summary.hardMoodDays}</div></div>
      <div class="card"><div class="title">Messages this week</div><div class="value">${summary.totalMessages}</div></div>
      <div class="card"><div class="title">Teacher steps this week</div><div class="value">${summary.totalSteps}</div></div>
    </body>
  </html>`
}

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentWeeklySummary'>

export function ParentWeeklySummaryScreen({ navigation }: Props) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      setLoadError(null)
      const childrenRes = await api.parentChildren(token)
      const child = childrenRes.children?.[0]
      if (!child) {
        setSummary(null)
        setLoadError(null)
        return
      }
      const [reportsRes, progressRes, checkinsRes, chatRes, stepsRes] = await Promise.all([
        api.parentReports(token, child.id),
        api.parentProgress(token, child.id),
        api.parentDailyCheckins(token, child.id),
        api.chatMessages(token, child.id),
        api.parentSteps(token, child.id),
      ])

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const reports = (reportsRes.reports || []).filter((r) => new Date(r.created_at).getTime() >= weekAgo)
      const progress = (progressRes.progress || []).filter((p) => new Date(p.date).getTime() >= weekAgo)
      const checkins = (checkinsRes.checkins || []).filter((c) => new Date(c.checkin_date).getTime() >= weekAgo)
      const chats = (chatRes.messages || []).filter((m) => new Date(m.createdAt).getTime() >= weekAgo)
      const steps = (stepsRes.steps || []).filter((s) => new Date(s.createdAt).getTime() >= weekAgo)
      const sleepValues = checkins
        .map((c) => Number(c.sleep_hours))
        .filter((v) => Number.isFinite(v))
      const moods = checkins.map((c) => extractMood(c).toLowerCase())

      setSummary({
        childName: child.name,
        reportAverage: avg(reports.map((r) => Number(r.progress_score || 0))),
        progressAverage: avg(progress.map((p) => Number(p.score || 0))),
        totalCheckins: checkins.length,
        latestMood: extractMood(checkins[0]),
        averageSleep: avg(sleepValues),
        totalMeltdowns: checkins.reduce((sum, c) => sum + (Number(c.meltdowns) || 0), 0),
        hardMoodDays: moods.filter((mood) => ['hard', 'sad', 'upset', 'angry'].includes(mood)).length,
        totalMessages: chats.length,
        totalSteps: steps.length,
        generatedAt: new Date().toISOString(),
      })
      setShareError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [token]),
  )

  const canShare = useMemo(() => Boolean(summary), [summary])

  const sharePdf = async () => {
    if (!summary) return
    setSharing(true)
    try {
      setShareError(null)
      const available = await Sharing.isAvailableAsync()
      if (!available) {
        setShareError('Sharing is not available on this device.')
        return
      }
      const html = summaryHtml(summary)
      const { uri } = await Print.printToFileAsync({ html })
      await Sharing.shareAsync(uri, { dialogTitle: 'Weekly Parent Summary' })
      setShareError(null)
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSharing(false)
    }
  }

  return (
    <ScreenScrollPage
      eyebrow="This week"
      title="Weekly summary"
      subtitle="At-a-glance for your child"
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel="← Today"
    >
      <Pressable style={appButton.secondary} onPress={() => void load()}>
        <Text style={[appButton.secondaryText, styles.refreshText]}>{loading ? 'Refreshing...' : 'Refresh weekly data'}</Text>
      </Pressable>

      {loadError ? (
        <InlineLoadError
          title="Could not load weekly summary"
          message={loadError}
          onRetry={() => void load()}
          retrying={loading}
          loadingLabel="Refreshing..."
        />
      ) : null}

      {!summary && !loadError ? (
        <ScreenCard>
          <Text style={styles.empty}>No child linked yet.</Text>
        </ScreenCard>
      ) : null}

      {summary ? (
        <>
          <ScreenCard>
            <Text style={styles.cardTitle}>Child</Text>
            <Text style={styles.cardValue}>{summary.childName}</Text>
          </ScreenCard>
          <View style={styles.grid}>
            <View style={styles.miniCard}>
              <Text style={styles.miniTitle}>Report avg</Text>
              <Text style={styles.miniValue}>{summary.reportAverage ?? 'n/a'}</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniTitle}>Progress avg</Text>
              <Text style={styles.miniValue}>{summary.progressAverage ?? 'n/a'}</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniTitle}>Check-ins</Text>
              <Text style={styles.miniValue}>{summary.totalCheckins}</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniTitle}>Messages</Text>
              <Text style={styles.miniValue}>{summary.totalMessages}</Text>
            </View>
          </View>
          <ScreenCard>
            <Text style={styles.cardTitle}>Latest mood</Text>
            <Text style={styles.cardValue}>{summary.latestMood}</Text>
            <Text style={styles.cardSub}>
              Avg. sleep: {summary.averageSleep ?? 'n/a'} hours · Meltdowns: {summary.totalMeltdowns} · Hard days: {summary.hardMoodDays}
            </Text>
            <Text style={styles.cardSub}>Generated: {new Date(summary.generatedAt).toLocaleString()}</Text>
          </ScreenCard>
        </>
      ) : null}

      <Pressable
        style={[appButton.primary, styles.shareBtn, (!canShare || sharing) && appButton.disabled]}
        disabled={!canShare || sharing}
        onPress={() => void sharePdf()}
      >
        <Text style={[appButton.primaryText, styles.shareBtnText]}>{sharing ? 'Preparing PDF...' : 'Share as PDF'}</Text>
      </Pressable>

      {shareError ? <InlineLoadError title="Could not share PDF" message={shareError} /> : null}
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  refreshText: { textAlign: 'center' },
  empty: { color: '#64748b', fontWeight: '600' },
  cardTitle: { color: '#64748b', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  cardSub: { color: '#64748b', fontSize: 12, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    gap: 4,
    shadowColor: '#1e1040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  miniTitle: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  miniValue: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  shareBtn: { marginTop: 8 },
  shareBtnText: { textAlign: 'center' },
})
