import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export const ToastContext = createContext<(message: string, variant?: ToastVariant) => void>(
  () => {},
)
