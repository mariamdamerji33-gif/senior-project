import { createDrawerNavigator } from '@react-navigation/drawer'
import { useWindowDimensions } from 'react-native'
import { colors } from '../theme/colors'
import { ParentDrawerSidebar } from './ParentDrawerSidebar'
import { ParentActivitiesNavigator } from './ParentActivitiesNavigator'
import type { ParentDrawerParamList } from './parentDrawerTypes'
import {
  ProfileDrawerScreen,
  ParentAdminSupportScreen,
  ParentCalendarScreen,
  ParentChatScreen,
  ParentDailyCheckInScreen,
  ParentDashboardSheetScreen,
  ParentDownloadsScreen,
  ParentMainOverviewScreen,
  ParentMenuHelpScreen,
  ParentNotificationsScreen,
  ParentProgressReportsScreen,
  ParentSecuritySettingsScreen,
  ParentWeeklySummaryScreen,
} from '../mvc/views/screens'

const Drawer = createDrawerNavigator<ParentDrawerParamList>()

export function ParentDrawerNavigator() {
  const { width } = useWindowDimensions()
  const drawerWidth = width < 390 ? 88 : width >= 768 ? 112 : 96

  return (
    <Drawer.Navigator
      initialRouteName="MainOverview"
      drawerContent={(props) => <ParentDrawerSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerType: 'permanent',
        /** Blue rail: navigation only (alerts live on the Today home card, top right). */
        drawerPosition: 'left',
        sceneStyle: { flex: 1, backgroundColor: colors.pageBg },
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: 'transparent',
          borderRightWidth: 0,
        },
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen name="ParentAccountProfile" component={ProfileDrawerScreen} options={{ title: 'Profile and security' }} />
      <Drawer.Screen name="MainOverview" component={ParentMainOverviewScreen} options={{ title: 'Today' }} />
      <Drawer.Screen name="ParentMenuHelp" component={ParentMenuHelpScreen} options={{ title: 'Menu guide' }} />
      <Drawer.Screen name="ParentDashboardSheet" component={ParentDashboardSheetScreen} />
      <Drawer.Screen name="ParentDailyCheckIn" component={ParentDailyCheckInScreen} />
      <Drawer.Screen name="ParentChat" component={ParentChatScreen} />
      <Drawer.Screen name="ParentProgressReports" component={ParentProgressReportsScreen} />
      <Drawer.Screen name="ParentNotifications" component={ParentNotificationsScreen} />
      <Drawer.Screen name="ParentWeeklySummary" component={ParentWeeklySummaryScreen} />
      <Drawer.Screen name="ParentCalendar" component={ParentCalendarScreen} />
      <Drawer.Screen name="ParentDownloads" component={ParentDownloadsScreen} />
      <Drawer.Screen name="ParentAdminSupport" component={ParentAdminSupportScreen} />
      <Drawer.Screen name="ParentSecuritySettings" component={ParentSecuritySettingsScreen} />
      <Drawer.Screen name="Activities" component={ParentActivitiesNavigator} options={{ title: 'Activities' }} />
    </Drawer.Navigator>
  )
}
