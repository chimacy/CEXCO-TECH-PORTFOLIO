import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { errMsg } from '@/utils/format'

export default function Login() {
  const { session, role, signIn, loading } = useAuth()
  const { settings } = useSettings()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session && role) return <Navigate to="/admin" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      await signIn(email.trim(), password)
      nav(loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin', { replace: true })
    } catch (x) { setError(errMsg(x)) } finally { setBusy(false) }
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'))
  const brand = settings?.brand_name ?? ''

  return (
    <main className="grid min-h-screen bg-ink lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-[.18]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)' }} />
        <div aria-hidden className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-accent blur-[140px] opacity-60" />
        <div aria-hidden className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/15" />
        <div aria-hidden className="absolute -right-8 top-40 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3 font-display text-xl font-bold tracking-tight">
          {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-9 w-auto" />}
          <span>{brand}</span>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Admin console
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">Manage your studio, your way.</h1>
          {settings?.tagline && <p className="mt-5 text-lg text-white/60">{settings.tagline}</p>}
        </div>
        <Link to="/" className="relative inline-flex w-fit items-center gap-2 text-sm text-white/60 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-paper px-5 py-10 sm:px-10 lg:rounded-l-[2.5rem]">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="mb-10 flex items-center gap-2.5 font-display text-lg font-bold lg:hidden">
            {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-8 w-auto" />}<span>{brand}</span>
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-black/55">Sign in to continue to your dashboard.</p>

          <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" aria-hidden />
                <input id="email" type="email" required autoComplete="username" autoFocus placeholder="you@example.com"
                  className="input !rounded-2xl !py-3.5 !pl-11" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" aria-hidden />
                <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••"
                  className="input !rounded-2xl !py-3.5 !pl-11 !pr-12" value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={onKey} onKeyDown={onKey} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-ink">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {caps && <p role="status" className="mt-1.5 text-xs font-medium text-amber-700">Caps Lock is on.</p>}
            </div>

            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={busy || !email || !password} className="btn btn-primary group w-full !rounded-2xl !py-3.5 text-base">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>}
            </button>
          </form>

          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-ink lg:hidden"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
        </div>
      </section>
    </main>
  )
}
