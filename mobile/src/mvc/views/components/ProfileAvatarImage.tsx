import { useEffect, useRef, useState } from 'react'
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

function initials(name: string | null | undefined) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const s = parts.map((p) => p[0]).join('')
  return (s || '?').toUpperCase().slice(0, 2)
}

type Props = {
  photoUrl?: string | null
  /** When set (from `/api/auth/me`), same path keeps the previous signed URL so RN can use disk cache until load errors. */
  photoStoragePath?: string | null
  name?: string | null
  size: number
  wrapStyle?: StyleProp<ViewStyle>
  imageStyle?: StyleProp<ImageStyle>
  initialsStyle?: StyleProp<TextStyle>
  onPhotoLoadError?: () => void
}

/** Profile portrait with initials fallback; avoids swapping Supabase signed URLs on every profile refresh when the file is unchanged. */
export function ProfileAvatarImage({
  photoUrl,
  photoStoragePath,
  name,
  size,
  wrapStyle,
  imageStyle,
  initialsStyle,
  onPhotoLoadError,
}: Props) {
  const path = (photoStoragePath ?? '').trim()
  const latest = (photoUrl ?? '').trim()

  const [displayUri, setDisplayUri] = useState(latest)
  const [loadFailed, setLoadFailed] = useState(false)
  const hadSuccessRef = useRef(false)
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!latest) {
      lastPathRef.current = null
      hadSuccessRef.current = false
      setDisplayUri('')
      setLoadFailed(false)
      return
    }
    if (!path) {
      lastPathRef.current = null
      hadSuccessRef.current = false
      setDisplayUri((prev) => (prev === latest ? prev : latest))
      setLoadFailed(false)
      return
    }
    if (path !== lastPathRef.current) {
      lastPathRef.current = path
      hadSuccessRef.current = false
      setDisplayUri(latest)
      setLoadFailed(false)
      return
    }
    if (!hadSuccessRef.current && latest !== displayUri) {
      setDisplayUri(latest)
      setLoadFailed(false)
    }
  }, [path, latest, displayUri])

  const showPhoto = Boolean(displayUri) && !loadFailed

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, wrapStyle]}>
      {showPhoto ? (
        <Image
          source={{ uri: displayUri }}
          style={[styles.img, { width: size, height: size }, imageStyle]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onLoad={() => {
            if (path) hadSuccessRef.current = true
          }}
          onError={() => {
            hadSuccessRef.current = false
            if (latest && latest !== displayUri) {
              setDisplayUri(latest)
              setLoadFailed(false)
              return
            }
            setLoadFailed(true)
            onPhotoLoadError?.()
          }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.3) }, initialsStyle]}>
          {initials(name)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#eff6ff',
  },
  img: {},
  initials: { fontWeight: '900', color: '#1d4ed8' },
})
