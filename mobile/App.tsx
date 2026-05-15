import 'react-native-gesture-handler'
import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { AuthProvider, DisplayComfortProvider, LanguageProvider } from './src/mvc/controllers'
import { AppNavigator } from './src/navigation/AppNavigator'
import { BrandWallpaperDecor } from './src/mvc/views/components/BrandWallpaperDecor'
import { colors } from './src/theme/colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
} catch (e) {
  if (__DEV__) {
    console.warn('expo-notifications handler not available (e.g. limited Expo Go build):', e)
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 900)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <BrandWallpaperDecor />
        <StatusBar style="dark" />
        <View style={styles.splashBlobTop} />
        <View style={styles.splashBlobBottom} />
        <View style={styles.splashCard}>
          <View style={styles.splashLogoWrap}>
            <Image source={require('./assets/icon.png')} style={styles.splashLogo} resizeMode="contain" />
          </View>
          <Text style={styles.splashKicker}>Family learning space</Text>
          <Text style={styles.splashTitle}>Autism School Platform</Text>
          <Text style={styles.splashText}>Communication & Learning</Text>
          <View style={styles.splashPills}>
            <Text style={styles.splashPill}>Progress</Text>
            <Text style={styles.splashPill}>Chat</Text>
            <Text style={styles.splashPill}>Activities</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <DisplayComfortProvider>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationContainer>
                  <StatusBar style="dark" />
                  <AppNavigator />
                </NavigationContainer>
              </GestureHandlerRootView>
            </AuthProvider>
          </DisplayComfortProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f2ff',
    overflow: 'hidden',
  },
  splashBlobTop: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#e5d8ff',
    top: -88,
    right: -96,
  },
  splashBlobBottom: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#dcf7f0',
    bottom: -80,
    left: -96,
  },
  splashCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#e5dcfb',
    paddingVertical: 30,
    paddingHorizontal: 22,
    shadowColor: '#2d195a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  splashLogoWrap: {
    width: 150,
    height: 150,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5dcfb',
    marginBottom: 18,
    shadowColor: '#5b21b6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  splashLogo: {
    width: 124,
    height: 124,
    borderRadius: 30,
  },
  splashKicker: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  splashTitle: {
    color: '#17131f',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 30,
  },
  splashText: {
    marginTop: 8,
    color: '#6d46d4',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  splashPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  splashPill: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.secondarySurface,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
})
