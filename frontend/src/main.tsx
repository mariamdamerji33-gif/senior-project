import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/ui.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/mvc/views/components/ErrorBoundary.tsx'
import { applyA11yUiPrefsToDocument, loadA11yUiPrefs } from '@/utils/a11yUiPrefs'

applyA11yUiPrefsToDocument(loadA11yUiPrefs())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
