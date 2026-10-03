import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ErrorState, Field, Spinner } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { listRows } from '@/services/admin'
import { useSettings } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

interface Form { badge: string; title: string; description: string; cta_text: string; hero_image_url: string | null; work_intro: string; accent: string }
const EMPTY: Form = { badge: '', title: '', description: '', cta_text: '', hero_image_url: null, work_intro: '', accent: '' }

export default function HomeEditor() {
  const toast = useToast()
  const { settings, refresh } = useSettings()
  const current = (settings as { accent_color?: string | null } | null)?.accent_color ?? ''
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await listRows('homepage_sections', { order: 'sort_order', asc: true })
    return { hero: rows.find((r) => r.key === 'hero'), gal: rows.find((r) => r.key === 'featured_work') }
  }, [])
  const [f, setF] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    const cfg = (data.hero?.config ?? {}) as Record<string, unknown>
    setF({
      badge: typeof cfg.badge === 'string' ? cfg.badge : '', title: String(data.hero?.title ?? ''), description: String(data.hero?.description ?? ''),
      cta_text: String(data.hero?.cta_text ?? ''), hero_image_url: typeof cfg.hero_image_url === 'string' ? cfg.hero_image_url : null,
      work_intro: String(data.gal?.description ?? ''), accent: current,
    })
  }, [data, current])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (busy) return
    if (f.accent && !/^#[0-9a-f]{6}$/i.test(f.accent)) { toast.error('Accent colour must look like #1a7f4b.'); return }
    setBusy(true)
    try {
      const heroCfg = { ...((data?.hero?.config ?? {}) as Record<string, unknown>), badge: f.badge || null, hero_image_url: f.hero_image_url }
      const { error: e } = await supabase.from('homepage_sections').upsert([
        { key: 'hero', title: f.title || null, description: f.description || null, cta_text: f.cta_text || null, config: heroCfg, is_visible: true, sort_order: Number(data?.hero?.sort_order ?? 1) },
        { key: 'featured_work', title: data?.gal?.title ?? 'Selected work', subtitle: data?.gal?.subtitle ?? null, description: f.work_intro || null, config: (data?.gal?.config ?? {}) as Record<string, unknown>, is_visible: true, sort_order: Number(data?.gal?.sort_order ?? 2) },
      ], { onConflict: 'key' })
      if (e) throw e
      if ((f.accent || '') !== (current || '')) {
        const { error: ae } = await supabase.from('site_settings').update({ accent_color: f.accent || null }).eq('id', 1)
        if (ae) throw new Error(ae.message.includes('accent_color') ? 'Run the 005 SQL in Supabase first (see instructions), then save again.' : ae.message)
        await refresh()
      }
      toast.success('Home page saved.'); reload()
    } catch (x) { toast.error(errMsg(x)) } finally { setBusy(false) }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorState message="Unable to load the home page content." onRetry={reload} />
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Homepage</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink className="h-4 w-4" /> View site</a>
          <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
        </div>
      </div>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display font-semibold sm:col-span-2">Opening</h2>
        <div className="sm:col-span-2"><Field label="Small label" hint="Appears next to the brand name. Default: Creative Design Portfolio."><input className="input" value={f.badge} onChange={(e) => set('badge', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Headline" hint="Shown in large capitals. Press Enter to choose where lines break."><textarea rows={4} className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Supporting text"><textarea rows={3} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
        <Field label="Button text" hint="Scrolls down to your work. Default: Explore work."><input className="input" value={f.cta_text} onChange={(e) => set('cta_text', e.target.value)} /></Field>
        <div className="sm:col-span-2"><ImageField label="Opening image (optional)" value={f.hero_image_url} onChange={(v) => set('hero_image_url', v)} />
          <p className="mt-2 text-xs text-black/50">A landscape image (about 3:2 or 16:10) works best. It is cropped to fit the frame.</p></div>
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="font-display font-semibold">Work page</h2>
        <Field label="Introduction" hint="A sentence or two shown at the top of the Work page."><textarea rows={3} className="input" value={f.work_intro} onChange={(e) => set('work_intro', e.target.value)} /></Field>
      </section>

      <section className="card grid gap-3 p-5">
        <h2 className="font-display font-semibold">Accent colour</h2>
        <p className="text-sm text-black/55">By default the green is taken from your logo. Only set a colour here if you want to override it.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input type="color" aria-label="Pick accent colour" value={/^#[0-9a-f]{6}$/i.test(f.accent) ? f.accent : '#0f7b4a'} onChange={(e) => set('accent', e.target.value)} className="h-11 w-14 rounded-lg border border-black/15 bg-white p-1" />
          <input className="input !w-40" placeholder="#0f7b4a" value={f.accent} onChange={(e) => set('accent', e.target.value.trim())} aria-label="Accent colour hex" />
          <button className="btn btn-ghost" onClick={() => set('accent', '')}>Use logo colour</button>
        </div>
      </section>
    </div>
  )
    }
