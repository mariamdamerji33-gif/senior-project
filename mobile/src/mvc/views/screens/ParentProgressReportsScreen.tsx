import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { api } from '../../models/api'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { readCachedJson, writeCachedJson } from '../../../offline/offlineCache'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentProgressReports'>

type ReportItem = { id: string; notes: string; category?: string; progress_score: number; created_at: string }
type ProgressItem = { id: string; score: number; date: string; activityTitle?: string }

function scoreTone(score: number) {
  if (score >= 80) return { bg: '#ecfdf3', border: '#b7ebc7', text: '#166534' }
  if (score >= 60) return { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' }
  return { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' }
}

function formatCategory(category?: string) {
  return String(category || 'general').replace(/_/g, ' ')
}

export function ParentProgressReportsScreen({ route, navigation }: Props) {
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const { childId, childName } = route.params
  const [reports, setReports] = useState<ReportItem[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCachedBanner, setShowCachedBanner] = useState(false)
  const isEn = language === 'en'
  const copy = {
    eyebrow: isEn ? 'Progress' : 'التقدم',
    title: isEn ? 'Reports' : 'التقارير',
    childFallback: isEn ? 'Your child' : 'طفلك',
    backToday: isEn ? '← Today' : '← اليوم',
    refreshing: isEn ? 'Refreshing...' : 'جاري التحديث...',
    refreshData: isEn ? 'Refresh data' : 'تحديث البيانات',
    loadFailedTitle: isEn ? 'Could not load reports' : 'تعذر تحميل التقارير',
    recentReports: isEn ? 'Recent reports' : 'أحدث التقارير',
    noReports: isEn ? 'No reports yet.' : 'لا توجد تقارير بعد.',
    category: isEn ? 'Category' : 'الفئة',
    score: isEn ? 'Score' : 'الدرجة',
    noNotes: isEn ? 'No notes' : 'لا توجد ملاحظات',
    activityProgress: isEn ? 'Activity progress' : 'تقدم الأنشطة',
    noProgress: isEn ? 'No progress entries yet.' : 'لا توجد نتائج أنشطة بعد.',
    activity: isEn ? 'Activity' : 'نشاط',
    unknownError: isEn ? 'Unknown error' : 'خطأ غير معروف',
    cachedBanner: isEn ? 'Offline mode: showing last saved reports.' : 'وضع عدم الاتصال: عرض آخر بيانات محفوظة.',
  }

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [r, p] = await Promise.all([api.parentReports(token, childId), api.parentProgress(token, childId)])
      setReports(r.reports || [])
      setProgress(p.progress || [])
      const cacheKey = `asp_mobile_reports_cache_v1:${childId}`
      await writeCachedJson(cacheKey, { reports: r.reports || [], progress: p.progress || [] })
      setLoadError(null)
      setShowCachedBanner(false)
    } catch (e) {
      const cacheKey = `asp_mobile_reports_cache_v1:${childId}`
      const cached = await readCachedJson<{ reports: ReportItem[]; progress: ProgressItem[] }>(cacheKey, { reports: [], progress: [] })
      if (cached.reports.length || cached.progress.length) {
        setReports(cached.reports)
        setProgress(cached.progress)
        setShowCachedBanner(true)
        setLoadError(null)
      } else {
        setShowCachedBanner(false)
        setLoadError(e instanceof Error ? e.message : copy.unknownError)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [childId, token])

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={childName || copy.childFallback}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.backToday}
      rtl={isArabic}
    >
      <Pressable style={appButton.outline} onPress={() => void loadData()}>
        <Text style={[appButton.outlineText, styles.refreshCenter]}>{loading ? copy.refreshing : copy.refreshData}</Text>
      </Pressable>

      {loadError ? (
        <InlineLoadError
          title={copy.loadFailedTitle}
          message={loadError}
          onRetry={() => void loadData()}
          retrying={loading}
          loadingLabel={copy.refreshing}
          rtl={isArabic}
        />
      ) : null}

      {showCachedBanner ? (
        <ScreenCard style={styles.cachedCard}>
          <Text style={[styles.cachedText, isArabic && styles.rtl]}>{copy.cachedBanner}</Text>
        </ScreenCard>
      ) : null}

      <ScreenCard>
        <Text style={[styles.cardHeading, isArabic && styles.rtl]}>{copy.recentReports}</Text>
        {reports.length === 0 ? (
          <Text style={[styles.empty, isArabic && styles.rtl]}>{copy.noReports}</Text>
        ) : (
          reports.slice(0, 5).map((item, idx) => (
            <View key={item.id} style={idx > 0 ? styles.rowDivider : undefined}>
              <View style={[styles.scoreBadge, { backgroundColor: scoreTone(item.progress_score).bg, borderColor: scoreTone(item.progress_score).border }]}>
                <Text style={[styles.score, { color: scoreTone(item.progress_score).text }, isArabic && styles.rtl]}>
                  {copy.score}: {item.progress_score}
                </Text>
              </View>
              <Text style={[styles.categoryText, isArabic && styles.rtl]}>
                {copy.category}: {formatCategory(item.category)}
              </Text>
              <Text style={[styles.note, isArabic && styles.rtl]}>{item.notes || copy.noNotes}</Text>
            </View>
          ))
        )}
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.cardHeading, isArabic && styles.rtl]}>{copy.activityProgress}</Text>
        {progress.length === 0 ? (
          <Text style={[styles.empty, isArabic && styles.rtl]}>{copy.noProgress}</Text>
        ) : (
          progress.slice(0, 8).map((item, idx) => (
            <View key={item.id} style={idx > 0 ? styles.rowDivider : undefined}>
              <View style={[styles.scoreBadge, { backgroundColor: scoreTone(item.score).bg, borderColor: scoreTone(item.score).border }]}>
                <Text style={[styles.score, { color: scoreTone(item.score).text }, isArabic && styles.rtl]}>
                  {item.activityTitle || copy.activity} — {item.score}
                </Text>
              </View>
              <Text style={[styles.note, isArabic && styles.rtl]}>{item.date}</Text>
            </View>
          ))
        )}
      </ScreenCard>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  refreshCenter: { textAlign: 'center' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  cardHeading: { color: '#0f172a', fontWeight: '900', fontSize: 17, marginBottom: 4 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#dbeafe', paddingTop: 12, marginTop: 12 },
  scoreBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4,
  },
  score: { fontWeight: '900' },
  categoryText: { color: '#475569', marginTop: 2, fontWeight: '800', textTransform: 'capitalize' },
  note: { color: '#64748b', marginTop: 4, lineHeight: 20, fontWeight: '600' },
  empty: { color: '#64748b', fontWeight: '600' },
  cachedCard: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  cachedText: { color: '#92400e', fontWeight: '700' },
})
