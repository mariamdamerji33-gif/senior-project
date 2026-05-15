import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { colors as baseColors } from '../../theme/colors'

/** Same key/JSON shape as the website (`frontend/src/utils/a11yUiPrefs.ts`). */
export const DISPLAY_COMFORT_STORAGE_KEY = 'a11y_ui_prefs_v1'

export type DisplayFontTier = 'sm' | 'md' | 'lg' | 'xl'
export type DisplayContrast = 'normal' | 'high'

export type DisplayComfortPrefs = {
  fontSize: DisplayFontTier
  contrast: DisplayContrast
}

export type AppThemeColors = Record<keyof typeof baseColors, string>

const FONT_ORDER: DisplayFontTier[] = ['sm', 'md', 'lg', 'xl']

const TEXT_SCALE: Record<DisplayFontTier, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.1,
  xl: 1.2,
}

const HIGH_CONTRAST_COLORS: AppThemeColors = {
  primary: '#5b21b6',
  primaryDark: '#4c1d95',
  primaryDeep: '#0f172a',
  secondarySurface: '#f1f5f9',
  secondaryBorder: '#64748b',
  outlineBorder: '#334155',
  surface: '#ffffff',
  surfaceSoft: '#f8fafc',
  pageBg: '#ffffff',
  text: '#0a0a0a',
  textMuted: '#334155',
  textTitle: '#000000',
  danger: '#991b1b',
}

function defaultPrefs(): DisplayComfortPrefs {
  return { fontSize: 'md', contrast: 'normal' }
}

function parsePrefs(raw: string | null): DisplayComfortPrefs {
  if (!raw) return defaultPrefs()
  try {
    const parsed = JSON.parse(raw) as Partial<DisplayComfortPrefs>
    const fontSize =
      parsed.fontSize === 'sm' || parsed.fontSize === 'md' || parsed.fontSize === 'lg' || parsed.fontSize === 'xl'
        ? parsed.fontSize
        : 'md'
    const contrast = parsed.contrast === 'high' ? 'high' : 'normal'
    return { fontSize, contrast }
  } catch {
    return defaultPrefs()
  }
}

function stepFontTier(current: DisplayFontTier, dir: -1 | 1): DisplayFontTier {
  let idx = FONT_ORDER.indexOf(current)
  if (idx < 0) idx = 1
  const next = Math.max(0, Math.min(FONT_ORDER.length - 1, idx + dir))
  return FONT_ORDER[next]!
}

function buildAppColors(contrast: DisplayContrast): AppThemeColors {
  if (contrast === 'high') return HIGH_CONTRAST_COLORS
  return { ...baseColors }
}

type DisplayComfortContextValue = {
  prefs: DisplayComfortPrefs
  textScale: number
  highContrast: boolean
  appColors: AppThemeColors
  stepFontSize: (dir: -1 | 1) => void
  toggleContrast: () => void
}

const DisplayComfortContext = createContext<DisplayComfortContextValue | undefined>(undefined)

export function DisplayComfortProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayComfortPrefs>(defaultPrefs)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const raw = await AsyncStorage.getItem(DISPLAY_COMFORT_STORAGE_KEY)
      if (!alive) return
      setPrefs(parsePrefs(raw))
      setHydrated(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void AsyncStorage.setItem(DISPLAY_COMFORT_STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs, hydrated])

  const value = useMemo<DisplayComfortContextValue>(() => {
    const highContrast = prefs.contrast === 'high'
    return {
      prefs,
      textScale: TEXT_SCALE[prefs.fontSize],
      highContrast,
      appColors: buildAppColors(prefs.contrast),
      stepFontSize: (dir) => setPrefs((p) => ({ ...p, fontSize: stepFontTier(p.fontSize, dir) })),
      toggleContrast: () =>
        setPrefs((p) => ({ ...p, contrast: p.contrast === 'high' ? 'normal' : 'high' })),
    }
  }, [prefs])

  return <DisplayComfortContext.Provider value={value}>{children}</DisplayComfortContext.Provider>
}

export function useDisplayComfort() {
  const ctx = useContext(DisplayComfortContext)
  if (!ctx) throw new Error('useDisplayComfort must be used inside DisplayComfortProvider')
  return ctx
}
