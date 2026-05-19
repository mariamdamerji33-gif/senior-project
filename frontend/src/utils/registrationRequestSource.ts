export type RegistrationSource = 'mobile' | 'website'

export function resolveRegistrationSource(row: {
  requested_role: string
  registration_source?: string | null
}): RegistrationSource {
  if (row.registration_source === 'mobile' || row.registration_source === 'website') {
    return row.registration_source
  }
  return row.requested_role === 'parent' ? 'mobile' : 'website'
}

export function registrationSourceLabel(source: RegistrationSource): string {
  return source === 'mobile' ? 'Mobile app registration' : 'Website registration'
}

export function registrationSourceShortLabel(source: RegistrationSource): string {
  return source === 'mobile' ? 'Mobile app' : 'Website'
}
