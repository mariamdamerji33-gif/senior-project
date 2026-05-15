import type { AppLanguage } from '../mvc/controllers/LanguageContextController'

export type ParentMood =
  | 'great'
  | 'good'
  | 'ok'
  | 'hard'
  | 'happy'
  | 'calm'
  | 'confused'
  | 'sad'
  | 'angry'

export type ParentAppetite = 'low' | 'normal' | 'high'

const MOOD_IDS: ParentMood[] = ['great', 'good', 'ok', 'hard', 'happy', 'calm', 'confused', 'sad', 'angry']

const MOOD_LABELS: Record<AppLanguage, Record<ParentMood, string>> = {
  en: {
    great: 'Great',
    good: 'Good',
    ok: 'OK',
    hard: 'Hard',
    happy: 'Happy',
    calm: 'Calm',
    confused: 'Confused',
    sad: 'Sad',
    angry: 'Angry',
  },
  ar: {
    great: 'رائع',
    good: 'جيد',
    ok: 'عادي',
    hard: 'صعب',
    happy: 'سعيد',
    calm: 'هادئ',
    confused: 'مرتبك',
    sad: 'حزين',
    angry: 'غاضب',
  },
}

const APPETITE_IDS: ParentAppetite[] = ['low', 'normal', 'high']
const APPETITE_LABELS: Record<AppLanguage, Record<ParentAppetite, string>> = {
  en: { low: 'low', normal: 'normal', high: 'high' },
  ar: { low: 'قليل', normal: 'عادي', high: 'زيادة' },
}

export function buildParentMoodOptions(language: AppLanguage) {
  return MOOD_IDS.map((value) => ({ value, label: MOOD_LABELS[language][value] }))
}

export function buildParentAppetiteOptions(language: AppLanguage) {
  return APPETITE_IDS.map((value) => ({ value, label: APPETITE_LABELS[language][value] }))
}

export function formatStoredMood(language: AppLanguage, raw: string | null | undefined): string {
  if (!raw) return language === 'en' ? 'n/a' : 'لا يوجد'
  const m = raw as ParentMood
  return MOOD_LABELS[language][m] ?? raw
}

export function formatStoredAppetite(language: AppLanguage, raw: string | null | undefined): string {
  if (!raw) return language === 'en' ? 'n/a' : 'لا يوجد'
  const a = raw as ParentAppetite
  return APPETITE_LABELS[language][a] ?? raw
}

export function getDailyCheckinCopy(language: AppLanguage, childName: string, today: string) {
  const en = language === 'en'
  const na = en ? 'n/a' : 'لا يوجد'
  return {
    eyebrow: en ? 'Daily' : 'يومي',
    title: en ? 'Check-in' : 'متابعة يومية',
    subtitle: en ? `${childName || 'Your child'} · ${today}` : `${childName || 'طفلك'} · ${today}`,
    backToday: en ? '← Today' : '← اليوم',
    offlineBanner: (n: number) =>
      en
        ? `${n} offline check-in(s) waiting to sync.`
        : `${n} متابعة محفوظة بدون إنترنت في انتظار المزامنة.`,
    syncNow: en ? 'Sync now' : 'مزامنة',
    syncing: en ? 'Syncing...' : 'جاري المزامنة...',
    historyErrorTitle: en ? 'Could not load check-in history' : 'تعذّر تحميل السجل',
    retry: en ? 'Try again' : 'إعادة المحاولة',
    loading: en ? 'Loading...' : 'جاري التحميل...',
    mood: en ? 'Mood' : 'المزاج',
    sleepHours: en ? 'Sleep hours' : 'ساعات النوم',
    appetite: en ? 'Appetite' : 'الشهية',
    meltdowns: en ? 'Meltdowns today' : 'نوبات اليوم',
    notes: en ? 'Notes' : 'ملاحظات',
    notesPlaceholder: en ? 'Optional notes for teacher...' : 'ملاحظات اختيارية للمعلم...',
    saveCheckin: en ? 'Save check-in' : 'حفظ',
    saving: en ? 'Saving...' : 'جاري الحفظ...',
    recentTitle: en ? 'Recent check-ins' : 'آخر المتابعات',
    noHistory: en ? 'No check-ins yet.' : 'لا توجد متابعات بعد.',
    historySleep: (h: string | number) => (en ? `Sleep: ${h} h` : `النوم: ${h} س`),
    historyMeltdowns: (m: string | number) => (en ? `Meltdowns: ${m}` : `النوبات: ${m}`),
    historyNotes: (n: string) => (en ? `Notes: ${n}` : `ملاحظات: ${n}`),
    historyMood: (m: string) => (en ? `Mood: ${m}` : `المزاج: ${m}`),
    historyAppetite: (a: string) => (en ? `Appetite: ${a}` : `الشهية: ${a}`),
    alertInvalidTitle: en ? 'Invalid input' : 'إدخال غير صالح',
    alertSleepBody: en ? 'Sleep hours must be between 0 and 24.' : 'ساعات النوم بين 0 و 24.',
    alertMeltdownBody: en ? 'Meltdowns must be between 0 and 20.' : 'عدد النوبات بين 0 و 20.',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: en ? 'Daily check-in saved successfully.' : 'تم حفظ المتابعة اليومية.',
    alertOfflineTitle: en ? 'Saved offline' : 'حفظ بدون إنترنت',
    alertOfflineBody:
      en
        ? 'No internet right now. Your check-in is saved and will sync automatically.'
        : 'لا يوجد اتصال. تم حفظ المتابعة وستُزامن تلقائيًا.',
    alertSaveFailed: en ? 'Save failed' : 'فشل الحفظ',
    unknownError: en ? 'Unknown error' : 'خطأ غير معروف',
    na,
  }
}

export function getActivityResultCopy(language: AppLanguage) {
  const en = language === 'en'
  return {
    title: en ? 'Last saved result' : 'آخر نتيجة محفوظة',
    score: (n: number) => (en ? `Score: ${n}` : `الدرجة: ${n}`),
  }
}
