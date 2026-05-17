import { useRef, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../controllers/AuthController'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { api, API_BASE_URL } from '../../models/api'
import { useLanguage } from '../../controllers/LanguageController'
import type { RootStackParamList } from '../../../navigation/types'
import { appButton } from '../../../theme'
import { DisplayComfortToolbar } from '../components/DisplayComfortToolbar'

function scaledText(style: TextStyle | TextStyle[], m: number): TextStyle {
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}

const LOGIN_COPY = {
  en: {
    tagline: 'One secure workspace for families, teachers, and coordinators — track progress and stay connected.',
    dashboard: 'Your dashboard',
    dashboardRest: ' — notes, progress, chat, and reports.',
    unlockTitle: 'What you unlock',
    unlockItems: [
      'Session notes and history in one place',
      'Progress tracking for your child',
      'Chat with your school and therapy team',
      'Reports families can understand',
    ],
    parentSignIn: 'Sign in',
    createAccount: 'Create account',
    schoolAccount: 'Parent account from school',
    signIn: 'Sign in',
    lead: 'Parent mobile access. Enter the same email and password from your school account.',
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    required: 'Email and password are required.',
    signingIn: 'Signing in...',
    signedIn: 'Signed in.',
    loginFailed: 'Login failed',
    continue: 'Continue',
    checking: 'Checking API connection...',
    apiOk: 'API connection OK',
    apiFailed: 'API connection failed',
    test: 'Test connection',
    needAccount: 'Need an account?',
    askSchool: 'Ask the school admin or coordinator to create your parent account on the website.',
    createDisabledTitle: 'Account from school',
    createDisabledBody: 'Parent accounts are created by admin/coordinator from the website.',
    heroTitle: 'Family Login',
    statAccess: 'Access',
    statSecure: 'Secure',
    statTools: 'Tools',
    emailPlaceholder: 'family@example.com',
    apiStatusOk: (db: string) => `API OK (${db})`,
    apiAlertBody: (db: string) => `Base URL: ${API_BASE_URL}\nDB: ${db}`,
    unknownError: 'Unknown error',
    forgotPassword: 'Forgot password?',
    haveResetCode: 'I have a reset code',
  },
  ar: {
    tagline: 'مساحة آمنة للعائلة لمتابعة تقدم الطفل والتواصل مع المدرسة.',
    dashboard: 'لوحة طفلك',
    dashboardRest: ' — ملاحظات، تقدم، محادثة، وتقارير.',
    unlockTitle: 'ماذا تجد هنا',
    unlockItems: ['ملاحظات الطفل في مكان واحد', 'متابعة تقدم طفلك', 'محادثة مع المعلم والفريق', 'تقارير سهلة الفهم للعائلة'],
    parentSignIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    schoolAccount: 'حساب ولي الأمر من المدرسة',
    signIn: 'تسجيل الدخول',
    lead: 'استخدم نفس البريد الإلكتروني وكلمة المرور التي أعطتها لك المدرسة.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور',
    required: 'البريد الإلكتروني وكلمة المرور مطلوبان.',
    signingIn: 'جاري تسجيل الدخول...',
    signedIn: 'تم تسجيل الدخول.',
    loginFailed: 'فشل تسجيل الدخول',
    continue: 'متابعة',
    checking: 'جاري فحص الاتصال...',
    apiOk: 'الاتصال يعمل',
    apiFailed: 'فشل الاتصال',
    test: 'فحص الاتصال',
    needAccount: 'ليس لديك حساب؟',
    askSchool: 'اطلب من مسؤول المدرسة أو المنسق إنشاء حساب ولي الأمر من الموقع.',
    createDisabledTitle: 'الحساب من المدرسة',
    createDisabledBody: 'يتم إنشاء حساب ولي الأمر من الموقع بواسطة الإدارة أو المنسق.',
    heroTitle: 'دخول العائلة',
    statAccess: 'دخول',
    statSecure: 'آمن',
    statTools: 'أدوات',
    emailPlaceholder: 'family@example.com',
    apiStatusOk: (db: string) => `الاتصال يعمل (${db})`,
    apiAlertBody: (db: string) => `الرابط الأساسي: ${API_BASE_URL}\nقاعدة البيانات: ${db}`,
    unknownError: 'خطأ غير معروف',
    forgotPassword: 'نسيت كلمة المرور؟',
    haveResetCode: 'لدي رمز إعادة التعيين',
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

  return (
    <SafeAreaView style={[styles.safe, high && styles.safeHc]}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrapCompact} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.bgBlobTop} />
        <View style={styles.bgBlobBottom} />
        <Image source={require('../../../../assets/icon.png')} style={styles.wallpaperLogo} resizeMode="contain" />
        <View style={[styles.topBar, high && styles.topBarHc]}>
          <View style={styles.logoMini}>
            <Image source={require('../../../../assets/icon.png')} style={styles.logoMiniImage} resizeMode="contain" />
          </View>
          <View style={styles.topBarText}>
            <Text style={[t(styles.appName), isArabic && styles.rtlText]}>Autism School</Text>
            <Text style={[t(styles.appSub), isArabic && styles.rtlText]}>Communication & Learning</Text>
          </View>
        </View>

        <DisplayComfortToolbar
          variant="surface"
          style={high ? { borderColor: '#0f172a', backgroundColor: '#f8fafc' } : undefined}
        />

        <View style={[styles.loginHero, high && styles.loginHeroHc]}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={[t(styles.heroSmall), isArabic && styles.rtlText]}>{copy.schoolAccount}</Text>
          <Text style={[t(styles.heroMainTitle), isArabic && styles.rtlText]}>{copy.heroTitle}</Text>
          <Text style={[t(styles.heroMainText), isArabic && styles.rtlText]}>{copy.lead}</Text>
          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, high && styles.heroStatHc]}>
              <Text style={[t(styles.heroStatNumber)]}>24/7</Text>
              <Text style={[t(styles.heroStatLabel), isArabic && styles.rtlText]}>{copy.statAccess}</Text>
            </View>
            <View style={[styles.heroStat, high && styles.heroStatHc]}>
              <Text style={[t(styles.heroStatNumber)]}>✓</Text>
              <Text style={[t(styles.heroStatLabel), isArabic && styles.rtlText]}>{copy.statSecure}</Text>
            </View>
            <View style={[styles.heroStat, high && styles.heroStatHc]}>
              <Text style={[t(styles.heroStatNumber)]}>3</Text>
              <Text style={[t(styles.heroStatLabel), isArabic && styles.rtlText]}>{copy.statTools}</Text>
            </View>
          </View>
          <View style={[styles.unlockCard, high && styles.unlockCardHc]}>
            <Text style={[t(styles.unlockTitle), isArabic && styles.rtlText]}>{copy.unlockTitle}</Text>
            {copy.unlockItems.map((item) => (
              <Text key={item} style={[t(styles.unlockItem), isArabic && styles.rtlText]}>
                ✓ {item}
              </Text>
            ))}
          </View>
        </View>

        <View style={[styles.loginCard, high && styles.loginCardHc]}>
          <View style={styles.languageSwitchCompact}>
            <Pressable style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => void setLanguage('en')}>
              <Text style={[t(styles.langText), language === 'en' && styles.langTextActive]}>English</Text>
            </Pressable>
            <Pressable style={[styles.langBtn, language === 'ar' && styles.langBtnActive]} onPress={() => void setLanguage('ar')}>
              <Text style={[t(styles.langText), language === 'ar' && styles.langTextActive]}>العربية</Text>
            </Pressable>
          </View>

          <View style={styles.loginHeaderRow}>
            <View>
              <Text style={[t(styles.cardTitle), isArabic && styles.rtlText]}>{copy.parentSignIn}</Text>
              <Text style={[t(styles.cardLeadCompact), isArabic && styles.rtlText]}>{copy.dashboard}{copy.dashboardRest}</Text>
            </View>
            <Pressable
              style={styles.createPill}
              onPress={() => Alert.alert(copy.createDisabledTitle, copy.createDisabledBody)}
            >
              <Text style={t(styles.createPillText)}>{copy.createAccount}</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.email}</Text>
            <View style={styles.inputWrap}>
              <Text style={t(styles.inputIcon)}>@</Text>
              <TextInput
                style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
                placeholder={copy.emailPlaceholder}
                placeholderTextColor="#9188a8"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={[t(styles.label), isArabic && styles.rtlText]}>{copy.password}</Text>
            <View style={styles.inputWrap}>
              <Text style={t(styles.inputIcon)}>*</Text>
              <TextInput
                ref={passwordRef}
                style={[styles.input, t(styles.input), isArabic && styles.rtlInput]}
                placeholder={copy.passwordPlaceholder}
                placeholderTextColor="#9188a8"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                returnKeyType="done"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  if (!submitting) {
                    const e = email.trim()
                    if (!e || !password.trim()) {
                      setError(copy.required)
                      return
                    }
                    setError('')
                    setStatus(copy.signingIn)
                    setSubmitting(true)
                    void login({ email: e, password, role: 'parent' })
                      .then(() => setStatus(copy.signedIn))
                      .catch((e) => {
                        const msg = e instanceof Error ? e.message : copy.unknownError
                        setError(msg)
                        Alert.alert(copy.loginFailed, msg)
                      })
                      .finally(() => setSubmitting(false))
                  }
                }}
              />
            </View>
          </View>

          <View style={[styles.forgotRow, isArabic && styles.forgotRowRtl]}>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
              <Text style={[styles.forgotLink, t(styles.forgotLink), isArabic && styles.rtlText]}>{copy.forgotPassword}</Text>
            </Pressable>
            <Text style={[styles.forgotSep, t(styles.forgotSep)]}> · </Text>
            <Pressable onPress={() => navigation.navigate('ResetPassword', {})} hitSlop={8}>
              <Text style={[styles.forgotLink, t(styles.forgotLink), isArabic && styles.rtlText]}>{copy.haveResetCode}</Text>
            </Pressable>
          </View>

          {status ? <Text style={t(styles.status)}>{status}</Text> : null}
          {error ? <Text style={t(styles.error)}>{error}</Text> : null}

          <Pressable
            style={[{ marginTop: 2 }, appButton.primary, submitting && appButton.disabled]}
            disabled={submitting}
            onPress={async () => {
              const e = email.trim()
              if (!e || !password.trim()) {
                setError(copy.required)
                return
              }
              setError('')
              setStatus(copy.signingIn)
              setSubmitting(true)
              try {
                await login({ email: e, password, role: 'parent' })
                setStatus(copy.signedIn)
              } catch (e) {
                const msg = e instanceof Error ? e.message : copy.unknownError
                setError(msg)
                Alert.alert(copy.loginFailed, msg)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <View style={styles.submitContent}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text style={t(appButton.primaryText)}>{submitting ? copy.signingIn : copy.continue}</Text>
            </View>
          </Pressable>

          <View style={styles.helpBox}>
            <Text style={[t(styles.helpTitle), isArabic && styles.rtlText]}>{copy.needAccount}</Text>
            <Text style={[t(styles.helpText), isArabic && styles.rtlText]}>{copy.askSchool}</Text>
          </View>

          {__DEV__ ? (
            <Pressable
              style={[styles.connectionLink, submitting && appButton.disabled]}
              disabled={submitting}
              onPress={async () => {
                setError('')
                setStatus(copy.checking)
                setSubmitting(true)
                try {
                  const h = await api.health()
                  setStatus(copy.apiStatusOk(h.database))
                  Alert.alert(copy.apiOk, copy.apiAlertBody(h.database))
                } catch (e) {
                  const msg = e instanceof Error ? e.message : `Cannot reach API at ${API_BASE_URL}`
                  setError(msg)
                  Alert.alert(copy.apiFailed, msg)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <Text style={t(styles.connectionLinkText)}>{copy.test}</Text>
            </Pressable>
          ) : null}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2eff9' },
  safeHc: { backgroundColor: '#ffffff' },
  keyboardAvoider: { flex: 1 },
  wrapCompact: { flexGrow: 1, justifyContent: 'center', padding: 18, gap: 16, paddingBottom: 28 },
  bgBlobTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#ebe4f5',
    top: -86,
    right: -90,
    opacity: 0.9,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#dff7f1',
    bottom: 28,
    left: -112,
    opacity: 0.8,
  },
  wallpaperLogo: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignSelf: 'center',
    top: 90,
    opacity: 0.045,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(229,220,251,0.9)',
    padding: 10,
  },
  topBarHc: {
    backgroundColor: '#ffffff',
    borderColor: '#1e293b',
  },
  logoMini: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e6dcff',
    shadowColor: '#6d46d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  logoMiniImage: { width: 42, height: 42, borderRadius: 12 },
  topBarText: { flex: 1 },
  appName: { color: '#21183a', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  appSub: { color: '#736986', fontWeight: '700', marginTop: 2, fontSize: 13 },
  loginHero: {
    backgroundColor: '#211a2e',
    borderRadius: 26,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#4f3b86',
    overflow: 'hidden',
    shadowColor: '#211a2e',
    shadowOpacity: 0.26,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  loginHeroHc: {
    backgroundColor: '#0b1220',
    borderColor: '#e2e8f0',
  },
  heroGlowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(124,77,255,0.5)',
    top: -62,
    right: -48,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(20,184,166,0.28)',
    bottom: -38,
    left: -32,
  },
  heroSmall: { color: '#d8ccff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroMainTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.7 },
  heroMainText: { color: '#eee8ff', lineHeight: 22, fontWeight: '700', fontSize: 15 },
  heroStatsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroStatHc: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: '#f8fafc',
  },
  heroStatNumber: { color: '#fff', fontSize: 17, fontWeight: '900' },
  heroStatLabel: { color: '#d8ccff', fontSize: 11, fontWeight: '800', marginTop: 2 },
  unlockCard: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    gap: 4,
  },
  unlockCardHc: {
    borderColor: '#f1f5f9',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  unlockTitle: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  unlockItem: { color: '#efe9ff', lineHeight: 19, fontWeight: '600' },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 20,
    gap: 12,
    shadowColor: '#2d195a',
    shadowOpacity: 0.13,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  loginCardHc: {
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  languageSwitchCompact: {
    flexDirection: 'row',
    backgroundColor: '#f4f1fb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 4,
    gap: 4,
  },
  langBtn: { flex: 1, borderRadius: 10, padding: 9, alignItems: 'center' },
  langBtnActive: { backgroundColor: '#211a2e' },
  langText: { color: '#534c62', fontWeight: '800', fontSize: 14 },
  langTextActive: { color: '#fff' },
  loginHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardLeadCompact: { color: '#6d6485', marginTop: 3, maxWidth: 210, lineHeight: 19, fontWeight: '600', fontSize: 14 },
  createPill: { backgroundColor: '#f8f5ff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#dfd6ee' },
  createPillText: { color: '#5f3dc9', fontWeight: '900', fontSize: 12 },
  connectionLink: { alignItems: 'center', paddingVertical: 4 },
  connectionLinkText: { color: '#6d46d4', fontWeight: '800', textDecorationLine: 'underline', fontSize: 14 },
  cardTitle: { color: '#17131f', fontSize: 23, fontWeight: '800', marginTop: 2, letterSpacing: -0.25 },
  field: { gap: 6 },
  forgotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 4,
  },
  forgotRowRtl: { flexDirection: 'row-reverse' },
  forgotLink: { color: '#6d46d4', fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },
  forgotSep: { color: '#9188a8', fontSize: 13, fontWeight: '600' },
  label: { color: '#534c62', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfd6ee',
    borderRadius: 16,
    backgroundColor: '#fdfcff',
    paddingHorizontal: 12,
  },
  inputIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f4f1fb',
    color: '#6d46d4',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 26,
    marginRight: 8,
  },
  input: { flex: 1, paddingVertical: 13, color: '#17131f', fontSize: 16 },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  submitContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  status: { color: '#17131f', fontWeight: '600', fontSize: 14 },
  error: { color: '#b91c1c', fontWeight: '600', fontSize: 14 },
  helpBox: { backgroundColor: '#faf8ff', borderRadius: 14, borderWidth: 1, borderColor: '#ece4ff', padding: 12, gap: 4 },
  helpTitle: { color: '#17131f', fontWeight: '800', fontSize: 15 },
  helpText: { color: '#534c62', lineHeight: 19, fontSize: 14 },
  link: { marginTop: 8, color: '#6d46d4', fontWeight: '800', textAlign: 'center' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
})
