import { useRef, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../controllers/AuthController'
import { useDisplayComfort } from '../../controllers/DisplayComfortContextController'
import { useLanguage } from '../../controllers/LanguageController'
import type { RootStackParamList } from '../../../navigation/types'
import { appButton } from '../../../theme'
import { colors } from '../../../theme/colors'
import { AuthAccountTabs } from '../components/AuthAccountTabs'
import { AuthLoginWallpaper } from '../components/AuthLoginWallpaper'
import { PasswordField } from '../components/PasswordField'
import { emailFieldError } from '../../../utils/fieldValidation'

function scaledText(style: TextStyle | TextStyle[], m: number): TextStyle {
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}

const LOGIN_COPY = {
  en: {
    productTitle: 'Autism School Platform',
    stepTitle: 'Sign in',
    lead: 'Parent mobile access. Use the email and password from your school.',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'Your password',
    required: 'Email and password are required.',
    emailRequired: 'Email is required.',
    invalidEmail: 'Enter a valid email address (e.g. you@example.com).',
    logIn: 'Log in',
    signingIn: 'Signing in…',
    signedIn: 'Signed in.',
    loginFailed: 'Login failed',
    forgotPassword: 'Forgot password?',
    signInTab: 'Sign in',
    createAccountTab: 'Create account',
    requestFamilyAccount: 'Request family account',
    requestFamilyHint: 'New parent? Submit email and password for School Admin approval.',
    unknownError: 'Unknown error',
  },
  ar: {
    productTitle: 'منصة مدرسة التوحد',
    stepTitle: 'تسجيل الدخول',
    lead: 'دخول العائلة. استخدم البريد وكلمة المرور من المدرسة.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'كلمة المرور',
    required: 'البريد الإلكتروني وكلمة المرور مطلوبان.',
    emailRequired: 'البريد الإلكتروني مطلوب.',
    invalidEmail: 'أدخل بريدًا إلكترونيًا صالحًا (مثل you@example.com).',
    logIn: 'تسجيل الدخول',
    signingIn: 'جاري تسجيل الدخول…',
    signedIn: 'تم تسجيل الدخول.',
    loginFailed: 'فشل تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    signInTab: 'تسجيل الدخول',
    createAccountTab: 'إنشاء حساب',
    requestFamilyAccount: 'طلب حساب عائلة',
    requestFamilyHint: 'ولي أمر جديد؟ أرسل البريد وكلمة المرور لموافقة مدير المدرسة.',
    unknownError: 'خطأ غير معروف',
  },
}

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { login } = useAuth()
  const { language, setLanguage, isArabic } = useLanguage()
  const { prefs, textScale: m } = useDisplayComfort()
  const high = prefs.contrast === 'high'
  const t = useMemo(() => (style: TextStyle | TextStyle[]) => scaledText(style, m), [m])
  const copy = LOGIN_COPY[language]
  const passwordRef = useRef<TextInput>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [emailTouched, setEmailTouched] = useState(false)

  const emailInlineError = useMemo(() => {
    if (!emailTouched) return ''
    const err = emailFieldError(email)
    if (!err) return ''
    if (err === 'Email is required.') return copy.emailRequired
    return copy.invalidEmail
  }, [email, emailTouched, copy.emailRequired, copy.invalidEmail])

  async function handleLogin() {
    setEmailTouched(true)
    const e = email.trim()
    const emailErr = emailFieldError(email)
    if (emailErr) {
      setError(emailErr === 'Email is required.' ? copy.emailRequired : copy.invalidEmail)
      return
    }
    if (!password.trim()) {
      setError(copy.required)
      return
    }
    setError('')
    setStatus(copy.signingIn)
    setSubmitting(true)
    try {
      await login({ email: e, password, role: 'parent' })
      setStatus(copy.signedIn)
    } catch (err) {
      const msg = err instanceof Error ? err.message : copy.unknownError
      setError(msg)
      Alert.alert(copy.loginFailed, msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, high && styles.safeHc]}>
      {!high ? <AuthLoginWallpaper /> : null}
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shell}>
            <View style={styles.header}>
              <Image source={require('../../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[t(styles.productTitle), isArabic && styles.rtlText]}>{copy.productTitle}</Text>
            </View>

            <View style={styles.langRow}>
              <Pressable
                style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                onPress={() => void setLanguage('en')}
              >
                <Text style={[t(styles.langText), language === 'en' && styles.langTextActive]}>EN</Text>
              </Pressable>
              <Pressable
                style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
                onPress={() => void setLanguage('ar')}
              >
                <Text style={[t(styles.langText), language === 'ar' && styles.langTextActive]}>AR</Text>
              </Pressable>
            </View>

            <AuthAccountTabs
              active="login"
              signInLabel={copy.signInTab}
              createAccountLabel={copy.createAccountTab}
              onSignIn={() => {}}
              onCreateAccount={() => navigation.navigate('Register')}
              textStyle={t}
              isArabic={isArabic}
            />

            <View style={[styles.card, high && styles.cardHc]}>
              <Text style={[t(styles.stepTitle), isArabic && styles.rtlText]}>{copy.stepTitle}</Text>
              <Text style={[t(styles.lead), isArabic && styles.rtlText]}>{copy.lead}</Text>

              <View style={styles.field}>
                <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.email}</Text>
                <TextInput
                  style={[styles.input, isArabic && styles.rtlInput]}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setEmailTouched(true)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {emailInlineError ? (
                  <Text style={[t(styles.fieldError), isArabic && styles.rtlText]} accessibilityRole="alert">
                    {emailInlineError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.password}</Text>
                <PasswordField
                  ref={passwordRef}
                  inputStyle={[styles.input, isArabic && styles.rtlInput]}
                  placeholder={copy.passwordPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  returnKeyType="done"
                  textContentType="password"
                  value={password}
                  onChangeText={setPassword}
                  rtl={isArabic}
                  onSubmitEditing={() => {
                    if (!submitting) void handleLogin()
                  }}
                />
              </View>

              <Pressable
                style={[appButton.primary, submitting && appButton.disabled]}
                disabled={submitting}
                onPress={() => void handleLogin()}
              >
                <View style={styles.submitContent}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
                  <Text style={t(appButton.primaryText)}>{submitting ? copy.signingIn : copy.logIn}</Text>
                </View>
              </Pressable>

              <Pressable style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
                <Text style={[t(styles.forgotLink), isArabic && styles.rtlText]}>{copy.forgotPassword}</Text>
              </Pressable>

              <View style={styles.requestFamilyBlock}>
                <Text style={[t(styles.requestFamilyHint), isArabic && styles.rtlText]}>{copy.requestFamilyHint}</Text>
                <Pressable
                  style={[appButton.secondary, styles.requestFamilyBtn]}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={[t(appButton.secondaryText), isArabic && styles.rtlText]}>
                    {copy.requestFamilyAccount}
                  </Text>
                </Pressable>
              </View>

              {status ? <Text style={t(styles.status)}>{status}</Text> : null}
              {error ? <Text style={t(styles.error)}>{error}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  safeHc: { backgroundColor: colors.surface },
  keyboardAvoider: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  shell: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 12,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  productTitle: {
    color: colors.textTitle,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    backgroundColor: colors.surface,
  },
  langBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  langTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    padding: 18,
    gap: 12,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardHc: {
    borderColor: colors.textTitle,
    borderWidth: 2,
  },
  stepTitle: {
    color: colors.textTitle,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  lead: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
    marginBottom: 4,
  },
  field: { gap: 6 },
  label: {
    color: colors.textTitle,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.92,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textTitle,
    fontSize: 16,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  forgotRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  forgotLink: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  requestFamilyBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outlineBorder,
    gap: 10,
  },
  requestFamilyHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  requestFamilyBtn: {
    alignSelf: 'stretch',
  },
  status: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  fieldError: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
})
