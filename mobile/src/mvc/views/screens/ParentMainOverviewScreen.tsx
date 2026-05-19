import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { countUnreadFromOthers, getSeenAt } from '../../../chat/seenState'
import { getOfflineDailyCheckinCount } from '../../../checkin/offlineDailyCheckinQueue'
import { INITIAL_DAILY_TASKS, loadChecklistForToday, markChecklistTaskDone, type DailyTask } from '../../../checklist/parentDailyChecklist'
import { notifyTherapistStepsIfNew, scheduleDailyParentReminder } from '../../../notifications/parentNotifications'
import { useParentInboxUnreadCount } from '../../../notifications/useParentInboxUnreadCount'
import { useLanguage, type AppLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { InlineLoadError } from '../components/InlineLoadError'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { colors } from '../../../theme/colors'
import { useComfortAwareStyles } from '../../../utils/comfortAwareStyles'

type Props = DrawerScreenProps<ParentDrawerParamList, 'MainOverview'>
type ParentProgressItem = { id: string; score: number; date: string; activityTitle?: string }
type ParentStep = { id: string; title: string; body: string; category?: string | null; createdAt: string }

const STEPS_SEEN_PREFIX = 'asp_mobile_steps_seen_v1'
const HOME_COPY = {
  en: {
    familyHome: 'Family home',
    hello: 'Hello',
    fallbackName: 'Parent',
    alerts: 'Alerts',
    alertsA11y: (count: number) => (count > 0 ? `Alerts, ${count} unread` : 'Alerts'),
    startHere: 'Start here',
    selectedChild: 'Child',
    noChild: 'No child linked yet',
    progress: 'Progress',
    feeling: 'Feeling',
    noFeeling: 'Not checked today',
    unreadChat: (count: number) => `${count} new message${count === 1 ? '' : 's'} — open Chat`,
    openChat: 'Open chat',
    urgentSend: 'Need urgent help from school?',
    urgentSending: 'Sending…',
    urgentNoChild: 'Link a student to your account before sending urgent help.',
    urgentSentTitle: 'Request sent',
    urgentSentBody: 'School admin or coordinator will see this in their inbox.',
    urgentSubject: 'Urgent parent help needed',
    urgentMessage: (name: string) => `Parent needs urgent help today for ${name}. Please contact the family as soon as possible.`,
    offlinePending: (count: number) => `${count} daily check-in(s) waiting to sync.`,
    offlineHint: 'Open Daily and tap Sync when you are back online.',
    offlineSyncedToast: 'Offline check-ins synced.',
    loadErrorTitle: 'Could not load data',
    loadErrorHint: 'Check your connection, then try again.',
    loadErrorRetry: 'Try again',
    refreshing: 'Refreshing…',
    checklistTitle: "Today's checklist",
    checklistDone: (done: number, total: number) => `${done}/${total} done`,
    checklistNext: (label: string) => `Next: ${label}`,
    checklistAllDone: 'All done for today.',
    go: 'Go',
    progressStrong: 'Strong',
    progressImproving: 'Improving',
    progressNeedsAttention: 'Needs attention',
    progressNoData: 'No data yet',
    taskLabelCheckin: 'Submit daily check-in',
    taskLabelGame: 'Do one child activity',
    taskLabelChat: 'Read teacher messages',
    taskLabelReview: 'Review progress',
    sendFailed: 'Send failed',
    unknownError: 'Unknown error',
  },
  ar: {
    familyHome: 'صفحة العائلة',
    hello: 'مرحباً',
    fallbackName: 'ولي الأمر',
    alerts: 'تنبيهات',
    alertsA11y: (count: number) => (count > 0 ? `تنبيهات، ${count} غير مقروء` : 'تنبيهات'),
    startHere: 'ابدأ هنا',
    selectedChild: 'الطفل',
    noChild: 'لا يوجد طفل مرتبط بعد',
    progress: 'التقدم',
    feeling: 'الشعور',
    noFeeling: 'لم يُسجَّل اليوم',
    unreadChat: (count: number) => `${count} رسالة جديدة — افتح المحادثة`,
    openChat: 'فتح المحادثة',
    urgentSend: 'تحتاج مساعدة عاجلة من المدرسة؟',
    urgentSending: 'جاري الإرسال…',
    urgentNoChild: 'اربط طفلاً بالحساب قبل إرسال طلب المساعدة.',
    urgentSentTitle: 'تم الإرسال',
    urgentSentBody: 'ستراه الإدارة أو المنسق في صندوق الدعم.',
    urgentSubject: 'طلب مساعدة عاجل من ولي الأمر',
    urgentMessage: (name: string) => `ولي الأمر يحتاج مساعدة عاجلة اليوم بخصوص ${name}. الرجاء التواصل مع العائلة.`,
    offlinePending: (count: number) => `${count} متابعة يومية بانتظار المزامنة.`,
    offlineHint: 'افتح «يومي» واضغط مزامنة عند عودة الإنترنت.',
    offlineSyncedToast: 'تمت مزامنة المتابعات.',
    loadErrorTitle: 'تعذر تحميل البيانات',
    loadErrorHint: 'تحقق من الاتصال ثم حاول مرة أخرى.',
    loadErrorRetry: 'حاول مرة أخرى',
    refreshing: 'جاري التحديث…',
    checklistTitle: 'قائمة اليوم',
    checklistDone: (done: number, total: number) => `${done}/${total} مكتمل`,
    checklistNext: (label: string) => `التالي: ${label}`,
    checklistAllDone: 'اكتمل كل شيء لليوم.',
    go: 'ابدأ',
    progressStrong: 'قوي',
    progressImproving: 'يتحسن',
    progressNeedsAttention: 'يحتاج متابعة',
    progressNoData: 'لا توجد بيانات بعد',
    taskLabelCheckin: 'إرسال متابعة اليوم',
    taskLabelGame: 'نشاط واحد للطفل',
    taskLabelChat: 'قراءة رسائل المعلم',
    taskLabelReview: 'مراجعة التقدم',
    sendFailed: 'فشل الإرسال',
    unknownError: 'خطأ غير معروف',
  },
}

function latestFeelingFromProgress(progress: ParentProgressItem[]) {
  const feelings = (progress || [])
    .filter((item) => (item.activityTitle || '').toLowerCase().startsWith('feelings check-in:'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const latest = feelings[0]
  if (!latest) return null
  const title = latest.activityTitle || ''
  const afterPrefix = title.split(':')[1] || ''
  const rawLabel = afterPrefix.split('(')[0]?.trim() || 'Unknown'
  return { label: rawLabel, date: latest.date }
}

function progressHealth(avg: number | null, language: AppLanguage) {
  const copy = HOME_COPY[language]
  if (avg == null) return copy.progressNoData
  if (avg >= 80) return copy.progressStrong
  if (avg >= 60) return copy.progressImproving
  return copy.progressNeedsAttention
}

function localizeTaskLabel(task: DailyTask, language: AppLanguage) {
  const copy = HOME_COPY[language]
  if (task.id === 'checkin') return copy.taskLabelCheckin
  if (task.id === 'game') return copy.taskLabelGame
  if (task.id === 'chat') return copy.taskLabelChat
  if (task.id === 'review') return copy.taskLabelReview
  return task.label
}

export function ParentMainOverviewScreen({ navigation }: Props) {
  const { token, user } = useAuth()
  const { language, setLanguage, isArabic } = useLanguage()
  const { textScale, appColors, highContrast } = useDisplayComfort()
  const s = useComfortAwareStyles(styles, textScale, appColors, highContrast)
  const copy = HOME_COPY[language]
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [firstChild, setFirstChild] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [todayEmotion, setTodayEmotion] = useState<{ label: string; date: string } | null>(null)
  const [recentAverage, setRecentAverage] = useState<number | null>(null)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(INITIAL_DAILY_TASKS)
  const [parentSteps, setParentSteps] = useState<ParentStep[]>([])
  const [newStepsCount, setNewStepsCount] = useState(0)
  const [urgentSending, setUrgentSending] = useState(false)
  const [offlinePendingCount, setOfflinePendingCount] = useState(0)
  const [showOfflineSyncedToast, setShowOfflineSyncedToast] = useState(false)
  const [homeLoadError, setHomeLoadError] = useState<string | null>(null)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const [inboxPollKey, setInboxPollKey] = useState(0)
  const notificationsUnread = useParentInboxUnreadCount(token, user?.id, inboxPollKey)
  const previousOfflinePendingRef = useRef(0)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedTasks = useMemo(() => dailyTasks.filter((task) => task.done).length, [dailyTasks])
  const checklistPercent = useMemo(
    () => (dailyTasks.length ? Math.round((completedTasks / dailyTasks.length) * 100) : 0),
    [completedTasks, dailyTasks.length],
  )
  const nextTask = useMemo(() => dailyTasks.find((task) => !task.done) || null, [dailyTasks])
  const localizedNextTaskLabel = useMemo(() => (nextTask ? localizeTaskLabel(nextTask, language) : null), [language, nextTask])

  const loadHome = async (opts?: { silent?: boolean }) => {
    if (!token) return
    if (!opts?.silent) setLoading(true)
    try {
      setHomeLoadError(null)
      setOfflinePendingCount(await getOfflineDailyCheckinCount())
      const c = await api.parentChildren(token)
      const childList = (c.children || []).map((item) => ({ id: item.id, name: item.name }))
      const selected = childList.find((item) => item.id === selectedChildId)
      const first = selected || childList[0]
      if (!first) {
        setFirstChild(null)
        setSelectedChildId(null)
        setChatUnread(0)
        setTodayEmotion(null)
        setRecentAverage(null)
        setParentSteps([])
        setNewStepsCount(0)
        return
      }
      if (selectedChildId !== first.id) setSelectedChildId(first.id)
      setFirstChild({ id: first.id, name: first.name })
      const [p, chatRes, seenAt] = await Promise.all([
        api.parentProgress(token, first.id),
        api.chatMessages(token, first.id),
        user?.id ? getSeenAt(user.id, first.id) : Promise.resolve(0),
      ])
      setChatUnread(countUnreadFromOthers(chatRes.messages || [], user?.id, seenAt))
      setTodayEmotion(latestFeelingFromProgress(p.progress || []))
      const progressItems = p.progress || []
      const recent = progressItems.slice(0, 5).map((item) => Number(item.score || 0))
      setRecentAverage(recent.length ? Math.round(recent.reduce((sum, val) => sum + val, 0) / recent.length) : null)

      try {
        const stepsRes = await api.parentSteps(token, first.id)
        const steps = (stepsRes.steps || []).slice(0, 5)
        setParentSteps(steps)
        const seenKey = `${STEPS_SEEN_PREFIX}:${first.id}`
        const seenRaw = await AsyncStorage.getItem(seenKey)
        const seenAtSteps = seenRaw ? new Date(seenRaw).getTime() : 0
        const unread = steps.filter((step) => new Date(step.createdAt).getTime() > seenAtSteps).length
        setNewStepsCount(unread)
      } catch {
        setParentSteps([])
        setNewStepsCount(0)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : copy.unknownError
      setHomeLoadError(msg)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadHome()
  }, [token, user?.id, selectedChildId])

  useEffect(() => {
    void scheduleDailyParentReminder()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadChecklist = async () => {
      if (!firstChild?.id) {
        setDailyTasks(INITIAL_DAILY_TASKS)
        return
      }
      const loaded = await loadChecklistForToday(firstChild.id)
      if (cancelled) return
      setDailyTasks(loaded)
    }
    void loadChecklist()
    return () => {
      cancelled = true
    }
  }, [firstChild?.id])

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setInboxPollKey((k) => k + 1)
        setOfflinePendingCount(await getOfflineDailyCheckinCount())
        if (!firstChild?.id) return
        const loaded = await loadChecklistForToday(firstChild.id)
        setDailyTasks(loaded)
      })()
    }, [firstChild]),
  )

  const runNextAction = () => {
    if (!firstChild || !nextTask) return
    if (nextTask.id === 'checkin') {
      navigation.navigate('ParentDailyCheckIn', { childId: firstChild.id, childName: firstChild.name })
      return
    }
    if (nextTask.id === 'chat') {
      void markChecklistTaskDone(firstChild.id, 'chat')
      navigation.navigate('ParentChat', { childId: firstChild.id, childName: firstChild.name })
      return
    }
    if (nextTask.id === 'review') {
      void markChecklistTaskDone(firstChild.id, 'review')
      navigation.navigate('ParentProgressReports', { childId: firstChild.id, childName: firstChild.name })
      return
    }
    navigation.navigate('Activities', { screen: 'ChildMode', params: { childId: firstChild.id, childName: firstChild.name } })
  }

  const sendUrgentHelp = async () => {
    if (!token) return
    if (!firstChild) {
      Alert.alert(copy.urgentSentTitle, copy.urgentNoChild)
      return
    }

    setUrgentSending(true)
    try {
      await api.sendSupportRequest(token, {
        childId: firstChild.id,
        subject: copy.urgentSubject,
        message: copy.urgentMessage(firstChild.name),
      })
      Alert.alert(copy.urgentSentTitle, copy.urgentSentBody)
    } catch (e) {
      Alert.alert(copy.sendFailed, e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setUrgentSending(false)
    }
  }

  useEffect(() => {
    const previous = previousOfflinePendingRef.current
    if (previous > 0 && offlinePendingCount === 0) {
      setShowOfflineSyncedToast(true)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setShowOfflineSyncedToast(false), 2600)
    }
    previousOfflinePendingRef.current = offlinePendingCount
  }, [offlinePendingCount])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!firstChild?.id || parentSteps.length === 0 || newStepsCount < 1) return
    const latest = parentSteps[0]
    void notifyTherapistStepsIfNew({
      childId: firstChild.id,
      latestCreatedAt: latest.createdAt,
      latestTitle: latest.title,
    })
  }, [firstChild?.id, newStepsCount, parentSteps])

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.homeContent}
        contentContainerStyle={s.wrap}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => {
              void (async () => {
                setPullRefreshing(true)
                try {
                  await loadHome({ silent: true })
                } finally {
                  setPullRefreshing(false)
                }
              })()
            }}
            tintColor={appColors.primary}
            colors={[appColors.primary]}
          />
        }
      >
        <View style={s.heroCard}>
          <View pointerEvents="none" style={s.heroGlowTop} />
          <View pointerEvents="none" style={s.heroGlowBottom} />
          <View style={[s.heroTopRow, { direction: 'ltr' }]}>
            <View style={[s.languageSwitchDark, s.languageSwitchInHeroRow]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="English"
                style={[s.langBtnDark, language === 'en' && s.langBtnDarkActive]}
                onPress={() => void setLanguage('en')}
              >
                <Text style={[s.langTextDark, language === 'en' && s.langTextDarkActive]}>EN</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Arabic"
                style={[s.langBtnDark, language === 'ar' && s.langBtnDarkActive]}
                onPress={() => void setLanguage('ar')}
              >
                <Text style={[s.langTextDark, language === 'ar' && s.langTextDarkActive]}>AR</Text>
              </Pressable>
            </View>
            <View style={s.heroTopSpacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.alertsA11y(notificationsUnread)}
              style={s.heroAlertsBtn}
              onPress={() => navigation.navigate('ParentNotifications')}
            >
              <Text style={s.heroAlertsIcon}>🔔</Text>
              <Text style={s.heroAlertsLabel}>{copy.alerts}</Text>
              {notificationsUnread > 0 ? (
                <View style={s.heroAlertsBadge}>
                  <Text style={s.heroAlertsBadgeText}>{notificationsUnread > 99 ? '99+' : String(notificationsUnread)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <Text style={[s.heroEyebrow, isArabic && s.rtlText]}>{copy.familyHome}</Text>
          <Text style={[s.heroTitle, isArabic && s.rtlText]}>
            {copy.hello} {user?.name || copy.fallbackName}
          </Text>
          {loading ? <ActivityIndicator color={colors.onDarkMuted} style={s.heroLoading} /> : null}
        </View>

        {homeLoadError ? (
          <InlineLoadError
            title={copy.loadErrorTitle}
            message={homeLoadError}
            hint={copy.loadErrorHint}
            onRetry={() => void loadHome()}
            retrying={loading}
            loadingLabel={copy.refreshing}
            retryLabel={copy.loadErrorRetry}
            rtl={isArabic}
          />
        ) : null}

        <View style={s.startHereCard}>
          <View style={s.startBadge}>
            <Text style={s.startBadgeText}>1</Text>
          </View>
          <View style={s.startCopy}>
            <Text style={[s.startTitle, isArabic && s.rtlText]}>{copy.startHere}</Text>
            <Text style={[s.startText, isArabic && s.rtlText]}>
              {localizedNextTaskLabel ? copy.checklistNext(localizedNextTaskLabel) : copy.checklistAllDone}
            </Text>
          </View>
          {nextTask && firstChild ? (
            <Pressable accessibilityRole="button" accessibilityLabel={localizedNextTaskLabel || copy.go} hitSlop={8} style={s.startGoBtn} onPress={runNextAction}>
              <Text style={s.startGoText}>{copy.go}</Text>
            </Pressable>
          ) : null}
        </View>

        {offlinePendingCount > 0 ? (
          <View style={s.offlinePendingCard}>
            <Text style={[s.offlinePendingTitle, isArabic && s.rtlText]}>{copy.offlinePending(offlinePendingCount)}</Text>
            <Text style={[s.offlinePendingText, isArabic && s.rtlText]}>{copy.offlineHint}</Text>
          </View>
        ) : null}

        {showOfflineSyncedToast ? (
          <View style={s.offlineSyncedToast}>
            <Text style={[s.offlineSyncedToastText, isArabic && s.rtlText]}>{copy.offlineSyncedToast}</Text>
          </View>
        ) : null}

        <View style={s.statusCard}>
          <Text style={[s.statusLine, isArabic && s.rtlText]}>
            {copy.selectedChild}: {firstChild?.name || copy.noChild}
          </Text>
          <Text style={[s.statusLine, isArabic && s.rtlText]}>
            {copy.feeling}: {todayEmotion?.label || copy.noFeeling}
          </Text>
          <Text style={[s.statusLine, isArabic && s.rtlText]}>
            {copy.progress}: {progressHealth(recentAverage, language)}
          </Text>
          {chatUnread > 0 && firstChild ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.openChat}
              style={s.chatHintBtn}
              onPress={() => navigation.navigate('ParentChat', { childId: firstChild.id, childName: firstChild.name })}
            >
              <Text style={[s.chatHintText, isArabic && s.rtlText]}>{copy.unreadChat(chatUnread)}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.todoCard}>
          <Text style={[s.todoTitle, isArabic && s.rtlText]}>{copy.checklistTitle}</Text>
          <Text style={[s.todoSub, isArabic && s.rtlText]}>{copy.checklistDone(completedTasks, dailyTasks.length)}</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${checklistPercent}%` }]} />
          </View>
          <View style={s.taskList}>
            {dailyTasks.map((task) => (
              <View key={task.id} style={s.taskRow}>
                <Text style={[s.taskDot, task.done && s.taskDotDone]}>{task.done ? '✓' : '•'}</Text>
                <Text style={[s.taskLabel, task.done && s.taskLabelDone, isArabic && s.rtlText]}>
                  {localizeTaskLabel(task, language)}
                </Text>
              </View>
            ))}
          </View>
          {nextTask ? (
            <Pressable accessibilityRole="button" accessibilityLabel={localizedNextTaskLabel || nextTask.label} style={s.nextActionBtn} onPress={runNextAction}>
              <Text style={[s.nextActionText, isArabic && s.rtlText]}>{copy.checklistNext(localizedNextTaskLabel || nextTask.label)}</Text>
            </Pressable>
          ) : (
            <View style={s.doneBadge}>
              <Text style={[s.doneBadgeText, isArabic && s.rtlText]}>{copy.checklistAllDone}</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          style={[s.urgentLink, urgentSending && s.urgentLinkDisabled]}
          disabled={urgentSending}
          onPress={() => void sendUrgentHelp()}
        >
          <Text style={[s.urgentLinkText, isArabic && s.rtlText]}>
            {urgentSending ? copy.urgentSending : copy.urgentSend}
          </Text>
        </Pressable>

        </ScrollView>
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  homeContent: { flex: 1 },
  wrap: { padding: 16, gap: 12, paddingBottom: 34 },
  heroCard: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 30,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.35)',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroGlowTop: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(37, 99, 235,0.42)',
    top: -72,
    right: -54,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(20,184,166,0.22)',
    bottom: -34,
    left: -28,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  heroTopSpacer: { flex: 1 },
  languageSwitchDark: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 4, gap: 4 },
  languageSwitchInHeroRow: { flex: 1, minWidth: 0, maxWidth: 160 },
  heroAlertsBtn: {
    minWidth: 56,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    position: 'relative',
  },
  heroAlertsIcon: { fontSize: 18 },
  heroAlertsLabel: { color: '#bfdbfe', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  heroAlertsBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAlertsBadgeText: { color: '#fff', fontWeight: '900', fontSize: 9 },
  langBtnDark: { flex: 1, borderRadius: 10, padding: 9, alignItems: 'center' },
  langBtnDarkActive: { backgroundColor: '#fff' },
  langTextDark: { color: '#bfdbfe', fontWeight: '800' },
  langTextDarkActive: { color: '#0f172a' },
  heroEyebrow: { color: colors.onDarkEyebrow, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: { color: colors.onDark, fontSize: 28, fontWeight: '900' },
  heroLoading: { alignSelf: 'flex-start', marginTop: 4 },
  startHereCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    shadowColor: '#2d195a',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  startBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBadgeText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  startCopy: { flex: 1, gap: 3 },
  startTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  startText: { color: '#64748b', lineHeight: 20, fontWeight: '700' },
  startGoBtn: { backgroundColor: '#dbeafe', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  startGoText: { color: '#1d4ed8', fontWeight: '900' },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    padding: 14,
    gap: 6,
  },
  statusLine: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  chatHintBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondarySurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatHintText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  offlinePendingCard: { backgroundColor: '#fffbeb', borderRadius: 14, borderWidth: 1, borderColor: '#f59e0b', padding: 12, gap: 6 },
  offlinePendingTitle: { color: '#92400e', fontWeight: '800' },
  offlinePendingText: { color: '#b45309', lineHeight: 20, fontWeight: '600' },
  offlineSyncedToast: { backgroundColor: '#ecfdf3', borderRadius: 12, borderWidth: 1, borderColor: '#86efac', padding: 10 },
  offlineSyncedToastText: { color: '#166534', fontWeight: '800', textAlign: 'center' },
  urgentLink: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  urgentLinkDisabled: { opacity: 0.55 },
  urgentLinkText: { color: colors.danger, fontWeight: '800', fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },
  todoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 15,
    gap: 8,
    shadowColor: '#2d195a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  todoTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  todoSub: { color: '#64748b', fontSize: 12 },
  progressTrack: { height: 10, backgroundColor: colors.secondarySurface, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineBorder },
  progressFill: { height: '100%', backgroundColor: '#1d4ed8' },
  taskList: { gap: 7, marginTop: 2 },
  taskRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  taskDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskDotDone: { backgroundColor: '#dcfce7', color: '#15803d' },
  taskLabel: { flex: 1, color: '#475569', fontWeight: '800', lineHeight: 18 },
  taskLabelDone: { color: '#64748b', textDecorationLine: 'line-through' },
  nextActionBtn: { backgroundColor: '#dbeafe', borderRadius: 14, padding: 11 },
  nextActionText: { color: '#1d4ed8', fontWeight: '800', textAlign: 'center', fontSize: 12 },
  doneBadge: { backgroundColor: '#eefcf3', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#b7ebc7' },
  doneBadgeText: { color: '#146c2e', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
})
