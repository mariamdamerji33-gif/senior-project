import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

export type ConfirmTone = 'primary' | 'danger'

export type ConfirmDialogProps = {
  visible: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  tone?: ConfirmTone
  /** Right-to-left layout for Arabic. */
  rtl?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * In-app confirmation modal (destructive actions, logout, etc.).
 * Prefer this over raw Alert when you want consistent styling with the rest of the app.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  tone = 'danger',
  rtl,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <Text style={[styles.title, rtl && styles.textRtl]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.body, rtl && styles.textRtl]}>{message}</Text>
          <View style={[styles.actions, rtl && styles.actionsRtl]}>
            <Pressable style={[styles.btnGhost, rtl && styles.btnGhostRtl]} onPress={onCancel} hitSlop={8}>
              <Text style={[styles.btnGhostText, rtl && styles.textRtl]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, tone === 'danger' && styles.btnDanger]}
              onPress={onConfirm}
              hitSlop={8}
            >
              <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 19, 31, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#2e1065',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: '#475569',
  },
  textRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#dbeafe',
    minWidth: 108,
    alignItems: 'center',
  },
  btnGhostRtl: {
    minWidth: 108,
  },
  btnGhostText: {
    color: '#1e40af',
    fontWeight: '800',
    fontSize: 15,
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    minWidth: 108,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: '#b91c1c',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
})
