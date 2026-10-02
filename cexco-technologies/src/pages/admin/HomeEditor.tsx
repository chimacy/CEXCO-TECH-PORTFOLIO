import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ErrorState, Field, Spinner } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { listRows } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

interface Form { badge: string; title: string; description: string; cta_text: string; hero_image_url: string | null; g_subtitle: string; g_title: string; g_description: string }
const EMPTY: Form = { badge: '', title: '', description: '', cta_text: '', hero_image_url: null, g_subtitle: '', g_title: '', g_description: '' }

export default function HomeEditor() {
  const toast = useToast()
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
      g_subtitle: String(data.gal?.subtitle ?? ''), g_title: String(data.gal?.title ?? ''), g_description: String(data.gal?.description ?? ''),
    })
  }, [data])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (busy) return
    setBusy(true)
    try {
      const heroCfg = { ...((data?.hero?.config ?? {}) as Record<string, unknown>), badge: f.badge || null, hero_image_url: f.hero_image_url }
      const { error: e } = await supabase.from('homepage_sections').upsert([
        { key: 'hero', title: f.title || null, description: f.description || null, cta_text: f.cta_text || null, config: heroCfg, is_visible: true, sort_order: Number(data?.hero?.sort_order ?? 1) },
        { key: 'featured_work', title: f.g_title || null, subtitle: f.g_subtitle || null, description: f.g_description || null, config: (data?.gal?.config ?? {}) as Record<string, unknown>, is_visible: true, sort_order: Number(data?.gal?.sort_order ?? 2) },
      ], { onConflict: 'key' })
      if (e) throw e
      toast.success('Home page saved.'); reload()
    } catch (x) { toast.error(errMsg(x)) } finally { setBusy(false) }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorState message="Unable to load the home page content." onRetry={reload} />
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Home page</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink className="h-4 w-4" /> View site</a>
          <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
        </div>
      </div>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display font-semibold sm:col-span-2">Top of the page</h2>
        <div className="sm:col-span-2"><Field label="Small label above the heading" hint="Optional, e.g. Graphic Design Portfolio."><input className="input" value={f.badge} onChange={(e) => set('badge', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Main heading"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Short text under the heading"><textarea rows={3} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
        <Field label="Button text" hint="The button scrolls down to your work. Default: View work."><input className="input" value={f.cta_text} onChange={(e) => set('cta_text', e.target.value)} /></Field>
        <ImageField label="Image beside the heading (optional)" value={f.hero_image_url} onChange={(v) => set('hero_image_url', v)} />
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display font-semibold sm:col-span-2">Work section heading</h2>
        <Field label="Small label"><input className="input" value={f.g_subtitle} onChange={(e) => set('g_subtitle', e.target.value)} /></Field>
        <Field label="Heading"><input className="input" value={f.g_title} onChange={(e) => set('g_title', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Short text"><textarea rows={2} className="input" value={f.g_description} onChange={(e) => set('g_description', e.target.value)} /></Field></div>
        <p className="text-xs text-black/50 sm:col-span-2">Leave the heading and text empty to show the designs with no heading.</p>
      </section>
    </div>
  )
}
