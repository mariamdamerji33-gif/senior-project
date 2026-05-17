import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'

type Props = {
  whenLocal: string
  status: string
  editError: string | null
  editSaving: boolean
  canSave: boolean
  onWhenChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function ManagerSessionEditForm({
  whenLocal,
  status,
  editError,
  editSaving,
  canSave,
  onWhenChange,
  onStatusChange,
  onSave,
  onCancel,
}: Props) {
  const inputStyle = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'inherit',
    font: 'inherit',
    width: '100%',
  } as const

  return (
    <>
      <div className="ui-rowEditPopover__fields">
        <label className="ui-field">
          <span className="ui-fieldLabel">When</span>
          <input
            type="datetime-local"
            className="ui-input"
            value={whenLocal}
            onChange={(e) => onWhenChange(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label className="ui-field">
          <span className="ui-fieldLabel">Status</span>
          <Select value={status} onChange={(e) => onStatusChange(e.target.value)}>
            <option value="scheduled">scheduled</option>
            <option value="confirmed">confirmed</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
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
