import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const DAILY_REMINDER_KEY = 'asp_mobile_daily_reminder_set_v1'
const STEPS_NOTIFIED_PREFIX = 'asp_mobile_steps_notified_v1'

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const asked = await Notifications.requestPermissionsAsync()
  return asked.granted
}

export async function scheduleDailyParentReminder() {
  const alreadySet = await AsyncStorage.getItem(DAILY_REMINDER_KEY)
  if (alreadySet === '1') return
  const granted = await ensureNotificationPermission()
  if (!granted) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily parent check-in',
      body: 'Open the app and complete today check-in and child activity.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  })

  await AsyncStorage.setItem(DAILY_REMINDER_KEY, '1')
}

export async function notifyTherapistStepsIfNew(params: { childId: string; latestCreatedAt?: string; latestTitle?: string }) {
  const { childId, latestCreatedAt, latestTitle } = params
  if (!latestCreatedAt) return

  const granted = await ensureNotificationPermission()
  if (!granted) return

  const key = `${STEPS_NOTIFIED_PREFIX}:${childId}`
  const previous = await AsyncStorage.getItem(key)
  if (previous && previous >= latestCreatedAt) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New teacher daily step',
      body: latestTitle ? `New step: ${latestTitle}` : 'You have a new teacher step.',
    },
    trigger: null,
  })
  await AsyncStorage.setItem(key, latestCreatedAt)
}
