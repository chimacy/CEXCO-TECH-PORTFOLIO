import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Pencil } from 'lucide-react'
import { ErrorState, Field, Modal, Spinner, Switch, Badge } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { RichEditor } from '@/components/admin/RichEditor'
import { useAsync } from '@/hooks/useAsync'
import { listRows, saveRow, type Row } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

const LIST_SOURCE: Record<string, { table: string; label: string }> = {
  featured_work: { table: 'portfolio_projects', label: 'title' }, services: { table: 'services', label: 'name' },
  categories: { table: 'categories', label: 'name' }, testimonials: { table: 'testimonials', label: 'client_name' }, pricing: { table: 'pricing_items', label: 'title' },
}
const NAMES: Record<string, string> = { hero: 'Hero', featured_work: 'Featured Work', services: 'Services', categories: 'Categories', about: 'About preview', process: 'Process', testimonials: 'Testimonials', pricing: 'Pricing preview', cta: 'Call to action', contact: 'Contact' }

export function HomepageManager() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('homepage_sections', { order: 'sort_order', asc: true }), [])
  const [edit, setEdit] = useState<Row | null>(null)
  const toggle = async (r: Row) => { try { await saveRow('homepage_sections', { is_visible: !r.is_visible }, r.id); toast.success(r.is_visible ? 'Section hidden.' : 'Section visible.'); reload() } catch (e) { toast.error(errMsg(e)) } }
  const move = async (i: number, d: -1 | 1) => {
    const list = data ?? []; const a = list[i]; const b = list[i + d]; if (!b) return
    try { await Promise.all(list.map((r, idx) => { const newIdx = idx === i ? i + d : idx === i + d ? i : idx; return saveRow('homepage_sections', { sort_order: newIdx + 1 }, r.id) })); toast.success('Section order updated.'); reload() } catch (e) { toast.error(errMsg(e)) }
    void a
  }
  if (loading) return <Spinner />
  if (error) return <ErrorState message="Unable to load homepage sections." onRetry={reload} />
  return (
    <div><h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Homepage</h1><p className="mb-6 text-sm text-black/55">Show, hide, reorder and edit every homepage section.</p>
      <ul className="space-y-3">{data?.map((r, i) => (
        <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-col"><button aria-label="Move up" disabled={i === 0} onClick={() => void move(i, -1)} className="disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button aria-label="Move down" disabled={i === (data.length - 1)} onClick={() => void move(i, 1)} className="disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div>
          <div className="min-w-0 flex-1"><p className="font-medium">{NAMES[String(r.key)] ?? String(r.key)}</p><p className="truncate text-sm text-black/50">{String(r.title ?? '—')}</p></div>
          <Badge value={r.is_visible ? 'published' : 'draft'} />
          <Switch label={`Show ${NAMES[String(r.key)] ?? r.key}`} checked={Boolean(r.is_visible)} onChange={() => void toggle(r)} />
          <button className="btn btn-ghost !px-3" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /> Edit</button>
        </li>))}</ul>
      {edit && <SectionModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}

function SectionModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const key = String(row.key)
  const [v, setV] = useState({ title: String(row.title ?? ''), subtitle: String(row.subtitle ?? ''), description: String(row.description ?? ''), cta_text: String(row.cta_text ?? ''), cta_link: String(row.cta_link ?? '') })
  const [cfg, setCfg] = useState<Record<string, unknown>>((row.config as Record<string, unknown>) ?? {})
  const [busy, setBusy] = useState(false)
  const src = LIST_SOURCE[key]
  const items = useAsync(() => (src ? listRows(src.table) : Promise.resolve([] as Row[])), [key])
  const projects = useAsync(() => (key === 'hero' ? listRows('portfolio_projects') : Promise.resolve([] as Row[])), [key])
  const ids = Array.isArray(cfg.item_ids) ? (cfg.item_ids as string[]) : []
  const s = <K extends keyof typeof v>(k: K, x: string) => setV((p) => ({ ...p, [k]: x }))
  useEffect(() => undefined, [])
  const save = async () => {
    setBusy(true)
    try { await saveRow('homepage_sections', { title: v.title || null, subtitle: v.subtitle || null, description: v.description || null, cta_text: v.cta_text || null, cta_link: v.cta_link || null, config: cfg }, row.id); toast.success('Section saved.'); onSaved() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`Edit ${NAMES[key] ?? key}`} wide footer={<><button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {key === 'hero' && <div className="sm:col-span-2"><Field label="Badge text"><input className="input" value={String(cfg.badge ?? '')} onChange={(e) => setCfg({ ...cfg, badge: e.target.value })} /></Field></div>}
        <div className="sm:col-span-2"><Field label={key === 'hero' ? 'Heading' : 'Title'}><input className="input" value={v.title} onChange={(e) => s('title', e.target.value)} /></Field></div>
        {key !== 'hero' && <div className="sm:col-span-2"><Field label="Subtitle"><input className="input" value={v.subtitle} onChange={(e) => s('subtitle', e.target.value)} /></Field></div>}
        <div className="sm:col-span-2"><Field label={key === 'hero' ? 'Subheading' : 'Description'}><textarea rows={3} className="input" value={v.description} onChange={(e) => s('description', e.target.value)} /></Field></div>
        <Field label={key === 'hero' ? 'Primary CTA text' : 'CTA text'}><input className="input" value={v.cta_text} onChange={(e) => s('cta_text', e.target.value)} /></Field>
        <Field label={key === 'hero' ? 'Primary CTA link' : 'CTA link'}><input className="input" placeholder="/portfolio" value={v.cta_link} onChange={(e) => s('cta_link', e.target.value)} /></Field>
        {key === 'hero' && <>
          <Field label="Secondary CTA text"><input className="input" value={String(cfg.secondary_cta_text ?? '')} onChange={(e) => setCfg({ ...cfg, secondary_cta_text: e.target.value })} /></Field>
          <Field label="Secondary CTA link"><input className="input" value={String(cfg.secondary_cta_link ?? '')} onChange={(e) => setCfg({ ...cfg, secondary_cta_link: e.target.value })} /></Field>
          <ImageField label="Hero image" value={(cfg.hero_image_url as string | null) ?? null} onChange={(u) => setCfg({ ...cfg, hero_image_url: u })} />
          <Field label="…or featured project" hint="Used when no hero image is set."><select className="input" value={String(cfg.featured_project_id ?? '')} onChange={(e) => setCfg({ ...cfg, featured_project_id: e.target.value || null })}><option value="">None</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{String(p.title)}</option>)}</select></Field></>}
        {src && <>
          <Field label="Max items"><input type="number" min={1} max={24} className="input" value={Number(cfg.limit ?? 6)} onChange={(e) => setCfg({ ...cfg, limit: Math.max(1, Number(e.target.value) || 6) })} /></Field>
          <div className="sm:col-span-2"><span className="label">Choose items (leave empty for automatic)</span>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-black/10 p-2">{items.loading ? <p className="p-2 text-sm text-black/50">Loading…</p> : items.data?.map((it) => (
              <label key={it.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5"><input type="checkbox" checked={ids.includes(it.id)} onChange={(e) => setCfg({ ...cfg, item_ids: e.target.checked ? [...ids, it.id] : ids.filter((x) => x !== it.id) })} />{String(it[src.label])}</label>))}</div></div></>}
      </div>
    </Modal>
  )
}

const PAGES = [{ slug: 'about', label: 'About' }, { slug: 'contact', label: 'Contact' }, { slug: 'privacy', label: 'Privacy' }, { slug: 'terms', label: 'Terms' }]

export function PagesManager() {
  const toast = useToast()
  const [slug, setSlug] = useState('about')
  const { data, loading, error, reload } = useAsync(() => listRows('pages', { order: 'slug', asc: true }), [])
  const row = data?.find((p) => p.slug === slug)
  const [f, setF] = useState<Record<string, unknown>>({}); const [busy, setBusy] = useState(false)
  useEffect(() => { if (row) setF({ ...row }) }, [row?.id, row?.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) return <Spinner />
  if (error) return <ErrorState message="Unable to load pages." onRetry={reload} />
  const str = (k: string) => String(f[k] ?? '')
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (!row) return; setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const k of ['title', 'heading', 'intro', 'body', 'mission', 'vision', 'image_url', 'seo_title', 'seo_description']) payload[k] = f[k] === '' ? null : f[k] ?? null
      payload.values_list = Array.isArray(f.values_list) ? f.values_list : []
      await saveRow('pages', payload, row.id); toast.success('Page saved.'); reload()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">Pages</h1><button className="btn btn-primary" disabled={busy || !row} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save page</button></div>
      <div className="mb-5 flex gap-2 overflow-x-auto">{PAGES.map((p) => <button key={p.slug} onClick={() => setSlug(p.slug)} className={`rounded-full border px-4 py-1.5 text-sm ${slug === p.slug ? 'border-ink bg-ink text-white' : 'border-black/15 bg-white'}`}>{p.label}</button>)}</div>
      {!row ? <ErrorState message="This page record is missing. Run the seed migration." /> : (
        <div className="card grid gap-4 p-5 sm:grid-cols-2" key={row.id}>
          <Field label="Page title"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Heading"><input className="input" value={str('heading')} onChange={(e) => set('heading', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Introduction"><textarea rows={3} className="input" value={str('intro')} onChange={(e) => set('intro', e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><span className="label">Body content</span><RichEditor value={str('body')} onChange={(h) => set('body', h)} /></div>
          {slug === 'about' && <>
            <Field label="Mission"><textarea rows={3} className="input" value={str('mission')} onChange={(e) => set('mission', e.target.value)} /></Field>
            <Field label="Vision"><textarea rows={3} className="input" value={str('vision')} onChange={(e) => set('vision', e.target.value)} /></Field>
            <Field label="Values" hint="One per line."><textarea rows={4} className="input" value={Array.isArray(f.values_list) ? (f.values_list as string[]).join('\n') : ''} onChange={(e) => set('values_list', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></Field>
            <ImageField label="Profile image" value={(f.image_url as string | null) ?? null} onChange={(u) => set('image_url', u)} />
            <p className="text-xs text-black/50 sm:col-span-2">Statistics and process steps are managed under “Stats & Process”.</p></>}
          <Field label="SEO title"><input className="input" value={str('seo_title')} onChange={(e) => set('seo_title', e.target.value)} /></Field>
          <Field label="SEO description"><input className="input" value={str('seo_description')} onChange={(e) => set('seo_description', e.target.value)} /></Field>
        </div>)}
    </div>
  )
}
