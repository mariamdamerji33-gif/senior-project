import { StyleSheet } from 'react-native'
import { colors } from './colors'

/** Horizontal padding for screen body (cards sit inside this gutter). */
export const PAGE_PAD = 18

const cardShadow = {
  shadowColor: colors.primaryDeep,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.11,
  shadowRadius: 22,
  elevation: 5,
}

export const screenLayout = StyleSheet.create({
  pageBg: { flex: 1, backgroundColor: colors.pageBg },
  scrollOuter: { flexGrow: 1, paddingBottom: 28 },
  /** Blue hero — full width inside scroll. */
  headerBand: {
    backgroundColor: colors.primaryDeep,
    paddingHorizontal: PAGE_PAD + 2,
    paddingTop: 14,
    paddingBottom: 34,
    minHeight: 132,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  headerEyebrow: {
    color: colors.onDarkEyebrow,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  headerTitle: {
    color: colors.onDark,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    color: colors.onDarkSubtitle,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 22,
  },
  backRow: { marginBottom: 4 },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  backText: { color: colors.onDark, fontWeight: '800', fontSize: 15 },
  /** Pulls cards up slightly under the rounded header for a sheet look. */
  bodySheet: {
    marginTop: -18,
    paddingHorizontal: PAGE_PAD,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 16,
  },
  elevatedCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    padding: 18,
    minHeight: 72,
    gap: 12,
    ...cardShadow,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.2,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '600',
  },
})
