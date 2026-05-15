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
import { TherapistChildrenPage } from '@/mvc/views/pages/therapist/TherapistChildrenPage'
import { TherapistReportsPage } from '@/mvc/views/pages/therapist/TherapistReportsPage'
import { TherapistActivitiesPage } from '@/mvc/views/pages/therapist/TherapistActivitiesPage'
import { TherapistProgressPage } from '@/mvc/views/pages/therapist/TherapistProgressPage'
import { TherapistSessionsPage } from '@/mvc/views/pages/therapist/TherapistSessionsPage'
import { TherapistChatPage } from '@/mvc/views/pages/therapist/TherapistChatPage'
import { TherapistTreatmentPlansPage } from '@/mvc/views/pages/therapist/TherapistTreatmentPlansPage'
import { TherapistDailyCheckinsPage } from '@/mvc/views/pages/therapist/TherapistDailyCheckinsPage'
import { TherapistParentStepsPage } from '@/mvc/views/pages/therapist/TherapistParentStepsPage'
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
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <ManagerSessionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="reports"
                element={
                  <RoleGuard allowedRoles={['manager', 'super_admin']}>
                    <ManagerReportsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="children"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistChildrenPage />
                  </RoleGuard>
                }
              />
              <Route
                path="activities"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistActivitiesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-reports"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-progress"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistProgressPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-sessions"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistSessionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-chat"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistChatPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-treatment"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistTreatmentPlansPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-daily-checkins"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistDailyCheckinsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="therapist-steps"
                element={
                  <RoleGuard allowedRoles={['therapist', 'super_admin']}>
                    <TherapistParentStepsPage />
                  </RoleGuard>
                }
              />

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
