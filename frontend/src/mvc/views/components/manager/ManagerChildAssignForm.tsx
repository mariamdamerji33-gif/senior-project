import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'

type UserOption = { id: string; label: string }

type Props = {
  parents: UserOption[]
  therapists: UserOption[]
  parentId: string
  therapistId: string
  editError: string | null
  editSaving: boolean
  canSave: boolean
  onParentChange: (id: string) => void
  onTherapistChange: (id: string) => void
  onSave: () => void
  onCancel: () => void
}

export function ManagerChildAssignForm({
  parents,
  therapists,
  parentId,
  therapistId,
  editError,
  editSaving,
  canSave,
  onParentChange,
  onTherapistChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <>
      <div className="ui-rowEditPopover__fields">
        <label className="ui-field">
          <span className="ui-fieldLabel">Family</span>
          <Select value={parentId} onChange={(e) => onParentChange(e.target.value)}>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="ui-field">
          <span className="ui-fieldLabel">Teacher</span>
          <Select value={therapistId} onChange={(e) => onTherapistChange(e.target.value)}>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {editError ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong ui-rowEditPopover__error" role="alert">
          {editError}
        </div>
      ) : null}
      <div className="ui-row ui-rowEditPopover__actions">
        <Button type="button" variant="ghost" disabled={editSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || editSaving} onClick={onSave}>
          {editSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  )
}
