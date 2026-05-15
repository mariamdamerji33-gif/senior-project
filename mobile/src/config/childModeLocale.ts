import type { AppLanguage } from '../mvc/controllers/LanguageContextController'

export type ChildModeActivityId = 'pecs' | 'matching' | 'daily-games' | 'speech' | 'routine' | 'feelings' | 'videos'

type ActivityCopy = { title: string; subtitle: string }

const ACTIVITIES: Record<AppLanguage, Record<ChildModeActivityId, ActivityCopy>> = {
  en: {
    pecs: { title: 'PECS Cards', subtitle: 'Use pictures to ask for help, food, play, or a break.' },
    matching: { title: 'Matching Game', subtitle: 'Find the same pictures and earn stars.' },
    'daily-games': { title: 'Daily Games', subtitle: 'Play colors, shapes, feelings, and routine games every day.' },
    speech: { title: 'Speech Repeat', subtitle: 'Practice short useful phrases out loud.' },
    routine: { title: 'Daily Routine', subtitle: 'Follow simple steps for today.' },
    feelings: { title: 'Feelings Check-In', subtitle: 'Choose how you feel and share it with family.' },
    videos: { title: 'Learning Videos', subtitle: 'Watch calm videos for practice and learning.' },
  },
  ar: {
    pecs: { title: 'بطاقات التواصل', subtitle: 'استخدم الصور لطلب المساعدة أو الطعام أو اللعب أو الاستراحة.' },
    matching: { title: 'لعبة المطابقة', subtitle: 'اعثر على نفس الصور واكسب النجوم.' },
    'daily-games': { title: 'ألعاب يومية', subtitle: 'العب ألعاب الألوان والأشكال والمشاعر والروتين كل يوم.' },
    speech: { title: 'تكرار النطق', subtitle: 'تدرّب على جمل قصيرة ومفيدة بصوت عالٍ.' },
    routine: { title: 'الروتين اليومي', subtitle: 'اتبع خطوات بسيطة لهذا اليوم.' },
    feelings: { title: 'مشاعر اليوم', subtitle: 'اختر شعورك وشاركه مع العائلة.' },
    videos: { title: 'فيديوهات تعلّم', subtitle: 'شاهد فيديوهات هادئة للتدريب والتعلم.' },
  },
}

export function getChildModeCopy(language: AppLanguage) {
  const a = ACTIVITIES[language]
  return {
    eyebrow: language === 'ar' ? 'مساحة الطفل' : 'Child Space',
    titleHello: (name: string) => (language === 'ar' ? `مرحبًا ${name}` : `Hi ${name}`),
    heroSub:
      language === 'ar'
        ? 'اختر نشاطًا واحدًا. تدريب قصير يكفي لهذا اليوم.'
        : 'Pick one activity. Short practice is enough for today.',
    progressTitle: language === 'ar' ? 'ابدأ من هنا' : 'Start Here',
    progressText:
      language === 'ar'
        ? 'اختر أي بطاقة أدناه. عند الانتهاء يمكن حفظ تقدمك للعائلة والمعلم.'
        : 'Choose any card below. When you finish, your progress can be saved for your family and teacher.',
    pillBig: language === 'ar' ? 'أزرار كبيرة' : 'Big buttons',
    pillSimple: language === 'ar' ? 'كلمات بسيطة' : 'Simple words',
    pillStars: language === 'ar' ? 'نجوم' : 'Stars',
    startHint: language === 'ar' ? 'اضغط للبدء' : 'Tap to start',
    activities: a,
  }
}
