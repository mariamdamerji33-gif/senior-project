import { StyleSheet, type TextStyle } from 'react-native'

/** Scales numeric `fontSize` / `lineHeight` for accessibility tiers. */
export function scaleTextStyle(style: TextStyle | TextStyle[] | undefined, m: number): TextStyle {
  if (style == null) return {}
  const f = StyleSheet.flatten(style) as TextStyle
  if (typeof f.fontSize !== 'number') return f
  const next: TextStyle = { ...f, fontSize: Math.round(f.fontSize * m) }
  if (typeof f.lineHeight === 'number') next.lineHeight = Math.round(f.lineHeight * m)
  return next
}
