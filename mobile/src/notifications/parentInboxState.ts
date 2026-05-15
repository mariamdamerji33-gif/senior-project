/** AsyncStorage keys / helpers for parent notification inbox (read + dismiss). */

export const PARENT_INBOX_READ_AT_PREFIX = 'asp_mobile_notifications_read_at_v1'
export const PARENT_INBOX_READ_IDS_PREFIX = 'asp_mobile_notifications_read_ids_v1'
export const PARENT_INBOX_DELETED_IDS_PREFIX = 'asp_mobile_notifications_deleted_ids_v1'

export type ParentInboxRow = { id: string; createdAt: string }

export function parentInboxReadAtKey(userId: string) {
  return `${PARENT_INBOX_READ_AT_PREFIX}:${userId}`
}

export function parentInboxReadIdsKey(userId: string) {
  return `${PARENT_INBOX_READ_IDS_PREFIX}:${userId}`
}

export function parentInboxDeletedIdsKey(userId: string) {
  return `${PARENT_INBOX_DELETED_IDS_PREFIX}:${userId}`
}

/** Read if parent marked all read up to `readAt`, marked this id read, or the item is not "newer" than the watermark. */
export function parentInboxItemIsRead(item: ParentInboxRow, readAt: number, readIds: string[]) {
  if (readIds.includes(item.id)) return true
  const ts = new Date(item.createdAt).getTime()
  if (!Number.isFinite(ts)) return false
  return ts <= readAt
}
