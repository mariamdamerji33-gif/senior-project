import AsyncStorage from '@react-native-async-storage/async-storage'

export type DailyTask = { id: DailyTaskId; label: string; done: boolean }
export type DailyTaskId = 'checkin' | 'game' | 'chat' | 'review'

const STORAGE_PREFIX = 'asp_mobile_parent_checklist_v1'

export const INITIAL_DAILY_TASKS: DailyTask[] = [
  { id: 'checkin', label: 'Submit daily check-in', done: false },
  { id: 'game', label: 'Do at least one child activity', done: false },
  { id: 'chat', label: 'Read teacher messages', done: false },
  { id: 'review', label: 'Review progress trend', done: false },
]

function storageKey(childId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `${STORAGE_PREFIX}:${childId}:${today}`
}

export async function loadChecklistForToday(childId: string): Promise<DailyTask[]> {
  const raw = await AsyncStorage.getItem(storageKey(childId))
  if (!raw) return INITIAL_DAILY_TASKS
  try {
    const parsed = JSON.parse(raw) as DailyTask[]
    if (!Array.isArray(parsed)) return INITIAL_DAILY_TASKS
    return parsed
  } catch {
    return INITIAL_DAILY_TASKS
  }
}

export async function saveChecklistForToday(childId: string, tasks: DailyTask[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(childId), JSON.stringify(tasks))
}

export async function markChecklistTaskDone(childId: string, taskId: DailyTaskId): Promise<void> {
  const current = await loadChecklistForToday(childId)
  const next = current.map((task) => (task.id === taskId ? { ...task, done: true } : task))
  await saveChecklistForToday(childId, next)
}
