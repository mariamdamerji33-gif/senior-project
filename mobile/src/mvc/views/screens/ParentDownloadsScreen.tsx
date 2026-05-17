import { useMemo, useState } from 'react'
import { Pressable, Share, StyleSheet, Text } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentDownloads'>

function asDate(input?: string) {
  const d = new Date(String(input || ''))
  if (Number.isNaN(d.getTime())) return null
  return d
}

function inRange(input: string | undefined, days: number) {
  const d = asDate(input)
  if (!d) return false
  const ms = Date.now() - d.getTime()
  return ms >= 0 && ms <= days * 24 * 60 * 60 * 1000
}

export function ParentDownloadsScreen({ route, navigation }: Props) {
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const { childId, childName } = route.params
  const [loading, setLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const [lastScope, setLastScope] = useState<'today' | 'week' | 'full'>('today')
  const isEn = language === 'en'
  const copy = {
    reportTitle: isEn ? 'Parent Report' : 'تقرير ولي الأمر',
    studentFallback: isEn ? 'Student' : 'الطفل',
    rangeLabel: isEn ? 'Range' : 'المدة',
    rangeToday: isEn ? 'Today' : 'اليوم',
    rangeWeek: isEn ? 'Last 7 days' : 'آخر 7 أيام',
    rangeAll: isEn ? 'All time' : 'كل الفترة',
    generated: isEn ? 'Generated' : 'تاريخ الإنشاء',
    summary: isEn ? 'Summary' : 'ملخص',
    reportsCount: isEn ? 'Reports count' : 'عدد التقارير',
    activitiesCount: isEn ? 'Activity records' : 'نتائج الأنشطة',
    checkinsCount: isEn ? 'Daily check-ins' : 'المتابعات اليومية',
    chatsCount: isEn ? 'Chat messages' : 'رسائل المحادثة',
    avgScore: isEn ? 'Average progress score' : 'متوسط درجة التقدم',
    latestReport: isEn ? 'Latest report score' : 'آخر درجة تقرير',
    latestCheckin: isEn ? 'Latest check-in' : 'آخر متابعة',
    mood: isEn ? 'mood' : 'المزاج',
    sleep: isEn ? 'sleep' : 'النوم',
    na: isEn ? 'n/a' : 'لا يوجد',
    notes: isEn ? 'Notes' : 'ملاحظات',
    dataSource:
      isEn
        ? 'This summary is generated from parent mobile data sources (reports, progress, check-ins, and chat).'
        : 'هذا الملخص تم إنشاؤه من بيانات تطبيق ولي الأمر (التقارير، التقدم، المتابعات، والمحادثة).',
    unknownError: isEn ? 'Unknown error' : 'خطأ غير معروف',
    eyebrow: isEn ? 'Export' : 'تصدير',
    title: isEn ? 'Downloads' : 'التحميلات',
    childFallback: isEn ? 'Your child' : 'طفلك',
    backToday: isEn ? '← Today' : '← اليوم',
    exportFailed: isEn ? 'Could not generate or share export' : 'تعذر إنشاء أو مشاركة الملف',
    exportHint: isEn ? 'Check your connection, then try a download again.' : 'تحقق من الاتصال ثم أعد المحاولة.',
    preparing: isEn ? 'Preparing...' : 'جاري التحضير...',
    retryExport: isEn ? 'Try export again' : 'إعادة المحاولة',
    downloadToday: isEn ? 'Download today summary' : 'تحميل ملخص اليوم',
    downloadWeek: isEn ? 'Download weekly report' : 'تحميل تقرير الأسبوع',
    downloadFull: isEn ? 'Download full history' : 'تحميل السجل الكامل',
    previewTitle: isEn ? 'Last generated preview' : 'آخر معاينة تم إنشاؤها',
    previewEmpty: isEn ? 'Generate any report to preview and share it here.' : 'أنشئ أي تقرير لمعاينته ومشاركته هنا.',
  }

  const title = useMemo(() => `${copy.reportTitle} - ${childName || copy.studentFallback}`, [childName, copy.reportTitle, copy.studentFallback])

  const buildAndShare = async (scope: 'today' | 'week' | 'full') => {
    if (!token) return
    setLoading(true)
    try {
      setLastScope(scope)
      setExportError(null)
      const [reportsRes, progressRes, checkinsRes, chatRes] = await Promise.all([
        api.parentReports(token, childId),
        api.parentProgress(token, childId),
        api.parentDailyCheckins(token, childId),
        api.chatMessages(token, childId),
      ])

      const reports = reportsRes.reports || []
      const progress = progressRes.progress || []
      const checkins = checkinsRes.checkins || []
      const chats = chatRes.messages || []

      const filteredReports =
        scope === 'today'
          ? reports.filter((r) => inRange(r.created_at, 1))
          : scope === 'week'
            ? reports.filter((r) => inRange(r.created_at, 7))
            : reports
      const filteredProgress =
        scope === 'today'
          ? progress.filter((p) => inRange(p.date, 1))
          : scope === 'week'
            ? progress.filter((p) => inRange(p.date, 7))
            : progress
      const filteredCheckins =
        scope === 'today'
          ? checkins.filter((c) => inRange(c.checkin_date, 1))
          : scope === 'week'
            ? checkins.filter((c) => inRange(c.checkin_date, 7))
            : checkins
      const filteredChats =
        scope === 'today'
          ? chats.filter((m) => inRange(m.createdAt, 1))
          : scope === 'week'
            ? chats.filter((m) => inRange(m.createdAt, 7))
            : chats

      const progressAvg = filteredProgress.length
        ? Math.round(filteredProgress.reduce((sum, p) => sum + Number(p.score || 0), 0) / filteredProgress.length)
        : null

      const body =
        `${title}\n` +
        `${copy.rangeLabel}: ${scope === 'today' ? copy.rangeToday : scope === 'week' ? copy.rangeWeek : copy.rangeAll}\n` +
        `${copy.generated}: ${new Date().toLocaleString()}\n\n` +
        `${copy.summary}\n` +
        `- ${copy.reportsCount}: ${filteredReports.length}\n` +
        `- ${copy.activitiesCount}: ${filteredProgress.length}\n` +
        `- ${copy.checkinsCount}: ${filteredCheckins.length}\n` +
        `- ${copy.chatsCount}: ${filteredChats.length}\n` +
        `- ${copy.avgScore}: ${progressAvg ?? copy.na}\n\n` +
        `${copy.latestReport}: ${
          typeof filteredReports[0]?.progress_score === 'number' ? filteredReports[0].progress_score : copy.na
        }\n` +
        `${copy.latestCheckin}: ${
          filteredCheckins[0]
            ? `${filteredCheckins[0].checkin_date} | ${copy.mood}: ${filteredCheckins[0].mood || copy.na} | ${copy.sleep}: ${
                filteredCheckins[0].sleep_hours ?? copy.na
              }`
            : copy.na
        }\n\n` +
        `${copy.notes}\n` +
        `${copy.dataSource}`

      setPreview(body)
      await Share.share({ title, message: body })
    } catch (e) {
      setExportError(e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={childName || copy.childFallback}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.backToday}
      rtl={isArabic}
    >
      {exportError ? (
        <InlineLoadError
          title={copy.exportFailed}
          message={exportError}
          hint={copy.exportHint}
          onRetry={() => void buildAndShare(lastScope)}
          retrying={loading}
          loadingLabel={copy.preparing}
          retryLabel={copy.retryExport}
          rtl={isArabic}
        />
      ) : null}

      <Pressable style={[appButton.primary, loading && appButton.disabled]} disabled={loading} onPress={() => void buildAndShare('today')}>
        <Text style={[appButton.primaryText, styles.btnCenter]}>{loading ? copy.preparing : copy.downloadToday}</Text>
      </Pressable>
      <Pressable style={[appButton.primary, loading && appButton.disabled]} disabled={loading} onPress={() => void buildAndShare('week')}>
        <Text style={[appButton.primaryText, styles.btnCenter]}>{loading ? copy.preparing : copy.downloadWeek}</Text>
      </Pressable>
      <Pressable style={[appButton.primary, loading && appButton.disabled]} disabled={loading} onPress={() => void buildAndShare('full')}>
        <Text style={[appButton.primaryText, styles.btnCenter]}>{loading ? copy.preparing : copy.downloadFull}</Text>
      </Pressable>

      <ScreenCard>
        <Text style={[styles.previewTitle, isArabic && styles.rtl]}>{copy.previewTitle}</Text>
        <Text style={[styles.previewText, isArabic && styles.rtl]}>{preview || copy.previewEmpty}</Text>
      </ScreenCard>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  btnCenter: { textAlign: 'center' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  previewTitle: { color: '#17131f', fontWeight: '900', fontSize: 15 },
  previewText: { color: '#534c62', lineHeight: 21, fontWeight: '600' },
})
