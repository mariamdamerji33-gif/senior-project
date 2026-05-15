import AsyncStorage from '@react-native-async-storage/async-storage'

const OFFLINE_CHECKIN_QUEUE_KEY = 'asp_mobile_offline_daily_checkins_v1'

export type OfflineDailyCheckinItem = {
  id: string
  createdAt: string
  payload: {
    childId: string
    checkinDate: string
    mood?: string | null
    sleepHours?: number | null
    appetite?: string | null
    meltdowns?: number | null
    notes?: string | null
  }
}

async function readQueue(): Promise<OfflineDailyCheckinItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_CHECKIN_QUEUE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as OfflineDailyCheckinItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeQueue(items: OfflineDailyCheckinItem[]) {
  await AsyncStorage.setItem(OFFLINE_CHECKIN_QUEUE_KEY, JSON.stringify(items))
}

export async function enqueueOfflineDailyCheckin(item: Omit<OfflineDailyCheckinItem, 'id' | 'createdAt'>) {
  const queue = await readQueue()
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    payload: item.payload,
  })
  await writeQueue(queue)
  return queue.length
}

export async function getOfflineDailyCheckinCount() {
  const queue = await readQueue()
  return queue.length
}

export async function flushOfflineDailyCheckins(
  sender: (payload: OfflineDailyCheckinItem['payload']) => Promise<unknown>,
) {
  const queue = await readQueue()
  if (!queue.length) return { synced: 0, remaining: 0 }

  const remaining: OfflineDailyCheckinItem[] = []
  let synced = 0
  for (const item of queue) {
    try {
      await sender(item.payload)
      synced += 1
    } catch {
      remaining.push(item)
    }
  }
  await writeQueue(remaining)
  return { synced, remaining: remaining.length }
}
