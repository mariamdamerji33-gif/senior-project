import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { useConfirmDialog } from '../components/useConfirmDialog'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import { api } from '../../models/api'
import type { AdminDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { normalizeBirthDateForApi } from '../../../utils/birthDateInput'
import { ProfileAvatarImage } from '../components/ProfileAvatarImage'
import { DisplayComfortToolbar } from '../components/DisplayComfortToolbar'

const PHONE_INPUT_PLACEHOLDER = '961 xx/ xxx xxx'

/** Editable staff profile (school tools). Used in admin drawer and for teachers on the family app shell. */
export function StaffAccountProfileBody({
  onBack,
  backLabel,
  onOpenSecurity,
  showLogout,
}: {
  onBack: () => void
  backLabel: string
  /** When set (family app shell), shows a row to open inactivity security settings. */
  onOpenSecurity?: () => void
  /** When true (family app shell), shows log out with confirmation. */
  showLogout?: boolean
}) {
  const { token, user, refreshUser, logout } = useAuth()
  const { language, isArabic } = useLanguage()
  const { confirm, confirmDialog } = useConfirmDialog()
  const isEn = language === 'en'
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setPhone(user?.phone ?? '')
    setBirthDate(user?.birthDate ?? '')
  }, [user?.id])

  const copy = {
    eyebrow: isEn ? 'Account' : 'الحساب',
    title: isEn ? 'Profile and security' : 'الملف والأمان',
    subtitle: isEn ? 'Photo and details appear after you save.' : 'تظهر الصورة والبيانات بعد الحفظ.',
    save: isEn ? 'Save phone & birthday' : 'حفظ',
    pickPhoto: isEn ? 'Choose photo' : 'اختر صورة',
    removePhoto: isEn ? 'Remove photo' : 'إزالة الصورة',
    phone: isEn ? 'Phone' : 'الهاتف',
    birth: isEn ? 'Birthday YYYY-MM-DD (2005_5_15 OK)' : 'تاريخ الميلاد',
    role: isEn ? 'Role' : 'الدور',
    email: isEn ? 'Email' : 'البريد',
    age: isEn ? 'Age' : 'العمر',
    removePhotoTitle: isEn ? 'Remove profile photo?' : 'إزالة صورة الملف؟',
    removePhotoBody: isEn
      ? 'Your account will show initials until you upload a new photo.'
      : 'سيظهر حسابك بالأحرف الأولى حتى ترفع صورة جديدة.',
    removePhotoConfirm: isEn ? 'Remove' : 'إزالة',
    cancel: isEn ? 'Cancel' : 'إلغاء',
    securitySettings: isEn ? 'Security settings' : 'إعدادات الأمان',
    securitySettingsHint: isEn ? 'Auto-logout when the app is in the background' : 'تسجيل خروج تلقائي عند بقاء التطبيق بالخلفية',
    logoutTitle: isEn ? 'Confirm logout' : 'تأكيد تسجيل الخروج',
    logoutBody: isEn ? 'Do you want to log out now?' : 'هل تريد تسجيل الخروج الآن؟',
    logoutConfirm: isEn ? 'Log out' : 'تسجيل الخروج',
    displayTitle: isEn ? 'Text size & contrast' : 'حجم النص والتباين',
    displayHint: isEn
      ? 'Adjust how text and colors look. These settings apply across the app.'
      : 'اضبط مظهر النص والألوان. تُطبَّق هذه الإعدادات على كل الشاشات.',
  }

  const pickImage = async () => {
    if (!token || busy) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setErr(isEn ? 'Photo library permission is required.' : 'يلزم إذن معرض الصور.')
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (picked.canceled || !picked.assets?.[0]) return
    const asset = picked.assets[0]
    const uri = asset.uri
    const mime = asset.mimeType || 'image/jpeg'
    const filename = asset.fileName || `profile_${Date.now()}.jpg`
    setBusy(true)
    setErr(null)
    try {
      await api.uploadOwnProfilePhoto(token, uri, mime, filename)
      await refreshUser()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      onBackPress={onBack}
      backLabel={backLabel}
      rtl={isArabic}
    >
      {err ? (
        <ScreenCard>
          <Text style={[styles.err, isArabic && styles.rtl]}>{err}</Text>
        </ScreenCard>
      ) : null}

      <ScreenCard>
        <Text style={[styles.displaySectionTitle, isArabic && styles.rtl]}>{copy.displayTitle}</Text>
        <Text style={[styles.displaySectionHint, isArabic && styles.rtl]}>{copy.displayHint}</Text>
        <DisplayComfortToolbar variant="surface" />
      </ScreenCard>

      <ScreenCard>
        <View style={[styles.row, isArabic && styles.rowRtl]}>
          <ProfileAvatarImage
            photoUrl={user?.profilePhotoUrl}
            photoStoragePath={user?.profilePhotoStoragePath}
            name={user?.name}
            size={72}
            wrapStyle={styles.avatarWrap}
            imageStyle={styles.avatarImg}
            initialsStyle={styles.avatarTxt}
            onPhotoLoadError={() => {
              void refreshUser().catch(() => {})
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.name, isArabic && styles.rtl]}>{user?.name || user?.email || '—'}</Text>
            <Text style={[styles.meta, isArabic && styles.rtl]}>
              {copy.role}: {user?.roleLabel || user?.role || '—'}
            </Text>
            <Text style={[styles.meta, isArabic && styles.rtl]}>
              {copy.email}: {user?.email || '—'}
            </Text>
            {user?.phone?.trim() ? (
              <Text style={[styles.meta, isArabic && styles.rtl]}>
                {copy.phone}: {user.phone}
              </Text>
            ) : null}
            {typeof user?.ageYears === 'number' ? (
              <Text style={[styles.meta, isArabic && styles.rtl]}>
                {copy.age}: {user.ageYears}
                {user.birthDate ? ` (${user.birthDate})` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.label, isArabic && styles.rtl]}>{copy.phone}</Text>
        <TextInput
          style={[styles.input, isArabic && styles.rtl]}
          value={phone}
          onChangeText={setPhone}
          placeholder={PHONE_INPUT_PLACEHOLDER}
          keyboardType="phone-pad"
          editable={!busy}
        />

        <Text style={[styles.label, isArabic && styles.rtl, { marginTop: 12 }]}>{copy.birth}</Text>
        <TextInput
          style={[styles.input, isArabic && styles.rtl]}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="2005-05-15 or 2005_5_15"
          editable={!busy}
          onEndEditing={() => {
            const b = normalizeBirthDateForApi(birthDate)
            if (b.ok && b.iso !== birthDate.trim()) setBirthDate(b.iso)
          }}
        />

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnMuted]}
          disabled={busy || !token}
          onPress={() => {
            if (!token) return
            const birthNorm = normalizeBirthDateForApi(birthDate)
            if (!birthNorm.ok) {
              setErr(birthNorm.message)
              return
            }
            setBusy(true)
            setErr(null)
            void (async () => {
              try {
                await api.patchMyProfile(token, { phone: phone.trim(), birthDate: birthNorm.iso })
                await refreshUser()
                setPhone('')
                setBirthDate('')
              } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Save failed')
              } finally {
                setBusy(false)
              }
            })()
          }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{copy.save}</Text>}
        </Pressable>

        <View style={[styles.rowBtns, isArabic && styles.rowRtl]}>
          <Pressable style={[styles.ghostBtn, busy && styles.btnMuted]} disabled={busy || !token} onPress={() => void pickImage()}>
            <Text style={styles.ghostBtnText}>{copy.pickPhoto}</Text>
          </Pressable>
          <Pressable
            style={[styles.ghostBtn, busy && styles.btnMuted]}
            disabled={busy || !token || !(Boolean(user?.profilePhotoStoragePath?.trim()) || Boolean(user?.profilePhotoUrl?.trim()))}
            onPress={() => {
              if (!token || busy) return
              void (async () => {
                const ok = await confirm({
                  title: copy.removePhotoTitle,
                  description: copy.removePhotoBody,
                  confirmLabel: copy.removePhotoConfirm,
                  cancelLabel: copy.cancel,
                  tone: 'danger',
                  rtl: !isEn,
                })
                if (!ok) return
                setBusy(true)
                setErr(null)
                try {
                  await api.deleteOwnProfilePhoto(token)
                  await refreshUser()
                } catch (e: unknown) {
                  setErr(e instanceof Error ? e.message : 'Remove failed')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            <Text style={styles.ghostBtnText}>{copy.removePhoto}</Text>
          </Pressable>
        </View>
        {onOpenSecurity ? (
          <>
            <View style={styles.profileDivider} />
            <Pressable
              style={[styles.securityRow, isArabic && styles.securityRowRtl]}
              onPress={onOpenSecurity}
              accessibilityRole="button"
              accessibilityLabel={copy.securitySettings}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.securityRowTitle, isArabic && styles.rtl]}>{copy.securitySettings}</Text>
                <Text style={[styles.securityRowHint, isArabic && styles.rtl]}>{copy.securitySettingsHint}</Text>
              </View>
              <Text style={styles.securityChevron}>{isArabic ? '‹' : '›'}</Text>
            </Pressable>
            {showLogout ? (
              <Pressable
                style={[styles.logoutUnderSecurity, isArabic && styles.securityRowRtl]}
                onPress={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: copy.logoutTitle,
                      description: copy.logoutBody,
                      confirmLabel: copy.logoutConfirm,
                      cancelLabel: copy.cancel,
                      tone: 'primary',
                      rtl: !isEn,
                    })
                    if (!ok) return
                    logout()
                  })()
                }}
                accessibilityRole="button"
                accessibilityLabel={copy.logoutConfirm}
              >
                <Text style={[styles.logoutUnderSecurityText, isArabic && styles.rtl]}>{copy.logoutConfirm}</Text>
              </Pressable>
            ) : null}
          </>
        ) : showLogout ? (
          <>
            <View style={styles.profileDivider} />
            <Pressable
              style={[styles.logoutRow, isArabic && styles.securityRowRtl]}
              onPress={() => {
                void (async () => {
                  const ok = await confirm({
                    title: copy.logoutTitle,
                    description: copy.logoutBody,
                    confirmLabel: copy.logoutConfirm,
                    cancelLabel: copy.cancel,
                    tone: 'primary',
                    rtl: !isEn,
                  })
                  if (!ok) return
                  logout()
                })()
              }}
              accessibilityRole="button"
              accessibilityLabel={copy.logoutConfirm}
            >
              <Text style={[styles.logoutRowTitle, isArabic && styles.rtl]}>{copy.logoutConfirm}</Text>
            </Pressable>
          </>
        ) : null}
      </ScreenCard>
      {confirmDialog}
    </ScreenScrollPage>
  )
}

type AdminProps = DrawerScreenProps<AdminDrawerParamList, 'AccountProfile'>

export function AdminAccountProfileScreen({ navigation }: AdminProps) {
  const { language } = useLanguage()
  const back = language === 'en' ? '← Summary' : '← الملخص'
  return <StaffAccountProfileBody onBack={() => navigation.navigate('Summary')} backLabel={back} />
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  err: { color: '#b91c1c', fontWeight: '700' },
  displaySectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  displaySectionHint: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  rowRtl: { flexDirection: 'row-reverse' },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 72, height: 72 },
  avatarTxt: { fontSize: 22, fontWeight: '900', color: '#1e3a8a' },
  name: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  meta: { marginTop: 4, color: '#475569', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '800', color: '#6b5a8a', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  btnMuted: { opacity: 0.55 },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  ghostBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#dbeafe',
  },
  ghostBtnText: { color: '#1e40af', fontWeight: '800' },
  profileDivider: {
    height: 1,
    backgroundColor: '#e8e0fb',
    marginTop: 16,
    marginBottom: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  securityRowRtl: { flexDirection: 'row-reverse' },
  securityRowTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  securityRowHint: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#6b5a8a' },
  securityChevron: { fontSize: 22, fontWeight: '300', color: '#8b7cb8' },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  logoutRowTitle: { fontSize: 16, fontWeight: '800', color: '#b91c1c' },
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
