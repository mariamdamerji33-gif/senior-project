import { useMemo, useRef, useState } from 'react'
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useDisplayComfort } from '../../controllers/DisplayComfortContextController'
import { useLanguage } from '../../controllers/LanguageController'
import { api } from '../../models/api'
import type { RootStackParamList } from '../../../navigation/types'
import { appButton } from '../../../theme'
import { colors } from '../../../theme/colors'
import { emailFieldError, isValidEmail } from '../../../utils/fieldValidation'
import { meetsRegisterPasswordRules, REGISTER_PASSWORD_HINT } from '../../../utils/passwordRules'
import { AuthAccountTabs } from '../components/AuthAccountTabs'
import { AuthLoginWallpaper } from '../components/AuthLoginWallpaper'
import { PasswordField } from '../components/PasswordField'

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>

function scaledText(style: TextStyle | TextStyle[], m: number): TextStyle {
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}

const COPY = {
  en: {
    productTitle: 'Autism School Platform',
    stepTitle: 'Create account',
    lead:
      'Enter your email and password to request a family (parent) account. A School Admin must approve your request before you can sign in to this app.',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '8+ characters, letter and number',
    submit: 'Submit request',
    submitting: 'Submitting…',
    goSignIn: 'Back to sign in',
    pendingSuccess:
      'Your request was sent. A School Admin will review it on the website. You can sign in here after approval.',
    done: 'OK',
    failed: 'Request failed',
    unknownError: 'Unknown error',
    signInTab: 'Sign in',
    createAccountTab: 'Create account',
    needFields: 'Enter your name, email, and password.',
    emailRequired: 'Email is required.',
    invalidEmail: 'Enter a valid email address (e.g. you@example.com).',
    badPassword: 'Password must be 8+ characters with at least one letter and one number.',
  },
  ar: {
    productTitle: 'منصة مدرسة التوحد',
    stepTitle: 'إنشاء حساب',
    lead:
      'أدخل بريدك وكلمة المرور لطلب حساب عائلة (ولي أمر). يجب أن يوافق مدير المدرسة قبل تسجيل الدخول في هذا التطبيق.',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    namePlaceholder: 'اسمك',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '8+ أحرف، حرف ورقم',
    submit: 'إرسال الطلب',
    submitting: 'جاري الإرسال…',
    goSignIn: 'العودة لتسجيل الدخول',
    pendingSuccess:
      'تم إرسال طلبك. سيراجعه مدير المدرسة من الموقع. يمكنك تسجيل الدخول هنا بعد الموافقة.',
    done: 'حسناً',
    failed: 'فشل الطلب',
    unknownError: 'خطأ غير معروف',
    signInTab: 'تسجيل الدخول',
    createAccountTab: 'إنشاء حساب',
    needFields: 'أدخل الاسم والبريد وكلمة المرور.',
    emailRequired: 'البريد الإلكتروني مطلوب.',
    invalidEmail: 'أدخل بريدًا إلكترونيًا صالحًا (مثل you@example.com).',
    badPassword: 'كلمة المرور: 8 أحرف على الأقل مع حرف ورقم.',
  },
} as const

export function RegisterScreen({ navigation }: Props) {
  const { language, setLanguage, isArabic } = useLanguage()
  const { prefs, textScale: m } = useDisplayComfort()
  const high = prefs.contrast === 'high'
  const t = useMemo(() => (style: TextStyle | TextStyle[]) => scaledText(style, m), [m])
  const copy = COPY[language]

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      isValidEmail(email) &&
      meetsRegisterPasswordRules(password) &&
      !submitting &&
      !success,
    [name, email, password, submitting, success],
  )

  const emailInlineError = useMemo(() => {
    if (!emailTouched) return ''
    const err = emailFieldError(email)
    if (!err) return ''
    if (err === 'Email is required.') return copy.emailRequired
    return copy.invalidEmail
  }, [email, emailTouched, copy.emailRequired, copy.invalidEmail])

  async function handleSubmit() {
    setEmailTouched(true)
    const nm = name.trim()
    const em = email.trim()
    const emailErr = emailFieldError(email)
    if (!nm || !em || !password.trim()) {
      setError(copy.needFields)
      return
    }
    if (emailErr) {
      setError(emailErr === 'Email is required.' ? copy.emailRequired : copy.invalidEmail)
      return
    }
    if (!meetsRegisterPasswordRules(password)) {
      setError(copy.badPassword)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await api.registerRequest({
        name: nm,
        email: em,
        password,
        requestedRole: 'parent',
        registrationSource: 'mobile',
      })
      setSuccess(res.message || copy.pendingSuccess)
      setPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : copy.unknownError
      setError(msg)
      Alert.alert(copy.failed, msg)
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
              active="register"
              signInLabel={copy.signInTab}
              createAccountLabel={copy.createAccountTab}
              onSignIn={() => navigation.navigate('Login')}
              onCreateAccount={() => {}}
              textStyle={t}
              isArabic={isArabic}
            />

            <View style={[styles.card, high && styles.cardHc]}>
              <Text style={[t(styles.stepTitle), isArabic && styles.rtlText]}>{copy.stepTitle}</Text>
              <Text style={[t(styles.lead), isArabic && styles.rtlText]}>{copy.lead}</Text>

              {success ? (
                <View style={styles.successBox}>
                  <Text style={[t(styles.successText), isArabic && styles.rtlText]}>{success}</Text>
                  <Pressable style={[appButton.primary, { marginTop: 8 }]} onPress={() => navigation.navigate('Login')}>
                    <Text style={t(appButton.primaryText)}>{copy.done}</Text>
                  </Pressable>
                  <Pressable style={[appButton.outline, { marginTop: 8 }]} onPress={() => navigation.navigate('Login')}>
                    <Text style={t(appButton.outlineText)}>{copy.goSignIn}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.fullName}</Text>
                    <TextInput
                      style={[styles.input, isArabic && styles.rtlInput]}
                      placeholder={copy.namePlaceholder}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      autoComplete="name"
                      value={name}
                      onChangeText={setName}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      editable={!submitting}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.email}</Text>
                    <TextInput
                      ref={emailRef}
                      style={[styles.input, isArabic && styles.rtlInput]}
                      placeholder={copy.emailPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      onBlur={() => setEmailTouched(true)}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      editable={!submitting}
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
                      autoComplete="new-password"
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="done"
                      rtl={isArabic}
                      onSubmitEditing={() => {
                        if (canSubmit) void handleSubmit()
                      }}
                      editable={!submitting}
                    />
                  </View>

                  <Text style={[t(styles.hint), isArabic && styles.rtlText]}>{REGISTER_PASSWORD_HINT}</Text>

                  {error ? <Text style={t(styles.error)}>{error}</Text> : null}

                  <Pressable
                    style={[appButton.primary, (!canSubmit || submitting) && appButton.disabled]}
                    disabled={!canSubmit || submitting}
                    onPress={() => void handleSubmit()}
                  >
                    <View style={styles.submitContent}>
                      {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
                      <Text style={t(appButton.primaryText)}>{submitting ? copy.submitting : copy.submit}</Text>
                    </View>
                  </Pressable>
                </>
              )}
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
  langTextActive: { color: '#fff' },
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
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  successBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    padding: 12,
    gap: 8,
  },
  successText: {
    color: colors.textTitle,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
})
