import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { useLanguage } from '../../controllers/LanguageController'
import { api } from '../../models/api'
import type { RootStackParamList } from '../../../navigation/types'
import { appButton } from '../../../theme'
import { DisplayComfortToolbar } from '../components/DisplayComfortToolbar'
import { REGISTER_PASSWORD_HINT } from '../../../utils/passwordRules'

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>

const COPY = {
  en: {
    title: 'Forgot password?',
    lead: 'Enter the email for your parent account. If it is registered, we will send reset steps when email is enabled.',
    email: 'Email',
    placeholder: 'family@example.com',
    send: 'Send reset instructions',
    sending: 'Sending…',
    back: '← Back to sign in',
    needEmail: 'Enter a valid email.',
    failed: 'Request failed',
    devContinue: 'Set new password (dev)',
  },
  ar: {
    title: 'نسيت كلمة المرور؟',
    lead: 'أدخل البريد المرتبط بحساب ولي الأمر. إذا كان مسجّلاً، ستصلك خطوات إعادة التعيين عند تفعيل البريد.',
    email: 'البريد الإلكتروني',
    placeholder: 'family@example.com',
    send: 'إرسال تعليمات إعادة التعيين',
    sending: 'جاري الإرسال…',
    back: '← العودة لتسجيل الدخول',
    needEmail: 'يرجى إدخال بريد صالح.',
    failed: 'فشل الطلب',
    devContinue: 'تعيين كلمة جديدة (تطوير)',
  },
} as const

function scaledText(style: TextStyle | TextStyle[], m: number): TextStyle {
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { language, isArabic } = useLanguage()
  const { prefs, textScale: m } = useDisplayComfort()
  const high = prefs.contrast === 'high'
  const t = useMemo(() => (s: TextStyle | TextStyle[]) => scaledText(s, m), [m])
  const copy = COPY[language]

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{
    message: string
    devNotice?: string
    devResetToken?: string
  } | null>(null)

  const canSubmit = email.trim().length > 4 && !busy

  return (
    <SafeAreaView style={[styles.safe, high && styles.safeHc]}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DisplayComfortToolbar variant="surface" style={high ? { borderColor: '#0f172a', backgroundColor: '#f8fafc' } : undefined} />

          <View style={[styles.card, high && styles.cardHc]}>
            <Text style={[styles.title, t(styles.title), isArabic && styles.rtl]}>{copy.title}</Text>
            <Text style={[styles.lead, t(styles.lead), isArabic && styles.rtl]}>{copy.lead}</Text>

            {done ? (
              <>
                <Text style={[styles.doneMsg, t(styles.doneMsg), isArabic && styles.rtl]}>{done.message}</Text>
                {done.devNotice ? (
                  <View style={styles.devBox}>
                    <Text style={[styles.devTitle, t(styles.devTitle)]}>{done.devNotice}</Text>
                    {done.devResetToken ? (
                      <Text selectable style={[styles.devToken, t(styles.devToken)]}>
                        {done.devResetToken}
                      </Text>
                    ) : null}
                    {__DEV__ && done.devResetToken ? (
                      <Pressable
                        style={[appButton.primary, { marginTop: 12 }]}
                        onPress={() => navigation.replace('ResetPassword', { token: done.devResetToken })}
                      >
                        <Text style={scaledText(appButton.primaryText, m)}>{copy.devContinue}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <Pressable style={styles.backLink} onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.backLinkText, t(styles.backLinkText), isArabic && styles.rtl]}>{copy.back}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.label, t(styles.label), isArabic && styles.rtl]}>{copy.email}</Text>
                <TextInput
                  style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={copy.placeholder}
                  placeholderTextColor="#9188a8"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!busy}
                />
                {err ? (
                  <Text style={[styles.err, t(styles.err), isArabic && styles.rtl]}>{err}</Text>
                ) : null}
                <Pressable
                  style={[appButton.primary, (!canSubmit || busy) && appButton.disabled, { marginTop: 12 }]}
                  disabled={!canSubmit || busy}
                  onPress={() => {
                    const e = email.trim()
                    if (e.length < 5) {
                      setErr(copy.needEmail)
                      return
                    }
                    setErr('')
                    setBusy(true)
                    void (async () => {
                      try {
                        const res = await api.forgotPassword(e)
                        setDone({
                          message:
                            res.message ||
                            'If this email is registered, check your inbox for next steps.',
                          devNotice: res.devNotice,
                          devResetToken: res.devResetToken,
                        })
                      } catch (ex: unknown) {
                        const msg = ex instanceof Error ? ex.message : copy.failed
                        setErr(msg)
                        Alert.alert(copy.failed, msg)
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  <Text style={scaledText(appButton.primaryText, m)}>{busy ? copy.sending : copy.send}</Text>
                </Pressable>
                <Pressable style={styles.backLink} onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.backLinkText, t(styles.backLinkText), isArabic && styles.rtl]}>{copy.back}</Text>
                </Pressable>
              </>
            )}
          </View>

          <Text style={[styles.hint, t(styles.hint), isArabic && styles.rtl]}>{REGISTER_PASSWORD_HINT}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2eff9' },
  safeHc: { backgroundColor: '#ffffff' },
  keyboardAvoider: { flex: 1 },
  wrap: { flexGrow: 1, padding: 18, paddingBottom: 28, gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 18,
    gap: 10,
  },
  cardHc: { borderColor: '#0f172a', borderWidth: 2 },
  title: { color: '#17131f', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  lead: { color: '#534c62', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  label: { color: '#534c62', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    borderWidth: 1,
    borderColor: '#dfd6ee',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#17131f',
    backgroundColor: '#fdfcff',
  },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  err: { color: '#b91c1c', fontWeight: '700', fontSize: 14 },
  doneMsg: { color: '#17131f', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  devBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  devTitle: { color: '#92400e', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  devToken: { marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: '#1c1917' },
  backLink: { marginTop: 8, paddingVertical: 6 },
  backLinkText: { color: '#6d46d4', fontWeight: '800', fontSize: 15 },
  hint: { color: '#6d6485', fontSize: 12, lineHeight: 18, fontWeight: '600' },
})
