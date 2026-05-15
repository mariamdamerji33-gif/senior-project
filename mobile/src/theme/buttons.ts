import { StyleSheet } from 'react-native'
import { colors } from './colors'

const primaryShadow = {
  shadowColor: colors.primaryDeep,
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.24,
  shadowRadius: 12,
  elevation: 4,
}

/**
 * Shared CTA styles — use with Pressable: `style={[appButton.primary, disabled && appButton.disabled]}`
 */
export const appButton = StyleSheet.create({
  disabled: { opacity: 0.55 },
  muted: { opacity: 0.6 },

  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...primaryShadow,
  },
  primaryCompact: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...primaryShadow,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  primaryTextCompact: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  secondary: {
    backgroundColor: colors.secondarySurface,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
  },
  secondaryText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 15,
  },

  outline: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
  },
  outlineText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
})
