import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './posthog'
import './utils/pwaInstall'
import App from './App.tsx'

// Set dark mode by default
document.documentElement.classList.add('dark')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures on unsupported/restricted origins
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
