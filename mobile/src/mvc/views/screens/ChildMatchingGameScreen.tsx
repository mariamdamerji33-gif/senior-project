import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { getChildLine, getMatchingUi } from '../../../config/childActivitiesLocale'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildMatchingGame'>
type Card = { id: number; symbol: string }

const BASE_SYMBOLS = ['🐶', '🍎', '🚗']

function makeDeck(): Card[] {
  const doubled = [...BASE_SYMBOLS, ...BASE_SYMBOLS]
  return doubled
    .map((symbol, i) => ({ id: i + 1, symbol }))
    .sort(() => Math.random() - 0.5)
}

export function ChildMatchingGameScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildMatchingGame')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const ui = useMemo(() => getMatchingUi(language), [language])

  const [deck, setDeck] = useState<Card[]>(() => makeDeck())
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const completed = useMemo(() => matched.length === deck.length, [matched.length, deck.length])

  const saveProgress = async () => {
    if (!completed || saved || !token) return
    const score = Math.max(50, 100 - Math.max(0, moves - 3) * 8)
    setSaveError('')
    setSaveStatus(ui.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, { childId, activityTitle: 'Matching game', score })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, 2)
      setSaved(true)
      setLastSaved({ score, date: new Date().toLocaleString() })
      setSaveStatus(result.savedOffline ? ui.savedOfflineLine(result.pending) : ui.savedLine)
      Alert.alert(ui.alertSavedTitle, ui.alertSavedBody)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ui.saveFailed
      setSaveError(msg)
      setSaveStatus('')
      Alert.alert(ui.alertFailTitle, msg)
    }
  }

  const onCardPress = (index: number) => {
    if (flipped.includes(index) || matched.includes(index) || flipped.length === 2) return
    const next = [...flipped, index]
    setFlipped(next)
    if (next.length < 2) return

    setMoves((m) => m + 1)
    const [a, b] = next
    const isPair = deck[a].symbol === deck[b].symbol
    if (isPair) {
      setMatched((prev) => [...prev, a, b])
      setFlipped([])
      return
    }
    setTimeout(() => setFlipped([]), 700)
  }

  const onReset = () => {
    setDeck(makeDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setSaved(false)
    setLastSaved(null)
    setSaveStatus('')
    setSaveError('')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtl]}>{getChildLine(language, childName, 'player')}</Text>
        <Text style={[styles.moves, isArabic && styles.rtl]}>{ui.moves(moves)}</Text>

        <View style={styles.grid}>
          {deck.map((card, index) => {
            const isVisible = flipped.includes(index) || matched.includes(index)
            return (
              <Pressable key={`${card.id}-${index}`} style={styles.card} onPress={() => onCardPress(index)}>
                <Text style={styles.cardText}>{isVisible ? card.symbol : '?'}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={[styles.status, isArabic && styles.rtl]}>{completed ? ui.statusDone : ui.statusHint}</Text>
        <Pressable style={[styles.saveBtn, (!completed || saved) && styles.saveBtnDisabled]} onPress={saveProgress} disabled={!completed || saved}>
          <Text style={styles.saveBtnText}>{saved ? ui.savedBtn : ui.saveBtn}</Text>
        </Pressable>
        <Pressable style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetBtnText}>{ui.playAgain}</Text>
        </Pressable>
        {saveStatus ? <Text style={[styles.inlineStatus, isArabic && styles.rtl]}>{saveStatus}</Text> : null}
        {saveError ? <Text style={[styles.inlineError, isArabic && styles.rtl]}>{saveError}</Text> : null}
        {lastSaved ? <ActivityResultCard score={lastSaved.score} date={lastSaved.date} /> : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  wrap: { flex: 1, padding: 20, gap: 10 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: '#475569', fontWeight: '700' },
  moves: { color: '#0f172a', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  card: {
    width: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
  },
  cardText: { fontSize: 34, color: '#0f172a' },
  status: { marginTop: 8, color: '#475569' },
  saveBtn: { marginTop: 4, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#1e40af', fontWeight: '700' },
  resetBtn: { marginTop: 6, backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontWeight: '700' },
  inlineStatus: { color: '#0f172a', textAlign: 'center' },
  inlineError: { color: '#b91c1c', textAlign: 'center' },
})
