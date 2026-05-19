import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { ScreenCard, ScreenScrollPage } from '../components/ScreenScrollPage'
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
  const { language, isArabic } = useLanguage()
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
    </ScreenScrollPage>
  )
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  body: { color: '#475569', lineHeight: 20, fontWeight: '600' },
  timeoutRow: { flexDirection: 'row', gap: 8 },
  timeoutChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#dbeafe',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  timeoutChipActive: { borderColor: '#1d4ed8', backgroundColor: '#dbeafe' },
  timeoutChipText: { color: '#1d4ed8', fontWeight: '800' },
  timeoutChipTextActive: { color: '#1e3a8a' },
  timeoutMeta: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  timeoutMetaActive: { color: '#1e40af' },
})
