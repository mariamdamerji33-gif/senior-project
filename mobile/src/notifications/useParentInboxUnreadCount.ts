import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../mvc/models/api'
import { parentInboxItemIsRead, parentInboxReadAtKey, parentInboxReadIdsKey } from './parentInboxState'

/**
 * Unread count for the parent notifications inbox (school + system items).
 * Bump `refreshKey` when navigation changes if you need to re-poll outside screens (e.g. drawer).
 */
export function useParentInboxUnreadCount(
  token: string | null | undefined,
  userId: string | null | undefined,
  refreshKey: string | number = 0,
) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (!token || !userId) {
        if (!cancelled) setUnread(0)
        return
      }
      try {
        const readRaw = await AsyncStorage.getItem(parentInboxReadAtKey(userId))
        const readAt = readRaw ? Number(readRaw) || 0 : 0
        let readIds: string[] = []
        try {
          const readIdsRaw = await AsyncStorage.getItem(parentInboxReadIdsKey(userId))
          const p = readIdsRaw ? (JSON.parse(readIdsRaw) as unknown) : []
          readIds = Array.isArray(p) ? p.map(String) : []
        } catch {
          readIds = []
        }
        const n = await api.parentNotifications(token)
        const c = (n.notifications || []).filter((item) => !parentInboxItemIsRead(item, readAt, readIds)).length
        if (!cancelled) setUnread(c)
      } catch {
        if (!cancelled) setUnread(0)
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [token, userId, refreshKey])

  return unread
}
