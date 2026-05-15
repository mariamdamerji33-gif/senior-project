import type { AppLanguage } from '../mvc/controllers/LanguageContextController'
import {
  DAILY_CLIP_ORDER,
  type DailyVideoSource,
  type DailyClipId,
  resolveDailyVideoSource,
} from './dailySupportedVideoUrls'

export type DailyClip = {
  id: DailyClipId
  day: string
  title: string
  description: string
  grownUpTip: string
  practice: string
  source: DailyVideoSource
}

const WEEKDAY: Record<AppLanguage, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
}

type DayCopy = { title: string; description: string; grownUpTip: string; practice: string }

const DAY_COPY: Record<AppLanguage, Record<DailyClipId, DayCopy>> = {
  en: {
    regulation: {
      title: 'Calm body breathing',
      description: 'Learn one simple breathing routine for calming the body before learning.',
      grownUpTip: 'Practice together once after the video. Keep the room quiet and praise any attempt.',
      practice: 'Try 3 slow breaths together.',
    },
    'predictable-start': {
      title: 'Visual schedule',
      description: 'Learn how pictures can show what happens now and what happens next.',
      grownUpTip: 'After watching, point to two pictures: first video, then one real activity.',
      practice: 'Say or point: first, then.',
    },
    'routine-story': {
      title: 'First then routine',
      description: 'Practice moving from one activity to another with a short first/then plan.',
      grownUpTip: 'Use the same words every day: first this, then that. Predictability helps.',
      practice: 'Choose one first/then pair.',
    },
    'feelings-names': {
      title: 'Name your feelings',
      description: 'Learn words for feelings and safe ways to show them.',
      grownUpTip: 'Model one feeling word; accept pointing, repeating, gesture, or AAC as participation.',
      practice: 'Pick one feeling word.',
    },
    'sounds-words': {
      title: 'Big feelings, calm choices',
      description: 'Learn what to do when feelings get loud: pause, breathe, ask for help.',
      grownUpTip: 'Pause before the end and ask: “What can we do when mad?” Offer choices.',
      practice: 'Choose: breathe, break, or help.',
    },
    'social-practice': {
      title: 'Personal space',
      description: 'Learn about body space, safe distance, and respecting another person’s bubble.',
      grownUpTip: 'Practice arm-length distance with a trusted adult for 20 seconds.',
      practice: 'Show your safe space bubble.',
    },
    celebration: {
      title: 'Rainbow breathing reward',
      description: 'End the week with a short visual breathing video and celebrate effort.',
      grownUpTip: 'Repeat the short clip once if the child wants a full 2-minute calm routine.',
      practice: 'Breathe and choose a reward.',
    },
  },
  ar: {
    regulation: {
      title: 'تنفس لتهدئة الجسم',
      description: 'تعلّم تمرين تنفس بسيط لتهدئة الجسم قبل التعلم.',
      grownUpTip: 'تدرّبوا مرة بعد الفيديو. اجعلوا المكان هادئًا وامدحوا أي محاولة.',
      practice: 'جرّبوا 3 أنفاس بطيئة.',
    },
    'predictable-start': {
      title: 'الجدول المصور',
      description: 'تعلّم كيف تساعد الصور على معرفة ما يحدث الآن وما يحدث بعد ذلك.',
      grownUpTip: 'بعد المشاهدة، أشر إلى صورتين: أولًا الفيديو، ثم نشاط حقيقي.',
      practice: 'قل أو أشر: أولًا، ثم.',
    },
    'routine-story': {
      title: 'روتين أولًا ثم',
      description: 'تدرّب على الانتقال من نشاط إلى آخر بخطة قصيرة: أولًا ثم.',
      grownUpTip: 'استخدموا نفس الكلمات كل يوم: أولًا هذا، ثم ذلك. التوقع الواضح يساعد.',
      practice: 'اختاروا نشاط أولًا ثم نشاطًا بعده.',
    },
    'feelings-names': {
      title: 'تسمية المشاعر',
      description: 'تعلّم كلمات للمشاعر وطرقًا آمنة للتعبير عنها.',
      grownUpTip: 'اعرضوا كلمة شعور واحدة؛ تقبلوا الإشارة أو الترديد أو جهاز التواصل كمشاركة.',
      practice: 'اختاروا كلمة شعور واحدة.',
    },
    'sounds-words': {
      title: 'مشاعر كبيرة واختيارات هادئة',
      description: 'تعلّم ماذا تفعل عندما تكبر المشاعر: توقف، تنفس، اطلب المساعدة.',
      grownUpTip: 'أوقفوا الفيديو قبل النهاية واسألوا: ماذا نفعل عند الغضب؟ اعرضوا اختيارات.',
      practice: 'اختر: تنفس، استراحة، أو مساعدة.',
    },
    'social-practice': {
      title: 'المساحة الشخصية',
      description: 'تعلّم مساحة الجسم والمسافة الآمنة واحترام مساحة الآخرين.',
      grownUpTip: 'تدرّبوا على مسافة طول الذراع مع شخص موثوق لمدة 20 ثانية.',
      practice: 'أرِني فقاعة المساحة الآمنة.',
    },
    celebration: {
      title: 'تنفس قوس قزح كمكافأة',
      description: 'اختم الأسبوع بفيديو تنفس بصري قصير واحتفل بالمحاولة.',
      grownUpTip: 'كرروا المقطع مرة إذا أراد الطفل روتين تهدئة مدته دقيقتان.',
      practice: 'تنفسوا ثم اختاروا مكافأة.',
    },
  },
}

export const CHILD_VIDEOS_UI: Record<
  AppLanguage,
  {
    screenTitle: string
    screenSubtitle: (childName: string) => string
    disclaimer: string
    dailyLabel: string
    playToday: string
    nowPlaying: string
    weekPlan: string
    todayBadge: string
    loadError: string
    durationLabel: string
    practiceLabel: string
  }
> = {
  en: {
    screenTitle: 'Daily supported videos',
    screenSubtitle: (childName) =>
      `Hi ${childName}. One short learning video each day — the same 7-day order every week for a predictable routine.`,
    disclaimer:
      'Each day uses a 2-3 minute autism-friendly learning segment. A grown-up should stay nearby, pause when needed, and practice the small activity after the video.',
    dailyLabel: "Today's video",
    playToday: "Play today's video",
    nowPlaying: 'Now playing',
    weekPlan: "This week's plan",
    todayBadge: 'Today',
    loadError: 'This clip could not load. Pick another day below or check your connection.',
    durationLabel: 'Length',
    practiceLabel: 'After video',
  },
  ar: {
    screenTitle: 'فيديوهات يومية داعمة',
    screenSubtitle: (childName) =>
      `مرحبًا ${childName}. فيديو تعلّم قصير كل يوم — نفس ترتيب الأيام السبعة كل أسبوع لروتين أوضح.`,
    disclaimer:
      'كل يوم يستخدم مقطع تعلّم مناسبًا للتوحد مدته تقريبًا دقيقتان إلى ثلاث دقائق. يجب بقاء شخص بالغ قريبًا، وإيقاف الفيديو عند الحاجة، وتطبيق النشاط القصير بعده.',
    dailyLabel: 'فيديو اليوم',
    playToday: 'تشغيل فيديو اليوم',
    nowPlaying: 'يعرض الآن',
    weekPlan: 'خطة هذا الأسبوع',
    todayBadge: 'اليوم',
    loadError: 'تعذّر تحميل المقطع. جرّب يومًا آخر أو تحققوا من الاتصال.',
    durationLabel: 'المدة',
    practiceLabel: 'بعد الفيديو',
  },
}

export function buildDailyClips(language: AppLanguage): DailyClip[] {
  const days = WEEKDAY[language]
  const copy = DAY_COPY[language]
  return DAILY_CLIP_ORDER.map((id, index) => ({
    id,
    day: days[index] ?? days[0],
    title: copy[id].title,
    description: copy[id].description,
    grownUpTip: copy[id].grownUpTip,
    practice: copy[id].practice,
    source: resolveDailyVideoSource(id),
  }))
}
