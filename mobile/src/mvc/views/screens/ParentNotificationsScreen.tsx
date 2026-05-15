import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { useFocusEffect } from '@react-navigation/native'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { useConfirmDialog } from '../components/useConfirmDialog'
import { appButton } from '../../../theme'
import { colors } from '../../../theme/colors'
import { getOfflineDailyCheckinCount } from '../../../checkin/offlineDailyCheckinQueue'
import {
  parentInboxDeletedIdsKey,
  parentInboxItemIsRead,
  parentInboxReadAtKey,
  parentInboxReadIdsKey,
} from '../../../notifications/parentInboxState'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { readCachedJson, writeCachedJson } from '../../../offline/offlineCache'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentNotifications'>
type NotificationItem = {
  id: string
  type: 'message' | 'step' | 'announcement' | 'report' | 'system'
  title: string
  body: string
  createdAt: string
  priority?: string
}

function iconForType(type: NotificationItem['type']) {
  if (type === 'message') return '💬'
  if (type === 'step') return '📌'
  if (type === 'announcement') return '📣'
  if (type === 'report') return '📝'
  return '⚠️'
}

export function ParentNotificationsScreen({ navigation }: Props) {
  const { token, user } = useAuth()
  const { language, isArabic } = useLanguage()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readAt, setReadAt] = useState(0)
  const [readIds, setReadIds] = useState<string[]>([])
  const [showCachedBanner, setShowCachedBanner] = useState(false)
  const isEn = language === 'en'
  const copy = {
    eyebrow: isEn ? 'Family' : 'العائلة',
    title: isEn ? 'Notifications' : 'التنبيهات',
    unread: (n: number) => (isEn ? `${n} unread` : `${n} غير مقروء`),
    updates: isEn ? 'School updates' : 'تحديثات المدرسة',
    backToday: isEn ? '← Today' : '← اليوم',
    refreshing: isEn ? 'Refreshing...' : 'جاري التحديث...',
    refresh: isEn ? 'Refresh' : 'تحديث',
    markAllRead: isEn ? 'Mark all read' : 'تحديد الكل كمقروء',
    loadFailed: isEn ? 'Could not load notifications' : 'تعذر تحميل التنبيهات',
    noNotifications: isEn ? 'No notifications yet.' : 'لا توجد تنبيهات بعد.',
    unknownError: isEn ? 'Unknown error' : 'خطأ غير معروف',
    cachedBanner: isEn ? 'Offline mode: showing last saved notifications.' : 'وضع عدم الاتصال: عرض آخر تنبيهات محفوظة.',
    offlineWaitingTitle: isEn ? 'Offline check-ins waiting' : 'متابعات بدون إنترنت بانتظار المزامنة',
    offlineWaitingBody: (n: number) =>
      isEn
        ? `${n} check-in(s) are saved offline. Open Daily Check-In to sync.`
        : `${n} متابعة محفوظة بدون إنترنت. افتح متابعة اليوم للمزامنة.`,
    announcementPriority: (priority: string) => (isEn ? `${priority} priority` : `أولوية ${priority}`),
    markRead: isEn ? 'Mark read' : 'تحديد كمقروء',
    deleteLabel: isEn ? 'Delete' : 'حذف',
    deleteTitle: isEn ? 'Delete this alert?' : 'حذف هذا التنبيه؟',
    deleteBody: isEn ? 'It will be removed from your list on this device.' : 'سيُزال من قائمتك على هذا الجهاز.',
    deleteConfirm: isEn ? 'Delete' : 'حذف',
    cancel: isEn ? 'Cancel' : 'إلغاء',
    readBeforeDeleteHint: isEn ? 'Read this alert before you can delete it.' : 'اقرأ التنبيه أولاً قبل الحذف.',
  }

  const refresh = async () => {
    if (!token) return
    setLoading(true)
    try {
      const userId = user?.id || 'unknown'
      const readKey = parentInboxReadAtKey(userId)
      const readIdsKey = parentInboxReadIdsKey(userId)
      const deletedKey = parentInboxDeletedIdsKey(userId)
      const readRaw = await AsyncStorage.getItem(readKey)
      setReadAt(readRaw ? Number(readRaw) || 0 : 0)
      let parsedReadIds: string[] = []
      try {
        const readIdsRaw = await AsyncStorage.getItem(readIdsKey)
        const p = readIdsRaw ? (JSON.parse(readIdsRaw) as unknown) : []
        parsedReadIds = Array.isArray(p) ? p.map(String) : []
      } catch {
        parsedReadIds = []
      }
      setReadIds(parsedReadIds)
      let parsedDeleted: string[] = []
      try {
        const delRaw = await AsyncStorage.getItem(deletedKey)
        const d = delRaw ? (JSON.parse(delRaw) as unknown) : []
        parsedDeleted = Array.isArray(d) ? d.map(String) : []
      } catch {
        parsedDeleted = []
      }
      const [notificationsRes, announcementsRes] = await Promise.all([api.parentNotifications(token), api.announcements(token)])
      const notifications: NotificationItem[] = (notificationsRes.notifications || []).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
      }))
      const announcementItems: NotificationItem[] = (announcementsRes.announcements || []).map((item) => ({
        id: `announcement-${item.id}`,
        type: 'announcement',
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
        priority: item.priority,
      }))
      const allItems = [...notifications, ...announcementItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      const offlinePending = await getOfflineDailyCheckinCount()
      if (offlinePending > 0) {
        allItems.unshift({
          id: 'offline-checkins',
          type: 'system',
          title: copy.offlineWaitingTitle,
          body: copy.offlineWaitingBody(offlinePending),
          createdAt: new Date().toISOString(),
        })
      }
      const visible = allItems.filter((i) => !parsedDeleted.includes(i.id)).slice(0, 40)
      setItems(visible)
      const cacheKey = `asp_mobile_notifications_cache_v1:${userId}`
      await writeCachedJson(cacheKey, visible)
      setLoadError(null)
      setShowCachedBanner(false)
    } catch (e) {
      const userId = user?.id || 'unknown'
      const cacheKey = `asp_mobile_notifications_cache_v1:${userId}`
      const deletedKey = parentInboxDeletedIdsKey(userId)
      let delList: string[] = []
      try {
        const delRaw = await AsyncStorage.getItem(deletedKey)
        const d = delRaw ? (JSON.parse(delRaw) as unknown) : []
        delList = Array.isArray(d) ? d.map(String) : []
      } catch {
        delList = []
      }
      const cached = await readCachedJson<NotificationItem[]>(cacheKey, [])
      const filteredCache = cached.filter((i) => !delList.includes(i.id))
      if (filteredCache.length) {
        setItems(filteredCache)
        setShowCachedBanner(true)
        setLoadError(null)
      } else {
        setShowCachedBanner(false)
        setLoadError(e instanceof Error ? e.message : copy.unknownError)
      }
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [token, user?.id]),
  )

  const unreadCount = useMemo(
    () => items.filter((item) => !parentInboxItemIsRead(item, readAt, readIds)).length,
    [items, readAt, readIds],
  )

  const markAllRead = async () => {
    const userId = user?.id || 'unknown'
    const readKey = parentInboxReadAtKey(userId)
    const readIdsKey = parentInboxReadIdsKey(userId)
    const now = Date.now()
    await AsyncStorage.setItem(readKey, String(now))
    setReadAt(now)
    const merged = [...new Set([...readIds, ...items.map((i) => i.id)])]
    setReadIds(merged)
    await AsyncStorage.setItem(readIdsKey, JSON.stringify(merged))
  }

  const markOneRead = async (id: string) => {
    if (readIds.includes(id)) return
    const userId = user?.id || 'unknown'
    const readIdsKey = parentInboxReadIdsKey(userId)
    const merged = [...readIds, id]
    setReadIds(merged)
    await AsyncStorage.setItem(readIdsKey, JSON.stringify(merged))
  }

  const confirmDeleteOne = (item: NotificationItem) => {
    void (async () => {
      const userId = user?.id || 'unknown'
      const readRaw = await AsyncStorage.getItem(parentInboxReadAtKey(userId))
      const readAtNow = readRaw ? Number(readRaw) || 0 : 0
      let readIdsNow: string[]
      try {
        const r = await AsyncStorage.getItem(parentInboxReadIdsKey(userId))
        const p = r ? (JSON.parse(r) as unknown) : []
        readIdsNow = Array.isArray(p) ? p.map(String) : []
      } catch {
        readIdsNow = []
      }
      if (!parentInboxItemIsRead(item, readAtNow, readIdsNow)) return
      const ok = await confirm({
        title: copy.deleteTitle,
        description: copy.deleteBody,
        confirmLabel: copy.deleteConfirm,
        cancelLabel: copy.cancel,
        tone: 'danger',
        rtl: isArabic,
      })
      if (!ok) return
      const deletedKey = parentInboxDeletedIdsKey(userId)
      const cacheKey = `asp_mobile_notifications_cache_v1:${userId}`
      const delRaw = await AsyncStorage.getItem(deletedKey)
      let list: string[]
      try {
        const p = delRaw ? (JSON.parse(delRaw) as unknown) : []
        list = Array.isArray(p) ? p.map(String) : []
      } catch {
        list = []
      }
      const nextDeleted = [...new Set([...list, item.id])]
      await AsyncStorage.setItem(deletedKey, JSON.stringify(nextDeleted))
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== item.id)
        void writeCachedJson(cacheKey, next)
        return next
      })
    })()
  }

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={unreadCount > 0 ? copy.unread(unreadCount) : copy.updates}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={copy.backToday}
      rtl={isArabic}
    >
      <View style={styles.toolbar}>
        <Pressable style={[appButton.secondary, styles.toolbarBtn]} onPress={() => void refresh()}>
          <Text style={[appButton.secondaryText, styles.toolbarBtnText]}>{loading ? copy.refreshing : copy.refresh}</Text>
        </Pressable>
        <Pressable style={[appButton.secondary, styles.toolbarBtn]} onPress={() => void markAllRead()}>
          <Text style={[appButton.secondaryText, styles.toolbarBtnText]}>{copy.markAllRead}</Text>
        </Pressable>
      </View>

      {loadError ? (
        <InlineLoadError
          title={copy.loadFailed}
          message={loadError}
          onRetry={() => void refresh()}
          retrying={loading}
          loadingLabel={copy.refreshing}
          rtl={isArabic}
        />
      ) : null}

      {showCachedBanner ? (
        <ScreenCard style={styles.cachedCard}>
          <Text style={[styles.cachedText, isArabic && styles.rtl]}>{copy.cachedBanner}</Text>
        </ScreenCard>
      ) : null}

      {items.length === 0 && !loadError ? (
        <ScreenCard>
          <Text style={[styles.empty, isArabic && styles.rtl]}>{copy.noNotifications}</Text>
        </ScreenCard>
      ) : null}

      {items.map((item) => {
        const read = parentInboxItemIsRead(item, readAt, readIds)
        return (
          <ScreenCard key={item.id} style={!read ? styles.unreadCard : undefined}>
            <Text style={[styles.cardTitle, isArabic && styles.rtl]}>
              {iconForType(item.type)} {item.title}
            </Text>
            {item.type === 'announcement' && item.priority ? (
              <Text style={[styles.priorityText, isArabic && styles.rtl]}>{copy.announcementPriority(item.priority)}</Text>
            ) : null}
            <Text style={[styles.cardBody, isArabic && styles.rtl]}>{item.body}</Text>
            <Text style={[styles.cardDate, isArabic && styles.rtl]}>{new Date(item.createdAt).toLocaleString()}</Text>
            <View style={[styles.cardActionsRow, isArabic && styles.cardActionsRowRtl]}>
              {!read ? (
                <>
                  <Pressable
                    style={[appButton.secondary, styles.cardActionBtn]}
                    onPress={() => void markOneRead(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={copy.markRead}
                  >
                    <Text style={[appButton.secondaryText, styles.cardActionBtnText]}>{copy.markRead}</Text>
                  </Pressable>
                  <Text style={[styles.readFirstHint, isArabic && styles.rtl]}>{copy.readBeforeDeleteHint}</Text>
                </>
              ) : (
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDeleteOne(item)}
                  accessibilityRole="button"
                  accessibilityLabel={copy.deleteLabel}
                >
                  <Text style={styles.deleteBtnText}>{copy.deleteLabel}</Text>
                </Pressable>
              )}
            </View>
          </ScreenCard>
        )
      })}

      {confirmDialog}
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 10 },
  toolbarBtn: { flex: 1 },
  toolbarBtnText: { textAlign: 'center', fontSize: 14 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  empty: { color: '#6d6485', fontWeight: '600' },
  unreadCard: { borderColor: '#6d46d4', backgroundColor: '#f6f2ff' },
  cachedCard: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  cachedText: { color: '#92400e', fontWeight: '700' },
  cardTitle: { color: '#2c2144', fontWeight: '800', fontSize: 16 },
  priorityText: { color: '#7c2d12', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  cardBody: { color: '#5f5573', lineHeight: 20, fontWeight: '600' },
  cardDate: { color: '#7c7392', fontSize: 11, marginTop: 4 },
  cardActionsRow: { marginTop: 12, gap: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  cardActionsRowRtl: { flexDirection: 'row-reverse' },
  cardActionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  cardActionBtnText: { fontSize: 13 },
  readFirstHint: { flex: 1, minWidth: 120, color: '#7c7392', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(180, 35, 24, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180, 35, 24, 0.35)',
  },
  deleteBtnText: { color: colors.danger, fontWeight: '800', fontSize: 14 },
})
