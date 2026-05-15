import type { DrawerScreenProps } from '@react-navigation/drawer'
import { useAuth } from '../../controllers/AuthController'
import { useLanguage } from '../../controllers/LanguageController'
import type { ParentDrawerParamList } from '../../../navigation/parentDrawerTypes'
import { StaffAccountProfileBody } from './AccountProfileScreen'
import { ParentAccountProfileScreen } from './FamilyProfileScreen'

type Props = DrawerScreenProps<ParentDrawerParamList, 'ParentAccountProfile'>

/**
 * Family drawer → Profile: parents see read-only school-managed fields; teachers (and any other
 * non-parent role in this shell) get the same editable profile as on the web.
 */
export function ProfileDrawerScreen(props: Props) {
  const { user } = useAuth()
  const { language } = useLanguage()

  if (user?.role === 'parent') {
    return <ParentAccountProfileScreen {...props} />
  }

  const back = language === 'en' ? '← Today' : '← اليوم'
  return (
    <StaffAccountProfileBody
      onBack={() => props.navigation.navigate('MainOverview')}
      backLabel={back}
      onOpenSecurity={() => props.navigation.navigate('ParentSecuritySettings')}
      showLogout
    />
  )
}
