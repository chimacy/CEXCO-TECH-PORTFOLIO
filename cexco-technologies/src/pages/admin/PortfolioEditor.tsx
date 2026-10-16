import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Eye, Loader2, Sparkles, Star, Trash2, Upload } from 'lucide-react'
import { ErrorState, Field, Img, Spinner, Switch } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { PlayBadge } from '@/components/WorkGrid'
import { useAsync } from '@/hooks/useAsync'
import { listRows, saveRow, uploadMedia } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { cn, errMsg, slugify } from '@/utils/format'
import { isVideoUrl, measureImage } from '@/utils/image'
import { toUsd } from '@/utils/price'
import { writeFor } from '@/utils/writer'
import type { PortfolioImage } from '@/types'

const friendly = (m: string) => (/year|cover_ratio|secondary_category_id|price_usd/.test(m) && /column|schema/i.test(m) ? 'Run the new SQL (005, 006 and 007) in Supabase first, then try again.' : /duplicate|unique/i.test(m) ? 'That slug is already in use.' : m)

interface Form { title: string; slug: string; short_description: string; description: string; category_id: string; secondary_category_id: string; client_name: string; price_label: string; price_usd: string; year: string; cover_image_url: string | null; featured: boolean; status: string; sort_order: string }
const EMPTY: Form = { title: '', slug: '', short_description: '', description: '', category_id: '', secondary_category_id: '', client_name: '', price_label: '', price_usd: '', year: String(new Date().getFullYear()), cover_image_url: null, featured: false, status: 'published', sort_order: '0' }
type Img1 = Pick<PortfolioImage, 'image_url' | 'alt_text'>
interface AiOut { short: string; description: string; categories: string[]; alt: string }

/** AI writing is switched off: the built-in writer is always used. */
async function callAi(title: string, names: string[]): Promise<AiOut | null> {
  void title; void names
  return null
}

export default function PortfolioEditor() {
  const { id } = useParams(); const isNew = !id || id === 'new'
  const nav = useNavigate(); const toast = useToast()
  const cats = useAsync(() => listRows('categories', { order: 'sort_order', asc: true }), [])
  const sections = useAsync(() => listRows('homepage_sections', { order: 'sort_order', asc: true }), [])
  const [f, setF] = useState<Form>(EMPTY); const [images, setImages] = useState<Img1[]>([])
  const [orig, setOrig] = useState<{ cover: string | null; ratio: number | null }>({ cover: null, ratio: null })
  const [slugTouched, setSlugTouched] = useState(!isNew); const [errs, setErrs] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false)
  const [rate, setRate] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const loaded = useAsync(async () => {
    if (isNew) return null
    const { data, error } = await supabase.from('portfolio_projects').select('*, images:portfolio_images(*)').eq('id', id).single()
    if (error) throw new Error(error.message)
    setF({ title: data.title, slug: data.slug, short_description: data.short_description ?? '', description: data.description ?? '', category_id: data.category_id ?? '', client_name: data.client_name ?? '', year: String(data.year ?? new Date(data.created_at).getFullYear()), cover_image_url: data.cover_image_url, featured: data.featured, status: data.status, sort_order: String(data.sort_order), secondary_category_id: data.secondary_category_id ?? '', price_label: data.price_label ?? '', price_usd: data.price_usd ?? '' })
    usdTouched.current = !!data.price_usd // keep a dollar price that was typed or saved earlier
    setOrig({ cover: data.cover_image_url, ratio: data.cover_ratio ? Number(data.cover_ratio) : null })
    setImages((data.images as PortfolioImage[]).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ image_url: i.image_url, alt_text: i.alt_text })))
    return data
  }, [id])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  // Exchange rate (naira per US dollar) lives with the homepage settings
  useEffect(() => {
    const row = sections.data?.find((r) => r.key === 'featured_work')
    const r = (row?.config as Record<string, unknown> | undefined)?.usd_rate
    if (r) setRate(String(r))
  }, [sections.data])
  const saveRate = async () => {
    const n = Number(rate)
    if (!n || n <= 0) return
    const row = sections.data?.find((r) => r.key === 'featured_work')
    const config = { ...((row?.config as Record<string, unknown> | undefined) ?? {}), usd_rate: n }
    const { error } = await supabase.from('homepage_sections').upsert({ key: 'featured_work', config }, { onConflict: 'key' })
    if (error) toast.error('Only the main admin can change the exchange rate.'); else toast.success('Exchange rate saved.')
  }

  // Dollar price follows the naira price automatically until you type your own
  const usdTouched = useRef(false)
  useEffect(() => {
    if (usdTouched.current) return
    setF((x) => ({ ...x, price_usd: toUsd(x.price_label, Number(rate)) }))
  }, [f.price_label, rate])

  // Writer: real AI when it is set up on the server, the built-in writer otherwise.
  // Anything you edit by hand is left alone.
  const touched = useRef({ short: false, desc: false, cat: false })
  const lastTitle = useRef('')
  const latestTitle = useRef('')
  latestTitle.current = f.title.trim()
  const altSuggest = useRef('')
  const [writing, setWriting] = useState(false)
  const [source, setSource] = useState<'ai' | 'builtin' | null>(null)
  const generate = async (force: boolean) => {
    const title = f.title.trim()
    if (title.length < 3 || !cats.data) return
    if (force) touched.current = { short: false, desc: false, cat: false }
    setWriting(true)
    const list = cats.data.map((c) => ({ id: String(c.id), name: String(c.name) }))
    const ai = await callAi(title, list.map((c) => c.name))
    if (title !== latestTitle.current) { setWriting(false); return } // the title changed while waiting
    let short: string, description: string, primary: string | undefined, secondary: string | undefined
    if (ai) {
      const ids = ai.categories.map((n) => list.find((c) => c.name.toLowerCase() === n.toLowerCase())?.id).filter((x): x is string => !!x)
      short = ai.short; description = ai.description; primary = ids[0]; secondary = ids[1]; altSuggest.current = ai.alt; setSource('ai')
    } else {
      const out = writeFor(title, list)
      short = out.short; description = out.description; primary = out.primary; secondary = out.secondary; altSuggest.current = ''; setSource('builtin')
    }
    setF((x) => ({
      ...x,
      short_description: touched.current.short ? x.short_description : short,
      description: touched.current.desc ? x.description : description,
      category_id: touched.current.cat ? x.category_id : primary ?? x.category_id,
      secondary_category_id: touched.current.cat ? x.secondary_category_id : secondary ?? '',
    }))
    setWriting(false)
  }
  useEffect(() => {
    if (!isNew || f.title.trim().length < 4 || !cats.data) return
    const t = window.setTimeout(() => {
      const title = f.title.trim()
      if (title === lastTitle.current) return
      lastTitle.current = title
      void generate(false)
    }, 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.title, isNew, cats.data])

  const resetForm = () => {
    setF({ ...EMPTY, year: String(new Date().getFullYear()) }); setImages([]); setOrig({ cover: null, ratio: null })
    setSlugTouched(false); setErrs({}); setSource(null); lastTitle.current = ''; altSuggest.current = ''; usdTouched.current = false
    touched.current = { short: false, desc: false, cat: false }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return; setUploading(true)
    try {
      const up: Awaited<ReturnType<typeof uploadMedia>>[] = []
      for (const file of Array.from(list)) up.push(await uploadMedia(file, 'portfolio'))
      setImages((x) => [...x, ...up.map((m) => ({ image_url: m.url, alt_text: null }))])
      if (!f.cover_image_url) set('cover_image_url', up[0].url)
      toast.success(`${up.length} file${up.length > 1 ? 's' : ''} uploaded.`)
    } catch (e) { toast.error(errMsg(e)) } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const moveImg = (i: number, d: -1 | 1) => setImages((x) => { const n = [...x]; const j = i + d; if (j < 0 || j >= n.length) return x; [n[i], n[j]] = [n[j], n[i]]; return n })
  const setAlt = (i: number, v: string) => setImages((x) => x.map((im, j) => (j === i ? { ...im, alt_text: v } : im)))
  const catLabel = String(cats.data?.find((c) => c.id === f.category_id)?.name ?? '')
  const autoAlt = (i: number) => `${altSuggest.current || `${f.title.trim()}${catLabel ? ` — ${catLabel} design` : ''}`}${images.length > 1 ? ` (${i + 1} of ${images.length})` : ''}`

  const save = async (status?: string) => {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = 'Title is required.'; if (!f.slug.trim()) e.slug = 'Slug is required.'
    if (f.year && !/^\d{4}$/.test(f.year)) e.year = 'Use a 4-digit year.'
    setErrs(e); if (Object.keys(e).length || saving) return; setSaving(true)
    try {
      const ratio = f.cover_image_url ? (f.cover_image_url === orig.cover && orig.ratio ? orig.ratio : await measureImage(f.cover_image_url)) : null
      const payload = { title: f.title.trim(), slug: f.slug, short_description: f.short_description || null, description: f.description || null, category_id: f.category_id || null, secondary_category_id: f.secondary_category_id && f.secondary_category_id !== f.category_id ? f.secondary_category_id : null, price_label: f.price_label.trim() || null, price_usd: f.price_usd.trim() || null, client_name: f.client_name || null, year: f.year ? Number(f.year) : null, cover_image_url: f.cover_image_url, cover_ratio: ratio, featured: f.featured, status: status ?? f.status, sort_order: Number(f.sort_order) || 0 }
      const row = await saveRow('portfolio_projects', payload, isNew ? undefined : id)
      const { error: de } = await supabase.from('portfolio_images').delete().eq('project_id', row.id); if (de) throw de
      if (images.length) { const { error: ie } = await supabase.from('portfolio_images').insert(images.map((im, i) => ({ project_id: row.id, image_url: im.image_url, alt_text: im.alt_text?.trim() || autoAlt(i), sort_order: i }))); if (ie) throw ie }
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
          <Field label="Title" required error={errs.title} hint="Put the design type last, e.g. “Pastor John Birthday Flyer”."><input className="input" value={f.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Slug" required error={errs.slug} hint="Web address: /work/your-slug"><input className="input" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></Field>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/[.04] px-3.5 py-2.5 text-xs text-black/60">
            <span className="flex items-center gap-2">{writing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
              {writing ? 'Writing…' : source === 'ai' ? 'Written by AI from the title. Edit anything you like.' : source === 'builtin' ? 'Written automatically from the title. Edit anything you like.' : 'Type the title and the descriptions, categories and alt text are written for you.'}</span>
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-xs" disabled={f.title.trim().length < 3 || writing} onClick={() => void generate(true)}>Write again</button>
          </div>
          <Field label="Short description" hint="One line shown under the title on the project page."><input className="input" value={f.short_description} onChange={(e) => { touched.current.short = true; set('short_description', e.target.value) }} /></Field>
          <Field label="Description" hint="Optional. Separate paragraphs with a blank line."><textarea rows={6} className="input" value={f.description} onChange={(e) => { touched.current.desc = true; set('description', e.target.value) }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><select className="input" value={f.category_id} onChange={(e) => { touched.current.cat = true; set('category_id', e.target.value) }}><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Second category (optional)" hint="The project also appears when people browse or search this category."><select className="input" value={f.secondary_category_id} onChange={(e) => { touched.current.cat = true; set('secondary_category_id', e.target.value) }}><option value="">None</option>{cats.data?.filter((c) => c.id !== f.category_id).map((c) => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select></Field>
            <Field label="Year" error={errs.year}><input inputMode="numeric" maxLength={4} className="input" value={f.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Client / project label"><input className="input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
            <Field label="Price in naira (optional)" hint="Examples: ₦15,000 · ₦15,000 – ₦30,000 · From ₦10,000"><input className="input" value={f.price_label} onChange={(e) => set('price_label', e.target.value)} /></Field>
            <Field label="Dollar price (shown in brackets)" hint="Filled in automatically from the exchange rate. You can type your own."><input className="input" value={f.price_usd} onChange={(e) => { usdTouched.current = e.target.value !== ''; set('price_usd', e.target.value) }} placeholder="e.g. $10 – $20" /></Field>
            <Field label="Exchange rate (₦ per $1)" hint="Used for the automatic dollar price."><input inputMode="decimal" className="input" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} onBlur={() => void saveRate()} placeholder="e.g. 1500" /></Field>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Featured on homepage</span><Switch label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} /></div>
            <Field label="Sort order" hint="Lower numbers come first. You can also drag projects in the list."><input type="number" className="input" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
          </div>
          <div className="card p-5"><ImageField label="Cover image" value={f.cover_image_url} onChange={(v) => set('cover_image_url', v)} />
            <p className="mt-2 text-xs text-black/50">To use a video as the cover, add it to the gallery below and press its star.</p></div>
          <div className="card p-5"><span className="label">Designs &amp; videos</span>
            <ul className="space-y-3">{images.map((im, i) => (
              <li key={im.image_url + i} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5"><Img src={im.image_url} alt="" width={200} />{isVideoUrl(im.image_url) && <PlayBadge small />}</div>
                <div className="min-w-0 flex-1">
                  <input className="input !py-2 !text-xs" aria-label={`Alt text for item ${i + 1}`} placeholder={autoAlt(i)} value={im.alt_text ?? ''} onChange={(e) => setAlt(i, e.target.value)} />
                  <div className="mt-1.5 flex items-center gap-1 text-black/60">
                    <button className="rounded p-1.5 hover:bg-black/5" aria-label="Move earlier" onClick={() => moveImg(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1.5 hover:bg-black/5" aria-label="Move later" onClick={() => moveImg(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1.5 hover:bg-black/5" aria-label="Use as cover" onClick={() => set('cover_image_url', im.image_url)}><Star className={cn('h-3.5 w-3.5', f.cover_image_url === im.image_url && 'fill-amber-400 text-amber-500')} /></button>
                    <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Remove" onClick={() => setImages((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>))}</ul>
            {images.length > 0 && <p className="mt-3 text-xs text-black/50">Alt text describes each design for blind visitors and search engines. Empty ones are filled in automatically.</p>}
            <button className="btn btn-ghost mt-3 w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Uploading…' : 'Add images or videos'}</button>
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" multiple className="sr-only" onChange={(e) => void addFiles(e.target.files)} />
            <p className="mt-2 text-xs text-black/50">Videos: MP4 or WebM, up to 50 MB (about 1080p and under 30 seconds works well).</p>
          </div>
        </div>
      </div>
    </div>
  )
}
