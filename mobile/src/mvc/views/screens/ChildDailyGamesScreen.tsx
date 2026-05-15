import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { buildDailyMiniGames, getDailyMiniGamesUi } from '../../../config/childActivitiesLocale'
import { useLanguage } from '../../controllers/LanguageController'
import { useAuth } from '../../controllers/AuthController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildDailyGames'>

export function ChildDailyGamesScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildDailyGames')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const games = useMemo(() => buildDailyMiniGames(language), [language])
  const ui = useMemo(() => getDailyMiniGamesUi(language), [language])

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const completedCount = completedIds.length
  const score = games.length ? Math.round((completedCount / games.length) * 100) : 0

  const onAnswer = (gameId: string, choiceId: string, answerId: string) => {
    setAnswers((prev) => ({ ...prev, [gameId]: choiceId }))
    setSaved(false)
    setSaveStatus('')
    setSaveError('')
    if (choiceId === answerId) {
      setCompletedIds((prev) => (prev.includes(gameId) ? prev : [...prev, gameId]))
    }
  }

  const onReset = () => {
    setAnswers({})
    setCompletedIds([])
    setSaved(false)
    setLastSaved(null)
    setSaveStatus('')
    setSaveError('')
  }

  const saveProgress = async () => {
    if (!token || completedCount === 0 || saved) return
    const stars = completedCount === games.length ? 3 : 1
    setSaveError('')
    setSaveStatus(ui.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, {
        childId,
        activityTitle: 'Daily mini games',
        score: Math.max(25, score),
      })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, stars)
      setSaved(true)
      setLastSaved({ score: Math.max(25, score), date: new Date().toLocaleString() })
      setSaveStatus(result.savedOffline ? ui.savedOfflineLine(result.pending) : ui.savedLine)
      Alert.alert(ui.alertSavedTitle, ui.alertSavedBody(stars))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ui.saveFailed
      setSaveError(msg)
      setSaveStatus('')
      Alert.alert(ui.alertFailTitle, msg)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, isArabic && styles.rtl]}>{ui.childLine(childName)}</Text>
          <Text style={[styles.heroText, isArabic && styles.rtl]}>{ui.intro}</Text>
          <Text style={[styles.heroProgress, isArabic && styles.rtl]}>{ui.progress(completedCount, games.length)}</Text>
        </View>

        {games.map((game, index) => {
          const selected = answers[game.id]
          const isDone = completedIds.includes(game.id)
          const hasWrongAnswer = Boolean(selected && selected !== game.answerId)
          return (
            <View key={game.id} style={[styles.gameCard, isDone && styles.gameCardDone]}>
              <View style={styles.gameHeader}>
                <View style={styles.gameNumber}>
                  <Text style={styles.gameNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.gameHeaderText}>
                  <Text style={[styles.gameTitle, isArabic && styles.rtl]}>{game.title}</Text>
                  <Text style={[styles.gameSubtitle, isArabic && styles.rtl]}>{game.subtitle}</Text>
                </View>
              </View>

              <Text style={[styles.prompt, isArabic && styles.rtl]}>{game.prompt}</Text>
              <Text style={[styles.chooseText, isArabic && styles.rtl]}>{ui.choose}</Text>

              <View style={styles.choiceRow}>
                {game.choices.map((choice) => {
                  const isSelected = selected === choice.id
                  const isCorrect = isSelected && choice.id === game.answerId
                  const isWrong = isSelected && choice.id !== game.answerId
                  return (
                    <Pressable
                      key={choice.id}
                      accessibilityRole="button"
                      accessibilityLabel={choice.label}
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.choiceBtn, isCorrect && styles.choiceCorrect, isWrong && styles.choiceWrong]}
                      onPress={() => onAnswer(game.id, choice.id, game.answerId)}
                    >
                      <Text style={[styles.choiceIcon, choice.id === 'blue' && styles.blueIcon, choice.id === 'red' && styles.redIcon, choice.id === 'yellow' && styles.yellowIcon]}>
                        {choice.icon}
                      </Text>
                      <Text style={[styles.choiceLabel, isArabic && styles.rtl]}>{choice.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {isDone ? <Text style={[styles.feedbackGood, isArabic && styles.rtl]}>{game.success}</Text> : null}
              {hasWrongAnswer ? <Text style={[styles.feedbackTry, isArabic && styles.rtl]}>{game.tryAgain}</Text> : null}
            </View>
          )
        })}

        <Text style={[styles.completeHint, isArabic && styles.rtl]}>{ui.completeAll}</Text>
        <Pressable
          style={[styles.saveBtn, (completedCount === 0 || saved) && styles.btnDisabled]}
          disabled={completedCount === 0 || saved}
          onPress={saveProgress}
        >
          <Text style={styles.saveBtnText}>{saved ? ui.savedBtn : ui.saveBtn}</Text>
        </Pressable>
        <Pressable style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetBtnText}>{ui.reset}</Text>
        </Pressable>
        {saveStatus ? <Text style={[styles.inlineStatus, isArabic && styles.rtl]}>{saveStatus}</Text> : null}
        {saveError ? <Text style={[styles.inlineError, isArabic && styles.rtl]}>{saveError}</Text> : null}
        {lastSaved ? <ActivityResultCard score={lastSaved.score} date={lastSaved.date} /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  wrap: { padding: 18, gap: 12, paddingBottom: 34 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  hero: {
    backgroundColor: '#2c1b57',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4f3b86',
    padding: 18,
    gap: 8,
  },
  heroTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  heroText: { color: '#eee9ff', lineHeight: 21, fontWeight: '700' },
  heroProgress: { color: '#c4b5fd', fontWeight: '900' },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5dcfb',
    padding: 14,
    gap: 10,
    shadowColor: '#2d195a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  gameCardDone: { borderColor: '#86efac', backgroundColor: '#fbfffc' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gameNumber: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#f1eaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameNumberText: { color: '#6b3df0', fontSize: 18, fontWeight: '900' },
  gameHeaderText: { flex: 1, gap: 2 },
  gameTitle: { color: '#24173f', fontSize: 17, fontWeight: '900' },
  gameSubtitle: { color: '#6d6485', lineHeight: 19, fontWeight: '600' },
  prompt: { color: '#2c2144', fontSize: 18, fontWeight: '900' },
  chooseText: { color: '#7c7392', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#faf7ff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1d6ff',
    padding: 10,
  },
  choiceCorrect: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  choiceWrong: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  choiceIcon: { fontSize: 28, color: '#6b3df0' },
  blueIcon: { color: '#2563eb' },
  redIcon: { color: '#dc2626' },
  yellowIcon: { color: '#f59e0b' },
  choiceLabel: { color: '#2c2144', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  feedbackGood: { color: '#15803d', fontWeight: '900' },
  feedbackTry: { color: '#b45309', fontWeight: '800' },
  completeHint: { color: '#5f5573', lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  saveBtn: { backgroundColor: '#6d46d4', borderRadius: 14, padding: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.58 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  resetBtn: { backgroundColor: '#f1eaff', borderRadius: 14, borderWidth: 1, borderColor: '#d9ccff', padding: 12, alignItems: 'center' },
  resetBtnText: { color: '#6b3df0', fontWeight: '900' },
  inlineStatus: { color: '#2c2144', textAlign: 'center', fontWeight: '700' },
  inlineError: { color: '#b42318', textAlign: 'center', fontWeight: '700' },
})
