import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { DisplayComfortToolbar } from '../components/DisplayComfortToolbar'
import { useConfirmDialog } from '../components/useConfirmDialog'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { ProfileAvatarImage } from '../components/ProfileAvatarImage'

/**
 * Family/parent: profile is view-only. Phone, birthday, and photo are set by the school coordinator on the website.
 * (Backend also returns 403 if a client tries `/api/auth/profile` or profile-photo as a parent.)
 */
export function ParentAccountProfileScreen({ navigation }: DrawerScreenProps<ParentDrawerParamList, 'ParentAccountProfile'>) {
  const { user, refreshUser, logout } = useAuth()
  const { language, isArabic } = useLanguage()
  const { confirm, confirmDialog } = useConfirmDialog()
  const isEn = language === 'en'
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setRefreshError(null)
        try {
          await refreshUser()
        } catch (e: unknown) {
          setRefreshError(e instanceof Error ? e.message : isEn ? 'Could not refresh profile.' : 'تعذر تحديث الملف.')
        }
      })()
    }, [refreshUser, isEn]),
  )

  async function onPullRefresh() {
    setPullRefreshing(true)
    setRefreshError(null)
    try {
      await refreshUser()
    } catch (e: unknown) {
      setRefreshError(e instanceof Error ? e.message : isEn ? 'Could not refresh profile.' : 'تعذر تحديث الملف.')
    } finally {
      setPullRefreshing(false)
    }
  }

  const back = isEn ? '← Today' : '← اليوم'
  const copy = {
    eyebrow: isEn ? 'Account' : 'الحساب',
    title: isEn ? 'Profile and security' : 'الملف والأمان',
    subtitle: isEn
      ? 'Your coordinator sets phone, birthday, and photo on the school website. Open this tab or pull down to load the latest.'
      : 'يحدّث المنسق هاتفك وتاريخ الميلاد والصورة من الموقع. اسحب للأسفل لتحديث البيانات.',
    phone: isEn ? 'Phone' : 'الهاتف',
    birth: isEn ? 'Birthday' : 'تاريخ الميلاد',
    role: isEn ? 'Role' : 'الدور',
    email: isEn ? 'Email' : 'البريد',
    age: isEn ? 'Age' : 'العمر',
    securitySettings: isEn ? 'Security settings' : 'إعدادات الأمان',
    securitySettingsHint: isEn ? 'Auto-logout when the app is in the background' : 'تسجيل خروج تلقائي عند بقاء التطبيق بالخلفية',
    logoutTitle: isEn ? 'Log out?' : 'تسجيل الخروج؟',
    logoutBody: isEn
      ? 'You will return to the sign-in screen. You can sign in again anytime.'
      : 'ستعود إلى شاشة تسجيل الدخول. يمكنك تسجيل الدخول مرة أخرى في أي وقت.',
    logoutButton: isEn ? 'Log out' : 'تسجيل الخروج',
    logoutConfirm: isEn ? 'Yes, log out' : 'نعم، تسجيل الخروج',
    cancel: isEn ? 'Cancel' : 'إلغاء',
    photo: isEn ? 'Profile photo' : 'صورة الملف',
    photoSchoolHint: isEn
      ? 'Your school coordinator adds or updates this on the website. Pull down to refresh after they save.'
      : 'يضيفها أو يحدّثها المنسق من الموقع. اسحب للأسفل للتحديث بعد الحفظ.',
    displayTitle: isEn ? 'Text size & contrast' : 'حجم النص والتباين',
    displayHint: isEn
      ? 'Adjust how text and colors look. These settings apply across the app.'
      : 'اضبط مظهر النص والألوان. تُطبَّق هذه الإعدادات على كل الشاشات.',
  }

  const hasPhoto = Boolean(user?.profilePhotoStoragePath?.trim() || user?.profilePhotoUrl?.trim())

  const refreshPhoto = useCallback(() => {
    void refreshUser().catch(() => {})
  }, [refreshUser])

  return (
    <>
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      onBackPress={() => navigation.navigate('MainOverview')}
      backLabel={back}
      rtl={isArabic}
      refreshing={pullRefreshing}
      onRefresh={onPullRefresh}
    >
      {refreshError ? (
        <View style={styles.refreshErrorBox}>
          <Text style={[styles.refreshErrorText, isArabic && styles.rtl]}>{refreshError}</Text>
        </View>
      ) : null}

      <View style={styles.avatarHero}>
        <Text style={[styles.avatarLabel, isArabic && styles.rtl]}>{copy.photo}</Text>
        <ProfileAvatarImage
          photoUrl={user?.profilePhotoUrl}
          photoStoragePath={user?.profilePhotoStoragePath}
          name={user?.name}
          size={104}
          wrapStyle={styles.avatarWrapLarge}
          imageStyle={styles.avatarImgLarge}
          initialsStyle={styles.avatarTxtLarge}
          onPhotoLoadError={refreshPhoto}
        />
        {!hasPhoto ? (
          <Text style={[styles.avatarHint, isArabic && styles.rtl]}>{copy.photoSchoolHint}</Text>
        ) : null}
      </View>

      <ScreenCard>
        <Text style={[styles.displaySectionTitle, isArabic && styles.rtl]}>{copy.displayTitle}</Text>
        <Text style={[styles.displaySectionHint, isArabic && styles.rtl]}>{copy.displayHint}</Text>
        <DisplayComfortToolbar variant="surface" />
      </ScreenCard>

      <ScreenCard>
        <Text style={[styles.name, isArabic && styles.rtl, styles.nameCentered]}>
          {user?.name || user?.email || '—'}
        </Text>
        <Text style={[styles.meta, isArabic && styles.rtl, styles.metaCentered]}>
          {copy.role}: {user?.roleLabel || user?.role || '—'}
        </Text>
        <Text style={[styles.meta, isArabic && styles.rtl, styles.metaCentered]}>
          {copy.email}: {user?.email || '—'}
        </Text>
        {typeof user?.ageYears === 'number' ? (
          <Text style={[styles.meta, isArabic && styles.rtl, styles.metaCentered]}>
            {copy.age}: {user.ageYears}
            {user.birthDate ? ` (${user.birthDate})` : ''}
          </Text>
        ) : null}

        <Text style={[styles.label, isArabic && styles.rtl, { marginTop: 14 }]}>{copy.phone}</Text>
        <Text style={[styles.readonlyLine, isArabic && styles.rtl]}>{user?.phone?.trim() ? user.phone : '—'}</Text>

        <Text style={[styles.label, isArabic && styles.rtl, { marginTop: 12 }]}>{copy.birth}</Text>
        <Text style={[styles.readonlyLine, isArabic && styles.rtl]}>{user?.birthDate?.trim() ? user.birthDate : '—'}</Text>

        <View style={styles.profileDivider} />
        <Pressable
          style={[styles.securityRow, isArabic && styles.securityRowRtl]}
          onPress={() => navigation.navigate('ParentSecuritySettings')}
          accessibilityRole="button"
          accessibilityLabel={copy.securitySettings}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.securityRowTitle, isArabic && styles.rtl]}>{copy.securitySettings}</Text>
            <Text style={[styles.securityRowHint, isArabic && styles.rtl]}>{copy.securitySettingsHint}</Text>
          </View>
          <Text style={styles.securityChevron}>{isArabic ? '‹' : '›'}</Text>
        </Pressable>

        <Pressable
          style={[styles.logoutUnderSecurity, isArabic && styles.securityRowRtl]}
          onPress={() => {
            void (async () => {
              const ok = await confirm({
                title: copy.logoutTitle,
                description: copy.logoutBody,
                confirmLabel: copy.logoutConfirm,
                cancelLabel: copy.cancel,
                tone: 'danger',
                rtl: !isEn,
              })
              if (!ok) return
              logout()
            })()
          }}
          accessibilityRole="button"
          accessibilityLabel={copy.logoutButton}
        >
          <Text style={[styles.logoutUnderSecurityText, isArabic && styles.rtl]}>{copy.logoutButton}</Text>
        </Pressable>
      </ScreenCard>
    </ScreenScrollPage>
    {confirmDialog}
    </>
  )
}

const styles = StyleSheet.create({
  refreshErrorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    marginBottom: 4,
  },
  refreshErrorText: { color: '#b91c1c', fontWeight: '700', fontSize: 14, lineHeight: 20 },
  displaySectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  displaySectionHint: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  avatarHero: {
    alignItems: 'center',
    marginTop: -52,
    marginBottom: 10,
    paddingHorizontal: 12,
    zIndex: 2,
  },
  avatarLabel: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  avatarWrapLarge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  avatarImgLarge: { width: 104, height: 104 },
  avatarTxtLarge: { fontSize: 32, fontWeight: '900', color: '#1d4ed8' },
  avatarHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },
  name: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  nameCentered: { textAlign: 'center', marginTop: 4 },
  meta: { marginTop: 4, color: '#475569', fontWeight: '600' },
  metaCentered: { textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '800', color: '#6b5a8a', marginBottom: 6 },
  readonlyLine: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  profileDivider: {
    height: 1,
    backgroundColor: '#e8e0fb',
    marginTop: 18,
    marginBottom: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  securityRowRtl: { flexDirection: 'row-reverse' },
  securityRowTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  securityRowHint: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#6b5a8a' },
  securityChevron: { fontSize: 22, fontWeight: '300', color: '#8b7cb8' },
  logoutUnderSecurity: {
    marginTop: 10,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutUnderSecurityText: { color: '#fff', fontWeight: '900', fontSize: 16 },
})
