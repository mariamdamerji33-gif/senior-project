import { useAuth } from '../mvc/controllers/AuthController'
import { ParentDrawerNavigator } from './ParentDrawerNavigator'
import { AdminDrawerNavigator } from './AdminDrawerNavigator'

/** Logged-in entry: drawer shell (persistent left rail) + routed main content */
export function HomeRouter() {
  const { user } = useAuth()
  if (user?.role === 'super_admin' || user?.role === 'manager') {
    return <AdminDrawerNavigator />
  }
  return <ParentDrawerNavigator />
}
