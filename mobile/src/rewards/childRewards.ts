import AsyncStorage from '@react-native-async-storage/async-storage'

const REWARD_PREFIX = 'asp_mobile_child_rewards_v1'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function keyFor(childId: string, date = todayKey()) {
  return `${REWARD_PREFIX}:${childId}:${date}`
}

export async function loadStarsForToday(childId: string) {
  const raw = await AsyncStorage.getItem(keyFor(childId))
  const value = Number(raw || 0)
  return Number.isFinite(value) ? value : 0
}

export async function addStarsForToday(childId: string, stars = 1) {
  const current = await loadStarsForToday(childId)
  const next = Math.max(0, current + stars)
  await AsyncStorage.setItem(keyFor(childId), String(next))
  return next
}
