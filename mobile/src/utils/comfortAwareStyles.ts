import { useMemo } from 'react'
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import type { AppThemeColors } from '../mvc/controllers/DisplayComfortContextController'
import { scaleTextStyle } from './scaleTextStyle'

type AnyStyle = TextStyle | ViewStyle

function normColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim().toLowerCase()
}

/** Map legacy and website hex values to theme tokens when high contrast is on. */
function mapColor(hex: string | null, appColors: AppThemeColors): string | undefined {
  if (!hex) return undefined
  const map: Record<string, string> = {
    '#f2eff9': appColors.pageBg,
    '#eff6ff': appColors.pageBg,
    '#faf8ff': appColors.surfaceSoft,
    '#f4f1fb': appColors.secondarySurface,
    '#fff': appColors.surface,
    '#ffffff': appColors.surface,
    '#17131f': appColors.textTitle,
    '#3b3150': appColors.text,
    '#534c62': appColors.text,
    '#6e6878': appColors.textMuted,
    '#6d6485': appColors.textMuted,
    '#7c7392': appColors.textMuted,
    '#9188a8': appColors.textMuted,
    '#9c94b0': appColors.textMuted,
    '#dfd6ee': appColors.outlineBorder,
    '#cfc4e6': appColors.secondaryBorder,
    '#6d46d4': appColors.primary,
    '#1d4ed8': appColors.primary,
    '#2563eb': appColors.primary,
    '#5a38b8': appColors.primaryDark,
    '#1e40af': appColors.primaryDark,
    '#8b6ae8': appColors.primary,
    '#5f3dc9': appColors.primaryDark,
    '#0f766e': appColors.calm,
    '#b91c1c': appColors.danger,
    '#991b1b': appColors.danger,
    '#211a2e': appColors.primaryDeep,
    '#3b2b6f': appColors.primaryDeep,
  }
  return map[hex]
}

function applyComfortStyle(style: AnyStyle, textScale: number, appColors: AppThemeColors, highContrast: boolean): AnyStyle {
  let next = StyleSheet.flatten(style) as TextStyle & ViewStyle
  if (typeof next.fontSize === 'number') {
    next = scaleTextStyle(next, textScale) as TextStyle & ViewStyle
  }
  if (!highContrast) return next

  const colorKey = normColor(next.color)
  const bgKey = normColor(next.backgroundColor)
  const borderKey = normColor(next.borderColor)
  const mappedColor = mapColor(colorKey, appColors)
  const mappedBg = mapColor(bgKey, appColors)
  const mappedBorder = mapColor(borderKey, appColors)
  if (mappedColor) next = { ...next, color: mappedColor }
  if (mappedBg) next = { ...next, backgroundColor: mappedBg }
  if (mappedBorder) next = { ...next, borderColor: mappedBorder }
  return next
}

/** Scale text and apply high-contrast palette for a StyleSheet record (e.g. parent dashboard). */
export function useComfortAwareStyles<T extends Record<string, AnyStyle>>(
  base: T,
  textScale: number,
  appColors: AppThemeColors,
  highContrast: boolean,
): T {
  return useMemo(() => {
    const out = {} as Record<string, AnyStyle>
    for (const key of Object.keys(base)) {
      out[key] = applyComfortStyle(base[key]!, textScale, appColors, highContrast)
    }
    return out as T
  }, [base, textScale, appColors, highContrast])
}
