import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../../../theme/colors'

const LOGO = require('../../../../assets/icon.png')

/**
 * Full-screen decorative layer — blue brand wallpaper (aligned with website).
 * Place behind navigation or screen content; screen roots should use transparent backgrounds.
 */
export function BrandWallpaperDecor() {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <View style={styles.blobMid} />
      <View style={styles.markWrap}>
        <Image source={LOGO} style={styles.mark} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: colors.pageBg,
  },
  blobTop: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    top: -150,
    right: -130,
  },
  blobBottom: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(29, 78, 216, 0.08)',
    bottom: -120,
    left: -140,
  },
  blobMid: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    top: '36%',
    left: -100,
  },
  markWrap: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mark: {
    width: 320,
    height: 320,
    opacity: 0.04,
  },
})
