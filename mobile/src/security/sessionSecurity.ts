import AsyncStorage from '@react-native-async-storage/async-storage'

const INACTIVITY_TIMEOUT_MINUTES_KEY = 'asp_mobile_inactivity_timeout_min_v1'

export const ALLOWED_TIMEOUT_MINUTES = [5, 15, 30] as const
export type TimeoutMinutes = (typeof ALLOWED_TIMEOUT_MINUTES)[number]

export async function getInactivityTimeoutMinutes(): Promise<TimeoutMinutes> {
  const raw = await AsyncStorage.getItem(INACTIVITY_TIMEOUT_MINUTES_KEY)
  const value = Number(raw)
  if (ALLOWED_TIMEOUT_MINUTES.includes(value as TimeoutMinutes)) return value as TimeoutMinutes
  return 15
}

export async function setInactivityTimeoutMinutes(minutes: TimeoutMinutes) {
  await AsyncStorage.setItem(INACTIVITY_TIMEOUT_MINUTES_KEY, String(minutes))
}

