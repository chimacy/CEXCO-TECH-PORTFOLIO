import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import * as api from '@/services/api'
import { supabase } from '@/lib/supabase'
import { EmptyState, ErrorState, PlaceholderArt, Spinner } from '@/components/ui'
import { WorkCard } from '@/components/WorkCard'
import { ShareButtons } from '@/components/ui/Share'
import { RichText } from '@/components/ui/RichText'
import type { PortfolioProject } from '@/types'

function Lightbox({ images, index, alt, onClose, onIndex }: { images: string[]; index: number; alt: string; onClose: () => void; onIndex: (i: number) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, images.length, onClose, onIndex])
  const many = images.length > 1
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label={`${alt} — full size`} onClick={onClose}>
      <img src={images[index]} alt={`${alt} ${index + 1}`} className="max-h-[92vh] max-w-[96vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} aria-label="Close" className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button>
      {many && <>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }} aria-label="Previous image" className="absolute left-2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-5"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }} aria-label="Next image" className="absolute right-2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-5"><ChevronRight className="h-5 w-5" /></button>
        <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-xs tracking-widest text-white/60">{index + 1} / {images.length}</p>
      </>}
    </div>
  )
}

function DesignImage({ src, alt, eager, onOpen }: { src: string; alt: string; eager: boolean; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button type="button" onClick={onOpen} aria-label={`View ${alt} full size`} className={`block w-full overflow-hidden rounded-md bg-[#e8e5de] ${loaded ? '' : 'aspect-[4/5]'}`} style={{ cursor: 'zoom-in' }}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} className={`block h-auto w-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  )
}

export default function ProjectDetail({ preview }: { preview?: boolean }) {
  const { slug = '' } = useParams()
  const [sp] = useSearchParams()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const { data: p, loading, error, reload } = useAsync<PortfolioProject | null>(async () => {
    if (preview) { // admin-only: RLS lets signed-in admins read drafts
      const res = await supabase.from('portfolio_projects').select('*, category:categories(id,name,slug), service:services(id,name,slug), images:portfolio_images(*)').eq('slug', slug).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      const d = res.data as PortfolioProject | null
      d?.images?.sort((a, b) => a.sort_order - b.sort_order)
      return d
    }
    return api.getProject(slug)
  }, [slug, preview])
  const related = useAsync(async () => (p && !preview ? api.getRelatedProjects(p, 4) : []), [p?.id])

  useEffect(() => { if (p && !preview) api.trackEvent('project_view', p.id) }, [p?.id, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: p?.title, description: p?.short_description ?? p?.description?.slice(0, 160), image: p?.cover_image_url, type: 'article', path: `/portfolio/${slug}`, noindex: preview })

  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this project." onRetry={reload} /></div>
  if (!p) return <div className="container-x py-24"><EmptyState title="Project not found" action={<Link to="/" className="btn btn-primary">Back to work</Link>} /></div>

  const images = Array.from(new Set([p.cover_image_url, ...(p.images ?? []).map((i) => i.image_url)].filter((x): x is string => !!x)))
  const meta = [p.client_name, p.client_type, new Date(p.created_at).getFullYear().toString()].filter(Boolean) as string[]
  const url = `${window.location.origin}/portfolio/${p.slug}`

  return (
    <div className="pb-4">
      <div className="container-x pt-6 sm:pt-10">
        {preview && <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">Preview — status: <b>{p.status}</b>. {sp.get('from') && <Link className="underline" to={sp.get('from')!}>Back to editor</Link>}</div>}
        <Link to="/#work" className="inline-flex items-center gap-2 text-[13px] text-black/55 transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> All work</Link>

        <header className="mx-auto mt-8 max-w-3xl text-center sm:mt-12">
          {p.category && <Link to={`/?category=${p.category.slug}#work`} className="text-[11px] font-medium uppercase tracking-[.22em] text-accent">{p.category.name}</Link>}
          <h1 className="mt-3 font-display text-[clamp(2rem,7vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em]">{p.title}</h1>
          {meta.length > 0 && <p className="mt-4 text-[13px] text-black/50 sm:text-sm">{meta.join('  ·  ')}</p>}
          {p.short_description && <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-black/65 sm:text-lg">{p.short_description}</p>}
        </header>

        <div className="mx-auto mt-10 flex max-w-4xl flex-col gap-3 sm:mt-14 sm:gap-6">
          {images.length ? images.map((src, i) => <DesignImage key={src} src={src} alt={`${p.title}${images.length > 1 ? ` (${i + 1})` : ''}`} eager={i === 0} onOpen={() => setLightbox(i)} />)
            : <div className="aspect-[4/5] w-full max-w-md self-center overflow-hidden rounded-md"><PlaceholderArt seed={p.title} /></div>}
        </div>

        {p.description && <div className="mx-auto mt-12 max-w-2xl sm:mt-16">{/<[a-z][\s\S]*>/i.test(p.description) ? <RichText html={p.description} /> : <p className="whitespace-pre-line text-[15px] leading-[1.8] text-black/70 sm:text-base">{p.description}</p>}</div>}

        <div className="mx-auto mt-10 flex max-w-2xl justify-center sm:mt-14"><ShareButtons title={p.title} url={url} /></div>
      </div>

      {!!related.data?.length && (
        <section className="container-x mt-20 sm:mt-28">
          <h2 className="mb-6 font-display text-2xl font-medium tracking-[-0.02em] sm:mb-8 sm:text-3xl">More work</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-4">{related.data.map((r) => <WorkCard key={r.id} p={r} uniform />)}</div>
        </section>
      )}

      {lightbox !== null && <Lightbox images={images} index={lightbox} alt={p.title} onClose={() => setLightbox(null)} onIndex={setLightbox} />}
    </div>
  )
  }
