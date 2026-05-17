import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { getChildModeCopy, type ChildModeActivityId } from '../../../config/childModeLocale'
import { useLanguage } from '../../controllers/LanguageController'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildMode'>

type ActivityItem = {
  id: ChildModeActivityId
  title: string
  subtitle: string
  icon: string
  color: string
  route: keyof Pick<
    ParentActivitiesParamList,
    | 'ChildPecs'
    | 'ChildMatchingGame'
    | 'ChildDailyGames'
    | 'ChildSpeechTraining'
    | 'ChildDailyRoutine'
    | 'ChildFeelingsCheckIn'
    | 'ChildVideos'
  >
}

const ACTIVITY_META: { id: ChildModeActivityId; icon: string; color: string; route: ActivityItem['route'] }[] = [
  { id: 'pecs', icon: '▣', color: '#6d46d4', route: 'ChildPecs' },
  { id: 'matching', icon: '★', color: '#0f766e', route: 'ChildMatchingGame' },
  { id: 'daily-games', icon: '◆', color: '#9333ea', route: 'ChildDailyGames' },
  { id: 'speech', icon: '♪', color: '#b45309', route: 'ChildSpeechTraining' },
  { id: 'routine', icon: '✓', color: '#2563eb', route: 'ChildDailyRoutine' },
  { id: 'feelings', icon: '♡', color: '#be185d', route: 'ChildFeelingsCheckIn' },
  { id: 'videos', icon: '▶', color: '#7c3aed', route: 'ChildVideos' },
]

export function ChildModeScreen({ route, navigation }: Props) {
  const { language, setLanguage, isArabic } = useLanguage()
  const childName = route.params?.childName || (language === 'ar' ? 'الطفل' : 'Child')
  const childId = route.params.childId
  const copy = useMemo(() => getChildModeCopy(language), [language])

  const items: ActivityItem[] = useMemo(
    () =>
      ACTIVITY_META.map((m) => ({
        ...m,
        title: copy.activities[m.id].title,
        subtitle: copy.activities[m.id].subtitle,
      })),
    [copy],
  )

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.bgBlobTop} />
        <View style={styles.bgBlobBottom} />
        <View style={styles.langRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="English"
            accessibilityState={{ selected: language === 'en' }}
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => void setLanguage('en')}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="العربية"
            accessibilityState={{ selected: language === 'ar' }}
            style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
            onPress={() => void setLanguage('ar')}
          >
            <Text style={[styles.langText, language === 'ar' && styles.langTextActive]}>العربية</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroBubbleLarge} />
          <View style={styles.heroBubbleSmall} />
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>★</Text>
          </View>
          <Text style={[styles.eyebrow, !isArabic && styles.uppercase, isArabic && styles.rtlText]}>{copy.eyebrow}</Text>
          <Text style={[styles.title, isArabic && styles.rtlText]}>{copy.titleHello(childName)}</Text>
          <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{copy.heroSub}</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIcon}>
              <Text style={styles.progressIconText}>✓</Text>
            </View>
            <View style={styles.progressCopy}>
              <Text style={[styles.progressTitle, isArabic && styles.rtlText]}>{copy.progressTitle}</Text>
              <Text style={[styles.progressText, isArabic && styles.rtlText]}>{copy.progressText}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <Text style={styles.pill}>{copy.pillBig}</Text>
            <Text style={styles.pill}>{copy.pillSimple}</Text>
            <Text style={styles.pill}>{copy.pillStars}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={language === 'ar' ? `افتح ${item.title}` : `Open ${item.title}`}
              accessibilityHint={copy.startHint}
              android_ripple={{ color: '#eee7ff' }}
              hitSlop={4}
              style={({ pressed }) => [styles.activityCard, isArabic && styles.activityCardRtl, pressed && styles.activityCardPressed]}
              onPress={() => navigation.navigate(item.route, { childId, childName })}
            >
              <View style={[styles.activityAccent, isArabic && styles.activityAccentRtl, { backgroundColor: item.color }]} />
              <View style={[styles.activityIcon, { backgroundColor: item.color }]}>
                <Text style={styles.activityIconText}>{item.icon}</Text>
              </View>
              <View style={styles.activityTextWrap}>
                <Text style={[styles.activityTitle, isArabic && styles.rtlText]}>{item.title}</Text>
                <Text style={[styles.activityHint, isArabic && styles.rtlText]}>{item.subtitle}</Text>
                <Text style={[styles.activityStartHint, isArabic && styles.rtlText]}>{copy.startHint}</Text>
              </View>
              <Text style={[styles.activityArrow, isArabic && styles.rtlArrow]}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2eff9' },
  wrap: { padding: 18, gap: 12, paddingBottom: 32 },
  bgBlobTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#ebe4f5',
    top: -104,
    right: -92,
    opacity: 0.9,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#dcf7f0',
    top: 270,
    left: -128,
    opacity: 0.8,
  },
  langRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 4,
    gap: 4,
    shadowColor: '#2d195a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  langBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  langBtnActive: { backgroundColor: '#f4f1fb' },
  langText: { fontWeight: '800', color: '#6d6485', fontSize: 13 },
  langTextActive: { color: '#5f3dc9' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlArrow: { transform: [{ scaleX: -1 }] },
  uppercase: { textTransform: 'uppercase' },
  hero: {
    backgroundColor: '#211a2e',
    borderRadius: 30,
    padding: 22,
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4f3b86',
    shadowColor: '#211a2e',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  heroBubbleLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124,77,255,0.46)',
    top: -66,
    right: -46,
  },
  heroBubbleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(20,184,166,0.26)',
    bottom: -28,
    left: -20,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroIconText: { color: '#6d46d4', fontSize: 30, fontWeight: '900' },
  eyebrow: { color: '#c4b5fd', fontWeight: '900', letterSpacing: 0.8, fontSize: 12 },
  title: { fontSize: 31, fontWeight: '900', color: '#fff' },
  subtitle: { color: '#eee9ff', fontSize: 16, lineHeight: 23 },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 16,
    gap: 8,
    shadowColor: '#2d195a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  progressHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  progressIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#eafaf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  progressIconText: { color: '#15803d', fontSize: 20, fontWeight: '900' },
  progressCopy: { flex: 1, gap: 4 },
  progressTitle: { color: '#17131f', fontSize: 18, fontWeight: '900' },
  progressText: { color: '#534c62', lineHeight: 20 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  pill: {
    backgroundColor: '#f4f1fb',
    color: '#6d46d4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: '800',
    fontSize: 12,
  },
  grid: { gap: 10 },
  activityCard: {
    minHeight: 108,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#211a2e',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  activityCardRtl: { flexDirection: 'row-reverse' },
  activityCardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  activityAccent: {
    position: 'absolute',
    width: 5,
    top: 16,
    bottom: 16,
    left: 0,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  activityAccentRtl: {
    left: undefined,
    right: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  activityIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  activityTextWrap: { flex: 1, gap: 4 },
  activityTitle: { color: '#17131f', fontSize: 18, fontWeight: '900' },
  activityHint: { color: '#6d6485', lineHeight: 19 },
  activityStartHint: { color: '#6d46d4', fontSize: 12, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  activityArrow: { color: '#6d46d4', fontSize: 30, fontWeight: '900' },
})
