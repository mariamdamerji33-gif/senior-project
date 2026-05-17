import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import {
  enqueueOfflineDailyCheckin,
  flushOfflineDailyCheckins,
  getOfflineDailyCheckinCount,
} from '../../../checkin/offlineDailyCheckinQueue'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import {
  buildParentAppetiteOptions,
  buildParentMoodOptions,
  formatStoredAppetite,
  formatStoredMood,
  getDailyCheckinCopy,
  type ParentAppetite,
  type ParentMood,
} from '../../../config/parentFlowsLocale'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentDailyCheckIn'>

type Checkin = {
  id: string
  checkin_date: string
  mood?: string | null
  sleep_hours?: number | null
  appetite?: string | null
  meltdowns?: number | null
  notes?: string | null
}

export function ParentDailyCheckInScreen({ route, navigation }: Props) {
  const { token } = useAuth()
  const { language, isArabic } = useLanguage()
  const { childId, childName } = route.params
  const [mood, setMood] = useState<ParentMood>('calm')
  const [sleepHours, setSleepHours] = useState('8')
  const [appetite, setAppetite] = useState<ParentAppetite>('normal')
  const [meltdowns, setMeltdowns] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingOffline, setSyncingOffline] = useState(false)
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null)
  const [history, setHistory] = useState<Checkin[]>([])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const copy = useMemo(() => getDailyCheckinCopy(language, childName || '', today), [language, childName, today])
  const moodOptions = useMemo(() => buildParentMoodOptions(language), [language])
  const appetiteOptions = useMemo(() => buildParentAppetiteOptions(language), [language])

  const loadHistory = async () => {
    if (!token) return
    setLoadingHistory(true)
    try {
      const res = await api.parentDailyCheckins(token, childId)
      setHistory((res.checkins || []).slice(0, 5))
      setHistoryLoadError(null)
    } catch (e) {
      setHistoryLoadError(e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [token, childId])

  const refreshPendingOffline = async () => {
    setPendingOfflineCount(await getOfflineDailyCheckinCount())
  }

  const syncOfflineNow = async () => {
    if (!token) return
    setSyncingOffline(true)
    try {
      const res = await flushOfflineDailyCheckins((payload) => api.parentUpsertDailyCheckin(token, payload))
      await refreshPendingOffline()
      if (res.synced > 0) {
        await loadHistory()
      }
    } finally {
      setSyncingOffline(false)
    }
  }

  useEffect(() => {
    void refreshPendingOffline()
    void syncOfflineNow()
  }, [])

  const saveCheckin = async () => {
    if (!token) return
    const parsedSleep = Number(sleepHours)
    const parsedMeltdowns = Number(meltdowns)
    if (!Number.isFinite(parsedSleep) || parsedSleep < 0 || parsedSleep > 24) {
      Alert.alert(copy.alertInvalidTitle, copy.alertSleepBody)
      return
    }
    if (!Number.isFinite(parsedMeltdowns) || parsedMeltdowns < 0 || parsedMeltdowns > 20) {
      Alert.alert(copy.alertInvalidTitle, copy.alertMeltdownBody)
      return
    }

    setSaving(true)
    try {
      const payload = {
        childId,
        checkinDate: today,
        mood,
        sleepHours: parsedSleep,
        appetite,
        meltdowns: parsedMeltdowns,
        notes: notes.trim() || null,
      }
      await api.parentUpsertDailyCheckin(token, payload)
      await markChecklistTaskDone(childId, 'checkin')
      Alert.alert(copy.alertSavedTitle, copy.alertSavedBody)
      await loadHistory()
    } catch (e) {
      const message = e instanceof Error ? e.message : copy.unknownError
      if (message.includes('Cannot reach API')) {
        await enqueueOfflineDailyCheckin({
          payload: { childId, checkinDate: today, mood, sleepHours: parsedSleep, appetite, meltdowns: parsedMeltdowns, notes: notes.trim() || null },
        })
        await markChecklistTaskDone(childId, 'checkin')
        await refreshPendingOffline()
        Alert.alert(copy.alertOfflineTitle, copy.alertOfflineBody)
      } else {
        Alert.alert(copy.alertSaveFailed, message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.backToday}
      rtl={isArabic}
    >
      {pendingOfflineCount > 0 ? (
        <ScreenCard style={styles.offlineBanner}>
          <Text style={[styles.offlineBannerText, isArabic && styles.rtl]}>{copy.offlineBanner(pendingOfflineCount)}</Text>
          <Pressable style={[styles.syncBtn, syncingOffline && appButton.disabled]} disabled={syncingOffline} onPress={() => void syncOfflineNow()}>
            <Text style={styles.syncBtnText}>{syncingOffline ? copy.syncing : copy.syncNow}</Text>
          </Pressable>
        </ScreenCard>
      ) : null}

      {historyLoadError ? (
        <InlineLoadError
          title={copy.historyErrorTitle}
          message={historyLoadError}
          onRetry={() => void loadHistory()}
          retrying={loadingHistory}
          retryLabel={copy.retry}
          loadingLabel={copy.loading}
          rtl={isArabic}
        />
      ) : null}

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.mood}</Text>
        <View style={styles.rowWrap}>
          {moodOptions.map((item) => (
            <Pressable key={item.value} style={[styles.chip, mood === item.value && styles.chipActive]} onPress={() => setMood(item.value)}>
              <Text style={[styles.chipText, mood === item.value && styles.chipTextActive, isArabic && styles.chipTextArabic]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.sleepHours}</Text>
        <TextInput
          style={[styles.input, isArabic && styles.rtlInput]}
          value={sleepHours}
          onChangeText={setSleepHours}
          keyboardType="decimal-pad"
          placeholder="8"
          textAlign={isArabic ? 'right' : 'left'}
        />
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.appetite}</Text>
        <View style={styles.rowWrap}>
          {appetiteOptions.map((item) => (
            <Pressable key={item.value} style={[styles.chip, appetite === item.value && styles.chipActive]} onPress={() => setAppetite(item.value)}>
              <Text style={[styles.chipText, appetite === item.value && styles.chipTextActive, isArabic && styles.chipTextArabic]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.meltdowns}</Text>
        <TextInput
          style={[styles.input, isArabic && styles.rtlInput]}
          value={meltdowns}
          onChangeText={setMeltdowns}
          keyboardType="number-pad"
          placeholder="0"
          textAlign={isArabic ? 'right' : 'left'}
        />
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.notes}</Text>
        <TextInput
          style={[styles.input, styles.notesInput, isArabic && styles.rtlInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={copy.notesPlaceholder}
          placeholderTextColor="#9c94b0"
          textAlign={isArabic ? 'right' : 'left'}
        />
      </ScreenCard>

      <Pressable style={[appButton.primary, saving && appButton.disabled]} disabled={saving} onPress={() => void saveCheckin()}>
        <Text style={appButton.primaryText}>{saving ? copy.saving : copy.saveCheckin}</Text>
      </Pressable>

      <ScreenCard>
        <Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{copy.recentTitle}</Text>
        {loadingHistory ? (
          <Text style={[styles.muted, isArabic && styles.rtl]}>{copy.loading}</Text>
        ) : history.length === 0 ? (
          <Text style={[styles.muted, isArabic && styles.rtl]}>{copy.noHistory}</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <Text style={[styles.historyTitle, isArabic && styles.rtl]}>{item.checkin_date}</Text>
              <Text style={[styles.historyLine, isArabic && styles.rtl]}>{copy.historyMood(formatStoredMood(language, item.mood))}</Text>
              <Text style={[styles.historyLine, isArabic && styles.rtl]}>{copy.historySleep(item.sleep_hours ?? copy.na)}</Text>
              <Text style={[styles.historyLine, isArabic && styles.rtl]}>{copy.historyAppetite(formatStoredAppetite(language, item.appetite))}</Text>
              <Text style={[styles.historyLine, isArabic && styles.rtl]}>{copy.historyMeltdowns(item.meltdowns ?? copy.na)}</Text>
              {item.notes ? <Text style={[styles.historyLine, isArabic && styles.rtl]}>{copy.historyNotes(item.notes)}</Text> : null}
            </View>
          ))
        )}
      </ScreenCard>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#fff7e8',
    borderColor: '#f7c873',
    gap: 10,
    borderRadius: 16,
  },
  offlineBannerText: { color: '#92400e', fontWeight: '700' },
  syncBtn: { backgroundColor: '#c86a13', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { color: '#17131f', fontWeight: '900', fontSize: 16 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  rtlInput: { writingDirection: 'rtl' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    backgroundColor: '#f4f1fb',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dccfff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#6d46d4', borderColor: '#6d46d4' },
  chipText: { color: '#603fd0', fontWeight: '800', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  chipTextArabic: { textTransform: 'none' },
  input: {
    backgroundColor: '#fdfcff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#17131f',
  },
  notesInput: { minHeight: 92, textAlignVertical: 'top' },
  muted: { color: '#6d6485' },
  historyCard: {
    backgroundColor: '#faf8ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9e0ff',
    padding: 12,
    gap: 2,
    marginTop: 9,
  },
  historyTitle: { color: '#17131f', fontWeight: '800' },
  historyLine: { color: '#534c62', lineHeight: 20 },
})
