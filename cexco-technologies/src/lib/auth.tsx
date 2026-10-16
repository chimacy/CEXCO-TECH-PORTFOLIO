import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AdminRole } from '@/types'

interface AuthCtx {
  session: Session | null
  role: AdminRole | null
  loading: boolean
  isSuperAdmin: boolean
  /** The password was accepted but the two-step verification code has not been entered yet */
  needsMfa: boolean
  refreshAal: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthCtx | null>(null)
export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

async function fetchRole(userId: string): Promise<AdminRole | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  return (data?.role as AdminRole | undefined) ?? null
}
async function mfaPending(s: Session | null): Promise<boolean> {
  if (!s) return false
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return !!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  } catch { return false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<AdminRole | null>(null)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    const apply = async (s: Session | null) => {
      const [r, m] = await Promise.all([s ? fetchRole(s.user.id) : Promise.resolve(null), mfaPending(s)])
      if (!live) return
      setSession(s); setRole(r); setNeedsMfa(m); setLoading(false)
    }
    void supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => void apply(s), 0) })
    return () => { live = false; sub.subscription.unsubscribe() }
  }, [])

  const refreshAal = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setNeedsMfa(await mfaPending(data.session))
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    session, role, loading, needsMfa, refreshAal, isSuperAdmin: role === 'SUPER_ADMIN',
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Incorrect email or password.')
    },
    signOut: async () => { await supabase.auth.signOut() },
  }), [session, role, loading, needsMfa, refreshAal])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
