import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import type { NavigationState, PartialState } from '@react-navigation/native'
import { useAuth } from '../mvc/controllers/AuthController'
import { useLanguage } from '../mvc/controllers/LanguageController'
import { DisplayComfortToolbar } from '../mvc/views/components/DisplayComfortToolbar'
import { api } from '../mvc/models/api'
import type { ParentDrawerParamList } from './parentDrawerTypes'

const LAST_CHILD_PREFIX = 'asp_mobile_last_child_v1'

function readActiveRoute(state: NavigationState | PartialState<NavigationState> | undefined): string {
  if (!state || typeof state.index !== 'number') return ''
  const route = state.routes[state.index]
  if (!route) return ''
  if (route.state) {
    const nestedName = getFocusedRouteNameFromRoute(route)
    return nestedName ? `${String(route.name)}:${nestedName}` : String(route.name)
  }
  return String(route.name)
}

export function ParentDrawerSidebar(props: DrawerContentComponentProps) {
  const { navigation } = props
  const { token, user } = useAuth()
  const { language } = useLanguage()
  const [cachedChild, setCachedChild] = useState<{ id: string; name: string } | null>(null)
  const [resolvingRoute, setResolvingRoute] = useState<keyof ParentDrawerParamList | null>(null)
  const focused = readActiveRoute(props.state as NavigationState)
  const copy = {
    menu: language === 'ar' ? 'القائمة' : 'Menu',
    today: language === 'ar' ? 'اليوم' : 'Today',
    board: language === 'ar' ? 'لوحة طفلك' : 'Child dashboard',
    daily: language === 'ar' ? 'اليومي' : 'Daily',
    play: language === 'ar' ? 'لعب' : 'Play',
    chat: language === 'ar' ? 'محادثة' : 'Chat',
    reports: language === 'ar' ? 'تقارير' : 'Reports',
    guide: language === 'ar' ? 'الدليل' : 'Guide',
    profile: language === 'ar' ? 'الملف والأمان' : 'Profile and security',
    noStudentTitle: language === 'ar' ? 'لا يوجد طفل مرتبط' : 'No student linked',
    noStudentBody:
      language === 'ar'
        ? 'يجب ربط طفل واحد على الأقل قبل فتح هذه الصفحة.'
        : 'Create or assign at least one student before opening this page.',
    loading: language === 'ar' ? 'جاري الفتح' : 'Opening',
  }

  useEffect(() => {
    let cancelled = false
    async function warmChildCache() {
      const userId = user?.id || 'unknown'
      const storageKey = `${LAST_CHILD_PREFIX}:${userId}`
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        if (cancelled || !raw) return
        const parsed = JSON.parse(raw) as { id?: string; name?: string }
        if (parsed?.id) {
          setCachedChild({ id: String(parsed.id), name: String(parsed.name || '').trim() || 'Student' })
        }
      } catch {
        // Ignore corrupted local cache and continue with API fallback.
      }
    }
    void warmChildCache()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const fetchFirstChild = useCallback(async (): Promise<{ id: string; name: string } | null> => {
    const userId = user?.id || 'unknown'
    const storageKey = `${LAST_CHILD_PREFIX}:${userId}`
    if (!token) return cachedChild
    try {
      const res = await api.parentChildren(token)
      const list = (res.children || []).map((c: { id: string; name?: string }) => ({
        id: String(c.id),
        name: String(c.name || '').trim() || 'Student',
      }))
      const first = list[0] ?? null
      if (first) {
        setCachedChild(first)
        await AsyncStorage.setItem(storageKey, JSON.stringify(first))
      }
      return first
    } catch {
      return cachedChild
    }
  }, [token, user?.id, cachedChild])

  const goMain = () => navigation.navigate('MainOverview')

  const navWithChild = async (screen: keyof ParentDrawerParamList, needChild: boolean) => {
    if (resolvingRoute) return
    if (!needChild) {
      navigation.navigate(screen)
      return
    }
    setResolvingRoute(screen)
    try {
      const child = await fetchFirstChild()
      if (!child) {
        Alert.alert(copy.noStudentTitle, copy.noStudentBody)
        return
      }
      switch (screen) {
        case 'ParentDashboardSheet':
          navigation.navigate('ParentDashboardSheet', { childId: child.id, childName: child.name })
          break
        case 'ParentDailyCheckIn':
          navigation.navigate('ParentDailyCheckIn', { childId: child.id, childName: child.name })
          break
        case 'Activities':
          navigation.navigate('Activities', { screen: 'ChildMode', params: { childId: child.id, childName: child.name } })
          break
        case 'ParentChat':
          navigation.navigate('ParentChat', { childId: child.id, childName: child.name })
          break
        case 'ParentProgressReports':
          navigation.navigate('ParentProgressReports', { childId: child.id, childName: child.name })
          break
        default:
          break
      }
    } finally {
      setResolvingRoute(null)
    }
  }

  const isMain = focused === 'MainOverview'
  const isBoard = focused === 'ParentDashboardSheet'
  const isDaily = focused === 'ParentDailyCheckIn'
  const isPlay = focused.startsWith('Activities')
  const isChat = focused === 'ParentChat'
  const isReports = focused === 'ParentProgressReports'
  const isMenuHelp = focused === 'ParentMenuHelp'
  const isProfile = focused === 'ParentAccountProfile' || focused === 'ParentSecuritySettings'

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.drawerGlowTop} />
      <View pointerEvents="none" style={styles.drawerGlowBottom} />

      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.profile}
          accessibilityState={{ selected: isProfile }}
          onPress={() => navigation.navigate('ParentAccountProfile')}
          style={[styles.leftDashLogoWrap, isProfile && styles.leftDashLogoWrapActive]}
        >
          <Image source={require('../../assets/icon.png')} style={styles.leftDashLogo} resizeMode="contain" />
        </Pressable>
        <Text style={styles.leftDashTitle}>{copy.menu}</Text>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.profile} accessibilityState={{ selected: isProfile }} style={isProfile ? styles.leftDashBtnActive : styles.leftDashBtn} onPress={() => navigation.navigate('ParentAccountProfile')}>
          <Text style={isProfile ? styles.leftDashIconActive : styles.leftDashIcon}>◎</Text>
          <Text style={isProfile ? styles.leftDashTextActive : styles.leftDashText}>{copy.profile}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.today} accessibilityState={{ selected: isMain }} style={isMain ? styles.leftDashBtnActive : styles.leftDashBtn} onPress={goMain}>
          <Text style={isMain ? styles.leftDashIconActive : styles.leftDashIcon}>⌂</Text>
          <Text style={isMain ? styles.leftDashTextActive : styles.leftDashText}>{copy.today}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.board} accessibilityState={{ selected: isBoard, busy: resolvingRoute === 'ParentDashboardSheet', disabled: !!resolvingRoute }} disabled={!!resolvingRoute} style={[isBoard ? styles.leftDashBtnActive : styles.leftDashBtn, resolvingRoute && styles.leftDashBtnMuted]} onPress={() => void navWithChild('ParentDashboardSheet', true)}>
          {resolvingRoute === 'ParentDashboardSheet' ? <ActivityIndicator color={isBoard ? '#6d46d4' : '#ddd6fe'} size="small" /> : <Text style={isBoard ? styles.leftDashIconActive : styles.leftDashIcon}>▦</Text>}
          <Text style={isBoard ? styles.leftDashTextActive : styles.leftDashText}>{copy.board}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.daily} accessibilityState={{ selected: isDaily, busy: resolvingRoute === 'ParentDailyCheckIn', disabled: !!resolvingRoute }} disabled={!!resolvingRoute} style={[isDaily ? styles.leftDashBtnActive : styles.leftDashBtn, resolvingRoute && styles.leftDashBtnMuted]} onPress={() => void navWithChild('ParentDailyCheckIn', true)}>
          {resolvingRoute === 'ParentDailyCheckIn' ? <ActivityIndicator color={isDaily ? '#6d46d4' : '#ddd6fe'} size="small" /> : <Text style={isDaily ? styles.leftDashIconActive : styles.leftDashIcon}>✓</Text>}
          <Text style={isDaily ? styles.leftDashTextActive : styles.leftDashText}>{copy.daily}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.play} accessibilityState={{ selected: isPlay, busy: resolvingRoute === 'Activities', disabled: !!resolvingRoute }} disabled={!!resolvingRoute} style={[isPlay ? styles.leftDashBtnActive : styles.leftDashBtn, resolvingRoute && styles.leftDashBtnMuted]} onPress={() => void navWithChild('Activities', true)}>
          {resolvingRoute === 'Activities' ? <ActivityIndicator color={isPlay ? '#6d46d4' : '#ddd6fe'} size="small" /> : <Text style={isPlay ? styles.leftDashIconActive : styles.leftDashIcon}>★</Text>}
          <Text style={isPlay ? styles.leftDashTextActive : styles.leftDashText}>{copy.play}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.chat} accessibilityState={{ selected: isChat, busy: resolvingRoute === 'ParentChat', disabled: !!resolvingRoute }} disabled={!!resolvingRoute} style={[isChat ? styles.leftDashBtnActive : styles.leftDashBtn, resolvingRoute && styles.leftDashBtnMuted]} onPress={() => void navWithChild('ParentChat', true)}>
          {resolvingRoute === 'ParentChat' ? <ActivityIndicator color={isChat ? '#6d46d4' : '#ddd6fe'} size="small" /> : <Text style={isChat ? styles.leftDashIconActive : styles.leftDashIcon}>✉</Text>}
          <Text style={isChat ? styles.leftDashTextActive : styles.leftDashText}>{copy.chat}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.reports} accessibilityState={{ selected: isReports, busy: resolvingRoute === 'ParentProgressReports', disabled: !!resolvingRoute }} disabled={!!resolvingRoute} style={[isReports ? styles.leftDashBtnActive : styles.leftDashBtn, resolvingRoute && styles.leftDashBtnMuted]} onPress={() => void navWithChild('ParentProgressReports', true)}>
          {resolvingRoute === 'ParentProgressReports' ? <ActivityIndicator color={isReports ? '#6d46d4' : '#ddd6fe'} size="small" /> : <Text style={isReports ? styles.leftDashIconActive : styles.leftDashIcon}>↗</Text>}
          <Text style={isReports ? styles.leftDashTextActive : styles.leftDashText}>{copy.reports}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={copy.guide} accessibilityState={{ selected: isMenuHelp }} style={isMenuHelp ? styles.leftDashBtnActive : styles.leftDashBtn} onPress={() => navigation.navigate('ParentMenuHelp')}>
          <Text style={isMenuHelp ? styles.leftDashIconActive : styles.leftDashIcon}>?</Text>
          <Text style={isMenuHelp ? styles.leftDashTextActive : styles.leftDashText}>{copy.guide}</Text>
        </Pressable>

        <DisplayComfortToolbar variant="drawer" />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#211a2e',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 12,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  drawerGlowTop: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(124,77,255,0.36)',
    top: -42,
    right: -54,
  },
  drawerGlowBottom: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(20,184,166,0.18)',
    bottom: 44,
    left: -56,
  },
  scrollFlex: { flex: 1 },
  scroll: {
    paddingTop: 16,
    paddingHorizontal: 8,
    gap: 9,
    paddingBottom: 12,
  },
  leftDashLogoWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  leftDashLogoWrapActive: {
    borderColor: '#6d46d4',
  },
  leftDashLogo: { width: 36, height: 36, borderRadius: 10 },
  leftDashTitle: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  leftDashBtn: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  leftDashBtnActive: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  leftDashBtnMuted: { opacity: 0.72 },
  leftDashIcon: { color: '#ddd6fe', fontSize: 16, fontWeight: '900' },
  leftDashText: { color: '#ddd6fe', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  leftDashIconActive: { color: '#6d46d4', fontSize: 16, fontWeight: '900' },
  leftDashTextActive: { color: '#6d46d4', fontSize: 9, fontWeight: '900', textAlign: 'center' },
})
