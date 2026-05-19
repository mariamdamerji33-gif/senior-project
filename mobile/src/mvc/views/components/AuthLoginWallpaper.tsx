import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../../../theme/colors'

const LOGO = require('../../../../assets/icon.png')

/** Matches website `.auth-page` light blue wallpaper (`frontend/src/index.css`). */
export function AuthLoginWallpaper() {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={styles.base} />
      <View style={styles.bottomFade} />
      <View style={styles.blobTop} />
      <View style={styles.blobBottomRight} />
      <View style={styles.blobBottomLeft} />
      <View style={styles.watermarkWrap}>
        <Image source={LOGO} style={styles.watermark} resizeMode="contain" accessibilityIgnoresInvertColors />
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
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    opacity: 0.55,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: colors.secondarySurface,
    opacity: 0.45,
  },
  blobTop: {
    position: 'absolute',
    width: 360,
    height: 280,
    borderRadius: 180,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
    top: -72,
    alignSelf: 'center',
    left: '12%',
  },
  blobBottomRight: {
    position: 'absolute',
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: 'rgba(29, 78, 216, 0.1)',
    bottom: 24,
    right: -72,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 240,
    height: 200,
    borderRadius: 120,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    bottom: 48,
    left: -80,
  },
  watermarkWrap: {
    position: 'absolute',
    top: '14%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.04,
  },
})
