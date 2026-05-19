import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native'
import { colors } from '../../../theme/colors'

type Props = {
  active: 'login' | 'register'
  signInLabel: string
  createAccountLabel: string
  onSignIn: () => void
  onCreateAccount: () => void
  textStyle?: (style: TextStyle | TextStyle[]) => TextStyle
  isArabic?: boolean
}

export function AuthAccountTabs({
  active,
  signInLabel,
  createAccountLabel,
  onSignIn,
  onCreateAccount,
  textStyle,
  isArabic,
}: Props) {
  const t = textStyle ?? ((s: TextStyle | TextStyle[]) => StyleSheet.flatten(s) as TextStyle)

  return (
    <View style={[styles.row, isArabic && styles.rowRtl]}>
      <Pressable
        style={[styles.tab, active === 'login' && styles.tabActive]}
        onPress={onSignIn}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'login' }}
      >
        <Text style={[t(styles.tabText), active === 'login' && styles.tabTextActive]}>{signInLabel}</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, active === 'register' && styles.tabActive]}
        onPress={onCreateAccount}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'register' }}
      >
        <Text style={[t(styles.tabText), active === 'register' && styles.tabTextActive]}>{createAccountLabel}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.outlineBorder,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
})
