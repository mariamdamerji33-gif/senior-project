import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'
import { buildRoutineTasks, getRoutineUi, type RoutineTask } from '../../../config/childActivitiesLocale'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import { addStarsForToday } from '../../../rewards/childRewards'
import { ActivityResultCard } from '../components/ActivityResultCard'
import { saveActivityProgressWithOfflineQueue } from '../../../offline/offlineActivityProgressQueue'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildDailyRoutine'>

function doneMap(tasks: RoutineTask[]): Record<string, boolean> {
  const m: Record<string, boolean> = {}
  tasks.forEach((t) => {
    m[t.id] = t.done
  })
  return m
}

export function ChildDailyRoutineScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildDailyRoutine')
  const childName = route.params?.childName || 'Child'
  const childId = route.params.childId
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const ui = useMemo(() => getRoutineUi(language), [language])

  const [tasks, setTasks] = useState<RoutineTask[]>(() => buildRoutineTasks(language, {}))

  useEffect(() => {
    setTasks((prev) => buildRoutineTasks(language, doneMap(prev)))
  }, [language])

  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ score: number; date: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const allDone = doneCount === tasks.length

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
    setSaved(false)
    setSaveStatus('')
    setSaveError('')
  }

  const resetDay = () => {
    setTasks(buildRoutineTasks(language, {}))
    setSaved(false)
    setLastSaved(null)
    setSaveStatus('')
    setSaveError('')
  }

  const saveProgress = async () => {
    if (!token || doneCount === 0) return
    const score = Math.round((doneCount / tasks.length) * 100)
    setSaveError('')
    setSaveStatus(ui.saving)
    try {
      const result = await saveActivityProgressWithOfflineQueue(token, { childId, activityTitle: 'Daily routine', score })
      await markChecklistTaskDone(childId, 'game')
      await addStarsForToday(childId, allDone ? 2 : 1)
      setSaved(true)
      setLastSaved({ score, date: new Date().toLocaleString() })
      setSaveStatus(result.savedOffline ? ui.savedOfflineLine(result.pending) : ui.savedLine)
      const stars = allDone ? 2 : 1
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
      <View style={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtl]}>{ui.childLine(childName)}</Text>
        <Text style={[styles.progress, isArabic && styles.rtl]}>{ui.progress(doneCount, tasks.length)}</Text>

        <View style={styles.list}>
          {tasks.map((task) => (
            <Pressable key={task.id} style={styles.item} onPress={() => toggleTask(task.id)}>
              <Text style={styles.check}>{task.done ? '✅' : '⬜'}</Text>
              <Text style={[styles.itemText, task.done && styles.itemTextDone, isArabic && styles.rtl]}>{task.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.status, isArabic && styles.rtl]}>{allDone ? ui.statusDone : ui.statusHint}</Text>
        <Pressable style={[styles.saveBtn, (doneCount === 0 || saved) && styles.saveBtnDisabled]} onPress={saveProgress} disabled={doneCount === 0 || saved}>
          <Text style={styles.saveBtnText}>{saved ? ui.savedBtn : ui.saveBtn}</Text>
        </Pressable>
        {saveStatus ? <Text style={[styles.inlineStatus, isArabic && styles.rtl]}>{saveStatus}</Text> : null}
        {saveError ? <Text style={[styles.inlineError, isArabic && styles.rtl]}>{saveError}</Text> : null}
        {lastSaved ? <ActivityResultCard score={lastSaved.score} date={lastSaved.date} /> : null}
        <Pressable style={styles.resetBtn} onPress={resetDay}>
          <Text style={styles.resetBtnText}>{ui.resetDay}</Text>
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
  progress: { color: '#0f172a', fontWeight: '700' },
  list: { marginTop: 6, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
  },
  check: { fontSize: 20, marginRight: 10 },
  itemText: { color: '#0f172a', fontWeight: '600', flex: 1 },
  itemTextDone: { textDecorationLine: 'line-through', color: '#64748b' },
  status: { marginTop: 6, color: '#475569' },
  saveBtn: { backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#1e40af', fontWeight: '700' },
  inlineStatus: { color: '#0f172a', textAlign: 'center' },
  inlineError: { color: '#b91c1c', textAlign: 'center' },
  resetBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, padding: 12, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontWeight: '700' },
})
