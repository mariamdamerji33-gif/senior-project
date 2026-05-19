import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useAuth } from '../../controllers/AuthController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { buildFeelings, getFeelingsUi, type FeelingOption } from '../../../config/childActivitiesLocale'
import { useLanguage } from '../../controllers/LanguageController'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildFeelingsCheckIn'>

export function ChildFeelingsCheckInScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildFeelingsCheckIn')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const feelings = useMemo(() => buildFeelings(language), [language])
  const ui = useMemo(() => getFeelingsUi(language), [language])

  const [selected, setSelected] = useState<FeelingOption | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setSelected((s) => (s ? buildFeelings(language).find((f) => f.id === s.id) ?? null : null))
  }, [language])

  const helper = useMemo(() => {
    if (!selected) return ui.helperEmpty
    return ui.helperSelected(selected.label)
  }, [selected, ui])

  const onSelectFeeling = (feeling: FeelingOption) => {
    setSelected(feeling)
    setSaved(false)
    setSaveStatus('')
    setSaveError('')
  }

  const saveProgress = async () => {
    if (!token || !selected) return
    setSaveError('')
    setSaveStatus(ui.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, {
        childId,
        activityTitle: `Feelings check-in: ${selected.label}${note.trim() ? ` (${note.trim().slice(0, 60)})` : ''}`,
        score: selected.score,
      })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, 1)
      setSaved(true)
      setLastSaved({ score: selected.score, date: new Date().toLocaleString() })
      setSaveStatus(result.savedOffline ? ui.savedOfflineLine(result.pending) : ui.savedLine)
      Alert.alert(ui.alertSavedTitle, ui.alertSavedBody(selected.label))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ui.saveFailed
      setSaveError(msg)
      setSaveStatus('')
      Alert.alert(ui.alertFailTitle, msg)
    }
  }

  const reset = () => {
    setSelected(null)
    setNote('')
    setSaved(false)
    setLastSaved(null)
    setSaveStatus('')
    setSaveError('')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtl]}>{ui.childLine(childName)}</Text>
        <Text style={[styles.helper, isArabic && styles.rtl]}>{helper}</Text>

        <View style={styles.grid}>
          {feelings.map((feeling) => {
            const active = selected?.id === feeling.id
            return (
              <Pressable key={feeling.id} style={[styles.feelingCard, active && styles.feelingCardActive]} onPress={() => onSelectFeeling(feeling)}>
                <Text style={styles.emoji}>{feeling.emoji}</Text>
                <Text style={[styles.feelingLabel, isArabic && styles.rtl]}>{feeling.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {selected ? (
          <View style={styles.tipCard}>
            <Text style={[styles.tipTitle, isArabic && styles.rtl]}>{ui.tipTitle}</Text>
            <Text style={[styles.tipText, isArabic && styles.rtl]}>{selected.teacherHint}</Text>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, isArabic && styles.rtl]}
          value={note}
          onChangeText={setNote}
          placeholder={ui.notePlaceholder}
          placeholderTextColor="#94a3b8"
          multiline
          textAlign={isArabic ? 'right' : 'left'}
        />

        <Pressable style={[styles.saveBtn, (!selected || saved) && styles.saveBtnDisabled]} onPress={saveProgress} disabled={!selected || saved}>
          <Text style={styles.saveBtnText}>{saved ? ui.savedBtn : ui.saveBtn}</Text>
        </Pressable>
        {saveStatus ? <Text style={[styles.inlineStatus, isArabic && styles.rtl]}>{saveStatus}</Text> : null}
        {saveError ? <Text style={[styles.inlineError, isArabic && styles.rtl]}>{saveError}</Text> : null}
        {lastSaved ? <ActivityResultCard score={lastSaved.score} date={lastSaved.date} /> : null}

        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetBtnText}>{ui.reset}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  wrap: { flex: 1, padding: 20, gap: 10 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: '#475569', fontWeight: '700' },
  helper: { color: '#0f172a', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  feelingCard: {
    width: '31%',
    minHeight: 88,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  feelingCardActive: { borderColor: '#1d4ed8', backgroundColor: '#dbeafe' },
  emoji: { fontSize: 28 },
  feelingLabel: { color: '#0f172a', fontWeight: '700' },
  tipCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 12, gap: 6 },
  tipTitle: { color: '#0f172a', fontWeight: '700' },
  tipText: { color: '#475569', lineHeight: 20 },
  input: {
    minHeight: 44,
    maxHeight: 90,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  saveBtn: { backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#1e40af', fontWeight: '700' },
  inlineStatus: { color: '#0f172a', textAlign: 'center' },
  inlineError: { color: '#b91c1c', textAlign: 'center' },
  resetBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontWeight: '700' },
})
