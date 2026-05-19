/**
 * Brand palette — mirrors website `frontend/src/index.css` blue levels.
 * L0 deep rail/header · L1 page · L2 muted panels · L3 cards · L4 accents
 */
export const colors = {
  /** L4 — primary accent (--accent / --blue-3) */
  primary: '#1d4ed8',
  primaryBright: '#2563eb',
  primaryDark: '#1e40af',
  /** L0 — drawer rail / header band (--blue-0 / --text-h) */
  primaryDeep: '#0f172a',
  /** Secondary accent (--calm) */
  calm: '#0284c7',
  /** L2 / L6 muted panels */
  secondarySurface: '#dbeafe',
  secondaryBorder: '#cbd5e1',
  outlineBorder: '#bfdbfe',
  /** L3 cards */
  surface: '#ffffff',
  surfaceSoft: '#f8fafc',
  /** L1 page canvas (--bg / --blue-7) */
  pageBg: '#eff6ff',
  text: '#475569',
  textMuted: '#64748b',
  textTitle: '#0f172a',
  inputPlaceholder: '#94a3b8',
  /** Text on dark header / drawer */
  onDark: '#ffffff',
  onDarkMuted: '#bfdbfe',
  onDarkEyebrow: '#93c5fd',
  onDarkSubtitle: '#e2e8f0',
  danger: '#b91c1c',
  dangerSoft: '#fff1f2',
  dangerBorder: '#fecdd3',
  success: '#166534',
  successSoft: '#ecfdf3',
  successBorder: '#b7ebc7',
  warning: '#92400e',
  warningSoft: '#fffbeb',
  warningBorder: '#fcd34d',
  warningAccent: '#c86a13',
} as const
