import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Copy, Eye, Loader2, Pencil, Plus, Search, Star, Trash2, Upload } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Img, Pagination, Spinner, Switch } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { deleteRow, listRows, saveRow, uploadMedia, type Row } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/lib/settings'
import { useToast } from '@/lib/toast'
import { errMsg, formatDate, formatPrice, slugify } from '@/utils/format'
import type { PortfolioImage } from '@/types'

const PAGE = 12

export function PortfolioList() {
  const toast = useToast(); const { settings } = useSettings()
  const { data, loading, error, reload } = useAsync(() => listRows('portfolio_projects'), [])
  const cats = useAsync(() => listRows('categories', { order: 'name', asc: true }), [])
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [cat, setCat] = useState(''); const [feat, setFeat] = useState('')
  const [sort, setSort] = useState('created_at'); const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set()); const [del, setDel] = useState<Row[] | null>(null); const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const r = (data ?? []).filter((p) => (!s || [p.title, p.client_name, p.slug].some((x) => String(x ?? '').toLowerCase().includes(s))) && (!status || p.status === status) && (!cat || p.category_id === cat) && (!feat || String(p.featured) === feat))
    return [...r].sort((a, b) => (sort === 'title' ? String(a.title).localeCompare(String(b.title)) : sort === 'sort_order' ? Number(a.sort_order) - Number(b.sort_order) : String(b[sort]).localeCompare(String(a[sort]))))
  }, [data, q, status, cat, feat, sort])
  const paged = rows.slice((page - 1) * PAGE, page * PAGE)
  const catName = (id: unknown) => cats.data?.find((c) => c.id === id)?.name as string | undefined
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const setStatusFor = async (ids: string[], st: string) => {
    try { const { error: e } = await supabase.from('portfolio_projects').update({ status: st }).in('id', ids); if (e) throw e; toast.success(st === 'published' ? 'Design published.' : st === 'draft' ? 'Design unpublished.' : 'Design archived.'); setSel(new Set()); reload() } catch (e) { toast.error(errMsg(e)) }
  }
  const setFeatured = async (r: Row) => { try { await saveRow('portfolio_projects', { featured: !r.featured }, r.id); toast.success(r.featured ? 'Removed from featured.' : 'Marked as featured.'); reload() } catch (e) { toast.error(errMsg(e)) } }
  const duplicate = async (r: Row) => {
    try {
      const { data: imgs } = await supabase.from('portfolio_images').select('*').eq('project_id', r.id)
      const copy: Record<string, unknown> = { ...r, title: `${r.title} (copy)`, slug: `${r.slug}-copy-${Math.random().toString(36).slice(2, 6)}`, status: 'draft', view_count: 0, is_sample: false }
      for (const k of ['id', 'created_at', 'updated_at']) delete copy[k]
      const n = await saveRow('portfolio_projects', copy)
      if (imgs?.length) await supabase.from('portfolio_images').insert(imgs.map((i) => ({ project_id: n.id, image_url: i.image_url, alt_text: i.alt_text, sort_order: i.sort_order })))
      toast.success('Design duplicated as draft.'); reload()
    } catch (e) { toast.error(errMsg(e)) }
  }
  const remove = async () => {
    if (!del) return; setBusy(true)
    try { await Promise.all(del.map((r) => deleteRow('portfolio_projects', r.id))); toast.success(del.length > 1 ? 'Designs deleted.' : 'Design deleted.'); setDel(null); setSel(new Set()); reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">All Designs</h1><Link to="/admin/portfolio/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Add design</Link></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search designs" placeholder="Search title, client…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        <select className="input" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select className="input" aria-label="Category" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="created_at">Newest</option><option value="title">Title A–Z</option><option value="sort_order">Sort order</option></select>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <select className="input !w-auto" aria-label="Featured filter" value={feat} onChange={(e) => { setFeat(e.target.value); setPage(1) }}><option value="">Featured: any</option><option value="true">Featured only</option><option value="false">Not featured</option></select>
        {sel.size > 0 && <><span className="text-black/50">{sel.size} selected</span><button className="btn btn-ghost" onClick={() => void setStatusFor([...sel], 'published')}>Publish</button><button className="btn btn-ghost" onClick={() => void setStatusFor([...sel], 'draft')}>Unpublish</button><button className="btn btn-ghost" onClick={() => void setStatusFor([...sel], 'archived')}>Archive</button><button className="btn btn-danger" onClick={() => setDel((data ?? []).filter((r) => sel.has(r.id)))}>Delete</button></>}
      </div>
      {loading ? <Spinner label="Loading designs…" /> : error ? <ErrorState message="Unable to load designs." onRetry={reload} /> : !rows.length ? <EmptyState title="No designs found." hint="Add your first design to get started." action={<Link to="/admin/portfolio/new" className="btn btn-primary">Add design</Link>} /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50"><tr>
            <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all on page" checked={paged.length > 0 && paged.every((r) => sel.has(r.id))} onChange={(e) => setSel(e.target.checked ? new Set(paged.map((r) => r.id)) : new Set())} /></th>
            {['Image', 'Title', 'Category', 'Price', 'Status', 'Featured', 'Created'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}<th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-black/5">{paged.map((r) => (
            <tr key={r.id} className="hover:bg-black/[.02]">
              <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.title}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
              <td className="px-4 py-3"><span className="block h-12 w-12 overflow-hidden rounded-lg bg-black/5"><Img src={r.cover_image_url as string | null} alt="" seed={String(r.title)} width={100} /></span></td>
              <td className="px-4 py-3 font-medium">{String(r.title)}{r.is_sample ? <span className="ml-2 text-xs font-normal text-black/40">sample</span> : null}</td>
              <td className="px-4 py-3 text-black/60">{catName(r.category_id) ?? '—'}</td>
              <td className="px-4 py-3">{formatPrice(r.price as number | null, r.price_label as string | null, settings?.currency)}</td>
              <td className="px-4 py-3"><Badge value={String(r.status)} /></td>
              <td className="px-4 py-3"><button aria-label={r.featured ? 'Unfeature' : 'Feature'} onClick={() => void setFeatured(r)}><Star className={`h-4 w-4 ${r.featured ? 'fill-amber-400 text-amber-500' : 'text-black/30'}`} /></button></td>
              <td className="px-4 py-3 text-black/55">{formatDate(String(r.created_at))}</td>
              <td className="px-4 py-3"><div className="flex justify-end gap-1">
                <Link className="rounded-lg p-2 hover:bg-black/5" aria-label="Preview" to={`/admin/preview/${r.slug}`}><Eye className="h-4 w-4" /></Link>
                <Link className="rounded-lg p-2 hover:bg-black/5" aria-label="Edit" to={`/admin/portfolio/${r.id}`}><Pencil className="h-4 w-4" /></Link>
                <button className="rounded-lg p-2 hover:bg-black/5" aria-label="Duplicate" onClick={() => void duplicate(r)}><Copy className="h-4 w-4" /></button>
                <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete" onClick={() => setDel([r])}><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>))}</tbody></table></div>)}
      <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      <ConfirmDialog open={!!del} title={del && del.length > 1 ? `Delete ${del.length} projects?` : 'Delete this project?'} message="This action cannot be undone." busy={busy} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  )
}

interface Form { title: string; slug: string; short_description: string; description: string; category_id: string; service_id: string; client_name: string; client_type: string; price: string; price_label: string; cover_image_url: string | null; featured: boolean; status: string; sort_order: string }
const EMPTY: Form = { title: '', slug: '', short_description: '', description: '', category_id: '', service_id: '', client_name: '', client_type: '', price: '', price_label: '', cover_image_url: null, featured: false, status: 'draft', sort_order: '0' }

export function PortfolioEditor() {
  const { id } = useParams(); const isNew = !id || id === 'new'
  const nav = useNavigate(); const toast = useToast()
  const cats = useAsync(() => listRows('categories', { order: 'sort_order', asc: true }), [])
  const svcs = useAsync(() => listRows('services', { order: 'sort_order', asc: true }), [])
  const [f, setF] = useState<Form>(EMPTY); const [images, setImages] = useState<Pick<PortfolioImage, 'image_url' | 'alt_text'>[]>([])
  const [slugTouched, setSlugTouched] = useState(!isNew); const [errs, setErrs] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const loaded = useAsync(async () => {
    if (isNew) return null
    const { data, error } = await supabase.from('portfolio_projects').select('*, images:portfolio_images(*)').eq('id', id).single()
    if (error) throw new Error(error.message)
    setF({ title: data.title, slug: data.slug, short_description: data.short_description ?? '', description: data.description ?? '', category_id: data.category_id ?? '', service_id: data.service_id ?? '', client_name: data.client_name ?? '', client_type: data.client_type ?? '', price: data.price == null ? '' : String(data.price), price_label: data.price_label ?? '', cover_image_url: data.cover_image_url, featured: data.featured, status: data.status, sort_order: String(data.sort_order) })
    setImages((data.images as PortfolioImage[]).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ image_url: i.image_url, alt_text: i.alt_text })))
    return data
  }, [id])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const addImages = async (list: FileList | null) => {
    if (!list?.length) return; setUploading(true)
    try { const up: Awaited<ReturnType<typeof uploadMedia>>[] = []; for (const file of Array.from(list)) up.push(await uploadMedia(file, 'portfolio')); setImages((x) => [...x, ...up.map((m) => ({ image_url: m.url, alt_text: null }))]); if (!f.cover_image_url) set('cover_image_url', up[0].url); toast.success(`${up.length} image${up.length > 1 ? 's' : ''} uploaded.`) }
    catch (e) { toast.error(errMsg(e)) } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const moveImg = (i: number, d: -1 | 1) => setImages((x) => { const n = [...x]; const j = i + d; if (j < 0 || j >= n.length) return x; [n[i], n[j]] = [n[j], n[i]]; return n })

  const save = async (status?: string) => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Title is required.'; if (!f.slug.trim()) e.slug = 'Slug is required.'
    setErrs(e); if (Object.keys(e).length || saving) return; setSaving(true)
    try {
      const payload = { title: f.title.trim(), slug: f.slug, short_description: f.short_description || null, description: f.description || null, category_id: f.category_id || null, service_id: f.service_id || null, client_name: f.client_name || null, client_type: f.client_type || null, price: f.price === '' ? null : Number(f.price), price_label: f.price_label || null, cover_image_url: f.cover_image_url, featured: f.featured, status: status ?? f.status, sort_order: Number(f.sort_order) || 0 }
      const row = await saveRow('portfolio_projects', payload, isNew ? undefined : id)
      const { error: de } = await supabase.from('portfolio_images').delete().eq('project_id', row.id); if (de) throw de
      if (images.length) { const { error: ie } = await supabase.from('portfolio_images').insert(images.map((im, i) => ({ project_id: row.id, image_url: im.image_url, alt_text: im.alt_text, sort_order: i }))); if (ie) throw ie }
      toast.success(payload.status === 'published' ? 'Design published.' : 'Design saved.')
      if (isNew) nav(`/admin/portfolio/${row.id}`, { replace: true }); else { set('status', payload.status); }
    } catch (x) { const m = errMsg(x); toast.error(/duplicate|unique/i.test(m) ? 'That slug is already in use.' : m) } finally { setSaving(false) }
  }

  if (!isNew && loaded.loading) return <Spinner />
  if (loaded.error) return <ErrorState message="Unable to load this design." onRetry={loaded.reload} />
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{isNew ? 'Add design' : 'Edit design'}</h1>
        <div className="flex flex-wrap gap-2">
          {!isNew && <Link className="btn btn-ghost" to={`/admin/preview/${f.slug}?from=/admin/portfolio/${id}`}><Eye className="h-4 w-4" /> Preview</Link>}
          <button className="btn btn-ghost" disabled={saving} onClick={() => void save('draft')}>Save draft</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void save('published')}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {f.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <Field label="Title" required error={errs.title}><input className="input" value={f.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Slug" required error={errs.slug} hint="Public URL: /portfolio/your-slug"><input className="input" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Short description"><input className="input" value={f.short_description} onChange={(e) => set('short_description', e.target.value)} /></Field>
          <Field label="Description"><textarea rows={7} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><select className="input" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Service"><select className="input" value={f.service_id} onChange={(e) => set('service_id', e.target.value)}><option value="">None</option>{svcs.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Client name"><input className="input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
            <Field label="Client type"><input className="input" value={f.client_type} onChange={(e) => set('client_type', e.target.value)} /></Field>
            <Field label="Price" hint="Empty = use price label only."><input type="number" step="any" className="input" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
            <Field label="Price label"><input className="input" value={f.price_label} onChange={(e) => set('price_label', e.target.value)} placeholder="e.g. Starting from" /></Field>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Featured</span><Switch label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} /></div>
            <Field label="Sort order"><input type="number" className="input" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
          </div>
          <div className="card p-5"><ImageField label="Cover image" value={f.cover_image_url} onChange={(v) => set('cover_image_url', v)} /></div>
          <div className="card p-5"><span className="label">Gallery</span>
            <div className="grid grid-cols-3 gap-2">{images.map((im, i) => (
              <div key={im.image_url + i} className="group relative aspect-square overflow-hidden rounded-xl bg-black/5"><Img src={im.image_url} alt="" width={200} />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white"><button aria-label="Move earlier" onClick={() => moveImg(i, -1)}><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button><button aria-label="Move later" onClick={() => moveImg(i, 1)}><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button><button aria-label="Remove image" onClick={() => setImages((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button></div></div>))}</div>
            <button className="btn btn-ghost mt-3 w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add images</button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addImages(e.target.files)} />
          </div>
        </div>
      </div>
    </div>
  )
}
