import { Text, View, StyleSheet } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { useLanguage } from '../../controllers/LanguageController'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { colors } from '../../../theme/colors'
import { screenLayout } from '../../../theme/layout'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentMenuHelp'>

const COPY = {
  en: {
    back: '← Back to Today',
    title: 'Simple menu guide',
    lead: 'The blue menu on the left has short names. Here is what each one means in everyday words.',
    foot: 'Tip: If you are not sure where to go, open Today and use the large buttons on the home page.',
    rows: [
      { icon: '◎', name: 'Profile', text: 'Your account: name, email, phone, birthday, photo (set by the school), security settings, and sign out. Tap the app logo or ◎ at the top of the blue menu.' },
      { icon: '⌂', name: 'Today', text: 'Your home page. See what to do today and your child’s summary.' },
      { icon: '▦', name: 'Child dashboard', text: 'A simple dashboard for your child — goals and notes in one place.' },
      { icon: '✓', name: 'Daily', text: 'Daily check-in for the school: mood, sleep, food, and short notes.' },
      { icon: '★', name: 'Play', text: 'Child Mode: calm games, routine, speech practice, feelings, and videos.' },
      { icon: '✉', name: 'Chat', text: 'Messages with your child’s teacher or school team.' },
      { icon: '↗', name: 'Reports', text: 'Scores and written reports about your child’s progress.' },
      { icon: '🔔', name: 'Alerts', text: 'School notifications in one list. On Today, tap the bell at the top right of the home card (next to language). The slim blue menu on the left no longer has alerts.' },
    ],
  },
  ar: {
    back: '← العودة إلى اليوم',
    title: 'دليل القائمة البسيط',
    lead: 'القائمة الزرقاء على اليسار فيها أسماء قصيرة. هذا معنى كل زر بلغة بسيطة.',
    foot: 'نصيحة: إذا لم تعرف أين تذهب، افتح «اليوم» واستخدم الأزرار الكبيرة في الصفحة الرئيسية.',
    rows: [
      { icon: '◎', name: 'الملف', text: 'حسابك: الاسم، البريد، الهاتف، تاريخ الميلاد، الصورة (من المدرسة)، الأمان، وتسجيل الخروج. اضغط شعار التطبيق أو ◎ أعلى القائمة الزرقاء.' },
      { icon: '⌂', name: 'اليوم', text: 'صفحتك الرئيسية. تعرض ماذا تفعل اليوم وملخصاً عن طفلك.' },
      { icon: '▦', name: 'لوحة طفلك', text: 'لوحة بسيطة لطفلك — أهداف وملاحظات في مكان واحد.' },
      { icon: '✓', name: 'يومي', text: 'متابعة يومية للمدرسة: المزاج، النوم، الأكل، وملاحظات قصيرة.' },
      { icon: '★', name: 'لعب', text: 'وضع الطفل: ألعاب هادئة، روتين، تدريب كلام، مشاعر، وفيديو.' },
      { icon: '✉', name: 'محادثة', text: 'رسائل مع معلم الطفل أو فريق المدرسة.' },
      { icon: '↗', name: 'تقارير', text: 'درجات وتقارير مكتوبة عن تقدم الطفل.' },
      { icon: '🔔', name: 'تنبيهات', text: 'إشعارات المدرسة في قائمة واحدة. في صفحة اليوم، اضغط الجرس أعلى اليمين في البطاقة الرئيسية (بجانب اللغة). القائمة الزرقاء الضيقة على اليسار لم تعد فيها تنبيهات.' },
    ],
  },
} as const

export function ParentMenuHelpScreen({ navigation }: Props) {
  const { language } = useLanguage()
  const isArabic = language === 'ar'
  const copy = COPY[language] || COPY.en

  return (
    <ScreenScrollPage
      title={copy.title}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.back}
      rtl={isArabic}
    >
      <Text style={[screenLayout.introText, isArabic && local.rtl]}>{copy.lead}</Text>

      {copy.rows.map((row) => (
        <ScreenCard key={row.name}>
          <View style={[local.row, isArabic && local.rowRtl]}>
            <Text style={local.cardIcon}>{row.icon}</Text>
            <View style={local.cardBody}>
              <Text style={[local.cardName, isArabic && local.rtl]}>{row.name}</Text>
              <Text style={[local.cardText, isArabic && local.rtl]}>{row.text}</Text>
            </View>
          </View>
        </ScreenCard>
      ))}

      <View style={local.footBox}>
        <Text style={[local.footText, isArabic && local.rtl]}>{copy.foot}</Text>
      </View>
    </ScreenScrollPage>
  )
}

const local = StyleSheet.create({
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  cardIcon: { fontSize: 22, marginTop: 2 },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '900', color: colors.text },
  cardText: { fontSize: 14, lineHeight: 20, color: colors.textMuted, fontWeight: '600' },
  footBox: {
    backgroundColor: colors.secondarySurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    padding: 14,
  },
  footText: { fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '700' },
})
