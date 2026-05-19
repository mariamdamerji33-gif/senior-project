import type { NavigatorScreenParams } from '@react-navigation/native'

/** Child Mode + games (nested stack inside parent drawer). */
export type ParentActivitiesParamList = {
  ChildMode: { childId: string; childName?: string }
  ChildMatchingGame: { childId: string; childName?: string }
  ChildDailyGames: { childId: string; childName?: string }
  ChildPecs: { childId: string; childName?: string }
  ChildSpeechTraining: { childId: string; childName?: string }
  ChildDailyRoutine: { childId: string; childName?: string }
  ChildFeelingsCheckIn: { childId: string; childName?: string }
  ChildVideos: { childId: string; childName?: string }
}

/** Permanent left-rail + main content (family account). */
export type ParentDrawerParamList = {
  MainOverview: undefined
  ParentAccountProfile: undefined
  /** Plain-language explanation of the left blue menu (family accounts). */
  ParentMenuHelp: undefined
  ParentDashboardSheet: { childId: string; childName?: string }
  ParentDailyCheckIn: { childId: string; childName?: string }
  ParentChat: { childId: string; childName?: string }
  ParentProgressReports: { childId: string; childName?: string }
  ParentNotifications: undefined
  ParentWeeklySummary: undefined
  ParentCalendar: { childId: string; childName?: string }
  ParentDownloads: { childId: string; childName?: string }
  ParentAdminSupport: { childId: string; childName?: string }
  ParentSecuritySettings: undefined
  Activities: NavigatorScreenParams<ParentActivitiesParamList>
}

export type AdminDrawerParamList = {
  Summary: undefined
  AccountProfile: undefined
}
