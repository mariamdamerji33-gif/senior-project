import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'

export type ChatMode = 'parent' | 'teacher'

type ChatMessage = {
  id: string
  childId: string
  senderId: string
  senderRole: string
  text: string
  createdAt: string
}

type VoiceNotePayload = {
  path: string
  mimeType?: string
  sizeBytes?: number
}

type ImagePayload = {
  path: string
  mimeType?: string
  sizeBytes?: number
}

function parseVoiceNote(text: string): VoiceNotePayload | null {
  if (!text.startsWith('[[voice-note]]')) return null
  try {
    return JSON.parse(text.replace('[[voice-note]]', '')) as VoiceNotePayload
  } catch {
    return null
  }
}

function parseChatImage(text: string): ImagePayload | null {
  if (!text.startsWith('[[chat-image]]')) return null
  try {
    return JSON.parse(text.replace('[[chat-image]]', '')) as ImagePayload
  } catch {
    return null
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function idsEqual(a: string, b: string) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
}

/** Always show role (Teacher / Family) so the thread reads as a two-party chat; append · You for your messages. */
function canDeleteMessage(m: ChatMessage, mode: ChatMode, myId: string) {
  if (!myId || !m.id) return false
  if (mode === 'teacher') return true
  if (mode === 'parent') return idsEqual(m.senderId, myId)
  return false
}

function senderLabel(m: ChatMessage, myId: string) {
  const roleName =
    m.senderRole === 'therapist'
      ? 'Teacher'
      : m.senderRole === 'parent'
        ? 'Family'
        : m.senderRole === 'super_admin'
          ? 'Admin'
          : 'User'
  return idsEqual(m.senderId, myId) ? `${roleName} · You` : roleName
}

export function ChildChatPage({ mode }: { mode: ChatMode }) {
  const { token, user } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const location = useLocation()
  const navigate = useNavigate()
  const myId = user?.id ?? ''
  const [children, setChildren] = useState<{ id: string; name: string }[]>([])
  const [childId, setChildId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [pendingChildId, setPendingChildId] = useState<string | null>(null)
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [voiceUrls, setVoiceUrls] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState<MediaRecorder | null>(null)
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Mark a thread as "seen" when the user is viewing it (used by dashboard notifications).
  useEffect(() => {
    if (!childId) return
    if (document.visibilityState !== 'visible') return
    if (messages.length === 0) return
    const latest = messages
      .map((m) => String(m.createdAt || ''))
      .filter(Boolean)
      .sort()
      .at(-1)
    if (!latest) return
    try {
      const key = 'a11y_chat_last_seen_v1'
      const raw = localStorage.getItem(key) || '{}'
      const map = (JSON.parse(raw) as Record<string, string>) || {}
      if (!map[childId] || map[childId] < latest) {
        map[childId] = latest
        localStorage.setItem(key, JSON.stringify(map))
      }
    } catch {
      /* ignore */
    }
  }, [childId, messages])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setLoadingChildren(true)
      try {
        const res =
          mode === 'parent' ? await api.parentChildren(token) : await api.teacherChildren(token)
        if (cancelled) return
        const list = (res.children || []) as { id: string; name: string }[]
        setChildren(list)
        if (list.length > 0) setChildId((prev) => prev || list[0].id)
      } catch {
        if (!cancelled) setChildren([])
      } finally {
        if (!cancelled) setLoadingChildren(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, mode])

  // Optional support for opening chat with a pre-filled draft message (e.g., from Symptoms dashboard).
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const draft = params.get('draft') || ''
    const targetChild = params.get('childId') || ''
    if (!draft) return
    setText((prev) => (prev.trim().length > 0 ? prev : draft))
    if (targetChild) setPendingChildId(targetChild)
    params.delete('draft')
    params.delete('childId')
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!pendingChildId) return
    if (children.length === 0) return
    const exists = children.some((c) => idsEqual(c.id, pendingChildId))
    if (exists) setChildId(pendingChildId)
    setPendingChildId(null)
  }, [pendingChildId, children])

  const loadMessages = useCallback(
    async (silent: boolean) => {
      if (!token || !childId) return
      if (!silent) {
        setLoadingMessages(true)
        setMsgError(null)
      }
      try {
        const res = await api.chatMessages(token, childId)
        setMessages((res.messages || []) as ChatMessage[])
      } catch (e) {
        if (!silent) {
          setMsgError(e instanceof Error ? e.message : 'Failed to load messages')
          setMessages([])
        }
      } finally {
        if (!silent) setLoadingMessages(false)
      }
    },
    [token, childId],
  )

  useEffect(() => {
    if (!token || !childId) {
      setMessages([])
      return
    }
    void loadMessages(false)
  }, [token, childId, loadMessages])

  useEffect(() => {
    if (!token || !childId) return
    const id = window.setInterval(() => {
      void loadMessages(true)
    }, 10000)
    return () => clearInterval(id)
  }, [token, childId, loadMessages])

  useEffect(() => {
    if (!token || !childId) return
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadMessages(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [token, childId, loadMessages])

  const thread = useMemo(
    () => messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  )

  async function loadVoiceUrl(messageId: string, voice: VoiceNotePayload) {
    if (!token || !childId) return
    setSendError(null)
    try {
      const res = await api.chatVoiceNoteUrl(token, { childId, path: voice.path })
      setVoiceUrls((prev) => ({ ...prev, [messageId]: res.url }))
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not open voice note')
    }
  }

  async function loadImageUrl(messageId: string, image: ImagePayload) {
    if (!token || !childId) return
    setSendError(null)
    try {
      const res = await api.chatImageUrl(token, { childId, path: image.path })
      setImageUrls((prev) => ({ ...prev, [messageId]: res.url }))
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not open image')
    }
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSendError('Voice recording is not supported in this browser.')
      return
    }
    try {
      setSendError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        void sendVoiceRecording(blob)
      }
      recorder.start()
      setRecording(recorder)
      setRecordingStartedAt(Date.now())
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not start microphone recording')
    }
  }

  function stopVoiceRecording() {
    if (!recording) return
    recording.stop()
    setRecording(null)
    setRecordingStartedAt(null)
  }

  async function deleteMessage(messageId: string) {
    if (!token || !childId) return
    const ok = await confirm({
      title: 'Delete message?',
      description:
        mode === 'teacher'
          ? 'This removes the message from the family thread. They will no longer see it in the app.'
          : 'This removes your message from the thread.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    setDeletingId(messageId)
    setSendError(null)
    try {
      await api.chatDeleteMessage(token, messageId, childId)
      setVoiceUrls((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      setImageUrls((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      await loadMessages(true)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function sendVoiceRecording(blob: Blob) {
    if (!token || !childId) return
    if (blob.size < 1) {
      setSendError('Voice note was empty. Please try again.')
      return
    }
    try {
      setSendError(null)
      await api.chatSendVoiceNote(token, { childId, file: blob })
      await loadMessages(true)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Voice note send failed')
    }
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Chat</h2>
      <Card style={{ overflow: 'hidden', padding: 0 }}>
        <div
          style={{
            padding: 14,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Child thread</div>
            {loadingChildren ? (
              <div style={{ opacity: 0.85 }}>Loading children…</div>
            ) : children.length === 0 ? (
              <div style={{ opacity: 0.85 }}>
                {mode === 'parent'
                  ? 'No children linked to your account yet.'
                  : 'No assigned children yet.'}
              </div>
            ) : (
              <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>Per child thread · auto-refresh ~10s</div>
        </div>

        <div style={{ padding: 16, minHeight: 300 }}>
          {loadingMessages ? (
            <div style={{ opacity: 0.85 }}>Loading messages…</div>
          ) : msgError ? (
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>
              <div className="ui-alert ui-alertError ui-textErrorPre ui-textErrorMb" role="alert">
                {msgError}
              </div>
              {msgError.includes('API route not found') || msgError.includes('Restart the backend') ? (
                <p style={{ opacity: 0.9, marginTop: 8 }}>
                  The API server is running an old build. Stop it and start again from the <code>backend</code> folder (
                  <code>npm start</code> or <code>node server.js</code>), then hard-refresh this page. Chat delete needs{' '}
                  <code>DELETE /api/chat/messages/:id</code> from the latest backend.
                </p>
              ) : null}
              {msgError.includes('chat_messages') || msgError.includes('Chat table') ? (
                <p style={{ opacity: 0.9, marginTop: 8 }}>
                  Run <code>supabase/chat_messages.sql</code> in Supabase → SQL Editor, then reload.
                </p>
              ) : null}
            </div>
          ) : thread.length === 0 ? (
            <div style={{ opacity: 0.85 }}>No messages yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {thread.map((m) => {
                const mine = idsEqual(m.senderId, myId)
                const voice = parseVoiceNote(m.text)
                const image = parseChatImage(m.text)
                return (
                  <Card
                    key={m.id}
                    style={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      borderRadius: 14,
                      padding: '10px 12px',
                      background: mine ? 'var(--chat-bubble-mine)' : 'var(--chat-bubble-theirs)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontWeight: 800,
                        fontSize: 12,
                        opacity: 0.85,
                      }}
                    >
                      <span>
                        {senderLabel(m, myId)} • {formatTime(m.createdAt)}
                      </span>
                      {canDeleteMessage(m, mode, myId) ? (
                        <button
                          type="button"
                          className="ui-chatDeleteBtn"
                          disabled={deletingId === m.id}
                          onClick={() => void deleteMessage(m.id)}
                          title="Delete message"
                        >
                          {deletingId === m.id ? '…' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                    {voice ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Voice note from parent</div>
                        {voiceUrls[m.id] ? (
                          <audio controls src={voiceUrls[m.id]} style={{ width: '100%' }} />
                        ) : (
                          <Button type="button" variant="ghost" onClick={() => void loadVoiceUrl(m.id, voice)}>
                            Play voice note
                          </Button>
                        )}
                      </div>
                    ) : image ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Chat image</div>
                        {imageUrls[m.id] ? (
                          <img
                            src={imageUrls[m.id]}
                            alt="Chat attachment"
                            style={{ maxWidth: 260, width: '100%', borderRadius: 12, display: 'block' }}
                          />
                        ) : (
                          <Button type="button" variant="ghost" onClick={() => void loadImageUrl(m.id, image)}>
                            View image
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: 14,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ flex: 1, minWidth: 240, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Message</span>
            <TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Type your message..."
            />
          </label>

          <Button
            type="button"
            disabled={text.trim().length < 1 || !childId}
            onClick={() => {
              void (async () => {
                if (text.trim().length < 1 || !childId || !token) return
                setSendError(null)
                try {
                  await api.chatSend(token, { childId, text: text.trim() })
                  setText('')
                  await loadMessages(true)
                } catch (e) {
                  setSendError(e instanceof Error ? e.message : 'Send failed')
                }
              })()
            }}
            variant={text.trim().length < 1 || !childId ? 'ghost' : 'primary'}
            style={{ padding: '12px 14px' }}
          >
            Send
          </Button>
          <Button
            type="button"
            disabled={!childId}
            onClick={() => {
              if (recording) stopVoiceRecording()
              else void startVoiceRecording()
            }}
            variant={recording ? 'primary' : 'ghost'}
            style={{ padding: '12px 14px' }}
          >
            {recording
              ? `Stop & send${recordingStartedAt ? ` (${Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000))}s)` : ''}`
              : 'Record voice'}
          </Button>
          <label className="ui-btn ui-btnGhost" style={{ padding: '12px 14px', cursor: childId ? 'pointer' : 'not-allowed', opacity: childId ? 1 : 0.55 }}>
            Send image
            <input
              type="file"
              accept="image/*"
              disabled={!childId}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.currentTarget.value = ''
                if (!file || !token || !childId) return
                void (async () => {
                  setSendError(null)
                  try {
                    await api.chatSendImage(token, { childId, file })
                    await loadMessages(true)
                  } catch (err) {
                    setSendError(err instanceof Error ? err.message : 'Image send failed')
                  }
                })()
              }}
            />
          </label>
        </div>
        {sendError ? (
          <div style={{ margin: 14 }}>
            <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
              {sendError}
            </div>
            {sendError.includes('API route not found') ? (
              <p className="ui-helpText" style={{ marginTop: 8 }}>
                Restart the backend from the <code>backend</code> folder, then try Delete again.
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>
      {confirmDialog}
    </div>
  )
}
