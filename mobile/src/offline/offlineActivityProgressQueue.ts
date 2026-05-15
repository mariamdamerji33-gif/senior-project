import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../mvc/models/api'

const OFFLINE_ACTIVITY_PROGRESS_QUEUE_KEY = 'asp_mobile_offline_activity_progress_v1'

export type ActivityProgressPayload = {
  childId: string
  activityTitle: string
  score: number
  date?: string
}

type OfflineActivityProgressItem = {
  id: string
  createdAt: string
  payload: ActivityProgressPayload
}

async function readQueue(): Promise<OfflineActivityProgressItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_ACTIVITY_PROGRESS_QUEUE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as OfflineActivityProgressItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeQueue(items: OfflineActivityProgressItem[]) {
  await AsyncStorage.setItem(OFFLINE_ACTIVITY_PROGRESS_QUEUE_KEY, JSON.stringify(items))
}

export async function enqueueOfflineActivityProgress(payload: ActivityProgressPayload) {
  const queue = await readQueue()
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    payload: { ...payload, date: payload.date || new Date().toISOString() },
  })
  await writeQueue(queue)
  return queue.length
}

export async function getOfflineActivityProgressCount() {
  const queue = await readQueue()
  return queue.length
}

export async function flushOfflineActivityProgress(token: string) {
  const queue = await readQueue()
  if (!queue.length) return { synced: 0, remaining: 0 }

  const remaining: OfflineActivityProgressItem[] = []
  let synced = 0
  for (const item of queue) {
    try {
      await api.parentSaveActivityProgress(token, item.payload)
      synced += 1
    } catch {
      remaining.push(item)
    }
  }
  await writeQueue(remaining)
  return { synced, remaining: remaining.length }
}

export async function saveActivityProgressWithOfflineQueue(token: string, payload: ActivityProgressPayload) {
  await flushOfflineActivityProgress(token)
  try {
    await api.parentSaveActivityProgress(token, payload)
    return { savedOffline: false, pending: await getOfflineActivityProgressCount() }
  } catch {
    const pending = await enqueueOfflineActivityProgress(payload)
    return { savedOffline: true, pending }
  }
}
