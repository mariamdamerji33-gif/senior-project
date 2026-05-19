import { useEffect, useMemo, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { markSeenNow } from '../../../chat/seenState'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenHeaderBand } from '../components/ScreenHeaderBand'
import { appButton } from '../../../theme'
import { screenLayout } from '../../../theme/layout'
import { markChecklistTaskDone } from '../../../checklist/parentDailyChecklist'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { useLanguage } from '../../controllers/LanguageController'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { readCachedJson, writeCachedJson } from '../../../offline/offlineCache'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentChat'>
type ChatMessage = { id: string; senderId: string; senderRole: string; text: string; createdAt: string }

function formatSenderRole(role: string) {
  if (role === 'therapist') return 'Teacher'
  if (role === 'parent') return 'Family'
  if (role === 'super_admin') return 'School Admin'
  if (role === 'manager') return 'Coordinator'
  return role || 'User'
}

function safeImageNameFromUri(uri: string) {
  const raw = uri.split('/').pop() || ''
  const cleaned = raw.split('?')[0].trim()
  if (!cleaned) return 'chat-image.jpg'
  if (/\.(jpg|jpeg|png|webp)$/i.test(cleaned)) return cleaned
  return `${cleaned}.jpg`
}

export function ParentChatScreen({ route, navigation }: Props) {
  const { token, user } = useAuth()
  const { language, isArabic } = useLanguage()
  const { appColors } = useDisplayComfort()
  const { childId, childName } = route.params
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCachedBanner, setShowCachedBanner] = useState(false)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const isEn = language === 'en'
  const copy = {
    eyebrow: isEn ? 'Messages' : 'الرسائل',
    title: isEn ? 'Family chat' : 'محادثة العائلة',
    backToday: isEn ? '← Today' : '← اليوم',
    childFallback: isEn ? 'Your child' : 'طفلك',
    refresh: isEn ? 'Refresh chat' : 'تحديث المحادثة',
    refreshing: isEn ? 'Refreshing...' : 'جاري التحديث...',
    loadErrorTitle: isEn ? 'Could not load messages' : 'تعذر تحميل الرسائل',
    noMessages: isEn ? 'No messages yet. Start the conversation below.' : 'لا توجد رسائل بعد. ابدأ المحادثة من الأسفل.',
    sendFailed: isEn ? 'Send failed' : 'فشل الإرسال',
    unknownError: isEn ? 'Unknown error' : 'خطأ غير معروف',
    voiceNoteFailed: isEn ? 'Voice note failed' : 'فشل إرسال التسجيل الصوتي',
    voiceNoteMissing: isEn ? 'Could not find the recorded audio.' : 'تعذر العثور على التسجيل الصوتي.',
    micNeededTitle: isEn ? 'Microphone needed' : 'يلزم إذن الميكروفون',
    micNeededBody: isEn ? 'Please allow microphone access to record a voice note.' : 'يرجى السماح بالوصول إلى الميكروفون لتسجيل رسالة صوتية.',
    recordingFailed: isEn ? 'Recording failed' : 'فشل التسجيل',
    voiceNoteSimple: isEn ? 'Voice note' : 'رسالة صوتية',
    play: isEn ? 'Play' : 'تشغيل',
    playing: isEn ? 'Playing...' : 'جاري التشغيل...',
    loadingImage: isEn ? 'Loading image...' : 'جاري تحميل الصورة...',
    typeMessage: isEn ? 'Type a message...' : 'اكتب رسالة...',
    sending: isEn ? 'Sending...' : 'جاري الإرسال...',
    sendMessage: isEn ? 'Send message' : 'إرسال الرسالة',
    stopAndSendVoice: isEn ? 'Stop & send voice note' : 'إيقاف وإرسال الرسالة الصوتية',
    recordVoice: isEn ? 'Record voice note' : 'تسجيل رسالة صوتية',
    sendImage: isEn ? 'Send image' : 'إرسال صورة',
    cachedBanner: isEn ? 'Offline mode: showing last saved messages.' : 'وضع عدم الاتصال: عرض آخر رسائل محفوظة.',
    photosNeededTitle: isEn ? 'Photos needed' : 'يلزم إذن الصور',
    photosNeededBody: isEn ? 'Please allow photo access to send an image.' : 'يرجى السماح بالوصول للصور لإرسال صورة.',
    imageSendFailed: isEn ? 'Image send failed' : 'فشل إرسال الصورة',
    voiceNoteTitle: isEn ? 'Voice note' : 'رسالة صوتية',
    voiceNoteOpenFailed: isEn ? 'Could not open this voice note.' : 'تعذر فتح هذه الرسالة الصوتية.',
    playFailed: isEn ? 'Play failed' : 'فشل التشغيل',
    playVoiceFailed: isEn ? 'Could not play voice note' : 'تعذر تشغيل الرسالة الصوتية',
    delete: isEn ? 'Delete' : 'حذف',
    deleteTitle: isEn ? 'Delete message?' : 'حذف الرسالة؟',
    deleteBody: isEn ? 'This removes your message from the thread.' : 'سيتم إزالة رسالتك من المحادثة.',
    deleteFailed: isEn ? 'Delete failed' : 'فشل الحذف',
  }

  const loadMessages = async () => {
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const res = await api.chatMessages(token, childId)
      setMessages(res.messages || [])
      const cacheKey = `asp_mobile_chat_cache_v1:${childId}`
      await writeCachedJson(cacheKey, res.messages || [])
      setLoadError(null)
      setShowCachedBanner(false)
      await markSeenNow(user.id, childId)
    } catch (e) {
      const cacheKey = `asp_mobile_chat_cache_v1:${childId}`
      const cached = await readCachedJson<ChatMessage[]>(cacheKey, [])
      if (cached.length) {
        setMessages(cached)
        setLoadError(null)
        setShowCachedBanner(true)
      } else {
        const msg = e instanceof Error ? e.message : copy.unknownError
        setLoadError(msg)
        setShowCachedBanner(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
    const timer = setInterval(() => {
      void loadMessages()
    }, 10000)
    return () => clearInterval(timer)
  }, [childId, token, user?.id])

  const ordered = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  )

  const sendMessage = async () => {
    if (!token) return
    const body = text.trim()
    if (!body) return
    setSending(true)
    try {
      await api.sendChatMessage(token, { childId, text: body })
      await markChecklistTaskDone(childId, 'chat')
      setText('')
      await loadMessages()
    } catch (e) {
      Alert.alert(copy.sendFailed, e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setSending(false)
    }
  }

  const toggleVoiceNote = async () => {
    if (!token) return
    if (recording) {
      setSending(true)
      try {
        await recording.stopAndUnloadAsync()
        const uri = recording.getURI()
        setRecording(null)
        if (!uri) {
          Alert.alert(copy.voiceNoteFailed, copy.voiceNoteMissing)
          return
        }
        await api.sendVoiceNote(token, { childId, uri, mimeType: 'audio/m4a' })
        await markChecklistTaskDone(childId, 'chat')
        await loadMessages()
      } catch (e) {
        Alert.alert(copy.voiceNoteFailed, e instanceof Error ? e.message : copy.unknownError)
      } finally {
        setSending(false)
      }
      return
    }

    try {
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(copy.micNeededTitle, copy.micNeededBody)
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const nextRecording = new Audio.Recording()
      await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await nextRecording.startAsync()
      setRecording(nextRecording)
    } catch (e) {
      Alert.alert(copy.recordingFailed, e instanceof Error ? e.message : copy.unknownError)
    }
  }

  const voiceNoteLabel = (body: string) => {
    if (!body.startsWith('[[voice-note]]')) return null
    try {
      const data = JSON.parse(body.replace('[[voice-note]]', '')) as { sizeBytes?: number }
      const kb = data.sizeBytes ? Math.round(data.sizeBytes / 1024) : null
      return kb ? `${copy.voiceNoteSimple} (${kb} KB)` : copy.voiceNoteSimple
    } catch {
      return copy.voiceNoteSimple
    }
  }

  const voiceNotePath = (body: string) => {
    if (!body.startsWith('[[voice-note]]')) return null
    try {
      const data = JSON.parse(body.replace('[[voice-note]]', '')) as { path?: string }
      return data.path || null
    } catch {
      return null
    }
  }

  const imagePath = (body: string) => {
    if (!body.startsWith('[[chat-image]]')) return null
    try {
      const data = JSON.parse(body.replace('[[chat-image]]', '')) as { path?: string }
      return data.path || null
    } catch {
      return null
    }
  }

  const loadChatImage = async (message: ChatMessage) => {
    if (!token || imageUrls[message.id]) return
    const path = imagePath(message.text)
    if (!path) return
    try {
      const res = await api.chatImageUrl(token, { childId, path })
      setImageUrls((prev) => ({ ...prev, [message.id]: res.url }))
    } catch {
      // Keep the chat readable even if a signed URL expires/fails.
    }
  }

  const pickAndSendImage = async () => {
    if (!token) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(copy.photosNeededTitle, copy.photosNeededBody)
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setSending(true)
    try {
      await api.sendChatImage(token, {
        childId,
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || safeImageNameFromUri(asset.uri),
      })
      await markChecklistTaskDone(childId, 'chat')
      await loadMessages()
    } catch (e) {
      Alert.alert(copy.imageSendFailed, e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setSending(false)
    }
  }

  const playVoiceNote = async (message: ChatMessage) => {
    if (!token) return
    const path = voiceNotePath(message.text)
    if (!path) {
      Alert.alert(copy.voiceNoteTitle, copy.voiceNoteOpenFailed)
      return
    }
    setPlayingId(message.id)
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      const res = await api.voiceNoteUrl(token, { childId, path })
      const { sound } = await Audio.Sound.createAsync({ uri: res.url }, { shouldPlay: true })
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setPlayingId(null)
          void sound.unloadAsync()
        }
      })
    } catch (e) {
      setPlayingId(null)
      Alert.alert(copy.playFailed, e instanceof Error ? e.message : copy.playVoiceFailed)
    }
  }

  const confirmDelete = (messageId: string) => {
    if (!token) return
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: isEn ? 'Cancel' : 'إلغاء', style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingId(messageId)
            try {
              await api.deleteChatMessage(token, messageId, childId)
              await loadMessages()
            } catch (e) {
              Alert.alert(copy.deleteFailed, e instanceof Error ? e.message : copy.unknownError)
            } finally {
              setDeletingId(null)
            }
          })()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[screenLayout.pageBg, { backgroundColor: appColors.pageBg }]} edges={['top', 'left', 'right']}>
      <View style={styles.outer}>
        <ScreenHeaderBand
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={childName || copy.childFallback}
          onBackPress={() => navigation.navigate('MainOverview')}
          backLabel={copy.backToday}
          rtl={isArabic}
        />
        <View style={styles.wrap}>
          <Pressable style={appButton.outline} onPress={() => void loadMessages()}>
            <Text style={[appButton.outlineText, styles.refreshCenter]}>{loading ? copy.refreshing : copy.refresh}</Text>
          </Pressable>

          {loadError ? (
            <InlineLoadError
              title={copy.loadErrorTitle}
              message={loadError}
              onRetry={() => void loadMessages()}
              retrying={loading}
              loadingLabel={copy.refreshing}
              rtl={isArabic}
            />
          ) : null}

          {showCachedBanner ? (
            <View style={styles.cachedBanner}>
              <Text style={[styles.cachedBannerText, isArabic && styles.rtlText]}>{copy.cachedBanner}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.chatList} contentContainerStyle={styles.chatContent}>
          {ordered.length === 0 ? (
            <Text style={[styles.empty, isArabic && styles.rtlText]}>{copy.noMessages}</Text>
          ) : (
            ordered.map((m) => {
              const mine = m.senderId === user?.id
              const isImage = Boolean(imagePath(m.text))
              if (isImage) void loadChatImage(m)
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.bubbleRole}>{formatSenderRole(m.senderRole)}</Text>
                    {mine ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={copy.delete}
                        disabled={deletingId === m.id}
                        onPress={() => confirmDelete(m.id)}
                      >
                        <Text style={styles.deleteLink}>{deletingId === m.id ? '…' : copy.delete}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {voiceNoteLabel(m.text) ? (
                    <Pressable style={[appButton.outline, styles.playVoiceBtn]} onPress={() => void playVoiceNote(m)} disabled={playingId === m.id}>
                      <Text style={appButton.outlineText}>
                        {playingId === m.id ? copy.playing : `${copy.play} ${voiceNoteLabel(m.text)}`}
                      </Text>
                    </Pressable>
                  ) : isImage ? (
                    imageUrls[m.id] ? (
                      <Image source={{ uri: imageUrls[m.id] }} style={styles.chatImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.bubbleText}>{copy.loadingImage}</Text>
                    )
                  ) : (
                    <Text style={styles.bubbleText}>{m.text}</Text>
                  )}
                  <Text style={styles.bubbleTime}>{new Date(m.createdAt).toLocaleString()}</Text>
                </View>
              )
            })
          )}
        </ScrollView>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={copy.typeMessage}
          multiline
          textAlign={isArabic ? 'right' : 'left'}
        />
        <Pressable
          style={[appButton.primaryCompact, (sending || !text.trim()) && appButton.disabled]}
          disabled={sending || !text.trim()}
          onPress={sendMessage}
        >
          <Text style={appButton.primaryTextCompact}>{sending ? copy.sending : copy.sendMessage}</Text>
        </Pressable>
        <Pressable
          style={[appButton.secondary, (sending && !recording) && appButton.disabled]}
          disabled={sending && !recording}
          onPress={toggleVoiceNote}
        >
          <Text style={appButton.secondaryText}>{recording ? copy.stopAndSendVoice : copy.recordVoice}</Text>
        </Pressable>
        <Pressable style={[appButton.outline, sending && appButton.disabled]} disabled={sending} onPress={() => void pickAndSendImage()}>
          <Text style={appButton.outlineText}>{copy.sendImage}</Text>
        </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  wrap: { flex: 1, marginTop: -12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, gap: 10 },
  refreshCenter: { textAlign: 'center' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  cachedBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 9,
  },
  cachedBannerText: { color: '#92400e', fontWeight: '700', textAlign: 'center' },
  chatList: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#1e1040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  chatContent: { padding: 12, gap: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 18 },
  bubble: { borderRadius: 10, padding: 10, maxWidth: '90%' },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#dbeafe' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#f5f2ff' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bubbleRole: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  deleteLink: { color: '#b42318', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  bubbleText: { color: '#0f172a', fontWeight: '600', marginTop: 2 },
  playVoiceBtn: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  chatImage: { width: 210, height: 150, borderRadius: 10, marginTop: 6, backgroundColor: '#dbeafe' },
  bubbleTime: { color: '#64748b', fontSize: 11, marginTop: 4 },
  input: {
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
})
