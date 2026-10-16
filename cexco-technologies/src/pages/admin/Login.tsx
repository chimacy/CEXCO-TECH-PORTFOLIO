import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/utils/format'

export default function Login() {
  const { session, role, signIn, signOut, loading, needsMfa, refreshAal } = useAuth()
  const { settings } = useSettings()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const goNext = () => nav(loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin', { replace: true })

  // Signed in with a password but the verification code is still needed (for example after a redirect from an admin page)
  useEffect(() => {
    if (!needsMfa || factorId) return
    void supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp?.[0]?.id ?? null))
  }, [needsMfa, factorId])

  if (!loading && session && role && !needsMfa && !factorId) return <Navigate to="/admin" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      await signIn(email.trim(), password)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data } = await supabase.auth.mfa.listFactors()
        const id = data?.totp?.[0]?.id
        if (!id) throw new Error('Two-step verification is on but no authenticator was found. Contact the site owner.')
        setFactorId(id); setPassword('')
      } else goNext()
    } catch (x) { setError(errMsg(x)) } finally { setBusy(false) }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !factorId) return
    setBusy(true); setError(null)
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId })
      if (ch.error) throw ch.error
      const v = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.trim() })
      if (v.error) throw new Error('That code is not correct. Wait for a fresh code and try again.')
      await refreshAal()
      goNext()
    } catch (x) { setError(errMsg(x)) } finally { setBusy(false) }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'))
  const brand = settings?.brand_name ?? ''
  const step2 = !!factorId

  return (
    <main className="grid min-h-screen bg-ink lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-[.18]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)' }} />
        <div aria-hidden className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-accent blur-[140px] opacity-60" />
        <div aria-hidden className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/15" />
        <div className="relative flex items-center gap-3 font-display text-xl font-bold tracking-tight">
          {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-9 w-auto" />}
          <span>{brand}</span>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Admin console
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">Manage your studio, your way.</h1>
        </div>
        <Link to="/" className="relative inline-flex w-fit items-center gap-2 text-sm text-white/60 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
      </section>

      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-10 lg:rounded-l-[2.5rem]">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="mb-10 flex items-center gap-2.5 font-display text-lg font-bold lg:hidden">
            {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-8 w-auto" />}<span>{brand}</span>
          </div>

          {!step2 ? (
            <>
              <h2 className="font-display text-4xl font-bold tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm text-black/55">Sign in to continue to your dashboard.</p>
              <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" aria-hidden />
                    <input id="email" type="email" required autoComplete="username" autoFocus placeholder="you@example.com" className="input !rounded-2xl !py-3.5 !pl-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" aria-hidden />
                    <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••" className="input !rounded-2xl !py-3.5 !pl-11 !pr-12" value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={onKey} onKeyDown={onKey} />
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-ink">
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
            </>
          ) : (
            <>
              <ShieldCheck className="h-8 w-8 text-accent" aria-hidden />
              <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">Two-step check</h2>
              <p className="mt-2 text-sm text-black/55">Open your authenticator app and enter the 6-digit code for this site.</p>
              <form onSubmit={verify} className="mt-9 space-y-5" noValidate>
                <input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-label="6-digit code" placeholder="123456"
                  className="input !rounded-2xl !py-4 text-center font-display text-2xl tracking-[.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary w-full !rounded-2xl !py-3.5 text-base">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify and continue</button>
                <button type="button" onClick={() => { setFactorId(null); setCode(''); setError(null); void signOut() }} className="w-full text-center text-sm text-black/50 hover:text-ink">Use a different account</button>
              </form>
            </>
          )}
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-ink lg:hidden"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
        </div>
      </section>
    </main>
  )
}
