import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth, useA11yUiPrefs } from '@/mvc/controllers'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

type NotificationItem = {
  id: string
  childId?: string
  title: string
  body: string
  actionLabel: string
  to: string
}

const CHAT_SEEN_KEY = 'a11y_chat_last_seen_v1'

function loadSeen(): Record<string, string> {
  try {
    return (JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || '{}') as Record<string, string>) || {}
  } catch {
    return {}
  }
}

export function DashboardHeaderTools() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { stepFontSize, toggleContrast, prefs } = useA11yUiPrefs()

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!token || !user?.role) return
    let cancelled = false

    async function poll() {
      if (!token || !user?.role) return
      const role = user.role
      if (role !== 'therapist') {
        if (!cancelled) setNotifications([])
        return
      }

      const childrenRes = await api.teacherChildren(token)
      const children = (childrenRes.children || []) as { id: string; name: string }[]

      const seen = loadSeen()
      const myId = String(user.id || '')

      const chatItems = (
        await Promise.all(
          children.map(async (c) => {
            try {
              const res = await api.chatMessages(token, c.id)
              const msgs = (res.messages || []) as { createdAt?: string; senderId?: string }[]
              const lastSeenIso = seen[c.id] || ''
              const unreadCount = msgs.filter((m) => {
                const ts = String(m.createdAt || '')
                if (!ts) return false
                if (lastSeenIso && ts <= lastSeenIso) return false
                const sender = String(m.senderId || '')
                return sender && sender !== myId
              }).length
              return unreadCount > 0
                ? ({
                    id: `chat-${c.id}`,
                    childId: c.id,
                    title: c.name,
                    body: `${unreadCount} unread message(s) from the family/school chat.`,
                    actionLabel: 'Open chat',
                    to: '/dashboard/teacher-chat',
                  } as NotificationItem)
                : null
            } catch {
              return null
            }
          }),
        )
      ).filter(Boolean) as NotificationItem[]

      let extraItems: NotificationItem[] = []
      const today = new Date().toISOString().slice(0, 10)
      extraItems = (
        await Promise.all(
          children.slice(0, 5).map(async (c) => {
            try {
              const res = await api.teacherDailyCheckins(token, c.id)
              const latest = (res.checkins || [])[0] as { checkin_date?: string; checkinDate?: string } | undefined
              const date = latest?.checkin_date || latest?.checkinDate || ''
              if (date !== today) return null
              return {
                id: `checkin-${c.id}-${date}`,
                childId: c.id,
                title: c.name,
                body: 'Family submitted a daily check-in today.',
                actionLabel: 'Open check-ins',
                to: '/dashboard/teacher-daily-checkins',
              } as NotificationItem
            } catch {
              return null
            }
          }),
        )
      ).filter(Boolean) as NotificationItem[]

      if (!cancelled) setNotifications([...chatItems, ...extraItems].slice(0, 8))
    }

    void poll()
    const id = window.setInterval(() => void poll(), 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [token, user?.id, user?.role])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const totalNotifications = notifications.length

  return (
    <div className="dash-tools">
      <div className="dash-toolsRow">
        <Button type="button" variant="ghost" onClick={() => stepFontSize(-1)} title="Smaller text" aria-label="Make text smaller">
          A-
        </Button>
        <Button type="button" variant="ghost" onClick={() => stepFontSize(1)} title="Larger text" aria-label="Make text larger">
          A+
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => toggleContrast()}
          title="Toggle high contrast"
          aria-label="Toggle high contrast mode"
          aria-pressed={prefs.contrast === 'high'}
        >
          Contrast
        </Button>

        <div className="dash-toolsNotif">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
            title="Notifications"
            aria-label={totalNotifications > 0 ? `Notifications, ${totalNotifications} update(s)` : 'Notifications'}
            aria-expanded={open}
            aria-controls="dashboard-notifications-panel"
          >
            Notifications{totalNotifications > 0 ? ` (${totalNotifications})` : ''}
          </Button>
          {open ? (
            <Card
              id="dashboard-notifications-panel"
              className="dash-toolsPanel"
              role="region"
              aria-label="Dashboard notifications"
              style={{ padding: 12 }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--text-h)' }}>Dashboard updates</div>
              {totalNotifications === 0 ? (
                <div className="ui-helpText">No urgent updates. New chat, report, and check-in alerts will appear here.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifications.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 750 }}>{u.title}</div>
                        <div className="ui-helpText">{u.body}</div>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setOpen(false)
                          navigate(u.to)
                        }}
                      >
                        {u.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
