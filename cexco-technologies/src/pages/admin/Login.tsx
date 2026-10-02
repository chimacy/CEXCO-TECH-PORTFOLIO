import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { Field } from '@/components/ui'
import { errMsg } from '@/utils/format'

export default function Login() {
  const { session, role, signIn, loading } = useAuth()
  const { settings } = useSettings()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  if (!loading && session && role) return <Navigate to="/admin" replace />
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return
    setBusy(true); setError(null)
    try { await signIn(email.trim(), password); nav(loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin', { replace: true }) }
    catch (x) { setError(errMsg(x)) } finally { setBusy(false) }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3ef] px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5 p-8">
        <div><h1 className="font-display text-2xl font-bold">{settings?.brand_name}</h1><p className="text-sm text-black/50">Admin sign in</p></div>
        <Field label="Email" required><input type="email" required autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" required><input type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</button>
      </form>
    </main>
  )
}
