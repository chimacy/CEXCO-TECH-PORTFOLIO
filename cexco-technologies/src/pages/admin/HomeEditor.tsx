import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ErrorState, Field, Spinner } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { listRows } from '@/services/admin'
import { parseRatio } from '@/lib/sections'
import { useSettings } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

const RATIOS = [
  { v: '4/5', label: 'Portrait 4:5 — 1080 × 1350 px (recommended)' },
  { v: '3/4', label: 'Portrait 3:4 — 1080 × 1440 px' },
  { v: '1/1', label: 'Square 1:1 — 1080 × 1080 px' },
  { v: '4/3', label: 'Landscape 4:3 — 1440 × 1080 px' },
  { v: '16/9', label: 'Wide 16:9 — 1920 × 1080 px' },
  { v: '9/16', label: 'Tall 9:16 — 1080 × 1920 px' },
]

interface Form {
  badge: string; title: string; description: string; cta_text: string; hero_image_url: string | null
  tile_ratio: string; work_intro: string
  wa_title: string; wa_text: string; wa_button: string; wa_message: string; wa_on: boolean
  accent: string
}
const EMPTY: Form = { badge: '', title: '', description: '', cta_text: '', hero_image_url: null, tile_ratio: '4/5', work_intro: '', wa_title: '', wa_text: '', wa_button: '', wa_message: '', wa_on: true, accent: '' }

export default function HomeEditor() {
  const toast = useToast()
  const { settings, refresh } = useSettings()
  const current = (settings as { accent_color?: string | null } | null)?.accent_color ?? ''
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await listRows('homepage_sections', { order: 'sort_order', asc: true })
    return { hero: rows.find((r) => r.key === 'hero'), gal: rows.find((r) => r.key === 'featured_work'), cta: rows.find((r) => r.key === 'cta') }
  }, [])
  const [f, setF] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    const cfg = (data.hero?.config ?? {}) as Record<string, unknown>
    const gcfg = (data.gal?.config ?? {}) as Record<string, unknown>
    const ccfg = (data.cta?.config ?? {}) as Record<string, unknown>
    const custom = ccfg.wa === true
    setF({
      badge: typeof cfg.badge === 'string' ? cfg.badge : '', title: String(data.hero?.title ?? ''), description: String(data.hero?.description ?? ''),
      cta_text: String(data.hero?.cta_text ?? ''), hero_image_url: typeof cfg.hero_image_url === 'string' ? cfg.hero_image_url : null,
      tile_ratio: typeof gcfg.tile_ratio === 'string' ? gcfg.tile_ratio : '4/5', work_intro: String(data.gal?.description ?? ''),
      wa_title: custom ? String(data.cta?.title ?? '') : '', wa_text: custom ? String(data.cta?.description ?? '') : '', wa_button: custom ? String(data.cta?.cta_text ?? '') : '',
      wa_message: typeof ccfg.whatsapp_message === 'string' ? ccfg.whatsapp_message : '', wa_on: data.cta ? Boolean(data.cta.is_visible) : true,
      accent: current,
    })
  }, [data, current])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const ratioOk = f.tile_ratio === '' || parseRatio(f.tile_ratio, 0) > 0

  const save = async () => {
    if (busy) return
    if (f.accent && !/^#[0-9a-f]{6}$/i.test(f.accent)) { toast.error('Accent colour must look like #1a7f4b.'); return }
    if (!ratioOk) { toast.error('Design shape must look like 4/5 or 1080x1350.'); return }
    setBusy(true)
    try {
      const heroCfg = { ...((data?.hero?.config ?? {}) as Record<string, unknown>), badge: f.badge || null, hero_image_url: f.hero_image_url }
      const galCfg = { ...((data?.gal?.config ?? {}) as Record<string, unknown>), tile_ratio: f.tile_ratio || '4/5' }
      const ctaCfg = { ...((data?.cta?.config ?? {}) as Record<string, unknown>), wa: true, whatsapp_message: f.wa_message || null }
      const { error: e } = await supabase.from('homepage_sections').upsert([
        { key: 'hero', title: f.title || null, description: f.description || null, cta_text: f.cta_text || null, config: heroCfg, is_visible: true, sort_order: Number(data?.hero?.sort_order ?? 1) },
        { key: 'featured_work', title: data?.gal?.title ?? 'Selected work', subtitle: data?.gal?.subtitle ?? null, description: f.work_intro || null, config: galCfg, is_visible: true, sort_order: Number(data?.gal?.sort_order ?? 2) },
        { key: 'cta', title: f.wa_title || null, description: f.wa_text || null, cta_text: f.wa_button || null, cta_link: null, config: ctaCfg, is_visible: f.wa_on, sort_order: Number(data?.cta?.sort_order ?? 9) },
      ], { onConflict: 'key' })
      if (e) throw e
      if ((f.accent || '') !== (current || '')) {
        const { error: ae } = await supabase.from('site_settings').update({ accent_color: f.accent || null }).eq('id', 1)
        if (ae) throw new Error(ae.message.includes('accent_color') ? 'Run the 005 SQL in Supabase first (see instructions), then save again.' : ae.message)
        await refresh()
      }
      toast.success('Home page saved. Reload the website to see the changes.'); reload()
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

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display font-semibold sm:col-span-2">Design shape</h2>
        <p className="text-sm text-black/55 sm:col-span-2">Every design on the homepage and Work page is shown in this one shape. Make your designs at the matching size before uploading and they will fill the frame perfectly. Designs of a different shape are cropped to fit.</p>
        <Field label="Shape">
          <select className="input" value={RATIOS.some((r) => r.v === f.tile_ratio) ? f.tile_ratio : ''} onChange={(e) => e.target.value && set('tile_ratio', e.target.value)}>
            {!RATIOS.some((r) => r.v === f.tile_ratio) && <option value="">Custom</option>}
            {RATIOS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Or type your own (width/height)" hint="Example: 5/7" error={ratioOk ? undefined : 'Use a format like 4/5 or 1080x1350.'}><input className="input" value={f.tile_ratio} onChange={(e) => set('tile_ratio', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Work page introduction" hint="A sentence or two shown at the top of the Work page."><textarea rows={3} className="input" value={f.work_intro} onChange={(e) => set('work_intro', e.target.value)} /></Field></div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-display font-semibold">WhatsApp button (end of every page)</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.wa_on} onChange={(e) => set('wa_on', e.target.checked)} /> Show</label>
        </div>
        <p className="text-sm text-black/55 sm:col-span-2">Your WhatsApp number is set in Settings. Leave a field empty to use the default wording.</p>
        <Field label="Heading" hint="Default: Like what you see?"><input className="input" value={f.wa_title} onChange={(e) => set('wa_title', e.target.value)} /></Field>
        <Field label="Button text" hint="Default: Chat on WhatsApp"><input className="input" value={f.wa_button} onChange={(e) => set('wa_button', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Supporting text"><input className="input" value={f.wa_text} onChange={(e) => set('wa_text', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Message the visitor sends you" hint="Pre-filled in WhatsApp. Add {link} to include the page they were viewing, e.g. “Hello, I saw {link} and I'd like a similar design.”"><textarea rows={3} className="input" value={f.wa_message} onChange={(e) => set('wa_message', e.target.value)} /></Field></div>
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
