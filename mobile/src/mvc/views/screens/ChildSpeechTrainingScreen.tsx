import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { buildSpeechPhrases, getChildLine, getSpeechUi } from '../../../config/childActivitiesLocale'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildSpeechTraining'>

export function ChildSpeechTrainingScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildSpeechTraining')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const phrases = useMemo(() => buildSpeechPhrases(language), [language])
  const ui = useMemo(() => getSpeechUi(language), [language])

  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const current = phrases[index] ?? phrases[0]
  const progress = useMemo(() => `${completed.length}/${phrases.length}`, [completed.length, phrases.length])

  const markDone = () => {
    const phraseId = current.id
    setAttempts((v) => v + 1)
    setCompleted((prev) => (prev.includes(phraseId) ? prev : [...prev, phraseId]))
  }

  const nextPhrase = () => {
    setIndex((i) => (i + 1) % phrases.length)
  }

  const resetSession = () => {
    setAttempts(0)
    setCompleted([])
    setIndex(0)
    setSaved(false)
    setLastSaved(null)
    setSaveStatus('')
    setSaveError('')
  }

  const saveProgress = async () => {
    if (!token || completed.length === 0) return
    const completionRatio = completed.length / phrases.length
    const effortPenalty = Math.max(0, attempts - completed.length) * 5
    const score = Math.max(40, Math.round(completionRatio * 100 - effortPenalty))
    setSaveError('')
    setSaveStatus(ui.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, { childId, activityTitle: 'Speech repeat', score })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, 1)
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtl]}>{getChildLine(language, childName, 'child')}</Text>
        <Text style={[styles.meta, isArabic && styles.rtl]}>{ui.meta(progress, attempts)}</Text>

        <View style={styles.phraseCard}>
          <Text style={[styles.prompt, isArabic && styles.rtl]}>{ui.prompt}</Text>
          <Text style={[styles.phraseText, isArabic && styles.rtl]}>&quot;{current.text}&quot;</Text>
          <Text style={[styles.hint, isArabic && styles.rtl]}>{ui.hint}</Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={markDone}>
          <Text style={styles.primaryBtnText}>{ui.markDone}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={nextPhrase}>
          <Text style={styles.secondaryBtnText}>{ui.nextPhrase}</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={resetSession}>
          <Text style={styles.ghostBtnText}>{ui.resetSession}</Text>
        </Pressable>

        <Pressable style={[styles.saveBtn, (completed.length === 0 || saved) && styles.saveBtnDisabled]} onPress={saveProgress} disabled={completed.length === 0 || saved}>
          <Text style={styles.saveBtnText}>{saved ? ui.savedBtn : ui.saveBtn}</Text>
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
  meta: { color: '#0f172a', fontWeight: '600' },
  phraseCard: { marginTop: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 14, gap: 8 },
  prompt: { color: '#64748b' },
  phraseText: { color: '#0f172a', fontSize: 24, fontWeight: '700' },
  hint: { color: '#64748b' },
  primaryBtn: { marginTop: 6, backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#1e40af', fontWeight: '700' },
  ghostBtn: { borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', padding: 12, alignItems: 'center' },
  ghostBtnText: { color: '#0f172a', fontWeight: '700' },
  saveBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  inlineStatus: { color: '#0f172a', textAlign: 'center' },
  inlineError: { color: '#b91c1c', textAlign: 'center' },
})
