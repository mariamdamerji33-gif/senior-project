import AsyncStorage from '@react-native-async-storage/async-storage'

type ChatMessage = {
  sender_id?: string
  senderId?: string
  created_at?: string
  createdAt?: string
}

const KEY_PREFIX = 'asp_mobile_chat_seen_v1'

function makeKey(userId: string, childId: string) {
  return `${KEY_PREFIX}:${userId}:${childId}`
}

export async function getSeenAt(userId: string, childId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(makeKey(userId, childId))
  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function markSeenNow(userId: string, childId: string): Promise<void> {
  await AsyncStorage.setItem(makeKey(userId, childId), String(Date.now()))
}

export function countUnreadFromOthers(messages: ChatMessage[], currentUserId?: string, seenAt = 0): number {
  if (!currentUserId) return 0
  return messages.filter((m) => {
    const senderId = m.senderId || m.sender_id || ''
    const createdAt = m.createdAt || m.created_at || ''
    if (senderId === currentUserId) return false
    const ts = new Date(createdAt).getTime()
    return Number.isFinite(ts) && ts > seenAt
  }).length
}
