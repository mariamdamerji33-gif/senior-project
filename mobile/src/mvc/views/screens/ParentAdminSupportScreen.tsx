import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { InlineLoadError } from '../components/InlineLoadError'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { appButton } from '../../../theme'
import { api, API_BASE_URL } from '../../models/api'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentAdminSupport'>

export function ParentAdminSupportScreen({ route, navigation }: Props) {
  const { token, user } = useAuth()
  const { language, isArabic } = useLanguage()
  const { childId, childName } = route.params
  const [subject, setSubject] = useState('Parent mobile support')
  const [message, setMessage] = useState('')
  const [healthStatus, setHealthStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const isEn = language === 'en'
  const copy = {
    eyebrow: isEn ? 'Help' : 'مساعدة',
    title: isEn ? 'Admin support' : 'دعم الإدارة',
    subtitle: isEn ? 'Family account help & troubleshooting' : 'مساعدة حساب العائلة وحل المشاكل',
    backToday: isEn ? '← Today' : '← اليوم',
    checking: isEn ? 'Checking...' : 'جاري الفحص...',
    apiOk: (db: string) =>
      isEn ? `API: ok | DB: ${db} | URL: ${API_BASE_URL}` : `الخادم: يعمل | قاعدة البيانات: ${db} | الرابط: ${API_BASE_URL}`,
    healthFailed: isEn ? 'Health check failed' : 'فشل فحص النظام',
    missingTitle: isEn ? 'Missing details' : 'بيانات ناقصة',
    missingBody: isEn ? 'Please write a subject and message.' : 'يرجى كتابة العنوان والرسالة.',
    sentTitle: isEn ? 'Sent' : 'تم الإرسال',
    sentBody: isEn ? 'Your support request was sent to school admin/coordinator.' : 'تم إرسال طلب الدعم إلى إدارة المدرسة/المنسق.',
    unknownError: isEn ? 'Unknown error' : 'خطأ غير معروف',
    accountContext: isEn ? 'Account context' : 'بيانات الحساب',
    parent: isEn ? 'Parent' : 'ولي الأمر',
    signedInUser: isEn ? 'Signed in user' : 'المستخدم الحالي',
    student: isEn ? 'Student' : 'الطفل',
    selectedStudent: isEn ? 'Selected student' : 'الطفل المختار',
    api: 'API',
    systemHealth: isEn ? 'System health' : 'حالة النظام',
    tapToCheck: isEn ? 'Tap below to check backend and database status.' : 'اضغط أدناه لفحص الخادم وقاعدة البيانات.',
    checkSystem: isEn ? 'Check system health' : 'فحص حالة النظام',
    sendSupport: isEn ? 'Send support request' : 'إرسال طلب دعم',
    subjectPlaceholder: isEn ? 'Subject' : 'العنوان',
    messagePlaceholder: isEn ? 'Describe the issue or request...' : 'اشرح المشكلة أو الطلب...',
    sendFailedTitle: isEn ? 'Could not send request' : 'تعذر إرسال الطلب',
    sending: isEn ? 'Sending...' : 'جاري الإرسال...',
    sendToAdmin: isEn ? 'Send to admin' : 'إرسال للإدارة',
  }

  const checkHealth = async () => {
    setHealthStatus(copy.checking)
    try {
      const h = await api.health()
      setHealthStatus(copy.apiOk(h.database))
    } catch (e) {
      setHealthStatus(e instanceof Error ? e.message : copy.healthFailed)
    }
  }

  const sendRequest = async () => {
    if (!token) return
    if (subject.trim().length < 3 || message.trim().length < 5) {
      Alert.alert(copy.missingTitle, copy.missingBody)
      return
    }

    setSubmitting(true)
    setSendError(null)
    try {
      await api.sendSupportRequest(token, {
        subject: subject.trim(),
        message: message.trim(),
        childId,
      })
      setMessage('')
      Alert.alert(copy.sentTitle, copy.sentBody)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : copy.unknownError)
    } finally {
      setSubmitting(false)
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
      keyboardShouldPersistTaps="handled"
    >
      <ScreenCard>
        <Text style={[styles.cardHeading, isArabic && styles.rtl]}>{copy.accountContext}</Text>
        <Text style={[styles.line, isArabic && styles.rtl]}>{copy.parent}: {user?.email || copy.signedInUser}</Text>
        <Text style={[styles.line, isArabic && styles.rtl]}>{copy.student}: {childName || copy.selectedStudent}</Text>
        <Text style={[styles.lineMuted, isArabic && styles.rtl]}>{copy.api}: {API_BASE_URL}</Text>
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.cardHeading, isArabic && styles.rtl]}>{copy.systemHealth}</Text>
        <Text style={[styles.line, isArabic && styles.rtl]}>{healthStatus || copy.tapToCheck}</Text>
        <Pressable style={appButton.secondary} onPress={() => void checkHealth()}>
          <Text style={[appButton.secondaryText, styles.secondaryBtnText]}>{copy.checkSystem}</Text>
        </Pressable>
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.cardHeading, isArabic && styles.rtl]}>{copy.sendSupport}</Text>
        <TextInput
          style={[styles.input, isArabic && styles.rtl]}
          value={subject}
          onChangeText={setSubject}
          placeholder={copy.subjectPlaceholder}
          placeholderTextColor="#9c94b0"
          textAlign={isArabic ? 'right' : 'left'}
        />
        <TextInput
          style={[styles.input, styles.messageInput, isArabic && styles.rtl]}
          value={message}
          onChangeText={setMessage}
          placeholder={copy.messagePlaceholder}
          placeholderTextColor="#9c94b0"
          multiline
          textAlign={isArabic ? 'right' : 'left'}
        />
        {sendError ? <InlineLoadError title={copy.sendFailedTitle} message={sendError} rtl={isArabic} /> : null}
        <Pressable style={[appButton.primary, submitting && appButton.disabled]} disabled={submitting} onPress={() => void sendRequest()}>
          <Text style={[appButton.primaryText, styles.sendText]}>{submitting ? copy.sending : copy.sendToAdmin}</Text>
        </Pressable>
      </ScreenCard>
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  cardHeading: { color: '#2c2144', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  line: { color: '#5f5573', lineHeight: 21, fontWeight: '600' },
  lineMuted: { color: '#7c7392', lineHeight: 20, fontSize: 12, marginTop: 4 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  input: {
    borderWidth: 1,
    borderColor: '#d8cffa',
    borderRadius: 12,
    backgroundColor: '#faf8ff',
    padding: 14,
    color: '#2c2144',
    fontWeight: '600',
  },
  messageInput: { minHeight: 110, textAlignVertical: 'top' },
  secondaryBtnText: { textAlign: 'center' },
  sendText: { textAlign: 'center' },
})
