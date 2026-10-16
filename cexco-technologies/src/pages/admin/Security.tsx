import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { ConfirmDialog, Field, Spinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

interface Enrol { id: string; qr: string; secret: string }

export default function Security() {
  const toast = useToast()
  const { session, refreshAal } = useAuth()
  const [factors, setFactors] = useState<{ id: string }[] | null>(null)
  const [enrol, setEnrol] = useState<Enrol | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmOff, setConfirmOff] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []).map((f) => ({ id: f.id })))
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  const start = async () => {
    setBusy(true)
    try {
      const { data: l } = await supabase.auth.mfa.listFactors()
      for (const f of l?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` })
      if (error) throw error
      setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  const verify = async () => {
    if (!enrol || busy) return
    setBusy(true)
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: enrol.id })
      if (ch.error) throw ch.error
      const v = await supabase.auth.mfa.verify({ factorId: enrol.id, challengeId: ch.data.id, code: code.trim() })
      if (v.error) throw new Error('That code is not correct. Wait for a fresh code and try again.')
      toast.success('Two-step verification is on.')
      setEnrol(null); setCode(''); await refresh(); await refreshAal()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  const turnOff = async () => {
    if (!confirmOff) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: confirmOff })
      if (error) throw error
      toast.success('Two-step verification is off.'); setConfirmOff(null); await refresh(); await refreshAal()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  if (!factors) return <Spinner />
  const on = factors.length > 0
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Security</h1>
      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {on ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden /> : <ShieldOff className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden />}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold">Two-step verification {on ? 'is on' : 'is off'}</h2>
            <p className="mt-1 text-sm text-black/60">Signing in needs your password <b>and</b> a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy). Even if someone learns your password, they cannot get in.</p>
            <p className="mt-2 text-xs text-black/45">Signed in as {session?.user.email}</p>

            {!on && !enrol && <button className="btn btn-primary mt-5" onClick={() => void start()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Turn on two-step verification</button>}
            {on && <button className="btn btn-ghost mt-5" onClick={() => setConfirmOff(factors[0].id)}>Turn off</button>}

            {enrol && (
              <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
                <img src={enrol.qr} alt="QR code to scan with your authenticator app" className="h-44 w-44 rounded-xl border border-black/10 bg-white p-2" />
                <div className="space-y-4">
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-black/70">
                    <li>Open your authenticator app and choose “Add account”.</li>
                    <li>Scan this QR code (or type the key below).</li>
                    <li>Enter the 6-digit code the app shows.</li>
                  </ol>
                  <p className="break-all rounded-lg bg-black/[.04] px-3 py-2 font-mono text-xs">{enrol.secret}</p>
                  <Field label="6-digit code"><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input !w-44 text-center font-display text-lg tracking-[.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => void verify()} disabled={busy || code.length !== 6}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirm</button>
                    <button className="btn btn-ghost" onClick={() => { setEnrol(null); setCode('') }} disabled={busy}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Good habits</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-black/65">
          <li>Use a long, unique password that you use nowhere else, and keep it in a password manager.</li>
          <li>Turn on two-step verification for your GitHub, Vercel and Supabase accounts too.</li>
          <li>Never share the Supabase “service_role” key with anyone.</li>
          <li>If you lose your phone, remove the authenticator in Supabase (Authentication → Users → your user → Remove MFA factors) and set it up again.</li>
        </ul>
      </section>

      <ConfirmDialog open={!!confirmOff} title="Turn off two-step verification?" message="Your account will only be protected by your password. If you enabled the optional database enforcement (SQL 008), run its rollback first or you will be locked out." confirmLabel="Turn off" busy={busy} onConfirm={() => void turnOff()} onCancel={() => setConfirmOff(null)} />
    </div>
  )
}
