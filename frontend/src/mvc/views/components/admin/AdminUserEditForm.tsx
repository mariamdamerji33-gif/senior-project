import { Button } from '@/mvc/views/components/ui/Button'

type RoleOpt = 'super_admin' | 'manager' | 'therapist' | 'parent'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { PasswordInput } from '@/mvc/views/components/ui/forms/PasswordInput'
import { EmailFieldError } from '@/mvc/views/components/ui/forms/EmailFieldError'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { ROLE_OPTIONS } from '@/utils/roleLabels'
import { REGISTER_PASSWORD_HINT } from '@/utils/passwordRules'

type Props = {
  editName: string
  editEmail: string
  editRole: RoleOpt
  editPassword: string
  editError: string | null
  editSaving: boolean
  canSave: boolean
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  editEmailTouched: boolean
  onEditEmailBlur: () => void
  onRoleChange: (v: RoleOpt) => void
  onPasswordChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}

export function AdminUserEditForm({
  editName,
  editEmail,
  editRole,
  editPassword,
  editError,
  editSaving,
  canSave,
  onNameChange,
  onEmailChange,
  editEmailTouched,
  onEditEmailBlur,
  onRoleChange,
  onPasswordChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <>
      <div className="ui-rowEditPopover__fields">
        <label className="ui-field">
          <span className="ui-fieldLabel">Name</span>
          <TextInput value={editName} onChange={(e) => onNameChange(e.target.value)} />
        </label>
        <label className="ui-field">
          <span className="ui-fieldLabel">Email</span>
          <TextInput
            value={editEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={onEditEmailBlur}
            type="email"
            autoComplete="email"
          />
          <EmailFieldError value={editEmail} show={editEmailTouched} />
        </label>
        <label className="ui-field">
          <span className="ui-fieldLabel">Role</span>
          <Select value={editRole} onChange={(e) => onRoleChange(e.target.value as RoleOpt)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="ui-field">
          <span className="ui-fieldLabel">New password</span>
          <PasswordInput
            value={editPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Leave blank to keep current"
          />
          <span className="ui-helpText">{REGISTER_PASSWORD_HINT}</span>
        </label>
      </div>
      {editError ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong ui-rowEditPopover__error" role="alert">
          {editError}
        </div>
      ) : null}
      <div className="ui-actionsRow ui-rowEditPopover__actions">
        <Button type="button" variant="primary" disabled={!canSave || editSaving} onClick={onSave}>
          {editSaving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={editSaving}>
          Cancel
        </Button>
      </div>
    </>
  )
}
