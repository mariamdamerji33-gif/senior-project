import { useEffect, useMemo, useState } from 'react'
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
import { meetsRegisterPasswordRules, REGISTER_PASSWORD_HINT } from '../../../utils/passwordRules'

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>

const COPY = {
  en: {
    title: 'New password',
    lead: 'Paste the reset token from your email (or from the developer notice). Then choose a new password.',
    token: 'Reset token',
    newPw: 'New password',
    confirm: 'Confirm password',
    submit: 'Update password',
    working: 'Saving…',
    back: '← Back to sign in',
    mismatch: 'Passwords do not match.',
    policy: 'Password must be 8–128 characters with a letter and a number.',
    failed: 'Reset failed',
    successTitle: 'Password updated',
    successBody: 'You can sign in with your new password.',
  },
  ar: {
    title: 'كلمة مرور جديدة',
    lead: 'الصق الرمز من بريدك الإلكتروني (أو من رسالة المطوّر). ثم اختر كلمة مرور جديدة.',
    token: 'رمز إعادة التعيين',
    newPw: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور',
    submit: 'تحديث كلمة المرور',
    working: 'جاري الحفظ…',
    back: '← العودة لتسجيل الدخول',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    policy: 'يجب أن تكون 8–128 حرفاً مع حرف ورقم.',
    failed: 'فشل إعادة التعيين',
    successTitle: 'تم تحديث كلمة المرور',
    successBody: 'يمكنك تسجيل الدخول بكلمة المرور الجديدة.',
  },
} as const

function scaledText(style: TextStyle | TextStyle[], m: number): TextStyle {
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { language, isArabic } = useLanguage()
  const { prefs, textScale: m } = useDisplayComfort()
  const high = prefs.contrast === 'high'
  const t = useMemo(() => (s: TextStyle | TextStyle[]) => scaledText(s, m), [m])
  const copy = COPY[language]

  const [token, setToken] = useState(route.params?.token?.trim() || '')
  useEffect(() => {
    const p = route.params?.token?.trim()
    if (p) setToken(p)
  }, [route.params?.token])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const canSubmit =
    token.trim().length > 0 &&
    meetsRegisterPasswordRules(password) &&
    password === confirm &&
    !busy

  return (
    <SafeAreaView style={[styles.safe, high && styles.safeHc]}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DisplayComfortToolbar variant="surface" style={high ? { borderColor: '#0f172a', backgroundColor: '#f8fafc' } : undefined} />

          <View style={[styles.card, high && styles.cardHc]}>
            <Text style={[styles.title, t(styles.title), isArabic && styles.rtl]}>{copy.title}</Text>
            <Text style={[styles.lead, t(styles.lead), isArabic && styles.rtl]}>{copy.lead}</Text>

            <Text style={[styles.label, t(styles.label), isArabic && styles.rtl]}>{copy.token}</Text>
            <TextInput
              style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
              value={token}
              onChangeText={setToken}
              placeholder="…"
              placeholderTextColor="#9188a8"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />

            <Text style={[styles.label, t(styles.label), isArabic && styles.rtl, { marginTop: 8 }]}>{copy.newPw}</Text>
            <TextInput
              style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9188a8"
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            <Text style={[styles.label, t(styles.label), isArabic && styles.rtl, { marginTop: 8 }]}>{copy.confirm}</Text>
            <TextInput
              style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor="#9188a8"
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            <Text style={[styles.hint, t(styles.hint), isArabic && styles.rtl]}>{REGISTER_PASSWORD_HINT}</Text>

            {err ? <Text style={[styles.err, t(styles.err), isArabic && styles.rtl]}>{err}</Text> : null}

            <Pressable
              style={[appButton.primary, !canSubmit && appButton.disabled, { marginTop: 12 }]}
              disabled={!canSubmit}
              onPress={() => {
                if (password !== confirm) {
                  setErr(copy.mismatch)
                  return
                }
                if (!meetsRegisterPasswordRules(password)) {
                  setErr(copy.policy)
                  return
                }
                setErr('')
                setBusy(true)
                void (async () => {
                  try {
                    const res = await api.resetPassword({ token: token.trim(), password })
                    Alert.alert(res.message || copy.successTitle, copy.successBody, [
                      { text: 'OK', onPress: () => navigation.replace('Login') },
                    ])
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
              <Text style={scaledText(appButton.primaryText, m)}>{busy ? copy.working : copy.submit}</Text>
            </Pressable>

            <Pressable style={styles.backLink} onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.backLinkText, t(styles.backLinkText), isArabic && styles.rtl]}>{copy.back}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f2ff' },
  safeHc: { backgroundColor: '#ffffff' },
  keyboardAvoider: { flex: 1 },
  wrap: { flexGrow: 1, padding: 18, paddingBottom: 28, gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5dcfb',
    padding: 18,
    gap: 8,
  },
  cardHc: { borderColor: '#0f172a', borderWidth: 2 },
  title: { color: '#17131f', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  lead: { color: '#534c62', fontSize: 14, lineHeight: 21, fontWeight: '600', marginBottom: 4 },
  label: { color: '#534c62', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5dcfb',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#17131f',
    backgroundColor: '#fdfcff',
  },
  hint: { color: '#6d6485', fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  err: { color: '#b42318', fontWeight: '700', fontSize: 14, marginTop: 6 },
  backLink: { marginTop: 8, paddingVertical: 6 },
  backLinkText: { color: '#6b3df0', fontWeight: '800', fontSize: 15 },
})
