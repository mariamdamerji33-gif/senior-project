import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
import { useConfirmDialog } from '../components/useConfirmDialog'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import {
  ALLOWED_TIMEOUT_MINUTES,
  getInactivityTimeoutMinutes,
  setInactivityTimeoutMinutes,
  type TimeoutMinutes,
} from '../../../security/sessionSecurity'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentSecuritySettings'>

export function ParentSecuritySettingsScreen({ navigation }: Props) {
  const { logout } = useAuth()
  const { language, isArabic } = useLanguage()
  const { confirm, confirmDialog } = useConfirmDialog()
  const isEn = language === 'en'
  const [timeoutMinutes, setTimeoutMinutesState] = useState<TimeoutMinutes>(15)
  const copy = {
    eyebrow: isEn ? 'Security' : 'الأمان',
    title: isEn ? 'Security settings' : 'إعدادات الأمان',
    subtitle: isEn ? 'Protect family data and sessions' : 'حماية بيانات العائلة والجلسة',
    backProfile: isEn ? '← Profile and security' : '← الملف والأمان',
    timeoutTitle: isEn ? 'Auto-logout timeout' : 'مهلة تسجيل الخروج التلقائي',
    timeoutBody: isEn ? 'If app stays in background longer than this, user is logged out.' : 'إذا بقي التطبيق بالخلفية أكثر من هذه المدة يتم تسجيل الخروج.',
    timeoutValue: (n: number) => (isEn ? `${n} min` : `${n} دقيقة`),
    recommended: isEn ? 'Recommended' : 'مقترح',
    logoutTitle: isEn ? 'Confirm logout' : 'تأكيد تسجيل الخروج',
    logoutBody: isEn ? 'Do you want to log out now?' : 'هل تريد تسجيل الخروج الآن؟',
    logoutConfirm: isEn ? 'Log out' : 'تسجيل الخروج',
    cancel: isEn ? 'Cancel' : 'إلغاء',
    logoutLink: isEn ? 'Log out' : 'تسجيل الخروج',
    logoutHint: isEn ? 'End session on this device' : 'إنهاء الجلسة على هذا الجهاز',
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const timeout = await getInactivityTimeoutMinutes()
      if (cancelled) return
      setTimeoutMinutesState(timeout)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ScreenScrollPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      onBackPress={() => navigation.navigate('ParentAccountProfile')}
      backLabel={copy.backProfile}
      rtl={isArabic}
    >
      <ScreenCard>
        <Text style={[styles.title, isArabic && styles.rtl]}>{copy.timeoutTitle}</Text>
        <Text style={[styles.body, isArabic && styles.rtl]}>{copy.timeoutBody}</Text>
        <View style={styles.timeoutRow}>
          {ALLOWED_TIMEOUT_MINUTES.map((item) => {
            const active = timeoutMinutes === item
            return (
              <Pressable
                key={item}
                style={[styles.timeoutChip, active && styles.timeoutChipActive]}
                onPress={() => {
                  setTimeoutMinutesState(item)
                  void setInactivityTimeoutMinutes(item)
                }}
              >
                <Text style={[styles.timeoutChipText, active && styles.timeoutChipTextActive]}>{copy.timeoutValue(item)}</Text>
                {item === 15 ? <Text style={[styles.timeoutMeta, active && styles.timeoutMetaActive]}>{copy.recommended}</Text> : null}
              </Pressable>
            )
          })}
        </View>
      </ScreenCard>

      <ScreenCard>
        <Pressable
          style={[styles.logoutRow, isArabic && styles.logoutRowRtl]}
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
          accessibilityLabel={copy.logoutLink}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.logoutTitle, isArabic && styles.rtl]}>{copy.logoutLink}</Text>
            <Text style={[styles.logoutHint, isArabic && styles.rtl]}>{copy.logoutHint}</Text>
          </View>
        </Pressable>
      </ScreenCard>
      {confirmDialog}
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  title: { color: '#17131f', fontSize: 16, fontWeight: '900' },
  body: { color: '#534c62', lineHeight: 20, fontWeight: '600' },
  timeoutRow: { flexDirection: 'row', gap: 8 },
  timeoutChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    backgroundColor: '#f4f1fb',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  timeoutChipActive: { borderColor: '#6d46d4', backgroundColor: '#f4f1fb' },
  timeoutChipText: { color: '#6d46d4', fontWeight: '800' },
  timeoutChipTextActive: { color: '#4c1d95' },
  timeoutMeta: { color: '#7c7392', fontSize: 11, fontWeight: '700' },
  timeoutMetaActive: { color: '#5a38b8' },
  logoutRow: { paddingVertical: 4 },
  logoutRowRtl: { flexDirection: 'row-reverse' },
  logoutTitle: { fontSize: 16, fontWeight: '800', color: '#b91c1c' },
  logoutHint: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#9f1239' },
})

