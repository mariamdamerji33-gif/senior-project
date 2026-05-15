import type { Role } from '@/types/auth'

/** Display names for roles (stored keys in API/DB are unchanged). */
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'School Admin',
  manager: 'Coordinator',
  therapist: 'Teacher',
  parent: 'Family',
}

export function formatRoleLabel(role: string | undefined | null): string {
  if (!role) return '—'
  const key = role as Role
  return ROLE_LABEL[key] ?? role
}

/** Options for role dropdowns (sign-in hint, registration, admin). */
export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'super_admin', label: ROLE_LABEL.super_admin },
  { value: 'manager', label: ROLE_LABEL.manager },
  { value: 'therapist', label: ROLE_LABEL.therapist },
  { value: 'parent', label: ROLE_LABEL.parent },
]

/** Self-registration: staff roles only (family accounts are created by the school). */
export const WEB_PUBLIC_ROLE_OPTIONS = ROLE_OPTIONS.filter((r) => r.value !== 'parent')

/** Sign-in role dropdown: reminder only; the server always uses the role stored for your account. */
export const SIGN_IN_ROLE_OPTIONS = ROLE_OPTIONS
