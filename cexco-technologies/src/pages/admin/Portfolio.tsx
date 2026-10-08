import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Loader2, Pencil, Plus, Search, Star, Trash2, Upload } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Img, Spinner, Switch } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { deleteRow, listRows, saveRow, uploadMedia, type Row } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { cn, errMsg, slugify } from '@/utils/format'
import { measureImage } from '@/utils/image'
import { writeFor } from '@/utils/writer'
import type { PortfolioImage } from '@/types'

const byOrder = (a: Row, b: Row) => Number(a.sort_order) - Number(b.sort_order) || String(b.created_at).localeCompare(String(a.created_at))
const friendly = (m: string) => (/year|cover_ratio|secondary_category_id/.test(m) && /column|schema/i.test(m) ? 'Run the new SQL (005 and 006) in Supabase first, then try again.' : /duplicate|unique/i.test(m) ? 'That slug is already in use.' : m)

export function PortfolioList() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('portfolio_projects', { order: 'sort_order', asc: true }), [])
  const cats = useAsync(() => listRows('categories', { order: 'name', asc: true }), [])
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [cat, setCat] = useState(''); const [feat, setFeat] = useState('')
  const [dragId, setDragId] = useState<string | null>(null); const [overId, setOverId] = useState<string | null>(null)
  const [del, setDel] = useState<Row | null>(null); const [busy, setBusy] = useState(false)

  useEffect(() => { if (data) setRows([...data].sort(byOrder)) }, [data])

  // One-time quiet backfill: measure covers that have no stored proportions yet (needed by the editorial grid)
  const filled = useRef(false)
  useEffect(() => {
    if (!data || filled.current) return
    filled.current = true
    const todo = data.filter((r) => r.cover_image_url && r.cover_ratio == null).slice(0, 40)
    if (!todo.length) return
    void (async () => {
      for (const r of todo) {
        const ratio = await measureImage(String(r.cover_image_url))
        if (!ratio) continue
        const { error: e } = await supabase.from('portfolio_projects').update({ cover_ratio: ratio }).eq('id', r.id)
        if (e) break
      }
    })()
  }, [data])

  const filtering = !!(q.trim() || status || cat || feat)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((p) => (!s || [p.title, p.client_name, p.slug].some((x) => String(x ?? '').toLowerCase().includes(s))) && (!status || p.status === status) && (!cat || p.category_id === cat) && (!feat || String(p.featured) === feat))
  }, [rows, q, status, cat, feat])
  const catName = (id: unknown) => cats.data?.find((c) => c.id === id)?.name as string | undefined

  const persistOrder = async (list: Row[]) => {
    const changed = list.map((r, i) => ({ r, order: i + 1 })).filter((x) => Number(x.r.sort_order) !== x.order)
    if (!changed.length) return
    const { error: e } = await supabase.from('portfolio_projects').upsert(changed.map(({ r, order }) => ({ id: r.id, title: r.title, slug: r.slug, sort_order: order })))
    if (e) throw e
  }
  const reorder = async (fromId: string, toId: string) => {
    const list = [...rows]
    const a = list.findIndex((x) => x.id === fromId); const b = list.findIndex((x) => x.id === toId)
    if (a < 0 || b < 0 || a === b) return
    const [m] = list.splice(a, 1); list.splice(b, 0, m)
    const before = rows
    setRows(list.map((r, i) => ({ ...r, sort_order: i + 1 })))
    try { await persistOrder(list); toast.success('Order saved.') } catch (e) { setRows(before); toast.error(errMsg(e)) }
  }
  const move = (id: string, d: -1 | 1) => { const i = rows.findIndex((x) => x.id === id); const o = rows[i + d]; if (o) void reorder(id, o.id) }

  const patch = async (r: Row, values: Record<string, unknown>, msg: string) => {
    try { await saveRow('portfolio_projects', values, r.id); toast.success(msg); setRows((l) => l.map((x) => (x.id === r.id ? { ...x, ...values } : x))) } catch (e) { toast.error(errMsg(e)) }
  }
  const duplicate = async (r: Row) => {
    try {
      const { data: imgs } = await supabase.from('portfolio_images').select('*').eq('project_id', r.id)
      const copy: Record<string, unknown> = { ...r, title: `${r.title} (copy)`, slug: `${r.slug}-copy-${Math.random().toString(36).slice(2, 6)}`, status: 'draft', view_count: 0, is_sample: false, sort_order: rows.length + 1 }
      for (const k of ['id', 'created_at', 'updated_at']) delete copy[k]
      const n = await saveRow('portfolio_projects', copy)
      if (imgs?.length) await supabase.from('portfolio_images').insert(imgs.map((i) => ({ project_id: n.id, image_url: i.image_url, alt_text: i.alt_text, sort_order: i.sort_order })))
      toast.success('Project duplicated as a draft.'); reload()
    } catch (e) { toast.error(errMsg(e)) }
  }
  const remove = async () => {
    if (!del) return; setBusy(true)
    try { await deleteRow('portfolio_projects', del.id); toast.success('Project deleted.'); setRows((l) => l.filter((x) => x.id !== del.id)); setDel(null) } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  const icon = 'rounded-lg p-2 hover:bg-black/5'
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">All Projects</h1><Link to="/admin/portfolio/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Add project</Link></div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search projects" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select className="input" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select>
        <select className="input" aria-label="Featured" value={feat} onChange={(e) => setFeat(e.target.value)}><option value="">Featured: any</option><option value="true">Featured only</option><option value="false">Not featured</option></select>
      </div>
      <p className="mb-4 text-xs text-black/50">{filtering ? 'Clear the search and filters to change the order.' : 'Drag a row (or use the arrows) to set the order projects appear on the website.'}</p>

      {loading ? <Spinner label="Loading projects…" /> : error ? <ErrorState message="Unable to load projects." onRetry={reload} /> : !shown.length ? <EmptyState title="No projects found." hint="Add your first project to get started." action={<Link to="/admin/portfolio/new" className="btn btn-primary">Add project</Link>} /> : (
        <ul className="space-y-2">
          {shown.map((r) => (
            <li key={r.id} draggable={!filtering}
              onDragStart={() => setDragId(r.id)} onDragOver={(e) => { if (dragId && !filtering) { e.preventDefault(); setOverId(r.id) } }}
              onDrop={(e) => { e.preventDefault(); if (dragId) void reorder(dragId, r.id); setDragId(null); setOverId(null) }} onDragEnd={() => { setDragId(null); setOverId(null) }}
              className={cn('card flex flex-wrap items-center gap-x-3 gap-y-2 p-3 transition', dragId === r.id && 'opacity-40', overId === r.id && dragId !== r.id && '!border-accent')}>
              {!filtering && <GripVertical aria-hidden className="hidden h-4 w-4 shrink-0 cursor-grab text-black/30 sm:block" />}
              <span className="h-14 w-14 shrink-0 overflow-hidden bg-black/5"><Img src={r.cover_image_url as string | null} alt="" seed={String(r.title)} width={120} /></span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{String(r.title)}{r.is_sample ? <span className="ml-2 text-xs font-normal text-black/40">sample</span> : null}</p>
                <p className="truncate text-xs text-black/50">{catName(r.category_id) ?? 'No category'}{r.year ? ` · ${String(r.year)}` : ''}</p>
              </div>
              <Badge value={String(r.status)} />
              <div className="ml-auto flex items-center">
                {!filtering && <><button className={icon} aria-label="Move up" onClick={() => move(r.id, -1)}><ArrowUp className="h-4 w-4" /></button><button className={icon} aria-label="Move down" onClick={() => move(r.id, 1)}><ArrowDown className="h-4 w-4" /></button></>}
                <button className={icon} aria-label={r.featured ? 'Remove from featured' : 'Mark as featured'} onClick={() => void patch(r, { featured: !r.featured }, r.featured ? 'Removed from featured.' : 'Marked as featured.')}><Star className={cn('h-4 w-4', r.featured ? 'fill-amber-400 text-amber-500' : 'text-black/35')} /></button>
                <button className={icon} aria-label={r.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => void patch(r, { status: r.status === 'published' ? 'draft' : 'published' }, r.status === 'published' ? 'Project unpublished.' : 'Project published.')}>{r.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <Link className={icon} aria-label="Preview" to={`/admin/preview/${r.slug}`}><Eye className="h-4 w-4 text-accent" /></Link>
                <Link className={icon} aria-label="Edit" to={`/admin/portfolio/${r.id}`}><Pencil className="h-4 w-4" /></Link>
                <button className={icon} aria-label="Duplicate" onClick={() => void duplicate(r)}><Copy className="h-4 w-4" /></button>
                <button className={cn(icon, 'text-red-600 hover:!bg-red-50')} aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!del} title="Delete this project?" message="This action cannot be undone." busy={busy} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  )
}

interface Form { title: string; slug: string; short_description: string; description: string; category_id: string; secondary_category_id: string; client_name: string; price_label: string; year: string; cover_image_url: string | null; featured: boolean; status: string; sort_order: string }
const EMPTY: Form = { title: '', slug: '', short_description: '', description: '', category_id: '', secondary_category_id: '', client_name: '', price_label: '', year: String(new Date().getFullYear()), cover_image_url: null, featured: false, status: 'published', sort_order: '0' }

export function PortfolioEditor() {
  const { id } = useParams(); const isNew = !id || id === 'new'
  const nav = useNavigate(); const toast = useToast()
  const cats = useAsync(() => listRows('categories', { order: 'sort_order', asc: true }), [])
  const [f, setF] = useState<Form>(EMPTY); const [images, setImages] = useState<Pick<PortfolioImage, 'image_url' | 'alt_text'>[]>([])
  const [orig, setOrig] = useState<{ cover: string | null; ratio: number | null }>({ cover: null, ratio: null })
  const [slugTouched, setSlugTouched] = useState(!isNew); const [errs, setErrs] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const loaded = useAsync(async () => {
    if (isNew) return null
    const { data, error } = await supabase.from('portfolio_projects').select('*, images:portfolio_images(*)').eq('id', id).single()
    if (error) throw new Error(error.message)
    setF({ title: data.title, slug: data.slug, short_description: data.short_description ?? '', description: data.description ?? '', category_id: data.category_id ?? '', client_name: data.client_name ?? '', year: String(data.year ?? new Date(data.created_at).getFullYear()), cover_image_url: data.cover_image_url, featured: data.featured, status: data.status, sort_order: String(data.sort_order), secondary_category_id: data.secondary_category_id ?? '', price_label: data.price_label ?? '' })
    setOrig({ cover: data.cover_image_url, ratio: data.cover_ratio ? Number(data.cover_ratio) : null })
    setImages((data.images as PortfolioImage[]).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ image_url: i.image_url, alt_text: i.alt_text })))
    return data
  }, [id])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  // Smart writer: drafts the short description, description and categories from the title (anything you edit yourself is left alone)
  const touched = useRef({ short: false, desc: false, cat: false })
  const lastTitle = useRef('')
  const [written, setWritten] = useState(false)
  const generate = (force: boolean) => {
    const title = f.title.trim()
    if (title.length < 3 || !cats.data) return
    const out = writeFor(title, cats.data.map((c) => ({ id: c.id, name: String(c.name) })))
    if (force) touched.current = { short: false, desc: false, cat: false }
    setF((x) => ({
      ...x,
      short_description: touched.current.short ? x.short_description : out.short,
      description: touched.current.desc ? x.description : out.description,
      category_id: touched.current.cat ? x.category_id : out.primary ?? x.category_id,
      secondary_category_id: touched.current.cat ? x.secondary_category_id : out.secondary ?? '',
    }))
    setWritten(true)
  }
  useEffect(() => {
    if (!isNew || f.title.trim().length < 4 || !cats.data) return
    const t = window.setTimeout(() => {
      const title = f.title.trim()
      if (title === lastTitle.current) return
      lastTitle.current = title
      generate(false)
    }, 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.title, isNew, cats.data])

  const resetForm = () => {
    setF({ ...EMPTY, year: String(new Date().getFullYear()) }); setImages([]); setOrig({ cover: null, ratio: null })
    setSlugTouched(false); setErrs({}); setWritten(false); lastTitle.current = ''; touched.current = { short: false, desc: false, cat: false }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addImages = async (list: FileList | null) => {
    if (!list?.length) return; setUploading(true)
    try {
      const up: Awaited<ReturnType<typeof uploadMedia>>[] = []
      for (const file of Array.from(list)) up.push(await uploadMedia(file, 'portfolio'))
      setImages((x) => [...x, ...up.map((m) => ({ image_url: m.url, alt_text: null }))])
      if (!f.cover_image_url) set('cover_image_url', up[0].url)
      toast.success(`${up.length} image${up.length > 1 ? 's' : ''} uploaded.`)
    } catch (e) { toast.error(errMsg(e)) } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const moveImg = (i: number, d: -1 | 1) => setImages((x) => { const n = [...x]; const j = i + d; if (j < 0 || j >= n.length) return x; [n[i], n[j]] = [n[j], n[i]]; return n })

  const save = async (status?: string) => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Title is required.'; if (!f.slug.trim()) e.slug = 'Slug is required.'
    if (f.year && !/^\d{4}$/.test(f.year)) e.year = 'Use a 4-digit year.'
    setErrs(e); if (Object.keys(e).length || saving) return; setSaving(true)
    try {
      const ratio = f.cover_image_url ? (f.cover_image_url === orig.cover && orig.ratio ? orig.ratio : await measureImage(f.cover_image_url)) : null
      const payload = { title: f.title.trim(), slug: f.slug, short_description: f.short_description || null, description: f.description || null, category_id: f.category_id || null, secondary_category_id: f.secondary_category_id && f.secondary_category_id !== f.category_id ? f.secondary_category_id : null, price_label: f.price_label.trim() || null, client_name: f.client_name || null, year: f.year ? Number(f.year) : null, cover_image_url: f.cover_image_url, cover_ratio: ratio, featured: f.featured, status: status ?? f.status, sort_order: Number(f.sort_order) || 0 }
      const row = await saveRow('portfolio_projects', payload, isNew ? undefined : id)
      const { error: de } = await supabase.from('portfolio_images').delete().eq('project_id', row.id); if (de) throw de
      if (images.length) { const { error: ie } = await supabase.from('portfolio_images').insert(images.map((im, i) => ({ project_id: row.id, image_url: im.image_url, alt_text: im.alt_text, sort_order: i }))); if (ie) throw ie }
      toast.success(payload.status === 'published' ? 'Project published.' : 'Project saved.')
      setOrig({ cover: f.cover_image_url, ratio })
      if (isNew && payload.status === 'published') resetForm() // ready for the next project
      else if (isNew) nav(`/admin/portfolio/${row.id}`, { replace: true })
      else set('status', payload.status)
    } catch (x) { toast.error(friendly(errMsg(x))) } finally { setSaving(false) }
  }

  if (!isNew && loaded.loading) return <Spinner />
  if (loaded.error) return <ErrorState message="Unable to load this project." onRetry={loaded.reload} />
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{isNew ? 'Add project' : 'Edit project'}</h1>
        <div className="flex flex-wrap gap-2">
          {!isNew && <Link className="btn btn-ghost" to={`/admin/preview/${f.slug}?from=/admin/portfolio/${id}`}><Eye className="h-4 w-4" /> Preview</Link>}
          <button className="btn btn-ghost" disabled={saving} onClick={() => void save('draft')}>Save draft</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void save('published')}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {!isNew && f.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <Field label="Title" required error={errs.title}><input className="input" value={f.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Slug" required error={errs.slug} hint="Web address: /work/your-slug"><input className="input" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></Field>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/[.04] px-3.5 py-2.5 text-xs text-black/60">
            <span>{written ? 'Written automatically from the title. Edit anything you like.' : 'Type the title and the short description, description and category are written for you.'}</span>
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-xs" disabled={f.title.trim().length < 3} onClick={() => generate(true)}>Write again</button>
          </div>
          <Field label="Short description" hint="One line shown under the title on the project page."><input className="input" value={f.short_description} onChange={(e) => { touched.current.short = true; set('short_description', e.target.value) }} /></Field>
          <Field label="Description" hint="Optional. Separate paragraphs with a blank line."><textarea rows={6} className="input" value={f.description} onChange={(e) => { touched.current.desc = true; set('description', e.target.value) }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><select className="input" value={f.category_id} onChange={(e) => { touched.current.cat = true; set('category_id', e.target.value) }}><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Second category (optional)" hint="The project also appears when people browse or search this category."><select className="input" value={f.secondary_category_id} onChange={(e) => { touched.current.cat = true; set('secondary_category_id', e.target.value) }}><option value="">None</option>{cats.data?.filter((c) => c.id !== f.category_id).map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Year" error={errs.year}><input inputMode="numeric" maxLength={4} className="input" value={f.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Client / project label"><input className="input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Price or price range (optional)" hint="Shown on the project page. Examples: ₦15,000 · ₦15,000 – ₦30,000 · From ₦10,000"><input className="input" value={f.price_label} onChange={(e) => set('price_label', e.target.value)} /></Field></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Featured on homepage</span><Switch label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} /></div>
            <Field label="Sort order" hint="Lower numbers come first. You can also drag projects in the list."><input type="number" className="input" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
          </div>
          <div className="card p-5"><ImageField label="Cover image" value={f.cover_image_url} onChange={(v) => set('cover_image_url', v)} /></div>
          <div className="card p-5"><span className="label">Gallery</span>
            <div className="grid grid-cols-3 gap-2">{images.map((im, i) => (
              <div key={im.image_url + i} className="relative aspect-square overflow-hidden bg-black/5"><Img src={im.image_url} alt="" width={200} />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/65 p-1 text-white">
                  <button aria-label="Move earlier" onClick={() => moveImg(i, -1)}><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
                  <button aria-label="Use as cover" onClick={() => set('cover_image_url', im.image_url)}><Star className={cn('h-3.5 w-3.5', f.cover_image_url === im.image_url && 'fill-amber-400 text-amber-400')} /></button>
                  <button aria-label="Move later" onClick={() => moveImg(i, 1)}><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
                  <button aria-label="Remove image" onClick={() => setImages((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
                </div></div>))}</div>
            <button className="btn btn-ghost mt-3 w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add images</button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addImages(e.target.files)} />
          </div>
        </div>
      </div>
    </div>
  )
    }
