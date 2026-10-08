import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import * as api from '@/services/api'
import { useSettings } from '@/lib/settings'
import { getProjectDetail } from '@/services/projects'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/lib/toast'
import { EmptyState, ErrorState, PlaceholderArt, Spinner } from '@/components/ui'
import { RichText } from '@/components/ui/RichText'
import { projectRatio, projectYear, type Project } from '@/utils/project'
import { transformUrl } from '@/utils/image'

function Lightbox({ images, index, alt, onClose, onIndex }: { images: string[]; index: number; alt: string; onClose: () => void; onIndex: (i: number) => void }) {
  const touch = useRef<number | null>(null)
  const n = images.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % n)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + n) % n)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, n, onClose, onIndex])
  const swipe = (x: number) => {
    if (touch.current === null || n < 2) return
    const dx = x - touch.current; touch.current = null
    if (Math.abs(dx) > 50) onIndex(dx < 0 ? (index + 1) % n : (index - 1 + n) % n)
  }
  const btn = 'absolute rounded-full bg-ink p-3 text-white transition hover:bg-accent'
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${alt} — full size`} onClick={onClose}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }} onTouchEnd={(e) => swipe(e.changedTouches[0].clientX)}>
      <img src={images[index]} alt={`${alt} ${index + 1}`} draggable={false} className="max-h-[92vh] max-w-[94vw] rounded-[35px] object-contain shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]" />
      <button onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Close" className={`${btn} right-4 top-[max(1rem,env(safe-area-inset-top))]`}><X className="h-5 w-5" /></button>
      {n > 1 && <>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + n) % n) }} aria-label="Previous image" className={`${btn} left-3 sm:left-6`}><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % n) }} aria-label="Next image" className={`${btn} right-3 sm:right-6`}><ChevronRight className="h-5 w-5" /></button>
        <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-[11px] tracking-[.2em] text-black/50">{index + 1} / {n}</p>
      </>}
    </div>
  )
}

/** One design, shown whole with 35px rounded corners: portrait work stays tall (never taller than the screen), landscape work runs wide. */
function DesignImage({ src, alt, ratio, eager, onOpen }: { src: string; alt: string; ratio?: number; eager: boolean; onOpen: () => void }) {
  const [r, setR] = useState<number | undefined>(ratio)
  const [loaded, setLoaded] = useState(false)
  return (
    <button type="button" onClick={onOpen} aria-label={`View ${alt} full size`} className="mx-auto block w-full overflow-hidden rounded-[35px] bg-neutral-100"
      style={{ cursor: 'zoom-in', aspectRatio: loaded ? undefined : String(r ?? 0.8), maxWidth: r ? `min(100%, calc(88vh * ${r}))` : '100%' }}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
        onLoad={(e) => { setLoaded(true); const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w && h) setR(w / h) }}
        className={`block h-auto w-full transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  )
}

export default function ProjectDetail({ preview }: { preview?: boolean }) {
  const { slug = '' } = useParams()
  const [sp] = useSearchParams()
  const toast = useToast()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [lightbox, setLightbox] = useState<number | null>(null)

  const { data: p, loading, error, reload } = useAsync<Project | null>(() => getProjectDetail(slug, preview), [slug, preview])

  useEffect(() => { if (p && !preview) api.trackEvent('project_view', p.id) }, [p?.id, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: p?.title, description: p?.short_description ?? p?.description?.slice(0, 160), image: p?.cover_image_url, type: 'article', path: `/work/${slug}`, noindex: preview })

  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this project." onRetry={reload} /></div>
  if (!p) return <div className="container-x py-24"><EmptyState title="Project not found" action={<Link to="/" className="btn btn-primary">Back to home</Link>} /></div>

  const images = Array.from(new Set([p.cover_image_url, ...(p.images ?? []).map((i) => i.image_url)].filter((x): x is string => !!x)))
  const url = `${window.location.origin}/work/${p.slug}`
  const price = p.price_label?.trim() || (p.price != null ? formatPrice(p.price, null, settings?.currency) : '')
  const info = [['Category', (p.cats?.length ? p.cats : p.category ? [p.category] : []).map((c) => c.name).join(' · ')], ['Year', String(projectYear(p))], ['Client', p.client_name], ['Type', p.client_type], ['Price', price]].filter(([, v]) => !!v) as [string, string][]
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') } }
  const enc = encodeURIComponent
  const shares = [
    { n: 'WhatsApp', h: `https://wa.me/?text=${enc(`${p.title} ${url}`)}` }, { n: 'X', h: `https://twitter.com/intent/tweet?text=${enc(p.title)}&url=${enc(url)}` },
    { n: 'Facebook', h: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` }, { n: 'LinkedIn', h: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]

  return (
    <div className="pb-4">
      <div className="container-x pt-6 sm:pt-10">
        {preview && <div className="mb-6 bg-amber-100 px-4 py-3 text-sm text-amber-900">Preview — status: <b>{p.status}</b>. {sp.get('from') && <Link className="underline" to={sp.get('from')!}>Back to editor</Link>}</div>}
        <button type="button" onClick={() => { if (preview) navigate(sp.get('from') ?? '/admin/portfolio'); else if (location.key !== 'default') navigate(-1); else navigate('/') }}
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.18em] text-black/50 transition-colors hover:text-accent"><ArrowLeft className="h-4 w-4" /> Back</button>

        <header className="mt-8 grid gap-8 sm:mt-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-8">
            <h1 className="animate-fadeUp font-display text-[clamp(2rem,8.6vw,3.25rem)] font-medium leading-[1.02] tracking-[-0.03em] sm:text-[clamp(2.75rem,6vw,5.5rem)]">{p.title}</h1>
            {p.short_description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-black/60 sm:mt-7 sm:text-lg">{p.short_description}</p>}
          </div>
          {info.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-end text-sm lg:col-span-4 lg:grid-cols-1">
              {info.map(([k, v]) => <div key={k}><dt className="eyebrow">{k}</dt><dd className={`mt-1.5 font-display text-base font-medium ${k === 'Price' ? 'text-accent' : ''}`}>{v}</dd></div>)}
            </dl>
          )}
        </header>

        <div className="mt-10 space-y-4 sm:mt-14 sm:space-y-8">
          {images.length
            ? images.map((src, i) => <DesignImage key={src} src={src} alt={`${p.title}${images.length > 1 ? ` (${i + 1})` : ''}`} ratio={i === 0 && p.cover_image_url === src ? projectRatio(p) : undefined} eager={i === 0} onOpen={() => setLightbox(i)} />)
            : <div className="mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[35px]"><PlaceholderArt seed={p.title} /></div>}
        </div>

        {p.description && (
          <div className="mx-auto mt-14 max-w-2xl sm:mt-20">
            {/<[a-z][\s\S]*>/i.test(p.description) ? <RichText html={p.description} /> : <div className="space-y-5 text-[15px] leading-[1.8] text-black/70 sm:text-base">{p.description.split(/\n{2,}/).map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}</div>}
          </div>
        )}

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/10 pt-6 text-[11px] font-medium uppercase tracking-[.18em] sm:mt-16">
          <span className="text-black/40">Share</span>
          <button onClick={() => void copy()} className="transition hover:text-accent">Copy link</button>
          {shares.map((s) => <a key={s.n} href={s.h} target="_blank" rel="noopener noreferrer" className="transition hover:text-accent">{s.n}</a>)}
        </div>
      </div>

      {lightbox !== null && <Lightbox images={images.map((s) => transformUrl(s, 2400))} index={lightbox} alt={p.title} onClose={() => setLightbox(null)} onIndex={setLightbox} />}
    </div>
  )
    }
