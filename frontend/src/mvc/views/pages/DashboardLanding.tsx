import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { api } from '@/mvc/models/apiClient'
import { Card } from '@/mvc/views/components/ui/Card'

type StatTone = 'purple' | 'teal' | 'blue' | 'gold' | 'rose'

function StatCard({
  label,
  value,
  hint,
  tone = 'purple',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: StatTone
}) {
  return (
    <Card className={`ui-cardSoft ui-statCardPro ui-statCardPro--${tone}`}>
      <div className="ui-statCard-icon" aria-hidden>
        {tone === 'teal' ? '✓' : tone === 'blue' ? '↗' : tone === 'gold' ? '★' : tone === 'rose' ? '!' : '●'}
      </div>
      <div>
        <div className="ui-statCard-label">{label}</div>
        <div className="ui-statCard-value">{value}</div>
        {hint ? <div className="ui-statCard-hint">{hint}</div> : null}
      </div>
    </Card>
  )
}

function ProgressBar({ label, value, tone = 'purple' }: { label: string; value: number; tone?: StatTone }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="pro-progressItem">
      <div className="pro-progressTop">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="pro-progressTrack">
        <div className={`pro-progressFill pro-progressFill--${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

function InsightCard({ title, text, tone = 'purple' }: { title: string; text: string; tone?: StatTone }) {
  return (
    <Card className={`pro-insightCard pro-insightCard--${tone}`}>
      <div className="pro-insightKicker">{tone === 'rose' ? 'Needs attention' : 'Recommended'}</div>
      <div className="pro-insightTitle">{title}</div>
      <p className="pro-insightText">{text}</p>
    </Card>
  )
}

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
        ? 'Organize sessions and review notes & reports.'
        : role === 'therapist'
          ? 'Add notes & reports and track progress.'
          : role === 'parent'
            ? 'Daily check-ins, progress, plans, and school chat — same school account as the mobile app.'
            : 'Sign in to see your workspace.'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})

  const totalActivity = useMemo(() => Object.values(stats).reduce((sum, n) => sum + Number(n || 0), 0), [stats])
  const dashboardHealth = useMemo(() => {
    if (!role) return 0
    if (role === 'parent') {
      const children = stats.children ?? 0
      const checkins = stats.checkins ?? 0
      const reports = stats.reports ?? 0
      const notifications = stats.notifications ?? 0
      return Math.min(
        96,
        34 +
          Math.min(26, children * 12) +
          Math.min(18, checkins * 2) +
          Math.min(14, reports * 2) +
          Math.min(12, notifications * 4),
      )
    }
    const reports = stats.reports ?? 0
    const sessions = stats.sessions ?? 0
    const children = stats.children ?? 0
    const activities = stats.activities ?? 0
    return Math.min(96, 42 + Math.min(22, children * 3) + Math.min(18, sessions * 2) + Math.min(14, reports * 2) + Math.min(8, activities))
  }, [role, stats.activities, stats.checkins, stats.children, stats.notifications, stats.reports, stats.sessions])

  const insightCards = useMemo(() => {
    if (role === 'super_admin') {
      return [
        { title: 'Watch access and registrations', text: 'Review pending school admin requests and support tickets before opening daily operations.', tone: 'purple' as StatTone },
        { title: 'System readiness', text: `${stats.users ?? 0} users and ${stats.children ?? 0} students are available across the platform.`, tone: 'teal' as StatTone },
      ]
    }
    if (role === 'manager') {
      return [
        { title: 'Coordinate today', text: 'Check sessions, staff accounts, and reports so each student has the right support.', tone: 'blue' as StatTone },
        { title: 'Family support queue', text: 'Open the mobile support inbox for urgent parent requests and follow-up.', tone: 'rose' as StatTone },
      ]
    }
    if (role === 'therapist') {
      return [
        { title: 'Start with students', text: 'Review assigned students, then add progress, activities, and family steps.', tone: 'teal' as StatTone },
        { title: 'Keep families connected', text: 'Use family chat and home steps to turn sessions into daily practice.', tone: 'purple' as StatTone },
      ]
    }
    if (role === 'parent') {
      return [
        {
          title: 'Stay in rhythm',
          text:
            (stats.children ?? 0) > 0
              ? 'Submit a short daily check-in so your teacher sees patterns early.'
              : 'When a student is linked to your account, daily check-ins and progress will show up here.',
          tone: 'teal' as StatTone,
        },
        {
          title: 'Reach your team',
          text:
            (stats.notifications ?? 0) > 0
              ? `You have ${stats.notifications} notification(s). Open School chat for quick questions.`
              : 'Use School chat when you need clarification on plans, steps, or sessions.',
          tone: 'purple' as StatTone,
        },
      ]
    }
    return []
  }, [role, stats.children, stats.notifications, stats.users])

  const startActions = useMemo(() => {
    if (role === 'super_admin') {
      return [
        { step: '1', title: 'Check analytics', text: 'See the full school numbers.', to: '/dashboard/analytics' },
        { step: '2', title: 'Review requests', text: 'Approve or reject new admin requests.', to: '/dashboard/admin-registration-requests' },
        { step: '3', title: 'Open support inbox', text: 'Handle urgent mobile family messages.', to: '/dashboard/support-inbox' },
      ]
    }
    if (role === 'manager') {
      return [
        { step: '1', title: 'Manage students', text: 'Create students and assign family/teacher.', to: '/dashboard/children-management' },
        { step: '2', title: 'Plan sessions', text: 'Schedule and update therapy sessions.', to: '/dashboard/sessions' },
        { step: '3', title: 'Read reports', text: 'Review notes from the team.', to: '/dashboard/reports' },
      ]
    }
    if (role === 'therapist') {
      return [
        { step: '1', title: 'Open students', text: 'Choose the child you are working with.', to: '/dashboard/children' },
        { step: '2', title: 'Add progress', text: 'Record activity scores and updates.', to: '/dashboard/therapist-progress' },
        { step: '3', title: 'Message family', text: 'Send steps or chat with parents.', to: '/dashboard/therapist-chat' },
      ]
    }
    if (role === 'parent') {
      return [
        { step: '1', title: 'Daily check-in', text: 'Share sleep, mood, and notes for today.', to: '/dashboard/parent-daily-checkin' },
        { step: '2', title: 'Child Space', text: 'Calm, child-friendly activities in the browser.', to: '/dashboard/child-space' },
        { step: '3', title: 'School chat', text: 'Message your teacher or coordinator.', to: '/dashboard/parent-chat' },
      ]
    }
    return []
  }, [role])

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
          const [usersRes, childrenRes, sessionsRes, reportsRes] = await Promise.all([
            api.managerUsers(token),
            api.managerChildren(token),
            api.managerSessions(token),
            api.managerReports(token),
          ])
          if (!cancelled) {
            setStats({
              users: usersRes.users?.length ?? 0,
              children: childrenRes.children?.length ?? 0,
              sessions: sessionsRes.sessions?.length ?? 0,
              reports: reportsRes.reports?.length ?? 0,
            })
          }
          return
        }

        if (role === 'therapist') {
          const res = await api.therapistOverview(token)
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
          return
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
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      {token && !loading && !error ? (
        <section className="pro-dashboardHero" aria-label="Dashboard overview">
          <div className="pro-dashboardHeroContent">
            <div className="pro-dashboardKicker">Live workspace</div>
            <h3 className="pro-dashboardTitle">Your day at a glance</h3>
            <p className="pro-dashboardText">
              Focus on the highest-impact actions first, then jump into the role tools below.
            </p>
            <div className="pro-dashboardPills">
              <span>{role ? role.replace('_', ' ') : 'workspace'}</span>
              <span>{totalActivity} records loaded</span>
              <span>Secure JWT session</span>
            </div>
          </div>
          <div className="pro-healthPanel">
            <div className="pro-healthRing" style={{ ['--health' as string]: `${dashboardHealth}%` }}>
              <span>{dashboardHealth}</span>
            </div>
            <div>
              <strong>Dashboard data readiness</strong>
              <p>
                This is not a completion percentage. It shows how much useful dashboard data is available.
                <br />
                <span dir="rtl">هذه ليست نسبة إنجاز، بل توضّح مدى توفر بيانات مفيدة في لوحة التحكم.</span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {token && !loading && !error && startActions.length > 0 ? (
        <section className="pro-startHere" aria-label="Start here">
          <div className="pro-sectionIntro">
            <div className="pro-sectionKicker">Start here</div>
            <h3>What should I do first?</h3>
            <p>Use these three buttons in order. They are the easiest path for your role.</p>
          </div>
          <div className="pro-actionGrid">
            {startActions.map((action) => (
              <ActionCard key={action.title} {...action} />
            ))}
          </div>
        </section>
      ) : null}

      {token && !loading && !error && insightCards.length > 0 ? (
        <div className="pro-dashboardGrid">
          <div className="pro-insightGrid">
            {insightCards.map((item) => (
              <InsightCard key={item.title} title={item.title} text={item.text} tone={item.tone} />
            ))}
          </div>
          <Card className="pro-progressPanel">
            <div className="pro-panelTitle">What these bars mean</div>
            <p className="pro-panelHelp">
              They show whether the dashboard has enough data and what needs attention. These are readiness indicators,
              not task completion.
            </p>
            <ProgressBar label="Dashboard data readiness" value={dashboardHealth} tone="purple" />
            <ProgressBar label="Records loaded" value={Math.min(100, totalActivity * 8)} tone="teal" />
            <ProgressBar label="Needs follow-up" value={38} tone="blue" />
          </Card>
        </div>
      ) : null}

      {token && !loading && !error && role === 'super_admin' && (
        <>
          <div className="ui-statGrid">
            <StatCard label="Users" value={stats.users ?? 0} hint="All active accounts" tone="purple" />
            <StatCard label="Students" value={stats.children ?? 0} hint="Linked records" tone="teal" />
            <StatCard label="Sessions" value={stats.sessions ?? 0} hint="Scheduled work" tone="blue" />
            <StatCard label="Notes & reports" value={stats.reports ?? 0} hint="Clinical notes" tone="gold" />
            <StatCard label="Activities" value={stats.activities ?? 0} hint="Learning tools" tone="rose" />
          </div>
        </>
      )}

      {token && !loading && !error && role === 'manager' && (
        <>
          <div className="ui-statGrid">
            <StatCard label="Users" value={stats.users ?? 0} hint="Staff and families" tone="purple" />
            <StatCard label="Students" value={stats.children ?? 0} hint="Managed students" tone="teal" />
            <StatCard label="Sessions" value={stats.sessions ?? 0} hint="Scheduled sessions" tone="blue" />
            <StatCard label="Notes & reports" value={stats.reports ?? 0} hint="Submitted updates" tone="gold" />
          </div>
        </>
      )}

      {token && !loading && !error && role === 'therapist' && (
        <>
          <div className="ui-statGrid">
            <StatCard label="Assigned students" value={stats.children ?? 0} hint="Your caseload" tone="teal" />
            <StatCard label="Sessions" value={stats.sessions ?? 0} hint="Therapy schedule" tone="blue" />
            <StatCard label="Activities" value={stats.activities ?? 0} hint="Learning library" tone="purple" />
            <StatCard label="Notes & reports (all)" value={stats.reports ?? 0} hint="Documentation" tone="gold" />
          </div>
        </>
      )}

      {token && !loading && !error && role === 'parent' && (
        <>
          <div className="ui-statGrid">
            <StatCard label="Linked students" value={stats.children ?? 0} hint="From your school" tone="teal" />
            <StatCard label="Daily check-ins saved" value={stats.checkins ?? 0} hint="For your first linked student" tone="blue" />
            <StatCard label="Notes & reports" value={stats.reports ?? 0} hint="Visible to your family" tone="gold" />
            <StatCard label="Notifications" value={stats.notifications ?? 0} hint="From the school" tone="purple" />
          </div>
        </>
      )}
    </div>
  )
}
