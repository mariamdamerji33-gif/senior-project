import { Pressable, StyleSheet, Text, View } from 'react-native'

export type InlineLoadErrorProps = {
  title: string
  message: string
  hint?: string
  onRetry?: () => void
  retryLabel?: string
  loadingLabel?: string
  retrying?: boolean
  /** Right-align text for Arabic */
  rtl?: boolean
}

/**
 * Consistent inline error surface for API / network failures (parent app screens).
 */
export function InlineLoadError({
  title,
  message,
  hint,
  onRetry,
  retryLabel = 'Try again',
  loadingLabel = 'Loading...',
  retrying = false,
  rtl = false,
}: InlineLoadErrorProps) {
  return (
    <View style={[styles.wrap, rtl && styles.wrapRtl]} accessibilityRole="alert">
      <View style={styles.accent} />
      <View style={styles.body}>
        <Text style={[styles.title, rtl && styles.rtl]}>{title}</Text>
        <Text style={[styles.message, rtl && styles.rtl]}>{message}</Text>
        {hint ? <Text style={[styles.hint, rtl && styles.rtl]}>{hint}</Text> : null}
        {onRetry ? (
          <Pressable
            style={[styles.retry, retrying && styles.retryDisabled]}
            onPress={onRetry}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel={retrying ? loadingLabel : retryLabel}
          >
            <Text style={styles.retryText}>{retrying ? loadingLabel : retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapRtl: { flexDirection: 'row-reverse' },
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
    overflow: 'hidden',
    shadowColor: '#450a0a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    width: 4,
    backgroundColor: '#e11d48',
  },
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  title: {
    color: '#9f1239',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  message: {
    color: '#881337',
    fontSize: 13,
    lineHeight: 19,
  },
  hint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fda4af',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  retryDisabled: { opacity: 0.65 },
  retryText: { color: '#be123c', fontWeight: '700', fontSize: 14 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
})
