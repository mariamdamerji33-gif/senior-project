export type Role = 'super_admin' | 'manager' | 'therapist' | 'parent'

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  role: Role
  roleLabel?: string | null
  phone?: string | null
  birthDate?: string | null
  ageYears?: number | null
  profilePhotoUrl?: string | null
  profilePhotoStoragePath?: string | null
}
