import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyA11yUiPrefsToDocument,
  loadA11yUiPrefs,
  saveA11yUiPrefs,
  stepA11yFontSize,
  type A11yContrast,
  type A11yFontSize,
  type A11yUiPrefs,
} from '@/utils/a11yUiPrefs'

type A11yUiPrefsContextValue = {
  prefs: A11yUiPrefs
  setFontSize: (size: A11yFontSize) => void
  stepFontSize: (dir: -1 | 1) => void
  setContrast: (c: A11yContrast) => void
  toggleContrast: () => void
}

const A11yUiPrefsContext = createContext<A11yUiPrefsContextValue | undefined>(undefined)

export function A11yUiPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yUiPrefs>(() => loadA11yUiPrefs())

  useEffect(() => {
    applyA11yUiPrefsToDocument(prefs)
    saveA11yUiPrefs(prefs)
  }, [prefs])

  const value = useMemo<A11yUiPrefsContextValue>(
    () => ({
      prefs,
      setFontSize: (fontSize) => setPrefs((p) => ({ ...p, fontSize })),
      stepFontSize: (dir) => setPrefs((p) => ({ ...p, fontSize: stepA11yFontSize(p.fontSize, dir) })),
      setContrast: (contrast) => setPrefs((p) => ({ ...p, contrast })),
      toggleContrast: () =>
        setPrefs((p) => ({ ...p, contrast: p.contrast === 'high' ? 'normal' : 'high' })),
    }),
    [prefs],
  )

  return <A11yUiPrefsContext.Provider value={value}>{children}</A11yUiPrefsContext.Provider>
}

// Fast refresh: hook is intentionally exported next to the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useA11yUiPrefs() {
  const ctx = useContext(A11yUiPrefsContext)
  if (!ctx) throw new Error('useA11yUiPrefs must be used inside A11yUiPrefsProvider')
  return ctx
}
