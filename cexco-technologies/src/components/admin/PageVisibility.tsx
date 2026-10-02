import { useState } from 'react'
import { Switch } from '@/components/ui'
import { useSettings } from '@/lib/settings'
import { useToast } from '@/lib/toast'
import { saveRow } from '@/services/admin'
import { errMsg } from '@/utils/format'
import { TOGGLEABLE_PAGES } from '@/utils/pages'

export function PageVisibility() {
  const { settings, refresh } = useSettings()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  if (!settings) return null
  const disabled = settings.disabled_pages ?? []

  const toggle = async (key: string, label: string) => {
    if (busy) return
    const next = disabled.includes(key) ? disabled.filter((k) => k !== key) : [...disabled, key]
    setBusy(key)
    try {
      await saveRow('site_settings', { disabled_pages: next }, '1')
      await refresh()
      toast.success(`${label} is now ${next.includes(key) ? 'hidden from' : 'visible on'} the website.`)
    } catch (e) {
      const m = errMsg(e)
      toast.error(m.includes('disabled_pages') ? 'Run the 004 SQL in Supabase first (see instructions).' : m)
    } finally { setBusy(null) }
  }

  return (
    <section className="card mb-8 p-5">
      <h2 className="font-display font-semibold">Website pages</h2>
      <p className="mb-4 mt-1 text-sm text-black/55">Switch a page off to remove it from the website completely: its page, menu and footer links, and its section on the homepage.</p>
      <ul className="divide-y divide-black/5">
        {TOGGLEABLE_PAGES.map((p) => {
          const on = !disabled.includes(p.key)
          return (
            <li key={p.key} className="flex items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-black/45">{on ? 'Visible on the website' : 'Hidden from the website'}</p></div>
              <Switch label={`Show ${p.label} on the website`} checked={on} disabled={busy !== null} onChange={() => void toggle(p.key, p.label)} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
