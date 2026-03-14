import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const storedTheme = window.localStorage.getItem('theme')
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'

document.documentElement.classList.toggle('dark', initialTheme === 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
