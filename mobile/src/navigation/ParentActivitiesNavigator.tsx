import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from './parentDrawerTypes'
import {
  ChildDailyGamesScreen,
  ChildDailyRoutineScreen,
  ChildFeelingsCheckInScreen,
  ChildMatchingGameScreen,
  ChildModeScreen,
  ChildPecsScreen,
  ChildSpeechTrainingScreen,
  ChildVideosScreen,
} from '../mvc/views/screens'
import { colors } from '../theme/colors'

const Stack = createNativeStackNavigator<ParentActivitiesParamList>()

const activityHeader = {
  headerShown: true as const,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'rgba(248, 245, 255, 0.98)' },
  headerTitleStyle: { fontWeight: '800' as const, color: colors.textTitle, fontSize: 17 },
  headerTintColor: colors.primary,
  headerBackButtonDisplayMode: 'minimal' as const,
}

export function ParentActivitiesNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ChildMode"
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="ChildMode" component={ChildModeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChildPecs" component={ChildPecsScreen} options={activityHeader} />
      <Stack.Screen name="ChildMatchingGame" component={ChildMatchingGameScreen} options={activityHeader} />
      <Stack.Screen name="ChildDailyGames" component={ChildDailyGamesScreen} options={activityHeader} />
      <Stack.Screen name="ChildSpeechTraining" component={ChildSpeechTrainingScreen} options={activityHeader} />
      <Stack.Screen name="ChildDailyRoutine" component={ChildDailyRoutineScreen} options={activityHeader} />
      <Stack.Screen name="ChildFeelingsCheckIn" component={ChildFeelingsCheckInScreen} options={activityHeader} />
      <Stack.Screen name="ChildVideos" component={ChildVideosScreen} options={activityHeader} />
    </Stack.Navigator>
  )
}
