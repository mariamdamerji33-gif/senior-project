import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
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
import { loadStarsForToday } from '../../../rewards/childRewards'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { InlineLoadError } from '../components/InlineLoadError'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { colors } from '../../../theme/colors'
import { readCachedJson, writeCachedJson } from '../../../offline/offlineCache'
import { useComfortAwareStyles } from '../../../utils/comfortAwareStyles'

type Props = DrawerScreenProps<ParentDrawerParamList, 'MainOverview'>
type ParentProgressItem = { id: string; score: number; date: string; activityTitle?: string }
type ParentStep = { id: string; title: string; body: string; category?: string | null; createdAt: string }
type AnnouncementItem = { id: string; title: string; body: string; audience: string; priority: string; createdAt: string }
type ProgressTrend = 'improving' | 'stable' | 'needsSupport' | 'noData'

const STEPS_SEEN_PREFIX = 'asp_mobile_steps_seen_v1'
const HOME_TIPS_SEEN_PREFIX = 'asp_mobile_home_tips_seen_v1'
const HOME_WHATS_NEW_SEEN_PREFIX = 'asp_mobile_whats_new_seen_v1'
const HOME_WHATS_NEW_VERSION = '2026-05-security-ui-pack'
const ANNOUNCEMENTS_CACHE_PREFIX = 'asp_mobile_announcements_cache_v1'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HOME_COPY = {
  en: {
    familyHome: 'Family home',
    hello: 'Hello',
    fallbackName: 'Parent',
    intro: (name: string) => `This page tells you what to do today for ${name}.`,
    menuHint:
      'Tip: Tap the bell on the right above for school alerts. The purple bar on the left opens Daily, Board, Play, Chat, Reports, and more. To sign out, use Profile and security.',
    profile: 'Profile',
    profileA11y: 'Profile and security',
    alerts: 'Alerts',
    alertsA11y: (count: number) => (count > 0 ? `Alerts, ${count} unread` : 'Alerts'),
    childFallback: 'your child',
    refresh: 'Refresh page',
    refreshing: 'Refreshing...',
    today: 'Today',
    startHere: 'Start here',
    quickView: 'Quick view',
    children: 'Children',
    lastReport: 'Last report',
    newMessages: 'New messages',
    stars: 'Stars today',
    selectedChild: 'Selected child',
    noChild: 'No child assigned yet',
    progress: 'Progress',
    feeling: 'Feeling',
    noFeeling: 'Not checked today',
    rewardTitle: 'Child reward',
    rewardSub: (stars: number) => stars > 0 ? `Great work. Your child earned ${stars} star(s) today.` : 'No stars yet today. Complete one activity to earn stars.',
    moreHelp: 'More tools',
    calendar: 'Family calendar',
    download: 'Download summary',
    admin: 'Ask admin for help',
    weeklySummary: 'Weekly summary (PDF)',
    menuGuideBtn: 'Simple menu guide',
    urgentTitle: 'Need Help Today?',
    urgentSub: 'Send an urgent request to school admin/coordinator.',
    urgentSend: 'Send urgent help request',
    urgentSending: 'Sending urgent request...',
    urgentNoChild: 'Create or assign at least one student before sending urgent help.',
    urgentSentTitle: 'Urgent request sent',
    urgentSentBody: 'School admin/coordinator will see this request in the support inbox.',
    urgentSubject: 'Urgent parent help needed',
    urgentMessage: (name: string) => `Parent needs urgent help today for ${name}. Please contact the family as soon as possible.`,
    offlinePending: (count: number) => `${count} daily check-in(s) saved offline and waiting to sync.`,
    offlineHint: 'Open Daily Check-In and tap Sync now when internet is back.',
    offlineSyncedToast: 'Offline check-ins synced successfully.',
    loadErrorTitle: 'We could not load your data',
    loadErrorHint: 'Check Wi‑Fi or USB connection, then tap Try again.',
    loadErrorRetry: 'Try again',
    noStudentTitle: 'No student linked',
    checklistTitle: "Today's family checklist",
    checklistDone: (done: number, total: number) => `Completed: ${done}/${total}`,
    checklistNext: (label: string) => `Next: ${label}`,
    checklistAllDone: 'All daily tasks completed. Great work!',
    go: 'Go',
    progressStrong: 'Strong',
    progressImproving: 'Improving',
    progressNeedsAttention: 'Needs attention',
    progressNoData: 'No data',
    weekAtGlance: 'Week at a glance',
    weekActivities: 'Activities this week',
    weekAverage: 'Week average',
    weekTrend: 'Trend',
    weekLatestNote: 'Latest teacher note',
    weekNoNote: 'No teacher note yet.',
    weekNoData: 'Complete one child activity to start the weekly progress summary.',
    weekViewReports: 'View full progress',
    trendImproving: 'Improving',
    trendStable: 'Stable',
    trendNeedsSupport: 'Needs support',
    taskLabelCheckin: 'Submit daily check-in',
    taskLabelGame: 'Do one child activity',
    taskLabelChat: 'Read teacher messages',
    taskLabelReview: 'Review progress trend',
    teacherStepsTitle: 'Teacher steps',
    teacherStepsBadge: (count: number) => (count > 0 ? `${count} new` : 'Ready'),
    teacherStepsEmpty: 'No teacher steps yet. Check back after the next school update.',
    noChildCalendar: 'Create or assign at least one student to open calendar.',
    noChildCheckin: 'Create or assign at least one student to submit a daily check-in.',
    noChildDownloads: 'Create or assign at least one student to open downloads.',
    noChildAdmin: 'Create or assign at least one student to contact admin support.',
    sendFailed: 'Send failed',
    unknownError: 'Unknown error',
    tipsTitle: 'Quick start for families',
    tipsLine1: '1) Start with Daily check-in.',
    tipsLine2: '2) Open Chat for teacher updates.',
    tipsLine3: '3) Use Play for one short child activity.',
    tipsHide: 'Hide tips',
    quickBarDaily: 'Daily',
    quickBarChat: 'Chat',
    quickBarHelp: 'Help',
    lastUpdated: (t: string) => `Last updated: ${t}`,
    announcementsTitle: 'School announcements',
    announcementsBadge: 'Live',
    announcementsCachedBadge: 'Saved',
    announcementsCachedHint: 'Showing last saved announcements because the API is not reachable.',
    announcementsEmpty: 'No school announcements yet.',
    whatsNewTitle: "What's new",
    whatsNewBody:
      'We improved this app for families:\n\n• Faster quick actions (Daily, Chat, Help)\n• Better security settings screen\n• Clearer sidebar labels\n• More stable child navigation and refresh',
    ok: 'OK',
  },
  ar: {
    familyHome: 'صفحة العائلة',
    hello: 'مرحباً',
    fallbackName: 'ولي الأمر',
    intro: (name: string) => `هذه الصفحة تخبرك ماذا تفعل اليوم من أجل ${name}.`,
    menuHint:
      'نصيحة: اضغط الجرس على اليمين في الأعلى للتنبيهات المدرسية. الشريط البنفسجي على اليسار يفتح اليومي واللوحة واللعب والمحادثة والتقارير وغيرها. لتسجيل الخروج استخدم الملف والأمان.',
    profile: 'الملف',
    profileA11y: 'الملف والأمان',
    alerts: 'تنبيهات',
    alertsA11y: (count: number) => (count > 0 ? `تنبيهات، ${count} غير مقروء` : 'تنبيهات'),
    childFallback: 'طفلك',
    refresh: 'تحديث الصفحة',
    refreshing: 'جاري التحديث...',
    today: 'اليوم',
    startHere: 'ابدأ هنا',
    quickView: 'نظرة سريعة',
    children: 'الأطفال',
    lastReport: 'آخر تقرير',
    newMessages: 'رسائل جديدة',
    stars: 'نجوم اليوم',
    selectedChild: 'الطفل المختار',
    noChild: 'لا يوجد طفل مرتبط بعد',
    progress: 'التقدم',
    feeling: 'الشعور',
    noFeeling: 'لم يتم الفحص اليوم',
    rewardTitle: 'مكافأة الطفل',
    rewardSub: (stars: number) => stars > 0 ? `عمل رائع. حصل طفلك على ${stars} نجمة اليوم.` : 'لا توجد نجوم اليوم. أكمل نشاطاً واحداً للحصول على نجوم.',
    moreHelp: 'أدوات إضافية',
    calendar: 'تقويم العائلة',
    download: 'تحميل الملخص',
    admin: 'طلب مساعدة من الإدارة',
    weeklySummary: 'ملخص أسبوعي (PDF)',
    menuGuideBtn: 'دليل القائمة البسيط',
    urgentTitle: 'تحتاج مساعدة اليوم؟',
    urgentSub: 'أرسل طلباً عاجلاً إلى الإدارة أو المنسق.',
    urgentSend: 'إرسال طلب مساعدة عاجل',
    urgentSending: 'جاري إرسال الطلب...',
    urgentNoChild: 'يجب ربط طفل بالحساب قبل إرسال طلب المساعدة.',
    urgentSentTitle: 'تم إرسال الطلب',
    urgentSentBody: 'سيظهر الطلب لمسؤول المدرسة أو المنسق في صندوق الدعم.',
    urgentSubject: 'طلب مساعدة عاجل من ولي الأمر',
    urgentMessage: (name: string) => `ولي الأمر يحتاج مساعدة عاجلة اليوم بخصوص ${name}. الرجاء التواصل مع العائلة في أقرب وقت.`,
    offlinePending: (count: number) => `${count} متابعة يومية محفوظة بدون إنترنت وتنتظر المزامنة.`,
    offlineHint: 'افتح متابعة اليوم واضغط مزامنة الآن عند عودة الإنترنت.',
    offlineSyncedToast: 'تمت مزامنة المتابعات المحفوظة بدون إنترنت بنجاح.',
    loadErrorTitle: 'تعذر تحميل البيانات',
    loadErrorHint: 'تحقق من الاتصال بالإنترنت أو USB ثم اضغط حاول مرة أخرى.',
    loadErrorRetry: 'حاول مرة أخرى',
    noStudentTitle: 'لا يوجد طفل مرتبط',
    checklistTitle: 'قائمة العائلة اليوم',
    checklistDone: (done: number, total: number) => `المكتمل: ${done}/${total}`,
    checklistNext: (label: string) => `التالي: ${label}`,
    checklistAllDone: 'جميع مهام اليوم مكتملة. أحسنتم!',
    go: 'ابدأ',
    progressStrong: 'قوي',
    progressImproving: 'يتحسن',
    progressNeedsAttention: 'يحتاج متابعة',
    progressNoData: 'لا توجد بيانات',
    weekAtGlance: 'نظرة على الأسبوع',
    weekActivities: 'أنشطة هذا الأسبوع',
    weekAverage: 'متوسط الأسبوع',
    weekTrend: 'الاتجاه',
    weekLatestNote: 'آخر ملاحظة من المعلم',
    weekNoNote: 'لا توجد ملاحظة من المعلم بعد.',
    weekNoData: 'أكمل نشاطاً واحداً للطفل لبدء ملخص التقدم الأسبوعي.',
    weekViewReports: 'عرض التقدم الكامل',
    trendImproving: 'يتحسن',
    trendStable: 'مستقر',
    trendNeedsSupport: 'يحتاج دعم',
    taskLabelCheckin: 'إرسال متابعة اليوم',
    taskLabelGame: 'تنفيذ نشاط واحد للطفل',
    taskLabelChat: 'قراءة رسائل المعلم',
    taskLabelReview: 'مراجعة تقدم الطفل',
    teacherStepsTitle: 'خطوات المعلم',
    teacherStepsBadge: (count: number) => (count > 0 ? `${count} جديد` : 'جاهز'),
    teacherStepsEmpty: 'لا توجد خطوات من المعلم بعد. تحقق بعد تحديث المدرسة التالي.',
    noChildCalendar: 'يجب ربط طفل واحد على الأقل لفتح التقويم.',
    noChildCheckin: 'يجب ربط طفل واحد على الأقل لإرسال متابعة اليوم.',
    noChildDownloads: 'يجب ربط طفل واحد على الأقل لفتح التحميلات.',
    noChildAdmin: 'يجب ربط طفل واحد على الأقل للتواصل مع الإدارة.',
    sendFailed: 'فشل الإرسال',
    unknownError: 'خطأ غير معروف',
    tipsTitle: 'بداية سريعة للعائلة',
    tipsLine1: '1) ابدأ بمتابعة اليوم.',
    tipsLine2: '2) افتح المحادثة لرسائل المعلم.',
    tipsLine3: '3) استخدم اللعب لنشاط قصير للطفل.',
    tipsHide: 'إخفاء الإرشادات',
    quickBarDaily: 'اليومي',
    quickBarChat: 'المحادثة',
    quickBarHelp: 'المساعدة',
    lastUpdated: (t: string) => `آخر تحديث: ${t}`,
    announcementsTitle: 'إعلانات المدرسة',
    announcementsBadge: 'مباشر',
    announcementsCachedBadge: 'محفوظ',
    announcementsCachedHint: 'يتم عرض آخر إعلانات محفوظة لأن الاتصال بالخادم غير متاح.',
    announcementsEmpty: 'لا توجد إعلانات مدرسية بعد.',
    whatsNewTitle: 'ما الجديد',
    whatsNewBody:
      'قمنا بتحسين التطبيق للعائلة:\n\n• إجراءات سريعة أفضل (اليومي، المحادثة، المساعدة)\n• شاشة إعدادات أمان أوضح\n• أسماء أوضح في القائمة الجانبية\n• ثبات أفضل في التنقل وتحديث البيانات',
    ok: 'حسناً',
  },
}

function supportActionForFeeling(feelingLabel: string) {
  const key = feelingLabel.trim().toLowerCase()
  if (key.includes('happy')) return 'Keep momentum with praise and one short learning activity.'
  if (key.includes('calm')) return 'Continue routine and use simple communication prompts.'
  if (key.includes('confused')) return 'Use visual cues and one-step instructions.'
  if (key.includes('sad')) return 'Validate feelings and offer comfort before tasks.'
  if (key.includes('angry')) return 'Lower voice, reduce stimuli, and offer a short break.'
  return 'Stay calm, keep language simple, and ask the teacher for a guided next step.'
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
  return {
    label: rawLabel,
    date: latest.date,
    action: supportActionForFeeling(rawLabel),
  }
}

function emotionPriority(label?: string) {
  const key = String(label || '').toLowerCase()
  if (key.includes('angry') || key.includes('sad')) return 'Needs support'
  if (key.includes('confused')) return 'Needs guidance'
  if (key.includes('calm') || key.includes('happy')) return 'Stable'
  return 'Unknown'
}

function progressHealth(avg: number | null, language: AppLanguage) {
  const copy = HOME_COPY[language]
  if (avg == null) return copy.progressNoData
  if (avg >= 80) return copy.progressStrong
  if (avg >= 60) return copy.progressImproving
  return copy.progressNeedsAttention
}

function averageScore(items: ParentProgressItem[]) {
  if (items.length === 0) return null
  const scores = items.map((item) => Number(item.score || 0))
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

function progressItemsThisWeek(progress: ParentProgressItem[]) {
  const cutoff = Date.now() - WEEK_MS
  return (progress || []).filter((item) => {
    const ts = new Date(item.date).getTime()
    return Number.isFinite(ts) && ts >= cutoff
  })
}

function calculateProgressTrend(progress: ParentProgressItem[]): ProgressTrend {
  const sorted = [...(progress || [])]
    .filter((item) => Number.isFinite(new Date(item.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  if (sorted.length === 0) return 'noData'

  const recentAverageScore = averageScore(sorted.slice(0, 3))
  const previousAverageScore = averageScore(sorted.slice(3, 6))
  if (recentAverageScore == null) return 'noData'
  if (previousAverageScore == null) return recentAverageScore >= 60 ? 'stable' : 'needsSupport'
  if (recentAverageScore - previousAverageScore >= 5) return 'improving'
  if (recentAverageScore < 60) return 'needsSupport'
  return 'stable'
}

function progressTrendLabel(trend: ProgressTrend, language: AppLanguage) {
  const copy = HOME_COPY[language]
  if (trend === 'improving') return copy.trendImproving
  if (trend === 'needsSupport') return copy.trendNeedsSupport
  if (trend === 'stable') return copy.trendStable
  return copy.progressNoData
}

function localizeTaskLabel(task: DailyTask, language: AppLanguage) {
  const copy = HOME_COPY[language]
  if (task.id === 'checkin') return copy.taskLabelCheckin
  if (task.id === 'game') return copy.taskLabelGame
  if (task.id === 'chat') return copy.taskLabelChat
  if (task.id === 'review') return copy.taskLabelReview
  return task.label
}

function buildTodayGuidance(params: {
  hasChild: boolean
  newStepsCount: number
  chatUnread: number
  emotionLabel?: string
  recentAverage: number | null
  checklistPercent: number
  language: AppLanguage
}) {
  const { hasChild, newStepsCount, chatUnread, emotionLabel, recentAverage, checklistPercent, language } = params
  const emotionStatus = emotionPriority(emotionLabel)
  if (language === 'ar') {
    if (!hasChild) return 'يجب ربط طفل بهذا الحساب حتى تظهر لوحة المتابعة والألعاب والمحادثة.'
    if (newStepsCount > 0) return 'ابدأ بخطوات المعلم الجديدة، ثم أكمل متابعة اليوم.'
    if (emotionStatus === 'Needs support') return 'اليوم يحتاج هدوء ودعم. راجع بطاقة الشعور وتواصل مع المعلم إذا احتجت.'
    if (chatUnread > 0) return 'لديك رسائل جديدة من المعلم. افتح المحادثة أولاً.'
    if (recentAverage != null && recentAverage < 60) return 'التقدم يحتاج متابعة. جرّب نشاطاً قصيراً اليوم وراجع التقرير.'
    if (checklistPercent < 100) return 'أكمل قائمة اليوم. زر البداية سيساعدك على الخطوة التالية.'
    return 'عمل رائع اليوم. كل المهام الأساسية مكتملة.'
  }
  if (!hasChild) return 'Assign a student to this family account to unlock dashboard, games, chat, and check-ins.'
  if (newStepsCount > 0) return 'Start with the new teacher daily steps, then complete today’s check-in.'
  if (emotionStatus === 'Needs support') return 'Today needs calm support. Review the emotion card and use teacher chat if needed.'
  if (chatUnread > 0) return 'You have teacher messages waiting. Read chat before starting today’s activities.'
  if (recentAverage != null && recentAverage < 60) return 'Progress needs attention. Do one short activity today and review progress reports.'
  if (checklistPercent < 100) return 'Continue today’s checklist. The next best action button will guide you.'
  return 'Great work today. All key parent tasks are complete.'
}

export function ParentMainOverviewScreen({ navigation }: Props) {
  const { token, user } = useAuth()
  const { language, setLanguage, isArabic } = useLanguage()
  const { textScale, appColors, highContrast } = useDisplayComfort()
  const s = useComfortAwareStyles(styles, textScale, appColors, highContrast)
  const copy = HOME_COPY[language]
  const [childrenCount, setChildrenCount] = useState<number>(0)
  const [latestReportScore, setLatestReportScore] = useState<number | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [firstChild, setFirstChild] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [todayEmotion, setTodayEmotion] = useState<{ label: string; date: string; action: string } | null>(null)
  const [recentAverage, setRecentAverage] = useState<number | null>(null)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(INITIAL_DAILY_TASKS)
  const [parentSteps, setParentSteps] = useState<ParentStep[]>([])
  const [newStepsCount, setNewStepsCount] = useState(0)
  const [urgentSending, setUrgentSending] = useState(false)
  const [starsToday, setStarsToday] = useState(0)
  const [offlinePendingCount, setOfflinePendingCount] = useState(0)
  const [showOfflineSyncedToast, setShowOfflineSyncedToast] = useState(false)
  const [showTipsCard, setShowTipsCard] = useState(true)
  const [homeLoadError, setHomeLoadError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('')
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false)
  const [latestAnnouncements, setLatestAnnouncements] = useState<AnnouncementItem[]>([])
  const [announcementsFromCache, setAnnouncementsFromCache] = useState(false)
  const [weekActivityCount, setWeekActivityCount] = useState(0)
  const [weekAverageScore, setWeekAverageScore] = useState<number | null>(null)
  const [latestReportNote, setLatestReportNote] = useState('')
  const [progressTrend, setProgressTrend] = useState<ProgressTrend>('noData')
  const whatsNewSeenKey = useMemo(
    () => `${HOME_WHATS_NEW_SEEN_PREFIX}:${HOME_WHATS_NEW_VERSION}:${user?.id || 'unknown'}`,
    [user?.id],
  )
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
  const todayGuidance = useMemo(
    () =>
      buildTodayGuidance({
        hasChild: Boolean(firstChild),
        newStepsCount,
        chatUnread,
        emotionLabel: todayEmotion?.label,
        recentAverage,
        checklistPercent,
        language,
      }),
    [chatUnread, checklistPercent, firstChild, language, newStepsCount, recentAverage, todayEmotion?.label],
  )

  const loadAnnouncements = async () => {
    if (!token) return
    const cacheKey = `${ANNOUNCEMENTS_CACHE_PREFIX}:${user?.id || 'unknown'}`
    try {
      const res = await api.announcements(token)
      const announcements = (res.announcements || [])
        .map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          audience: item.audience,
          priority: item.priority,
          createdAt: item.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latest = announcements.slice(0, 3)
      setLatestAnnouncements(latest)
      setAnnouncementsFromCache(false)
      await writeCachedJson(cacheKey, latest)
    } catch {
      const cached = await readCachedJson<AnnouncementItem[]>(cacheKey, [])
      setLatestAnnouncements(cached)
      setAnnouncementsFromCache(cached.length > 0)
    }
  }

  const loadHome = async (opts?: { silent?: boolean }) => {
    if (!token) return
    if (!opts?.silent) setLoading(true)
    try {
      setHomeLoadError(null)
      setOfflinePendingCount(await getOfflineDailyCheckinCount())
      await loadAnnouncements()
      const c = await api.parentChildren(token)
      const childList = (c.children || []).map((item) => ({ id: item.id, name: item.name }))
      setChildrenCount(childList.length)
      const selected = childList.find((item) => item.id === selectedChildId)
      const first = selected || childList[0]
      if (!first) {
        setFirstChild(null)
        setSelectedChildId(null)
        setLatestReportScore(null)
        setChatUnread(0)
        setTodayEmotion(null)
        setRecentAverage(null)
        setStarsToday(0)
        setWeekActivityCount(0)
        setWeekAverageScore(null)
        setLatestReportNote('')
        setProgressTrend('noData')
        return
      }
      if (selectedChildId !== first.id) setSelectedChildId(first.id)
      setFirstChild({ id: first.id, name: first.name })
      setStarsToday(await loadStarsForToday(first.id))
      const [r, p, chatRes, seenAt] = await Promise.all([
        api.parentReports(token, first.id),
        api.parentProgress(token, first.id),
        api.chatMessages(token, first.id),
        user?.id ? getSeenAt(user.id, first.id) : Promise.resolve(0),
      ])
      const latest = r.reports[0]
      setLatestReportScore(typeof latest?.progress_score === 'number' ? latest.progress_score : null)
      setLatestReportNote(String(latest?.notes || '').trim())
      setChatUnread(countUnreadFromOthers(chatRes.messages || [], user?.id, seenAt))
      setTodayEmotion(latestFeelingFromProgress(p.progress || []))
      const progressItems = p.progress || []
      const recent = progressItems.slice(0, 5).map((item) => Number(item.score || 0))
      setRecentAverage(recent.length ? Math.round(recent.reduce((sum, val) => sum + val, 0) / recent.length) : null)
      const weekItems = progressItemsThisWeek(progressItems)
      setWeekActivityCount(weekItems.length)
      setWeekAverageScore(averageScore(weekItems))
      setProgressTrend(calculateProgressTrend(progressItems))

      try {
        const stepsRes = await api.parentSteps(token, first.id)
        const steps = (stepsRes.steps || []).slice(0, 5)
        setParentSteps(steps)
        const seenKey = `${STEPS_SEEN_PREFIX}:${first.id}`
        const seenRaw = await AsyncStorage.getItem(seenKey)
        const seenAt = seenRaw ? new Date(seenRaw).getTime() : 0
        const unread = steps.filter((s) => new Date(s.createdAt).getTime() > seenAt).length
        setNewStepsCount(unread)
      } catch {
        setParentSteps([])
        setNewStepsCount(0)
      }
      setLastUpdatedAt(new Date().toLocaleTimeString())
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
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
        setStarsToday(await loadStarsForToday(firstChild.id))
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
      Alert.alert(copy.noStudentTitle, copy.urgentNoChild)
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
    let cancelled = false
    const loadTipsState = async () => {
      const key = `${HOME_TIPS_SEEN_PREFIX}:${user?.id || 'unknown'}`
      try {
        const raw = await AsyncStorage.getItem(key)
        if (cancelled) return
        setShowTipsCard(raw !== '1')
      } catch {
        if (cancelled) return
        setShowTipsCard(true)
      }
    }
    void loadTipsState()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    const showWhatsNewOnce = async () => {
      try {
        const seen = await AsyncStorage.getItem(whatsNewSeenKey)
        if (cancelled || seen === '1') return
        setShowWhatsNewModal(true)
      } catch {
        // Ignore read/write issues; popup is informational only.
      }
    }
    void showWhatsNewOnce()
    return () => {
      cancelled = true
    }
  }, [whatsNewSeenKey])

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
              <Pressable style={[s.langBtnDark, language === 'en' && s.langBtnDarkActive]} onPress={() => void setLanguage('en')}>
                <Text style={[s.langTextDark, language === 'en' && s.langTextDarkActive]}>English</Text>
              </Pressable>
              <Pressable style={[s.langBtnDark, language === 'ar' && s.langBtnDarkActive]} onPress={() => void setLanguage('ar')}>
                <Text style={[s.langTextDark, language === 'ar' && s.langTextDarkActive]}>العربية</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.profileA11y}
              style={s.heroProfileBtn}
              onPress={() => navigation.navigate('ParentAccountProfile')}
            >
              <Text style={s.heroProfileIcon}>◎</Text>
              <Text style={s.heroProfileLabel}>{copy.profile}</Text>
            </Pressable>
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
          <Text style={[s.heroTitle, isArabic && s.rtlText]}>{copy.hello} {user?.name || copy.fallbackName}</Text>
          <Text style={[s.heroText, isArabic && s.rtlText]}>{copy.intro(firstChild?.name || copy.childFallback)}</Text>
          <Text style={[s.heroHint, isArabic && s.rtlText]}>{copy.menuHint}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.refresh}
            accessibilityState={{ busy: loading, disabled: loading }}
            disabled={loading}
            style={[s.refreshBtn, loading && s.refreshBtnDisabled]}
            onPress={() => void loadHome()}
          >
            <View style={s.refreshContent}>
              {loading ? <ActivityIndicator color={colors.primaryDark} size="small" /> : null}
              <Text style={s.refreshBtnText}>{loading ? copy.refreshing : copy.refresh}</Text>
            </View>
          </Pressable>
          {lastUpdatedAt ? <Text style={[s.lastUpdatedText, isArabic && s.rtlText]}>{copy.lastUpdated(lastUpdatedAt)}</Text> : null}
        </View>

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

        {showTipsCard ? (
          <View style={s.tipsCard}>
            <Text style={[s.tipsTitle, isArabic && s.rtlText]}>{copy.tipsTitle}</Text>
            <Text style={[s.tipsLine, isArabic && s.rtlText]}>{copy.tipsLine1}</Text>
            <Text style={[s.tipsLine, isArabic && s.rtlText]}>{copy.tipsLine2}</Text>
            <Text style={[s.tipsLine, isArabic && s.rtlText]}>{copy.tipsLine3}</Text>
            <Pressable
              style={s.tipsHideBtn}
              onPress={() => {
                const key = `${HOME_TIPS_SEEN_PREFIX}:${user?.id || 'unknown'}`
                setShowTipsCard(false)
                void AsyncStorage.setItem(key, '1')
              }}
            >
              <Text style={s.tipsHideBtnText}>{copy.tipsHide}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.announcementsCard}>
          <View style={s.cardTitleRow}>
            <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.announcementsTitle}</Text>
            <Text style={[s.announcementLiveBadge, announcementsFromCache && s.announcementCachedBadge]}>
              {announcementsFromCache ? copy.announcementsCachedBadge : copy.announcementsBadge}
            </Text>
          </View>
          {announcementsFromCache ? (
            <Text style={[s.announcementCacheHint, isArabic && s.rtlText]}>{copy.announcementsCachedHint}</Text>
          ) : null}
          {latestAnnouncements.length > 0 ? (
            latestAnnouncements.map((item) => (
              <View key={item.id} style={s.announcementItem}>
                <View style={s.announcementTitleRow}>
                  <Text style={[s.announcementTitle, isArabic && s.rtlText]}>{item.title}</Text>
                  {item.priority ? <Text style={s.announcementPriority}>{item.priority}</Text> : null}
                </View>
                <Text style={[s.announcementBody, isArabic && s.rtlText]} numberOfLines={3}>
                  {item.body}
                </Text>
                <Text style={[s.announcementDate, isArabic && s.rtlText]}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <Text style={[s.announcementBody, isArabic && s.rtlText]}>{copy.announcementsEmpty}</Text>
          )}
        </View>

        <View style={s.teacherStepsCard}>
          <View style={s.cardTitleRow}>
            <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.teacherStepsTitle}</Text>
            <Text style={s.cardMiniBadge}>{copy.teacherStepsBadge(newStepsCount)}</Text>
          </View>
          {parentSteps.length > 0 ? (
            parentSteps.slice(0, 3).map((step) => (
              <View key={step.id} style={s.teacherStepItem}>
                <Text style={[s.teacherStepTitle, isArabic && s.rtlText]}>{step.title}</Text>
                <Text style={[s.teacherStepBody, isArabic && s.rtlText]} numberOfLines={2}>
                  {step.body}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[s.teacherStepBody, isArabic && s.rtlText]}>{copy.teacherStepsEmpty}</Text>
          )}
        </View>

        <View style={s.simpleSummaryCard}>
          <View style={s.cardTitleRow}>
            <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.quickView}</Text>
            <Text style={s.cardMiniBadge}>{copy.today}</Text>
          </View>
          <View style={s.summaryGrid}>
            <View style={[s.summaryBox, s.summaryBoxPurple]}>
              <Text style={s.summaryNumber}>{childrenCount}</Text>
              <Text style={s.summaryLabel}>{copy.children}</Text>
            </View>
            <View style={[s.summaryBox, s.summaryBoxTeal]}>
              <Text style={s.summaryNumber}>{latestReportScore ?? '-'}</Text>
              <Text style={s.summaryLabel}>{copy.lastReport}</Text>
            </View>
            <View style={[s.summaryBox, s.summaryBoxBlue]}>
              <Text style={s.summaryNumber}>{chatUnread}</Text>
              <Text style={s.summaryLabel}>{copy.newMessages}</Text>
            </View>
            <View style={[s.summaryBox, s.summaryBoxGold]}>
              <Text style={s.summaryNumber}>{starsToday}</Text>
              <Text style={s.summaryLabel}>{copy.stars}</Text>
            </View>
          </View>
          <Text style={[s.simpleLine, isArabic && s.rtlText]}>{copy.selectedChild}: {firstChild?.name || copy.noChild}</Text>
          <Text style={[s.simpleLine, isArabic && s.rtlText]}>{copy.progress}: {progressHealth(recentAverage, language)}</Text>
          <Text style={[s.simpleLine, isArabic && s.rtlText]}>{copy.feeling}: {todayEmotion?.label || copy.noFeeling}</Text>
        </View>

        <View style={s.weekSummaryCard}>
          <View style={s.cardTitleRow}>
            <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.weekAtGlance}</Text>
            <Text style={s.cardMiniBadge}>{progressTrendLabel(progressTrend, language)}</Text>
          </View>
          <View style={s.weekSummaryGrid}>
            <View style={[s.summaryBox, s.summaryBoxTeal]}>
              <Text style={s.summaryNumber}>{weekAverageScore ?? '-'}</Text>
              <Text style={s.summaryLabel}>{copy.weekAverage}</Text>
            </View>
            <View style={[s.summaryBox, s.summaryBoxPurple]}>
              <Text style={s.summaryNumber}>{weekActivityCount}</Text>
              <Text style={s.summaryLabel}>{copy.weekActivities}</Text>
            </View>
          </View>
          <Text style={[s.weekTrendText, isArabic && s.rtlText]}>
            {copy.weekTrend}: {progressTrendLabel(progressTrend, language)}
          </Text>
          <View style={s.weekNoteBox}>
            <Text style={[s.weekNoteLabel, isArabic && s.rtlText]}>{copy.weekLatestNote}</Text>
            <Text style={[s.weekNoteText, isArabic && s.rtlText]} numberOfLines={3}>
              {latestReportNote || (progressTrend === 'noData' ? copy.weekNoData : copy.weekNoNote)}
            </Text>
          </View>
          {firstChild ? (
            <Pressable
              style={s.weekProgressBtn}
              onPress={() => navigation.navigate('ParentProgressReports', { childId: firstChild.id, childName: firstChild.name })}
            >
              <Text style={s.weekProgressBtnText}>{copy.weekViewReports}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.todayCard}>
          <View pointerEvents="none" style={s.todayGlow} />
          <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.today}</Text>
          <Text style={[s.todayText, isArabic && s.rtlText]}>{todayGuidance}</Text>
          {nextTask && firstChild ? (
            <Pressable style={s.primaryActionBtn} onPress={runNextAction}>
              <Text style={s.primaryActionText}>{copy.startHere}: {localizedNextTaskLabel}</Text>
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

        <View style={s.moreSection}>
          <Text style={[s.sectionLabel, isArabic && s.rtlText]}>{copy.moreHelp}</Text>
          <View style={s.quickRow}>
            <Pressable style={s.quickBtn} onPress={() => navigation.navigate('ParentWeeklySummary')}>
              <Text style={s.quickBtnText}>{copy.weeklySummary}</Text>
            </Pressable>
            <Pressable
              style={s.quickBtn}
              onPress={() => {
                if (!firstChild) {
                  Alert.alert(copy.noStudentTitle, copy.noChildCalendar)
                  return
                }
                navigation.navigate('ParentCalendar', { childId: firstChild.id, childName: firstChild.name })
              }}
            >
              <Text style={s.quickBtnText}>{copy.calendar}</Text>
            </Pressable>
          </View>
          <View style={s.quickRow}>
            <Pressable
              style={s.quickBtn}
              onPress={() => {
                if (!firstChild) {
                  Alert.alert(copy.noStudentTitle, copy.noChildDownloads)
                  return
                }
                navigation.navigate('ParentDownloads', { childId: firstChild.id, childName: firstChild.name })
              }}
            >
              <Text style={s.quickBtnText}>{copy.download}</Text>
            </Pressable>
            <Pressable
              style={s.quickBtn}
              onPress={() => {
                if (!firstChild) {
                  Alert.alert(copy.noStudentTitle, copy.noChildAdmin)
                  return
                }
                navigation.navigate('ParentAdminSupport', { childId: firstChild.id, childName: firstChild.name })
              }}
            >
              <Text style={s.quickBtnText}>{copy.admin}</Text>
            </Pressable>
          </View>
          <Pressable style={s.sheetBtn} onPress={() => navigation.navigate('ParentMenuHelp')}>
            <Text style={s.sheetBtnText}>{copy.menuGuideBtn}</Text>
          </Pressable>
          <Pressable style={[s.urgentBtn, urgentSending && s.urgentBtnDisabled]} disabled={urgentSending} onPress={() => void sendUrgentHelp()}>
            <Text style={s.urgentBtnText}>{urgentSending ? copy.urgentSending : copy.urgentSend}</Text>
          </Pressable>
        </View>

        <View style={s.quickBarWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.quickBarDaily}
            style={s.quickBarBtn}
            onPress={() => {
              if (!firstChild) {
                Alert.alert(copy.noStudentTitle, copy.noChildCheckin)
                return
              }
              navigation.navigate('ParentDailyCheckIn', { childId: firstChild.id, childName: firstChild.name })
            }}
          >
            <Text style={s.quickBarIcon}>✓</Text>
            <Text style={[s.quickBarText, isArabic && s.rtlText]}>{copy.quickBarDaily}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.quickBarChat}
            style={s.quickBarBtn}
            onPress={() => {
              if (!firstChild) {
                Alert.alert(copy.noStudentTitle, copy.noChildAdmin)
                return
              }
              navigation.navigate('ParentChat', { childId: firstChild.id, childName: firstChild.name })
            }}
          >
            <Text style={s.quickBarIcon}>✉</Text>
            <Text style={[s.quickBarText, isArabic && s.rtlText]}>{copy.quickBarChat}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.quickBarHelp} style={s.quickBarBtn} onPress={() => navigation.navigate('ParentMenuHelp')}>
            <Text style={s.quickBarIcon}>?</Text>
            <Text style={[s.quickBarText, isArabic && s.rtlText]}>{copy.quickBarHelp}</Text>
          </Pressable>
        </View>

        </ScrollView>

      <Modal visible={showWhatsNewModal} transparent animationType="fade" onRequestClose={() => setShowWhatsNewModal(false)}>
        <View style={s.whatsNewOverlay}>
          <View style={s.whatsNewCard}>
            <Text style={[s.whatsNewTitle, isArabic && s.rtlText]}>{copy.whatsNewTitle}</Text>
            <Text style={[s.whatsNewBody, isArabic && s.rtlText]}>{copy.whatsNewBody}</Text>
            <Pressable
              style={s.whatsNewOkBtn}
              onPress={() => {
                setShowWhatsNewModal(false)
                void AsyncStorage.setItem(whatsNewSeenKey, '1')
              }}
            >
              <Text style={s.whatsNewOkBtnText}>{copy.ok}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2eff9' },
  homeContent: { flex: 1 },
  wrap: { padding: 16, gap: 12, paddingBottom: 34 },
  heroCard: {
    backgroundColor: '#211a2e',
    borderRadius: 30,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4f3b86',
    overflow: 'hidden',
    shadowColor: '#211a2e',
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
    backgroundColor: 'rgba(124,77,255,0.42)',
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
  languageSwitchDark: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 4, gap: 4 },
  languageSwitchInHeroRow: { flex: 1, minWidth: 0 },
  heroProfileBtn: {
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
  },
  heroProfileIcon: { fontSize: 18, color: '#fff', fontWeight: '900' },
  heroProfileLabel: { color: '#ddd6fe', fontSize: 8, fontWeight: '900', textAlign: 'center' },
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
  heroAlertsLabel: { color: '#ddd6fe', fontSize: 8, fontWeight: '900', textAlign: 'center' },
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
  langTextDark: { color: '#ddd6fe', fontWeight: '800' },
  langTextDarkActive: { color: '#211a2e' },
  heroEyebrow: { color: '#ddd6fe', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  heroText: { color: '#eee9ff', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  heroHint: { color: '#d8ceff', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 4 },
  startHereCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
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
    backgroundColor: '#6d46d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBadgeText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  startCopy: { flex: 1, gap: 3 },
  startTitle: { color: '#17131f', fontSize: 16, fontWeight: '900' },
  startText: { color: '#6d6485', lineHeight: 20, fontWeight: '700' },
  startGoBtn: { backgroundColor: '#f4f1fb', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  startGoText: { color: '#6d46d4', fontWeight: '900' },
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 17,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#2d195a',
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  todayGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(124,77,255,0.08)',
    top: -34,
    right: -20,
  },
  offlinePendingCard: { backgroundColor: '#fffbeb', borderRadius: 14, borderWidth: 1, borderColor: '#f59e0b', padding: 12, gap: 6 },
  offlinePendingTitle: { color: '#92400e', fontWeight: '800' },
  offlinePendingText: { color: '#b45309', lineHeight: 20, fontWeight: '600' },
  offlineSyncedToast: { backgroundColor: '#ecfdf3', borderRadius: 12, borderWidth: 1, borderColor: '#86efac', padding: 10 },
  offlineSyncedToastText: { color: '#166534', fontWeight: '800', textAlign: 'center' },
  urgentCard: { backgroundColor: '#fff5f5', borderRadius: 16, borderWidth: 1, borderColor: '#fecaca', padding: 14, gap: 8 },
  urgentTitle: { color: '#991b1b', fontSize: 18, fontWeight: '800' },
  urgentSub: { color: '#7f1d1d', lineHeight: 20 },
  urgentBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 12, alignItems: 'center' },
  urgentBtnDisabled: { opacity: 0.6 },
  urgentBtnText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  sectionLabel: { color: '#17131f', fontSize: 19, fontWeight: '900' },
  todayText: { color: '#3b3150', fontSize: 16, fontWeight: '700', lineHeight: 23 },
  primaryActionBtn: { backgroundColor: '#6d46d4', borderRadius: 16, padding: 14, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  simpleSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 15,
    gap: 11,
    shadowColor: '#2d195a',
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardMiniBadge: {
    backgroundColor: '#f4f1fb',
    color: '#6d46d4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
  },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryBox: { flex: 1, backgroundColor: '#faf8ff', borderRadius: 16, borderWidth: 1, borderColor: '#ece4ff', padding: 10 },
  summaryBoxPurple: { backgroundColor: '#faf8ff' },
  summaryBoxTeal: { backgroundColor: '#effcf8', borderColor: '#ccfbf1' },
  summaryBoxBlue: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  summaryBoxGold: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  summaryNumber: { color: '#6d46d4', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  summaryLabel: { color: '#6d6485', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  simpleLine: { color: '#534c62', lineHeight: 20 },
  weekSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 15,
    gap: 11,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  weekSummaryGrid: { flexDirection: 'row', gap: 8 },
  weekTrendText: { color: '#3b3150', fontSize: 15, fontWeight: '800', lineHeight: 21 },
  weekNoteBox: {
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
    gap: 4,
  },
  weekNoteLabel: { color: '#1e3a8a', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  weekNoteText: { color: '#534c62', lineHeight: 20, fontWeight: '600' },
  weekProgressBtn: { backgroundColor: '#eff6ff', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 11 },
  weekProgressBtnText: { color: '#1d4ed8', fontWeight: '900', textAlign: 'center' },
  announcementsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 15,
    gap: 10,
    shadowColor: '#2d195a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  announcementLiveBadge: {
    backgroundColor: '#ecfdf5',
    color: '#047857',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
  },
  announcementItem: {
    backgroundColor: '#faf8ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ece4ff',
    padding: 12,
    gap: 5,
  },
  announcementTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  announcementTitle: { flex: 1, color: '#17131f', fontWeight: '900', fontSize: 15 },
  announcementPriority: {
    color: '#7c2d12',
    backgroundColor: '#ffedd5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  announcementBody: { color: '#534c62', lineHeight: 20, fontWeight: '600' },
  announcementDate: { color: '#7c7392', fontSize: 11, fontWeight: '700' },
  announcementCachedBadge: { backgroundColor: '#fffbeb', color: '#92400e' },
  announcementCacheHint: { color: '#92400e', lineHeight: 19, fontWeight: '700', fontSize: 12 },
  teacherStepsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 15,
    gap: 10,
    shadowColor: '#0f766e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  teacherStepItem: {
    backgroundColor: '#effcf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 12,
    gap: 4,
  },
  teacherStepTitle: { color: '#134e4a', fontWeight: '900', fontSize: 15 },
  teacherStepBody: { color: '#42635f', lineHeight: 20, fontWeight: '600' },
  rewardCard: { backgroundColor: '#fff7ed', borderRadius: 16, borderWidth: 1, borderColor: '#fed7aa', padding: 14, gap: 6 },
  rewardTitle: { color: '#7c2d12', fontSize: 18, fontWeight: '800' },
  rewardStars: { color: '#f59e0b', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  rewardSub: { color: '#7c2d12', lineHeight: 20, fontWeight: '700' },
  moreSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 15,
    gap: 10,
    shadowColor: '#2d195a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, backgroundColor: '#faf8ff', borderRadius: 16, borderWidth: 1, borderColor: '#dfd6ee', padding: 12 },
  quickBtnText: { color: '#5f3dc9', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  sheetBtn: { backgroundColor: '#faf8ff', borderRadius: 16, borderWidth: 1, borderColor: '#dfd6ee', padding: 12 },
  sheetBtnText: { color: '#5f3dc9', fontWeight: '700', textAlign: 'center' },
  todoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 15,
    gap: 8,
    shadowColor: '#2d195a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  todoTitle: { color: '#17131f', fontWeight: '900', fontSize: 16 },
  todoSub: { color: '#6d6485', fontSize: 12 },
  progressTrack: { height: 10, backgroundColor: '#ece4ff', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#e3d9fb' },
  progressFill: { height: '100%', backgroundColor: '#6d46d4' },
  taskList: { gap: 7, marginTop: 2 },
  taskRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#faf8ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ece4ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  taskDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#f4f1fb',
    color: '#6d46d4',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskDotDone: { backgroundColor: '#dcfce7', color: '#15803d' },
  taskLabel: { flex: 1, color: '#3b3150', fontWeight: '800', lineHeight: 18 },
  taskLabelDone: { color: '#64748b', textDecorationLine: 'line-through' },
  nextActionBtn: { backgroundColor: '#f4f1fb', borderRadius: 14, padding: 11 },
  nextActionText: { color: '#6d46d4', fontWeight: '800', textAlign: 'center', fontSize: 12 },
  doneBadge: { backgroundColor: '#eefcf3', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#b7ebc7' },
  doneBadgeText: { color: '#146c2e', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  refreshBtn: { marginTop: -2, marginBottom: 2, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dfd6ee', padding: 10 },
  refreshBtnDisabled: { opacity: 0.72 },
  refreshContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshBtnText: { color: '#6d46d4', fontWeight: '800', textAlign: 'center' },
  lastUpdatedText: { color: '#ddd6fe', fontSize: 12, fontWeight: '700', marginTop: 2 },
  tipsCard: {
    backgroundColor: '#eef6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bcd8ff',
    padding: 12,
    gap: 5,
  },
  tipsTitle: { color: '#1e3a8a', fontWeight: '900', fontSize: 16 },
  tipsLine: { color: '#334155', lineHeight: 20, fontWeight: '600' },
  tipsHideBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tipsHideBtnText: { color: '#1d4ed8', fontWeight: '800' },
  quickBarWrap: {
    marginTop: 2,
    marginBottom: 6,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 8,
    shadowColor: '#2d195a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  quickBarBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#f4f1fb',
    borderWidth: 1,
    borderColor: '#dfd6ee',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  quickBarIcon: { color: '#6d46d4', fontWeight: '900', fontSize: 15 },
  quickBarText: { color: '#6d46d4', fontWeight: '800', fontSize: 12 },
  whatsNewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 14, 41, 0.58)',
    justifyContent: 'center',
    padding: 22,
  },
  whatsNewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 18,
    gap: 10,
  },
  whatsNewTitle: { color: '#17131f', fontSize: 21, fontWeight: '900' },
  whatsNewBody: { color: '#534c62', lineHeight: 22, fontWeight: '600' },
  whatsNewOkBtn: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#6d46d4',
    paddingVertical: 11,
    alignItems: 'center',
  },
  whatsNewOkBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
})
