import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { api } from '@/mvc/models/apiClient'
import { StatCard } from '@/mvc/views/components/ui/StatCard'

function ActionCard({
  step,
  title,
  text,
  to,
}: {
  step: string
  title: string
  text: string
  to: string
}) {
  return (
    <Link to={to} className="pro-actionCard">
      <span className="pro-actionStep">{step}</span>
      <span className="pro-actionBody">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <span className="pro-actionArrow" aria-hidden>
        →
      </span>
    </Link>
  )
}

export function DashboardLanding() {
  const { user, token } = useAuth()
  const role = user?.role

  const title =
    role === 'super_admin'
      ? 'School Admin Overview'
      : role === 'manager'
        ? 'Coordinator Overview'
        : role === 'therapist'
          ? 'Teacher Overview'
          : role === 'parent'
            ? 'Family Overview'
            : 'Dashboard'

  const subtitle =
    role === 'super_admin'
      ? 'Staff tools in the browser. Families use the mobile app only.'
      : role === 'manager'
        ? 'Manage students and staff accounts.'
        : role === 'therapist'
          ? 'Add notes & reports and track progress.'
          : role === 'parent'
            ? 'Daily check-ins, progress, plans, and school chat — same school account as the mobile app.'
            : 'Sign in to see your workspace.'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})

  const startActions =
    role === 'super_admin'
      ? [
          { step: '1', title: 'Check analytics', text: 'See the full school numbers.', to: '/dashboard/analytics' },
          { step: '2', title: 'Review requests', text: 'Approve or reject Teacher, Coordinator, and School Admin sign-ups.', to: '/dashboard/admin-registration-requests' },
          { step: '3', title: 'Open support inbox', text: 'Handle urgent mobile family messages.', to: '/dashboard/support-inbox' },
        ]
      : role === 'manager'
        ? [
            { step: '1', title: 'Manage students', text: 'Create students and assign family/teacher.', to: '/dashboard/children-management' },
            { step: '2', title: 'Support inbox', text: 'Handle urgent messages from mobile families.', to: '/dashboard/support-inbox' },
          ]
        : role === 'therapist'
          ? [
              { step: '1', title: 'Open students', text: 'Choose the child you are working with.', to: '/dashboard/children' },
              { step: '2', title: 'Plan sessions', text: 'Schedule and update therapy sessions.', to: '/dashboard/teacher-sessions' },
              { step: '3', title: 'Add progress', text: 'Record activity scores and updates.', to: '/dashboard/teacher-progress' },
              { step: '4', title: 'Message family', text: 'Send steps or chat with parents.', to: '/dashboard/teacher-chat' },
            ]
          : role === 'parent'
            ? [
                {
                  step: '1',
                  title: 'Use the mobile app',
                  text: 'Family accounts sign in on Autism School Mobile (not this website).',
                  to: '/family-app',
                },
                {
                  step: '2',
                  title: 'Daily check-in & activities',
                  text: 'Check-ins, child games, chat, and reports are in the app.',
                  to: '/family-app',
                },
                {
                  step: '3',
                  title: 'Need help?',
                  text: 'Ask your coordinator for the Expo link or APK.',
                  to: '/family-app',
                },
              ]
            : []

  useEffect(() => {
    if (!token || !role) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        if (role === 'super_admin') {
          const res = await api.adminAnalytics(token)
          const c = res.counts || {}
          if (!cancelled) {
            setStats({
              users: c.users ?? 0,
              children: c.children ?? 0,
              sessions: c.sessions ?? 0,
              reports: c.reports ?? 0,
              activities: c.activities ?? 0,
            })
          }
          return
        }

        if (role === 'manager') {
          const [usersRes, childrenRes] = await Promise.all([
            api.managerUsers(token),
            api.managerChildren(token),
          ])
          if (!cancelled) {
            setStats({
              users: usersRes.users?.length ?? 0,
              children: childrenRes.children?.length ?? 0,
            })
          }
          return
        }

        if (role === 'therapist') {
          const res = await api.teacherOverview(token)
          const c = res.counts || {}
          if (!cancelled) {
            setStats({
              children: c.children ?? 0,
              activities: c.activities ?? 0,
              reports: c.reports ?? 0,
              sessions: c.sessions ?? 0,
            })
          }
          return
        }

        if (role === 'parent') {
          const [childrenRes, notifRes] = await Promise.all([
            api.parentChildren(token),
            api.parentNotifications(token).catch(() => ({ notifications: [] as unknown[] })),
          ])
          const children = childrenRes.children ?? []
          const firstId = children[0]?.id as string | undefined
          let reports = 0
          let checkins = 0
          if (firstId) {
            const [repRes, checkRes] = await Promise.all([
              api.parentReports(token, firstId),
              api.parentDailyCheckins(token, firstId),
            ])
            reports = repRes.reports?.length ?? 0
            checkins = checkRes.checkins?.length ?? 0
          }
          if (!cancelled) {
            setStats({
              children: children.length,
              reports,
              checkins,
              notifications: notifRes.notifications?.length ?? 0,
            })
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load overview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, role])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">{title}</h2>
      <p className="ui-pageLead">{subtitle}</p>

      {!token && <p className="ui-textMuted">Sign in to see your overview.</p>}

      {token && loading && <p className="ui-textMuted">Loading overview…</p>}
      {error ? (
        <div>
          <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
            {error}
          </div>
          {error.includes('API route not found') ? (
            <p className="ui-helpText" style={{ marginTop: 10 }}>
              The API server is running old code. Stop it, then start again from the <code>backend</code> folder (
              <code>npm start</code>), and hard-refresh this page. Teacher dashboard needs{' '}
              <code>GET /api/teacher/overview</code>.
            </p>
          ) : null}
        </div>
      ) : null}

      {token && !loading && !error && startActions.length > 0 ? (
        <section className="pro-startHere" aria-label="Start here">
          <div className="pro-sectionIntro">
            <div className="pro-sectionKicker">Start here</div>
            <h3>What should I do first?</h3>
            <p>Use these shortcuts for your role.</p>
          </div>
          <div className="pro-actionGrid">
            {startActions.map((action) => (
              <ActionCard key={action.title} {...action} />
            ))}
          </div>
        </section>
      ) : null}

      {token && !loading && !error && role === 'super_admin' && (
        <div className="ui-statGrid">
          <StatCard label="Users" value={stats.users ?? 0} hint="All active accounts" tone="blue" />
          <StatCard label="Students" value={stats.children ?? 0} hint="Linked records" tone="teal" />
          <StatCard label="Sessions" value={stats.sessions ?? 0} hint="Scheduled work" tone="blue" />
          <StatCard label="Notes & reports" value={stats.reports ?? 0} hint="Clinical notes" tone="gold" />
          <StatCard label="Activities" value={stats.activities ?? 0} hint="Learning tools" tone="rose" />
        </div>
      )}

      {token && !loading && !error && role === 'manager' && (
        <div className="ui-statGrid">
          <StatCard label="Users" value={stats.users ?? 0} hint="Staff and families" tone="blue" />
          <StatCard label="Students" value={stats.children ?? 0} hint="Managed students" tone="teal" />
        </div>
      )}

      {token && !loading && !error && role === 'therapist' && (
        <div className="ui-statGrid">
          <StatCard label="Assigned students" value={stats.children ?? 0} hint="Your caseload" tone="teal" />
          <StatCard
            label="Sessions"
            value={stats.sessions ?? 0}
            hint="Open schedule"
            tone="blue"
            to="/dashboard/teacher-sessions"
          />
          <StatCard label="Activities" value={stats.activities ?? 0} hint="Learning library" tone="blue" />
          <StatCard label="Notes & reports (all)" value={stats.reports ?? 0} hint="Documentation" tone="gold" />
        </div>
      )}

      {token && !loading && !error && role === 'parent' && (
        <div className="ui-statGrid">
          <StatCard label="Linked students" value={stats.children ?? 0} hint="From your school" tone="teal" />
          <StatCard label="Daily check-ins saved" value={stats.checkins ?? 0} hint="For your first linked student" tone="blue" />
          <StatCard label="Notes & reports" value={stats.reports ?? 0} hint="Visible to your family" tone="gold" />
          <StatCard label="Notifications" value={stats.notifications ?? 0} hint="From the school" tone="blue" />
        </div>
      )}
    </div>
  )
}
