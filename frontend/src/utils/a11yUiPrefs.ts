export type A11yFontSize = 'sm' | 'md' | 'lg' | 'xl'
export type A11yContrast = 'normal' | 'high'

export type A11yUiPrefs = {
  fontSize: A11yFontSize
  contrast: A11yContrast
}

/** Same key/shape as mobile app login display prefs for parity. */
export const A11Y_UI_PREFS_KEY = 'a11y_ui_prefs_v1'

export const A11Y_FONT_ORDER: A11yFontSize[] = ['sm', 'md', 'lg', 'xl']

export function defaultA11yUiPrefs(): A11yUiPrefs {
  return { fontSize: 'md', contrast: 'normal' }
}

export function loadA11yUiPrefs(): A11yUiPrefs {
  if (typeof window === 'undefined' || !window.localStorage) return defaultA11yUiPrefs()
  try {
    const raw = window.localStorage.getItem(A11Y_UI_PREFS_KEY)
    if (!raw) return defaultA11yUiPrefs()
    const parsed = JSON.parse(raw) as Partial<A11yUiPrefs>
    const fontSize =
      parsed.fontSize === 'sm' || parsed.fontSize === 'md' || parsed.fontSize === 'lg' || parsed.fontSize === 'xl'
        ? parsed.fontSize
        : 'md'
    const contrast = parsed.contrast === 'high' ? 'high' : 'normal'
    return { fontSize, contrast }
  } catch {
    return defaultA11yUiPrefs()
  }
}

export function saveA11yUiPrefs(p: A11yUiPrefs) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(A11Y_UI_PREFS_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export function applyA11yUiPrefsToDocument(p: A11yUiPrefs) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.a11ySize = p.fontSize
  document.documentElement.dataset.a11yContrast = p.contrast
}

export function stepA11yFontSize(current: A11yFontSize, dir: -1 | 1): A11yFontSize {
  let idx = A11Y_FONT_ORDER.indexOf(current)
  if (idx < 0) idx = 1
  const next = Math.max(0, Math.min(A11Y_FONT_ORDER.length - 1, idx + dir))
  return A11Y_FONT_ORDER[next]!
}
