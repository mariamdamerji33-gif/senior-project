import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { screenLayout } from '../../../theme/layout'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentCalendar'>
type TimelineItem = {
  id: string
  type: 'checkin' | 'step' | 'report' | 'activity'
  title: string
  body: string
  date: string
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'No date'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function iconFor(type: TimelineItem['type']) {
  if (type === 'checkin') return '✓'
  if (type === 'step') return '!'
  if (type === 'report') return 'R'
  return '★'
}

export function ParentCalendarScreen({ route, navigation }: Props) {
  const { token } = useAuth()
  const { isArabic } = useLanguage()
  const { childId, childName } = route.params
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const copy = isArabic
    ? {
        eyebrow: 'العائلة',
        title: 'تقويم العائلة',
        lead: 'ملخص واضح للأيام، المتابعات، خطوات المعلم، والتقارير.',
        refresh: 'تحديث التقويم',
        loading: 'جاري التحميل...',
        empty: 'لا توجد أحداث بعد.',
        student: 'الطفل',
        back: '← اليوم',
      }
    : {
        eyebrow: 'Family',
        title: 'Family calendar',
        lead: 'A simple timeline for check-ins, teacher steps, reports, and activities.',
        refresh: 'Refresh calendar',
        loading: 'Loading...',
        empty: 'No timeline events yet.',
        student: 'Student',
        back: '← Today',
      }

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  )

  const loadCalendar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [reportsRes, progressRes, checkinsRes, stepsRes] = await Promise.all([
        api.parentReports(token, childId),
        api.parentProgress(token, childId),
        api.parentDailyCheckins(token, childId),
        api.parentSteps(token, childId),
      ])

      const next: TimelineItem[] = [
        ...(checkinsRes.checkins || []).map((item) => ({
          id: `checkin-${item.id}`,
          type: 'checkin' as const,
          title: isArabic ? 'متابعة يومية' : 'Daily check-in',
          body: `${isArabic ? 'المزاج' : 'Mood'}: ${item.mood || '-'} | ${isArabic ? 'النوم' : 'Sleep'}: ${item.sleep_hours ?? '-'}h | ${isArabic ? 'الشهية' : 'Appetite'}: ${item.appetite || '-'}`,
          date: item.checkin_date || item.created_at || '',
        })),
        ...(stepsRes.steps || []).map((item) => ({
          id: `step-${item.id}`,
          type: 'step' as const,
          title: item.title,
          body: item.body,
          date: item.createdAt,
        })),
        ...(reportsRes.reports || []).map((item) => ({
          id: `report-${item.id}`,
          type: 'report' as const,
          title: isArabic ? 'تقرير جديد' : 'New report',
          body: `${isArabic ? 'الدرجة' : 'Score'}: ${item.progress_score ?? '-'} | ${item.notes || ''}`,
          date: item.created_at,
        })),
        ...(progressRes.progress || []).map((item) => ({
          id: `activity-${item.id}`,
          type: 'activity' as const,
          title: item.activityTitle || (isArabic ? 'نشاط الطفل' : 'Child activity'),
          body: `${isArabic ? 'الدرجة' : 'Score'}: ${item.score ?? '-'}`,
          date: item.date,
        })),
      ]
      setItems(next.slice(0, 40))
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCalendar()
  }, [childId, token, isArabic])

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={`${copy.student}: ${childName || '—'}`}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.back}
      rtl={isArabic}
    >
      <Text style={[screenLayout.introText, isArabic && styles.rtlText]}>{copy.lead}</Text>

      <Pressable style={appButton.primary} onPress={() => void loadCalendar()}>
        <Text style={[appButton.primaryText, styles.refreshText]}>{loading ? copy.loading : copy.refresh}</Text>
      </Pressable>

      {loadError ? (
        <InlineLoadError
          title={isArabic ? 'تعذر تحميل التقويم' : 'Could not load calendar'}
          message={loadError}
          onRetry={() => void loadCalendar()}
          retrying={loading}
          loadingLabel={copy.loading}
          retryLabel={isArabic ? 'حاول مرة أخرى' : 'Try again'}
          rtl={isArabic}
        />
      ) : null}

      {sorted.length === 0 && !loading && !loadError ? (
        <ScreenCard>
          <Text style={[styles.empty, isArabic && styles.rtlText]}>{copy.empty}</Text>
        </ScreenCard>
      ) : null}

      <View style={styles.timeline}>
        {sorted.map((item) => (
          <ScreenCard key={item.id}>
            <View style={[styles.item, isArabic && styles.itemRtl]}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{iconFor(item.type)}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={[styles.itemDate, isArabic && styles.rtlText]}>{formatDate(item.date)}</Text>
                <Text style={[styles.itemTitle, isArabic && styles.rtlText]}>{item.title}</Text>
                <Text style={[styles.itemText, isArabic && styles.rtlText]}>{item.body}</Text>
              </View>
            </View>
          </ScreenCard>
        ))}
      </View>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  refreshText: { textAlign: 'center' },
  empty: { color: '#6d6485', textAlign: 'center', fontWeight: '600' },
  timeline: { gap: 10 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  itemRtl: { flexDirection: 'row-reverse' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f4f1fb', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#5f3dc9', fontWeight: '900', fontSize: 16 },
  itemBody: { flex: 1, gap: 4 },
  itemDate: { color: '#7c7392', fontSize: 12, fontWeight: '800' },
  itemTitle: { color: '#17131f', fontWeight: '900', fontSize: 16 },
  itemText: { color: '#534c62', lineHeight: 20, fontWeight: '600' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
})
