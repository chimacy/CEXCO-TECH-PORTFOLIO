import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSettings } from '@/services/api'
import type { SiteSettings } from '@/types'

interface Ctx { settings: SiteSettings | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const SettingsCtx = createContext<Ctx>({ settings: null, loading: true, error: null, refresh: async () => undefined })
export const useSettings = () => useContext(SettingsCtx)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setSettings(await getSettings()); setError(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load site settings.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!settings?.favicon_url) return
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = settings.favicon_url
  }, [settings?.favicon_url])

  const value = useMemo(() => ({ settings, loading, error, refresh }), [settings, loading, error, refresh])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}
