import { Card } from './ui/Card'

/** Shown when a parent account has no rows in `children` linked via `parent_id`. */
export function ParentNoChildrenHint() {
  return (
    <Card className="ui-cardSoft" style={{ padding: 16, marginBottom: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>No students linked to your account yet</div>
      <p style={{ margin: '0 0 12px', opacity: 0.9, fontSize: 14, lineHeight: 1.55 }}>
        A <strong>coordinator</strong> links students to you by name in <strong>Students Management</strong> (not by typing
        ids):
      </p>
      <ol style={{ margin: 0, paddingLeft: 22, opacity: 0.92, fontSize: 14, lineHeight: 1.7 }}>
        <li>Log in as <strong>coordinator</strong>.</li>
        <li>Open <strong>Students Management</strong> in the sidebar.</li>
        <li>
          Find or create the student, set <strong>Family</strong> to <strong>you</strong> (your name in the dropdown), then
          click <strong>Update</strong>.
        </li>
        <li>
          Log back in as family (choose <strong>Family</strong> on the login page if you see a <strong>Role</strong>{' '}
          field).
        </li>
      </ol>
    </Card>
  )
}
