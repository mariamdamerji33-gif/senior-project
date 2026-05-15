import type { ReactNode } from 'react'
import {
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDisplayComfort } from '../../controllers/DisplayComfortController'
import { BrandWallpaperDecor } from './BrandWallpaperDecor'
import { ScreenHeaderBand } from './ScreenHeaderBand'
import { screenLayout } from '../../../theme/layout'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  onBackPress?: () => void
  backLabel?: string
  rtl?: boolean
  children: ReactNode
  scrollContentStyle?: StyleProp<ViewStyle>
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never'
  /** Pull-to-refresh (e.g. after coordinator updates profile on the website). */
  refreshing?: boolean
  onRefresh?: () => void | Promise<void>
}

/**
 * Standard parent screen: safe area, purple header band, sheet-style body with consistent padding.
 */
export function ScreenScrollPage({
  eyebrow,
  title,
  subtitle,
  onBackPress,
  backLabel,
  rtl,
  children,
  scrollContentStyle,
  keyboardShouldPersistTaps = 'handled',
  refreshing = false,
  onRefresh,
}: Props) {
  const { appColors, highContrast } = useDisplayComfort()

  return (
    <SafeAreaView style={[screenLayout.pageBg, { backgroundColor: appColors.pageBg }]} edges={['top', 'left', 'right']}>
      <BrandWallpaperDecor />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[screenLayout.scrollOuter, scrollContentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh()
              }}
            />
          ) : undefined
        }
      >
        <ScreenHeaderBand
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          backLabel={backLabel}
          rtl={rtl}
        />
        <View style={[screenLayout.bodySheet, highContrast && { gap: 14 }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}

type CardProps = { children: ReactNode; style?: StyleProp<ViewStyle> }

export function ScreenCard({ children, style }: CardProps) {
  const { appColors, highContrast } = useDisplayComfort()
  return (
    <View
      style={[
        screenLayout.elevatedCard,
        { backgroundColor: appColors.surface, borderColor: appColors.outlineBorder },
        highContrast && { borderWidth: 2 },
        style,
      ]}
    >
      {children}
    </View>
  )
}
