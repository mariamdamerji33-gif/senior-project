import { useLayoutEffect } from 'react'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AppLanguage } from '../mvc/controllers/LanguageContextController'
import type { ParentActivitiesParamList } from './parentDrawerTypes'
import { useLanguage } from '../mvc/controllers/LanguageController'

export type ChildActivityScreenName = Exclude<keyof ParentActivitiesParamList, 'ChildMode'>

const TITLES: Record<AppLanguage, Record<ChildActivityScreenName, string>> = {
  en: {
    ChildPecs: 'PECS cards',
    ChildMatchingGame: 'Matching game',
    ChildDailyGames: 'Daily games',
    ChildSpeechTraining: 'Speech practice',
    ChildDailyRoutine: 'Daily routine',
    ChildFeelingsCheckIn: 'Feelings check-in',
    ChildVideos: 'Learning videos',
  },
  ar: {
    ChildPecs: 'بطاقات التواصل',
    ChildMatchingGame: 'لعبة المطابقة',
    ChildDailyGames: 'ألعاب يومية',
    ChildSpeechTraining: 'تمرين النطق',
    ChildDailyRoutine: 'الروتين اليومي',
    ChildFeelingsCheckIn: 'مشاعر اليوم',
    ChildVideos: 'فيديوهات تعلّم',
  },
}

/** Localized stack header title for child activity screens (not Child Mode). */
export function useSetChildActivityScreenTitle(
  navigation: NativeStackNavigationProp<ParentActivitiesParamList>,
  screen: ChildActivityScreenName,
) {
  const { language } = useLanguage()
  useLayoutEffect(() => {
    navigation.setOptions({ title: TITLES[language][screen] })
  }, [language, navigation, screen])
}
