import { Card } from './ui/Card'
import { useAuth } from '@/mvc/controllers'

export function TherapistNoChildrenHint() {
  const { user } = useAuth()

  return (
    <Card className="ui-cardSoft" style={{ padding: 16, marginBottom: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        No students here yet — this is normal until someone links you
      </div>
      <p style={{ margin: '0 0 12px', opacity: 0.9, fontSize: 14, lineHeight: 1.55 }}>
        You do <strong>not</strong> need to change ids by hand. A <strong>coordinator</strong> does this in the app using
        your <strong>name</strong> (not the long id):
      </p>
      <ol style={{ margin: 0, paddingLeft: 22, opacity: 0.92, fontSize: 14, lineHeight: 1.7 }}>
        <li>Log in as <strong>coordinator</strong>.</li>
        <li>Open <strong>Students Management</strong> in the sidebar.</li>
        <li>
          Find the student (or create one), set <strong>Teacher</strong> to <strong>you</strong> (your name in the
          dropdown), set a <strong>Family</strong>, then click <strong>Update</strong>.
        </li>
        <li>
          Log back in as teacher (if the login page has a <strong>Role</strong> field, choose <strong>Teacher</strong>) —
          the student should appear.
        </li>
      </ol>
      <details style={{ marginTop: 14, fontSize: 13, opacity: 0.88 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Optional: check in Supabase</summary>
        <p style={{ margin: '10px 0 6px', lineHeight: 1.5 }}>
          Table <code>children</code> → teacher column <code>therapist_id</code> must match your user id in <code>users</code>:
        </p>
        <code style={{ display: 'block', fontSize: 12, wordBreak: 'break-all' }}>{user?.id}</code>
      </details>
    </Card>
  )
}
