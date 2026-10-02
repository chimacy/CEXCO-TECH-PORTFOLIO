import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from '@/lib/auth'
import { SettingsProvider } from '@/lib/settings'
import { ToastProvider } from '@/lib/toast'
import { isSupabaseConfigured } from '@/lib/supabase'
import './styles/index.css'

function Setup() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-display text-3xl font-bold">Supabase is not configured</h1>
      <p className="mt-3 text-black/70">Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server. See README.md for the full setup.</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <BrowserRouter>
        <ToastProvider><SettingsProvider><AuthProvider><App /></AuthProvider></SettingsProvider></ToastProvider>
      </BrowserRouter>
    ) : <Setup />}
  </StrictMode>,
)
