import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { useLanguage } from '../../controllers/LanguageController'
import { scaleTextStyle } from '../../../utils/scaleTextStyle'

type Variant = 'surface' | 'drawer'

const COPY = {
  en: {
    a11yLabel: 'Text size & contrast',
    contrastOn: 'Contrast: on',
    contrastOff: 'Contrast',
  },
  ar: {
    a11yLabel: 'حجم النص والتباين',
    contrastOn: 'تباين: مفعّل',
    contrastOff: 'تباين',
  },
} as const

type Props = {
  variant?: Variant
  /** Merged into the outer wrapper (e.g. high-contrast tweaks on login). */
  style?: ViewStyle
}

export function DisplayComfortToolbar({ variant = 'surface', style }: Props) {
  const { language } = useLanguage()
  const { prefs, textScale, stepFontSize, toggleContrast } = useDisplayComfort()
  const high = prefs.contrast === 'high'
  const copy = COPY[language] || COPY.en
  const isDrawer = variant === 'drawer'
  const styles = isDrawer ? drawerStyles : surfaceStyles
  const contrastLabel = isDrawer ? (high ? '◉' : '◐') : high ? copy.contrastOn : copy.contrastOff
  const labelStyle = scaleTextStyle(styles.label, textScale)
  const btnTextStyle = scaleTextStyle(styles.btnText, textScale)

  return (
    <View style={[styles.wrap, style]} accessibilityRole="toolbar" accessibilityLabel={copy.a11yLabel}>
      <Text style={labelStyle}>{copy.a11yLabel}</Text>
      <View style={styles.btns}>
        <Pressable
          accessibilityLabel="Smaller text"
          onPress={() => stepFontSize(-1)}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={btnTextStyle}>A−</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Larger text"
          onPress={() => stepFontSize(1)}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={btnTextStyle}>A+</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="High contrast"
          accessibilityState={{ selected: high }}
          onPress={() => toggleContrast()}
          style={({ pressed }) => [styles.btn, high && styles.btnOn, pressed && styles.btnPressed]}
        >
          <Text style={[btnTextStyle, high && isDrawer && drawerStyles.btnTextOnContrast]}>
            {contrastLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const surfaceStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,220,251,0.95)',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  label: {
    color: '#534c62',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dfd6ee',
    backgroundColor: '#fdfcff',
  },
  btnPressed: { opacity: 0.85 },
  btnOn: {
    borderColor: '#0f172a',
    backgroundColor: '#e2e8f0',
  },
  btnText: { color: '#17131f', fontWeight: '900', fontSize: 15 },
})

const drawerStyles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
    alignItems: 'stretch',
  },
  label: {
    color: '#e9e0ff',
    fontWeight: '800',
    fontSize: 8,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 11,
  },
  btns: { flexDirection: 'column', gap: 5, alignItems: 'stretch' },
  btn: {
    width: '100%',
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnPressed: { opacity: 0.88 },
  btnOn: {
    borderColor: '#f8fafc',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnTextOnContrast: { color: '#0f172a' },
})
