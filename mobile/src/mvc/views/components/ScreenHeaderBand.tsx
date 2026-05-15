import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { screenLayout } from '../../../theme/layout'
import { scaleTextStyle } from '../../../utils/scaleTextStyle'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  onBackPress?: () => void
  backLabel?: string
  rtl?: boolean
}

export function ScreenHeaderBand({ eyebrow, title, subtitle, onBackPress, backLabel, rtl }: Props) {
  const { textScale, appColors, highContrast } = useDisplayComfort()
  const scaled = useMemo(
    () => ({
      back: scaleTextStyle(screenLayout.backText, textScale),
      eyebrow: scaleTextStyle(screenLayout.headerEyebrow, textScale),
      title: scaleTextStyle(screenLayout.headerTitle, textScale),
      sub: scaleTextStyle(screenLayout.headerSubtitle, textScale),
    }),
    [textScale],
  )

  return (
    <View
      style={[
        screenLayout.headerBand,
        {
          backgroundColor: appColors.primaryDeep,
          borderBottomColor: highContrast ? '#cbd5e1' : 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      <View pointerEvents="none" style={styles.headerGlowLarge} />
      <View pointerEvents="none" style={styles.headerGlowSmall} />
      {onBackPress ? (
        <View style={screenLayout.backRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? 'Back'} onPress={onBackPress} style={screenLayout.backBtn} hitSlop={12}>
            <Text style={[scaled.back, rtl && styles.rtl]}>{backLabel ?? '← Back'}</Text>
          </Pressable>
        </View>
      ) : null}
      {eyebrow ? <Text style={[scaled.eyebrow, rtl && styles.rtl]}>{eyebrow}</Text> : null}
      <Text style={[scaled.title, rtl && styles.rtl]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={[scaled.sub, rtl && styles.rtl]}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  headerGlowLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124,77,255,0.38)',
    top: -72,
    right: -48,
  },
  headerGlowSmall: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(20,184,166,0.22)',
    bottom: -34,
    left: -24,
  },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
})
