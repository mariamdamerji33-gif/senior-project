import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { buildPecsCards, getChildLine, getPecsUi, type PecsCard } from '../../../config/childActivitiesLocale'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildPecs'>

export function ChildPecsScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildPecs')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const pecsUi = useMemo(() => getPecsUi(language), [language])
  const cards = useMemo(() => buildPecsCards(language), [language])

  const [selected, setSelected] = useState<PecsCard | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setSelected((s) => (s ? buildPecsCards(language).find((c) => c.id === s.id) ?? null : null))
  }, [language])

  const summary = useMemo(
    () => (history.length ? pecsUi.summaryUsed(history.length) : pecsUi.summaryEmpty),
    [history.length, pecsUi],
  )

  const onPick = (card: PecsCard) => {
    setSelected(card)
    setHistory((prev) => [card.label, ...prev].slice(0, 6))
    setSaved(false)
    setSaveStatus('')
    setSaveError('')
  }

  const saveProgress = async () => {
    if (!token || history.length === 0) return
    const score = Math.min(100, history.length * 20)
    setSaveError('')
    setSaveStatus(pecsUi.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, { childId, activityTitle: 'PECS cards', score })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, 1)
      setSaved(true)
      setLastSaved({ score, date: new Date().toLocaleString() })
      setSaveStatus(result.savedOffline ? pecsUi.savedOfflineLine(result.pending) : pecsUi.savedLine)
      Alert.alert(pecsUi.alertSavedTitle, pecsUi.alertSavedBody)
    } catch (e) {
      const msg = e instanceof Error ? e.message : pecsUi.saveFailed
      setSaveError(msg)
      setSaveStatus('')
      Alert.alert(pecsUi.alertFailTitle, msg)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtl]}>{getChildLine(language, childName, 'child')}</Text>
        <Text style={[styles.summary, isArabic && styles.rtl]}>{summary}</Text>

        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable key={card.id} style={styles.card} onPress={() => onPick(card)}>
              <Text style={styles.icon}>{card.icon}</Text>
              <Text style={[styles.label, isArabic && styles.rtl]}>{card.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.speechBox}>
          <Text style={[styles.speechTitle, isArabic && styles.rtl]}>{pecsUi.speechTitle}</Text>
          <Text style={[styles.speechText, isArabic && styles.rtl]}>
            {selected ? selected.phrase : pecsUi.speechEmpty}
          </Text>
        </View>

        <View style={styles.historyBox}>
          <Text style={[styles.historyTitle, isArabic && styles.rtl]}>{pecsUi.recentTitle}</Text>
          <Text style={[styles.historyText, isArabic && styles.rtl]}>
            {history.length ? history.join(' • ') : pecsUi.recentEmpty}
          </Text>
        </View>

        <Pressable style={[styles.saveBtn, (history.length === 0 || saved) && styles.saveBtnDisabled]} onPress={saveProgress} disabled={history.length === 0 || saved}>
          <Text style={styles.saveBtnText}>{saved ? pecsUi.savedBtn : pecsUi.saveBtn}</Text>
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
  subtitle: { color: '#534c62', fontWeight: '700' },
  summary: { color: '#17131f', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 30 },
  label: { color: '#17131f', fontWeight: '700' },
  speechBox: { marginTop: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dfd6ee', padding: 12 },
  speechTitle: { color: '#6d6485', marginBottom: 4 },
  speechText: { color: '#17131f', fontSize: 18, fontWeight: '700' },
  historyBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dfd6ee', padding: 12 },
  historyTitle: { color: '#6d6485', marginBottom: 4 },
  historyText: { color: '#17131f' },
  saveBtn: { backgroundColor: '#6d46d4', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  inlineStatus: { color: '#17131f', textAlign: 'center' },
  inlineError: { color: '#b91c1c', textAlign: 'center' },
})
