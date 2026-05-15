import type { AppLanguage } from '../mvc/controllers/LanguageContextController'

export type PecsCard = { id: string; icon: string; label: string; phrase: string }
export type PhraseItem = { id: string; text: string }
export type RoutineTask = { id: string; label: string; done: boolean }
export type FeelingOption = { id: string; emoji: string; label: string; score: number; teacherHint: string }
export type DailyMiniGame = {
  id: string
  title: string
  subtitle: string
  prompt: string
  choices: { id: string; icon: string; label: string }[]
  answerId: string
  success: string
  tryAgain: string
}

const PECS_ICONS: Record<string, string> = {
  drink: '🥤',
  eat: '🍎',
  play: '🧩',
  toilet: '🚻',
  help: '🆘',
  break: '🛋️',
}

const PECS_IDS = ['drink', 'eat', 'play', 'toilet', 'help', 'break'] as const

const PECS_LABELS: Record<AppLanguage, Record<(typeof PECS_IDS)[number], { label: string; phrase: string }>> = {
  en: {
    drink: { label: 'Drink', phrase: 'I want a drink' },
    eat: { label: 'Eat', phrase: 'I want to eat' },
    play: { label: 'Play', phrase: 'I want to play' },
    toilet: { label: 'Toilet', phrase: 'I need the toilet' },
    help: { label: 'Help', phrase: 'Please help me' },
    break: { label: 'Break', phrase: 'I need a break' },
  },
  ar: {
    drink: { label: 'شراب', phrase: 'أريد شرابًا' },
    eat: { label: 'أكل', phrase: 'أريد أن آكل' },
    play: { label: 'لعب', phrase: 'أريد أن ألعب' },
    toilet: { label: 'حمام', phrase: 'أحتاج الحمام' },
    help: { label: 'مساعدة', phrase: 'ساعدوني من فضلكم' },
    break: { label: 'استراحة', phrase: 'أحتاج استراحة' },
  },
}

export function buildPecsCards(language: AppLanguage): PecsCard[] {
  return PECS_IDS.map((id) => ({
    id,
    icon: PECS_ICONS[id],
    label: PECS_LABELS[language][id].label,
    phrase: PECS_LABELS[language][id].phrase,
  }))
}

export function getPecsUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    summaryEmpty: en ? 'Select a card to communicate' : 'اختر بطاقة للتواصل',
    summaryUsed: (n: number) =>
      en ? `${n} cards used today` : `${n} بطاقة مستخدمة اليوم`,
    speechTitle: en ? 'Selected phrase' : 'العبارة المختارة',
    speechEmpty: en ? 'Tap a card to build communication.' : 'المس بطاقة لبناء التواصل.',
    recentTitle: en ? 'Recent cards' : 'آخر البطاقات',
    recentEmpty: en ? 'No cards used yet.' : 'لم تُستخدم بطاقات بعد.',
    saving: en ? 'Saving progress...' : 'جاري حفظ التقدم...',
    savedLine: en ? 'Progress saved successfully.' : 'تم حفظ التقدم بنجاح.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save progress' : 'حفظ التقدم',
    savedBtn: en ? 'Progress saved' : 'تم الحفظ',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: en ? 'PECS activity progress was saved. 1 star earned.' : 'تم حفظ نشاط البطاقات. نجمة واحدة.',
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save progress' : 'تعذّر حفظ التقدم',
  }
}

export function getMatchingUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    moves: (n: number) => (en ? `Moves: ${n}` : `الحركات: ${n}`),
    statusDone: en ? 'Great job! You matched all cards.' : 'أحسنت! طابقت كل البطاقات.',
    statusHint: en ? 'Match pairs to complete the game.' : 'طابق الأزواج لإكمال اللعبة.',
    saving: en ? 'Saving progress...' : 'جاري حفظ التقدم...',
    savedLine: en ? 'Progress saved successfully.' : 'تم حفظ التقدم بنجاح.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save progress' : 'حفظ التقدم',
    savedBtn: en ? 'Progress saved' : 'تم الحفظ',
    playAgain: en ? 'Play again' : 'العب مجددًا',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: en ? 'Matching game progress was saved. 2 stars earned.' : 'تم حفظ لعبة المطابقة. نجمتان.',
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save progress' : 'تعذّر حفظ التقدم',
  }
}

const DAILY_GAMES: Record<AppLanguage, DailyMiniGame[]> = {
  en: [
    {
      id: 'color-blue',
      title: 'Color match',
      subtitle: 'Look, choose, and say the color.',
      prompt: 'Find blue',
      choices: [
        { id: 'red', icon: '●', label: 'Red' },
        { id: 'blue', icon: '●', label: 'Blue' },
        { id: 'yellow', icon: '●', label: 'Yellow' },
      ],
      answerId: 'blue',
      success: 'Great. This is blue.',
      tryAgain: 'Try again. Look for blue.',
    },
    {
      id: 'shape-circle',
      title: 'Shape match',
      subtitle: 'Practice visual matching with simple shapes.',
      prompt: 'Find the circle',
      choices: [
        { id: 'square', icon: '■', label: 'Square' },
        { id: 'circle', icon: '●', label: 'Circle' },
        { id: 'triangle', icon: '▲', label: 'Triangle' },
      ],
      answerId: 'circle',
      success: 'Nice work. Circle matched.',
      tryAgain: 'Try again. The circle is round.',
    },
    {
      id: 'emotion-happy',
      title: 'Feeling face',
      subtitle: 'Learn to recognize common emotions.',
      prompt: 'Who is happy?',
      choices: [
        { id: 'sad', icon: '😢', label: 'Sad' },
        { id: 'happy', icon: '😊', label: 'Happy' },
        { id: 'angry', icon: '😠', label: 'Angry' },
      ],
      answerId: 'happy',
      success: 'Yes. That face is happy.',
      tryAgain: 'Try again. Happy has a smile.',
    },
    {
      id: 'routine-breakfast',
      title: 'What comes next?',
      subtitle: 'Practice daily routine order.',
      prompt: 'After waking up, what comes next?',
      choices: [
        { id: 'breakfast', icon: '🍽️', label: 'Eat breakfast' },
        { id: 'sleep', icon: '🛏️', label: 'Go to sleep' },
        { id: 'bus', icon: '🚌', label: 'Go home' },
      ],
      answerId: 'breakfast',
      success: 'Correct. Breakfast comes next.',
      tryAgain: 'Try again. Think about morning routine.',
    },
    {
      id: 'first-then',
      title: 'First / Then',
      subtitle: 'Practice following a simple two-step plan.',
      prompt: 'First wash hands. Then what?',
      choices: [
        { id: 'eat', icon: '🍎', label: 'Eat snack' },
        { id: 'sleep', icon: '🛏️', label: 'Sleep' },
        { id: 'run', icon: '🏃', label: 'Run away' },
      ],
      answerId: 'eat',
      success: 'Correct. First wash hands, then eat snack.',
      tryAgain: 'Try again. First wash hands, then snack.',
    },
    {
      id: 'same-different',
      title: 'Same or different',
      subtitle: 'Build attention by comparing two pictures.',
      prompt: 'Which two are the same?',
      choices: [
        { id: 'cars', icon: '🚗🚗', label: 'Cars' },
        { id: 'apple-car', icon: '🍎🚗', label: 'Apple and car' },
        { id: 'dog-ball', icon: '🐶⚽', label: 'Dog and ball' },
      ],
      answerId: 'cars',
      success: 'Yes. The two cars are the same.',
      tryAgain: 'Try again. Look for two matching pictures.',
    },
    {
      id: 'big-small',
      title: 'Big and small',
      subtitle: 'Practice size words with simple choices.',
      prompt: 'Find the big star',
      choices: [
        { id: 'small-star', icon: '☆', label: 'Small star' },
        { id: 'big-star', icon: '★', label: 'Big star' },
        { id: 'small-dot', icon: '•', label: 'Small dot' },
      ],
      answerId: 'big-star',
      success: 'Great. That is the big star.',
      tryAgain: 'Try again. Big means larger.',
    },
  ],
  ar: [
    {
      id: 'color-blue',
      title: 'مطابقة اللون',
      subtitle: 'انظر، اختر، وسمِّ اللون.',
      prompt: 'اعثر على الأزرق',
      choices: [
        { id: 'red', icon: '●', label: 'أحمر' },
        { id: 'blue', icon: '●', label: 'أزرق' },
        { id: 'yellow', icon: '●', label: 'أصفر' },
      ],
      answerId: 'blue',
      success: 'رائع. هذا أزرق.',
      tryAgain: 'حاول مرة أخرى. ابحث عن الأزرق.',
    },
    {
      id: 'shape-circle',
      title: 'مطابقة الشكل',
      subtitle: 'تدريب بصري بأشكال بسيطة.',
      prompt: 'اعثر على الدائرة',
      choices: [
        { id: 'square', icon: '■', label: 'مربع' },
        { id: 'circle', icon: '●', label: 'دائرة' },
        { id: 'triangle', icon: '▲', label: 'مثلث' },
      ],
      answerId: 'circle',
      success: 'أحسنت. طابقت الدائرة.',
      tryAgain: 'حاول مرة أخرى. الدائرة شكلها مستدير.',
    },
    {
      id: 'emotion-happy',
      title: 'وجه الشعور',
      subtitle: 'تعلّم تمييز المشاعر الشائعة.',
      prompt: 'من هو السعيد؟',
      choices: [
        { id: 'sad', icon: '😢', label: 'حزين' },
        { id: 'happy', icon: '😊', label: 'سعيد' },
        { id: 'angry', icon: '😠', label: 'غاضب' },
      ],
      answerId: 'happy',
      success: 'نعم. هذا الوجه سعيد.',
      tryAgain: 'حاول مرة أخرى. السعيد يبتسم.',
    },
    {
      id: 'routine-breakfast',
      title: 'ماذا بعد؟',
      subtitle: 'تدريب على ترتيب الروتين اليومي.',
      prompt: 'بعد الاستيقاظ، ماذا يأتي بعد ذلك؟',
      choices: [
        { id: 'breakfast', icon: '🍽️', label: 'تناول الفطور' },
        { id: 'sleep', icon: '🛏️', label: 'النوم' },
        { id: 'bus', icon: '🚌', label: 'العودة للمنزل' },
      ],
      answerId: 'breakfast',
      success: 'صحيح. الفطور يأتي بعد ذلك.',
      tryAgain: 'حاول مرة أخرى. فكّر في روتين الصباح.',
    },
    {
      id: 'first-then',
      title: 'أولًا / ثم',
      subtitle: 'تدرّب على خطة بسيطة من خطوتين.',
      prompt: 'أولًا نغسل اليدين. ثم ماذا؟',
      choices: [
        { id: 'eat', icon: '🍎', label: 'تناول وجبة خفيفة' },
        { id: 'sleep', icon: '🛏️', label: 'النوم' },
        { id: 'run', icon: '🏃', label: 'الجري بعيدًا' },
      ],
      answerId: 'eat',
      success: 'صحيح. أولًا نغسل اليدين، ثم نأكل وجبة خفيفة.',
      tryAgain: 'حاول مرة أخرى. أولًا غسل اليدين، ثم الوجبة.',
    },
    {
      id: 'same-different',
      title: 'نفس أو مختلف',
      subtitle: 'تقوية الانتباه بمقارنة صورتين.',
      prompt: 'أي صورتين متشابهتان؟',
      choices: [
        { id: 'cars', icon: '🚗🚗', label: 'سيارتان' },
        { id: 'apple-car', icon: '🍎🚗', label: 'تفاحة وسيارة' },
        { id: 'dog-ball', icon: '🐶⚽', label: 'كلب وكرة' },
      ],
      answerId: 'cars',
      success: 'نعم. السيارتان متشابهتان.',
      tryAgain: 'حاول مرة أخرى. ابحث عن صورتين متطابقتين.',
    },
    {
      id: 'big-small',
      title: 'كبير وصغير',
      subtitle: 'تدريب على كلمات الحجم باختيارات بسيطة.',
      prompt: 'اعثر على النجمة الكبيرة',
      choices: [
        { id: 'small-star', icon: '☆', label: 'نجمة صغيرة' },
        { id: 'big-star', icon: '★', label: 'نجمة كبيرة' },
        { id: 'small-dot', icon: '•', label: 'نقطة صغيرة' },
      ],
      answerId: 'big-star',
      success: 'رائع. هذه النجمة الكبيرة.',
      tryAgain: 'حاول مرة أخرى. كبير يعني أكبر حجمًا.',
    },
  ],
}

export function buildDailyMiniGames(language: AppLanguage): DailyMiniGame[] {
  return DAILY_GAMES[language]
}

export function getDailyMiniGamesUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    childLine: (name: string) => (en ? `Daily play for ${name}` : `لعب يومي من أجل ${name}`),
    intro: en
      ? 'Play 7 short games every day: colors, shapes, feelings, first/then, routine, matching, and size.'
      : 'العب 7 ألعاب قصيرة يوميًا: الألوان، الأشكال، المشاعر، أولًا/ثم، الروتين، المطابقة، والحجم.',
    progress: (done: number, total: number) => (en ? `Completed: ${done}/${total}` : `المكتمل: ${done}/${total}`),
    choose: en ? 'Choose an answer' : 'اختر إجابة',
    completeAll: en ? 'Complete all games to earn 3 stars.' : 'أكمل كل الألعاب لتحصل على 3 نجوم.',
    saving: en ? 'Saving daily games...' : 'جاري حفظ الألعاب اليومية...',
    savedLine: en ? 'Daily games saved successfully.' : 'تم حفظ الألعاب اليومية بنجاح.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save daily games' : 'حفظ الألعاب اليومية',
    savedBtn: en ? 'Daily games saved' : 'تم حفظ الألعاب',
    reset: en ? 'Play again' : 'العب مجددًا',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: (stars: number) =>
      en ? `Daily games progress was saved. ${stars} star(s) earned.` : `تم حفظ الألعاب اليومية. ${stars} نجمة.`,
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save daily games' : 'تعذّر حفظ الألعاب اليومية',
  }
}

const SPEECH_IDS = ['1', '2', '3', '4'] as const
const SPEECH_TEXT: Record<AppLanguage, Record<(typeof SPEECH_IDS)[number], string>> = {
  en: {
    '1': 'I want water',
    '2': 'I need help',
    '3': 'I want to play',
    '4': 'I am happy',
  },
  ar: {
    '1': 'أريد ماء',
    '2': 'أحتاج مساعدة',
    '3': 'أريد أن ألعب',
    '4': 'أنا سعيد',
  },
}

export function buildSpeechPhrases(language: AppLanguage): PhraseItem[] {
  return SPEECH_IDS.map((id) => ({ id, text: SPEECH_TEXT[language][id] }))
}

export function getSpeechUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    meta: (done: string, attempts: number) =>
      en ? `Completed: ${done} | Attempts: ${attempts}` : `المكتمل: ${done} | المحاولات: ${attempts}`,
    prompt: en ? 'Repeat this phrase:' : 'كرّر هذه العبارة:',
    hint: en ? 'Use your voice, then tap "Mark done".' : 'استخدم صوتك ثم اضغط «تم».',
    markDone: en ? 'Mark done' : 'تم',
    nextPhrase: en ? 'Next phrase' : 'العبارة التالية',
    resetSession: en ? 'Reset session' : 'إعادة الجلسة',
    saving: en ? 'Saving progress...' : 'جاري حفظ التقدم...',
    savedLine: en ? 'Progress saved successfully.' : 'تم حفظ التقدم بنجاح.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save progress' : 'حفظ التقدم',
    savedBtn: en ? 'Progress saved' : 'تم الحفظ',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: en ? 'Speech training progress was saved. 1 star earned.' : 'تم حفظ تمرين النطق. نجمة واحدة.',
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save progress' : 'تعذّر حفظ التقدم',
  }
}

const ROUTINE_IDS = ['wake', 'breakfast', 'school', 'practice', 'play'] as const
const ROUTINE_LABELS: Record<AppLanguage, Record<(typeof ROUTINE_IDS)[number], string>> = {
  en: {
    wake: 'Wake up and wash face',
    breakfast: 'Eat breakfast',
    school: 'Prepare school bag',
    practice: 'Do speech practice',
    play: 'Play time',
  },
  ar: {
    wake: 'الاستيقاظ وغسل الوجه',
    breakfast: 'تناول الفطور',
    school: 'تجهيز حقيبة المدرسة',
    practice: 'تمرين النطق',
    play: 'وقت اللعب',
  },
}

export function buildRoutineTasks(language: AppLanguage, preserveDone: Record<string, boolean>): RoutineTask[] {
  return ROUTINE_IDS.map((id) => ({
    id,
    label: ROUTINE_LABELS[language][id],
    done: preserveDone[id] ?? false,
  }))
}

export function getRoutineUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    childLine: (name: string) => (en ? `Child: ${name}` : `الطفل: ${name}`),
    progress: (done: number, total: number) =>
      en ? `Completed: ${done}/${total}` : `المكتمل: ${done}/${total}`,
    statusDone: en ? 'Excellent! All routine tasks completed.' : 'ممتاز! اكتملت كل المهام.',
    statusHint: en ? 'Tap each task after finishing it.' : 'اضغط كل مهمة بعد إنهائها.',
    saving: en ? 'Saving progress...' : 'جاري حفظ التقدم...',
    savedLine: en ? 'Progress saved successfully.' : 'تم حفظ التقدم بنجاح.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save progress' : 'حفظ التقدم',
    savedBtn: en ? 'Progress saved' : 'تم الحفظ',
    resetDay: en ? 'Reset day' : 'إعادة اليوم',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: (stars: number) =>
      en
        ? `Daily routine progress was saved. ${stars} star(s) earned.`
        : `تم حفظ الروتين اليومي. ${stars} نجمة.`,
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save progress' : 'تعذّر حفظ التقدم',
  }
}

const FEELING_IDS = ['happy', 'calm', 'confused', 'sad', 'angry'] as const
const FEELING_DATA: Record<
  AppLanguage,
  Record<(typeof FEELING_IDS)[number], { label: string; teacherHint: string }>
> = {
  en: {
    happy: { label: 'Happy', teacherHint: 'Reinforce with praise and a preferred activity.' },
    calm: { label: 'Calm', teacherHint: 'Continue routine and offer short communication prompts.' },
    confused: { label: 'Confused', teacherHint: 'Use one-step instructions with visual support.' },
    sad: { label: 'Sad', teacherHint: 'Validate emotion, reduce demands, and offer comfort item.' },
    angry: { label: 'Angry', teacherHint: 'Use calm voice, breathing break, and safe quiet space.' },
  },
  ar: {
    happy: { label: 'سعيد', teacherHint: 'شجّعوا بثناء ونشاط يفضّله الطفل.' },
    calm: { label: 'هادئ', teacherHint: 'تابعوا الروتين وقدّموا مطالبات تواصل قصيرة.' },
    confused: { label: 'مرتبك', teacherHint: 'استخدموا تعليمات من خطوة واحدة مع دعم بصري.' },
    sad: { label: 'حزين', teacherHint: 'عرّفوا المشاعر، خفّفوا المطالب، ووفّروا شيئًا مريحًا.' },
    angry: { label: 'غاضب', teacherHint: 'صوت هادئ، استراحة تنفّس، ومكان آمن وهادئ.' },
  },
}

const FEELING_SCORES: Record<(typeof FEELING_IDS)[number], number> = {
  happy: 95,
  calm: 85,
  confused: 55,
  sad: 40,
  angry: 30,
}

const FEELING_EMOJI: Record<(typeof FEELING_IDS)[number], string> = {
  happy: '😊',
  calm: '🙂',
  confused: '😕',
  sad: '😢',
  angry: '😠',
}

export function buildFeelings(language: AppLanguage): FeelingOption[] {
  return FEELING_IDS.map((id) => ({
    id,
    emoji: FEELING_EMOJI[id],
    label: FEELING_DATA[language][id].label,
    score: FEELING_SCORES[id],
    teacherHint: FEELING_DATA[language][id].teacherHint,
  }))
}

export function getFeelingsUi(language: AppLanguage) {
  const en = language === 'en'
  return {
    childLine: (name: string) => (en ? `Child: ${name}` : `الطفل: ${name}`),
    helperEmpty: en ? 'Tap an emoji to show how you feel today.' : 'المس وجهًا يعبّر عن شعورك اليوم.',
    helperSelected: (label: string) => (en ? `You selected ${label}.` : `اخترتَ: ${label}.`),
    tipTitle: en ? 'Teacher support hint' : 'تلميح للدعم',
    notePlaceholder: en ? 'Optional: what happened? (for family/teacher)' : 'اختياري: ماذا حدث؟ (للعائلة/المعلم)',
    saving: en ? 'Saving feelings check-in...' : 'جاري حفظ المشاعر...',
    savedLine:
      en
        ? 'Check-in saved. Teacher can use this to support the family with next steps.'
        : 'تم الحفظ. يمكن للمعلم استخدام ذلك لدعم الخطوات التالية.',
    savedOfflineLine: (pending: number) =>
      en
        ? `Saved offline. ${pending} progress item(s) will sync when internet is back.`
        : `تم الحفظ بدون إنترنت. ستتم مزامنة ${pending} نتيجة عند عودة الاتصال.`,
    saveBtn: en ? 'Save check-in' : 'حفظ',
    savedBtn: en ? 'Check-in saved' : 'تم الحفظ',
    reset: en ? 'Reset' : 'إعادة',
    alertSavedTitle: en ? 'Saved' : 'تم الحفظ',
    alertSavedBody: (label: string) =>
      en ? `Feeling "${label}" was saved. 1 star earned.` : `تم حفظ الشعور «${label}». نجمة واحدة.`,
    alertFailTitle: en ? 'Save failed' : 'فشل الحفظ',
    saveFailed: en ? 'Unable to save check-in' : 'تعذّر حفظ المشاعر',
  }
}

export function getChildLine(language: AppLanguage, name: string, role: 'child' | 'player') {
  if (role === 'player') return language === 'en' ? `Player: ${name}` : `اللاعب: ${name}`
  return language === 'en' ? `Child: ${name}` : `الطفل: ${name}`
}
