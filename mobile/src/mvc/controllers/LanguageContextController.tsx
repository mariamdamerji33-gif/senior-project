import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppLanguage = 'en' | 'ar'

const STORAGE_KEY = 'asp_mobile_language_v1'

type LanguageContextValue = {
  language: AppLanguage
  isArabic: boolean
  setLanguage: (language: AppLanguage) => Promise<void>
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY)
      if (!mounted) return
      if (saved === 'ar' || saved === 'en') setLanguageState(saved)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isArabic: language === 'ar',
      setLanguage: async (nextLanguage) => {
        setLanguageState(nextLanguage)
        await AsyncStorage.setItem(STORAGE_KEY, nextLanguage)
      },
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

