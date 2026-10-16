import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import * as api from '@/services/api'
import { useSettings } from '@/lib/settings'
import { useTileRatio } from '@/lib/sections'
import { getProjectDetail } from '@/services/projects'
import { cn, formatPrice } from '@/utils/format'
import { useToast } from '@/lib/toast'
import { EmptyState, ErrorState, PlaceholderArt, Spinner } from '@/components/ui'
import { RichText } from '@/components/ui/RichText'
import { PlayBadge, useBreakpoint } from '@/components/WorkGrid'
import { projectRatio, projectYear, type Project } from '@/utils/project'
import { isVideoUrl, transformUrl } from '@/utils/image'

interface Item { src: string; alt: string; video: boolean }
const pad = (n: number) => String(n).padStart(2, '0')
const noMenu = (e: { preventDefault: () => void }) => e.preventDefault()

function Lightbox({ items, index, onClose, onIndex }: { items: Item[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const touch = useRef<number | null>(null)
  const n = items.length
  const it = items[index]
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
  const btn = 'absolute z-10 rounded-full bg-ink p-3 text-white transition hover:bg-accent'
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/95" role="dialog" aria-modal="true" aria-label={`${it.alt} — full size`} onClick={onClose}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }} onTouchEnd={(e) => swipe(e.changedTouches[0].clientX)}>
      {it.video ? (
        <video key={it.src} src={it.src} autoPlay controls playsInline controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={noMenu} aria-label={it.alt}
          className="max-h-[92vh] max-w-[94vw] rounded-[35px] bg-black shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]" onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={transformUrl(it.src, 2400)} alt={it.alt} draggable={false} className="max-h-[92vh] max-w-[94vw] rounded-[35px] object-contain shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]" />
      )}
      <button onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Close" className={`${btn} right-4 top-[max(1rem,env(safe-area-inset-top))]`}><X className="h-5 w-5" /></button>
      {n > 1 && <>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + n) % n) }} aria-label="Previous" className={`${btn} left-3 sm:left-6`}><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % n) }} aria-label="Next" className={`${btn} right-3 sm:right-6`}><ChevronRight className="h-5 w-5" /></button>
        <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-[11px] tracking-[.2em] text-black/50">{pad(index + 1)} / {pad(n)}</p>
      </>}
    </div>
  )
}

/** A single design shown large, with 35px rounded corners (never taller than the screen). */
function SingleImage({ item, ratio, onOpen }: { item: Item; ratio?: number; onOpen: () => void }) {
  const [r, setR] = useState<number | undefined>(ratio)
  const [loaded, setLoaded] = useState(false)
  if (item.video) {
    return (
      <video src={item.src} poster={transformUrl(item.src, 1200)} controls playsInline preload="none" controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={noMenu} aria-label={item.alt}
        className="mx-auto block max-h-[80vh] w-full rounded-[35px] bg-black" style={{ maxWidth: r ? `min(100%, calc(80vh * ${r}))` : '100%' }}
        onLoadedMetadata={(e) => { const { videoWidth: w, videoHeight: h } = e.currentTarget; if (w && h) setR(w / h) }} />
    )
  }
  return (
    <button type="button" onClick={onOpen} aria-label={`View ${item.alt} full size`} className="mx-auto block w-full overflow-hidden rounded-[35px] bg-neutral-100"
      style={{ cursor: 'zoom-in', aspectRatio: loaded ? undefined : String(r ?? 0.8), maxWidth: r ? `min(100%, calc(84vh * ${r}))` : '100%' }}>
      <img src={item.src} alt={item.alt} loading="eager" decoding="async" draggable={false}
        onLoad={(e) => { setLoaded(true); const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w && h) setR(w / h) }}
        className={cn('block h-auto w-full transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0')} />
    </button>
  )
}

/** One tile of a multi-design project: same look as the homepage catalog (uniform shape, rounded, numbered). */
function GalleryTile({ item, index, total, ratio, onOpen }: { item: Item; index: number; total: number; ratio: number; onOpen: () => void }) {
  const [src, setSrc] = useState(transformUrl(item.src, 700))
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div>
      <button type="button" onClick={onOpen} aria-label={`${item.video ? 'Play' : 'View'}: ${item.alt}`} className="group relative block w-full overflow-hidden rounded-[35px] bg-neutral-100"
        style={{ aspectRatio: String(ratio), cursor: item.video ? 'pointer' : 'zoom-in' }}>
        {!failed ? (
          <img src={src} alt={item.alt} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" draggable={false}
            onLoad={() => setLoaded(true)} onError={() => { if (!item.video && src !== item.src) setSrc(item.src); else setFailed(true) }}
            className={cn('absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]', loaded ? 'opacity-100' : 'opacity-0')} />
        ) : <PlaceholderArt seed={item.alt} />}
        {item.video && <PlayBadge />}
      </button>
      <p className="mt-3 px-2 font-display text-[11px] tabular-nums text-accent">{pad(index + 1)} <span className="text-black/30">/ {pad(total)}</span></p>
    </div>
  )
}

function GalleryGrid({ items, ratio, onOpen }: { items: Item[]; ratio: number; onOpen: (i: number) => void }) {
  const bp = useBreakpoint()
  const n = items.length
  const cols = bp === 'lg' ? Math.min(4, Math.max(2, n)) : bp === 'md' ? Math.min(3, Math.max(2, n)) : 2
  const maxW = n <= 2 ? 940 : n === 3 ? 1200 : 1440
  const columns = Array.from({ length: cols }, (_, c) => items.map((it, i) => ({ it, i })).filter(({ i }) => i % cols === c))
  return (
    <div className="mx-auto flex items-start gap-3.5 sm:gap-5 lg:gap-7" style={{ maxWidth: maxW }}>
      {columns.map((col, c) => (
        <div key={c} className={cn('flex min-w-0 flex-1 flex-col gap-8 sm:gap-12', c % 2 === 1 && 'mt-10 sm:mt-16')}>
          {col.map(({ it, i }) => <GalleryTile key={it.src} item={it} index={i} total={n} ratio={ratio} onOpen={() => onOpen(i)} />)}
        </div>
      ))}
    </div>
  )
}

function Description({ text }: { text: string }) {
  if (/<[a-z][\s\S]*>/i.test(text)) return <RichText html={text} />
  const paras = text.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean)
  return (
    <div className="space-y-5">
      {paras.map((t, i) => i === 0
        ? <p key={i} className="whitespace-pre-line font-display text-[1.3rem] font-medium leading-[1.3] tracking-[-0.01em] sm:text-[1.65rem]">{t}</p>
        : <p key={i} className="whitespace-pre-line text-[15px] leading-[1.85] text-black/65 sm:text-base">{t}</p>)}
    </div>
  )
}

export default function ProjectDetail({ preview }: { preview?: boolean }) {
  const { slug = '' } = useParams()
  const [sp] = useSearchParams()
  const toast = useToast()
  const { settings } = useSettings()
  const ratio = useTileRatio()
  const navigate = useNavigate()
  const location = useLocation()
  const [lightbox, setLightbox] = useState<number | null>(null)

  const { data: p, loading, error, reload } = useAsync<Project | null>(() => getProjectDetail(slug, preview), [slug, preview])

  useEffect(() => { if (p && !preview) api.trackEvent('project_view', p.id) }, [p?.id, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: p?.title, description: p?.short_description ?? p?.description?.slice(0, 160), image: p?.cover_image_url, type: 'article', path: `/work/${slug}`, noindex: preview })

  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this project." onRetry={reload} /></div>
  if (!p) return <div className="container-x py-24"><EmptyState title="Project not found" action={<Link to="/" className="btn btn-primary">Back to home</Link>} /></div>

  // Only allow going back to admin pages from the preview link (prevents redirects to other sites)
  const from = sp.get('from')
  const safeFrom = from && /^\/admin\/[A-Za-z0-9\-_/]*$/.test(from) ? from : '/admin/portfolio'
  const categoryName = (p.cats?.length ? p.cats : p.category ? [p.category] : []).map((c) => c.name)
  const altFor = (src: string, i: number, total: number) => (p.images ?? []).find((m) => m.image_url === src)?.alt_text?.trim() || `${p.title}${categoryName[0] ? ` — ${categoryName[0]} design` : ''}${total > 1 ? ` (${i + 1} of ${total})` : ''}`
  const srcs = Array.from(new Set([p.cover_image_url, ...(p.images ?? []).map((i) => i.image_url)].filter((x): x is string => !!x)))
  const items: Item[] = srcs.map((src, i) => ({ src, alt: altFor(src, i, srcs.length), video: isVideoUrl(src) }))
  const multi = items.length > 1

  const url = `${window.location.origin}/work/${p.slug}`
  const priceNgn = p.price_label?.trim() || (p.price != null ? formatPrice(p.price, null, settings?.currency) : '')
  const usd = (p as Project & { price_usd?: string | null }).price_usd?.trim() || ''
  const rows: { k: string; v: string; accent?: boolean }[] = [
    { k: 'Category', v: categoryName.join(' · ') }, { k: 'Year', v: String(projectYear(p)) }, { k: 'Client', v: p.client_name ?? '' }, { k: 'Type', v: p.client_type ?? '' },
    { k: 'Price', v: priceNgn, accent: true },
  ].filter((r) => !!r.v)

  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') } }
  const enc = encodeURIComponent
  const shares = [
    { n: 'WhatsApp', h: `https://wa.me/?text=${enc(`${p.title} ${url}`)}` }, { n: 'X', h: `https://twitter.com/intent/tweet?text=${enc(p.title)}&url=${enc(url)}` },
    { n: 'Facebook', h: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` }, { n: 'LinkedIn', h: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]

  const value = (r: { k: string; v: string; accent?: boolean }) => (
    <span className={cn('font-display text-base font-medium', r.accent && 'text-accent')}>
      {r.v}{r.k === 'Price' && usd && <span className="ml-1.5 font-normal text-black/50">({usd})</span>}
    </span>
  )
  const renderMeta = () => rows.length === 0 ? null : (
    <dl className="divide-y divide-black/10 border-y border-black/10">
      {rows.map((r) => <div key={r.k} className="flex items-baseline justify-between gap-6 py-3.5"><dt className="eyebrow">{r.k}</dt><dd className="text-right">{value(r)}</dd></div>)}
    </dl>
  )
  const renderShare = () => (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/10 pt-6 text-[11px] font-medium uppercase tracking-[.18em]">
      <span className="text-black/40">Share</span>
      <button onClick={() => void copy()} className="transition-colors hover:text-accent">Copy link</button>
      {shares.map((s) => <a key={s.n} href={s.h} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">{s.n}</a>)}
    </div>
  )
  const renderTitle = () => (
    <>
      <h1 className="animate-fadeUp font-display text-[clamp(2rem,8.6vw,3.25rem)] font-medium leading-[1.02] tracking-[-0.03em] sm:text-[clamp(2.75rem,5.4vw,4.75rem)]">{p.title}</h1>
      {p.short_description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-black/60 sm:mt-6 sm:text-lg">{p.short_description}</p>}
    </>
  )

  return (
    <div className="pb-4">
      <div className="container-x pt-6 sm:pt-10">
        {preview && <div className="mb-6 bg-amber-100 px-4 py-3 text-sm text-amber-900">Preview — status: <b>{p.status}</b>. {from && <Link className="underline" to={safeFrom}>Back to editor</Link>}</div>}
        <button type="button" onClick={() => { if (preview) navigate(safeFrom); else if (location.key !== 'default') navigate(-1); else navigate('/') }}
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.18em] text-black/50 transition-colors hover:text-accent"><ArrowLeft className="h-4 w-4" /> Back</button>

        {multi ? (
          <>
            <header className="mt-8 grid gap-8 sm:mt-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
              <div className="lg:col-span-8">{renderTitle()}</div>
              <div className="lg:col-span-4">{renderMeta()}</div>
            </header>
            <div className="mt-12 sm:mt-16"><GalleryGrid items={items} ratio={ratio} onOpen={setLightbox} /></div>
            {p.description && (
              <section className="mt-16 grid gap-6 border-t border-black/10 pt-10 sm:mt-24 sm:pt-14 lg:grid-cols-12 lg:gap-x-12">
                <p className="eyebrow lg:col-span-3">About this design</p>
                <div className="lg:col-span-7"><Description text={p.description} /></div>
              </section>
            )}
            <div className="mt-12 sm:mt-16">{renderShare()}</div>
          </>
        ) : (
          <div className="mt-8 grid gap-8 sm:mt-12 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10">
            <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1">{renderTitle()}</div>
            <div className="lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
              {items[0] ? <SingleImage item={items[0]} ratio={items[0].src === p.cover_image_url ? projectRatio(p) : undefined} onOpen={() => setLightbox(0)} />
                : <div className="mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[35px]"><PlaceholderArt seed={p.title} /></div>}
            </div>
            <div className="space-y-10 lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:self-start">
              {renderMeta()}
              {p.description && <Description text={p.description} />}
              {renderShare()}
            </div>
          </div>
        )}
      </div>

      {lightbox !== null && <Lightbox items={items} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />}
    </div>
  )
}
