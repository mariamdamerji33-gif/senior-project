import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { A11yUiPrefsProvider, AuthProvider } from '@/mvc/controllers'
import { ToastProvider } from '@/mvc/views/components/ToastProvider'
import { DashboardLayout } from '@/mvc/views/components/DashboardLayout'
import { RequireAuth } from '@/mvc/views/components/RequireAuth'
import { BlockFamilyWebAccess } from '@/mvc/views/components/BlockFamilyWebAccess'
import { RoleGuard } from '@/mvc/views/components/RoleGuard'
import { DashboardLanding } from '@/mvc/views/pages/DashboardLanding'
import { LoginPage } from '@/mvc/views/pages/LoginPage'
import { RegisterPage } from '@/mvc/views/pages/RegisterPage'
import { FamilyMobileOnlyPage } from '@/mvc/views/pages/FamilyMobileOnlyPage'
import { TeacherChildrenPage } from '@/mvc/views/pages/teacher/TeacherChildrenPage'
import { TeacherReportsPage } from '@/mvc/views/pages/teacher/TeacherReportsPage'
import { TeacherActivitiesPage } from '@/mvc/views/pages/teacher/TeacherActivitiesPage'
import { TeacherProgressPage } from '@/mvc/views/pages/teacher/TeacherProgressPage'
import { TeacherSessionsPage } from '@/mvc/views/pages/teacher/TeacherSessionsPage'
import { TeacherChatPage } from '@/mvc/views/pages/teacher/TeacherChatPage'
import { TeacherTreatmentPlansPage } from '@/mvc/views/pages/teacher/TeacherTreatmentPlansPage'
import { TeacherDailyCheckinsPage } from '@/mvc/views/pages/teacher/TeacherDailyCheckinsPage'
import { TeacherParentStepsPage } from '@/mvc/views/pages/teacher/TeacherParentStepsPage'
import { AdminAnalyticsPage } from '@/mvc/views/pages/admin/AdminAnalyticsPage'
import { AdminUsersPage } from '@/mvc/views/pages/admin/AdminUsersPage'
import { AdminRegistrationRequestsPage } from '@/mvc/views/pages/admin/AdminRegistrationRequestsPage'
import { AdminSupportInboxPage } from '@/mvc/views/pages/admin/AdminSupportInboxPage'
import { ManagerUsersPage } from '@/mvc/views/pages/manager/ManagerUsersPage'
import { ManagerParentProfilePage } from '@/mvc/views/pages/manager/ManagerParentProfilePage'
import { ManagerSessionsPage } from '@/mvc/views/pages/manager/ManagerSessionsPage'
import { ManagerReportsPage } from '@/mvc/views/pages/manager/ManagerReportsPage'
import { ManagerChildrenPage } from '@/mvc/views/pages/manager/ManagerChildrenPage'
import { StudentProfilePage } from '@/mvc/views/pages/StudentProfilePage'
import { PrivacyPolicyPage } from '@/mvc/views/pages/PrivacyPolicyPage'
import { TermsPage } from '@/mvc/views/pages/TermsPage'
import { NotFoundPage } from '@/mvc/views/pages/NotFoundPage'
import { ForgotPasswordPage } from '@/mvc/views/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/mvc/views/pages/ResetPasswordPage'
import { AccountProfilePage } from '@/mvc/views/pages/AccountProfilePage'
const familyWebRedirect = <Navigate to="/family-app" replace />

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <A11yUiPrefsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/family-app" element={<FamilyMobileOnlyPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <BlockFamilyWebAccess>
                    <DashboardLayout />
                  </BlockFamilyWebAccess>
                </RequireAuth>
              }
            >
              <Route index element={<DashboardLanding />} />
              <Route path="account" element={<AccountProfilePage />} />

              <Route
                path="student/:studentId"
                element={
                  <RoleGuard allowedRoles={['super_admin', 'manager', 'therapist']}>
                    <StudentProfilePage />
                  </RoleGuard>
                }
              />

              <Route
                path="analytics"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminAnalyticsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="admin-users"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminUsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="admin-registration-requests"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminRegistrationRequestsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="support-inbox"
                element={
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <AdminSupportInboxPage />
                  </RoleGuard>
                }
              />

              <Route
                path="users"
                element={
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <ManagerUsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="users/parent/:parentUserId"
                element={
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <ManagerParentProfilePage />
                  </RoleGuard>
                }
              />
              <Route
                path="children-management"
                element={
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <ManagerChildrenPage />
                  </RoleGuard>
                }
              />
              <Route
                path="sessions"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <ManagerSessionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="reports"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <ManagerReportsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="children"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherChildrenPage />
                  </RoleGuard>
                }
              />
              <Route
                path="activities"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherActivitiesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-reports"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-progress"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherProgressPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-sessions"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherSessionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-chat"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherChatPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-treatment"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherTreatmentPlansPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-daily-checkins"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherDailyCheckinsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="teacher-steps"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TeacherParentStepsPage />
                  </RoleGuard>
                }
              />

              <Route path="therapist-reports" element={<Navigate to="/dashboard/teacher-reports" replace />} />
              <Route path="therapist-progress" element={<Navigate to="/dashboard/teacher-progress" replace />} />
              <Route path="therapist-sessions" element={<Navigate to="/dashboard/teacher-sessions" replace />} />
              <Route path="therapist-chat" element={<Navigate to="/dashboard/teacher-chat" replace />} />
              <Route path="therapist-treatment" element={<Navigate to="/dashboard/teacher-treatment" replace />} />
              <Route path="therapist-daily-checkins" element={<Navigate to="/dashboard/teacher-daily-checkins" replace />} />
              <Route path="therapist-steps" element={<Navigate to="/dashboard/teacher-steps" replace />} />

              <Route path="parent-daily-checkin" element={familyWebRedirect} />
              <Route path="child-space" element={familyWebRedirect} />
              <Route path="parent-treatment" element={familyWebRedirect} />
              <Route path="parent-steps" element={familyWebRedirect} />
              <Route path="parent-progress" element={familyWebRedirect} />
              <Route path="parent-reports" element={familyWebRedirect} />
              <Route path="parent-chat" element={familyWebRedirect} />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        </A11yUiPrefsProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
