import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import type { RootStackParamList } from './types'
import { HomeRouter } from './HomeRouter'
import { useAuth } from '../mvc/controllers/AuthController'
import { useDisplayComfort } from '../mvc/controllers/DisplayComfortController'
import { BrandWallpaperDecor } from '../mvc/views/components/BrandWallpaperDecor'
import { LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen } from '../mvc/views/screens'

export type { AuthStackParamList, RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  const { user, loading } = useAuth()
  const { appColors } = useDisplayComfort()

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: appColors.pageBg }]}>
        <BrandWallpaperDecor />
        <ActivityIndicator color={appColors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: appColors.pageBg }]}>
      <BrandWallpaperDecor />
      <Stack.Navigator
        key={user ? `signed-in-${user.id}` : 'signed-out'}
        initialRouteName={user ? 'Home' : 'Login'}
        screenOptions={{
          contentStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'rgba(239, 246, 255, 0.94)' },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot password' }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset password' }} />
          </>
        ) : (
          <Stack.Screen
            name="Home"
            component={HomeRouter}
            options={{
              headerShown: false,
              title: 'Autism School Mobile',
            }}
          />
        )}
      </Stack.Navigator>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
