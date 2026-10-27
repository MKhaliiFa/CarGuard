import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import './styles/global.css'
import { App } from './App'
import { UpdatePrompt } from './components/UpdatePrompt'
import { requestPersistentStorage } from './lib/storage'
import { InspectionProvider } from './state/InspectionContext'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

void requestPersistentStorage()

createRoot(root).render(
  <StrictMode>
    <InspectionProvider>
      <App />
      <UpdatePrompt />
    </InspectionProvider>
  </StrictMode>,
)
