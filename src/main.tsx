import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initTelegramWebApp } from './telegram'

// Safe outside Telegram (plain browser, local dev) - see initTelegramWebApp's own comment. Must run
// once, as early as possible, and isn't tied to any particular screen's mount/unmount, so it lives
// here rather than inside a component.
initTelegramWebApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
