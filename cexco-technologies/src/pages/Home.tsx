import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, Loader2 } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Img } from '@/components/ui'
import { WorkCard } from '@/components/WorkCard'
import { cn } from '@/utils/format'
import type { Category, HomepageSection, PortfolioProject } from '@/types'

const calcCols = () => (window.innerWidth >= 1536 ? 4 : window.innerWidth >= 768 ? 3 : 2)
function useColumns(): number {
  const [n, setN] = useState(calcCols)
  useEffect(() => { const on = () => setN(calcCols()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  return n
}

const str = (s: HomepageSection | undefined, k: string) => (typeof s?.config?.[k] === 'string' && s.config[k] ? (s.config[k] as string) : null)

function Hero({ hero, loading }: { hero?: HomepageSection; loading: boolean }) {
  const { settings } = useSettings()
  const title = hero?.title ?? settings?.tagline ?? settings?.brand_name ?? ''
  const image = str(hero, 'hero_image_url')
  if (loading) return <section className="container-x pb-12 pt-14 sm:pb-20 sm:pt-24"><div className="h-14 w-3/4 animate-pulse rounded bg-black/5 sm:h-24" /></section>
  return (
    <section className="container-x pb-12 pt-12 sm:pb-20 sm:pt-24 lg:pb-28">
      <div className={cn('grid items-end gap-10 lg:gap-16', image && 'lg:grid-cols-[1.25fr_1fr]')}>
        <div className="animate-fadeUp">
          {str(hero, 'badge') && <p className="mb-5 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[.22em] text-black/55 sm:mb-7"><span className="h-px w-8 bg-black/40" />{str(hero, 'badge')}</p>}
          <h1 className="font-display text-[clamp(2.5rem,9.2vw,6.5rem)] font-medium leading-[1] tracking-[-0.03em]">{title}</h1>
          {hero?.description && <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-black/60 sm:mt-8 sm:text-lg">{hero.description}</p>}
          <a href="#work" className="group mt-8 inline-flex items-center gap-3 text-sm font-medium sm:mt-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-black/25 transition group-hover:border-ink group-hover:bg-ink group-hover:text-white"><ArrowDown className="h-4 w-4" /></span>
            <span className="border-b border-transparent transition group-hover:border-ink">{hero?.cta_text || 'View work'}</span>
          </a>
        </div>
        {image && <div className="aspect-[4/5] w-full max-w-md overflow-hidden rounded-md bg-black/5 lg:max-w-none"><Img src={image} alt="" eager width={900} sizes="(min-width:1024px) 40vw, 100vw" /></div>}
      </div>
    </section>
  )
}

export default function Home() {
  useSeo({})
  const { settings } = useSettings()
  const [sp, setSp] = useSearchParams()
  const sections = useAsync(api.getSections, [])
  const cats = useAsync<Category[]>(async () => {
    const [all, used] = await Promise.all([api.getCategories(), supabase.from('portfolio_projects').select('category_id').eq('status', 'published').limit(2000)])
    const ids = new Set((used.data ?? []).map((r) => r.category_id as string | null))
    return all.filter((c) => ids.has(c.id))
  }, [])

  const slug = sp.get('category')
  const active = cats.data?.find((c) => c.slug === slug)
  const waiting = !!slug && cats.loading
  const pageSize = settings?.items_per_page ?? 12
  const uniform = settings?.default_layout === 'grid'
  const cols = useColumns()

  const [items, setItems] = useState<PortfolioProject[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [more, setMore] = useState(false)
  const reqId = useRef(0)

  const load = useCallback(async (p: number, reset: boolean) => {
    const id = ++reqId.current
    if (reset) setState('loading'); else setMore(true)
    try {
      const res = await api.getProjects({ page: p, pageSize, categoryId: active?.id })
      if (id !== reqId.current) return
      setItems((prev) => (reset ? res.data : [...prev, ...res.data])); setTotal(res.count); setPage(p); setState('ready')
    } catch { if (id === reqId.current) setState('error') } finally { if (id === reqId.current) setMore(false) }
  }, [pageSize, active?.id])

  useEffect(() => { if (!waiting) void load(1, true) }, [load, waiting])

  const hero = sections.data?.find((s) => s.key === 'hero')
  const gal = sections.data?.find((s) => s.key === 'featured_work')
  const pick = (c: string | null) => { const n = new URLSearchParams(sp); if (c) n.set('category', c); else n.delete('category'); setSp(n, { replace: true, preventScrollReset: true }) }
  const columns = Array.from({ length: cols }, (_, c) => items.filter((_, i) => i % cols === c))

  return (
    <>
      <Hero hero={hero} loading={sections.loading} />

      <section id="work" className="scroll-mt-14 sm:scroll-mt-16">
        {(gal?.title || gal?.description) && (
          <div className="container-x pb-7 sm:pb-12">
            {gal.subtitle && <p className="mb-3 text-[11px] font-medium uppercase tracking-[.22em] text-black/50">{gal.subtitle}</p>}
            {gal.title && <h2 className="font-display text-3xl font-medium tracking-[-0.02em] sm:text-5xl">{gal.title}</h2>}
            {gal.description && <p className="mt-3 max-w-xl text-[15px] text-black/60 sm:text-base">{gal.description}</p>}
          </div>
        )}

        {!!cats.data?.length && (
          <div className="sticky top-14 z-30 border-y border-black/10 bg-paper/90 backdrop-blur sm:top-16">
            <div className="container-x flex items-center gap-2 overflow-x-auto py-3" role="group" aria-label="Filter by category">
              {[{ slug: null as string | null, name: 'All' }, ...cats.data].map((c) => {
                const on = (c.slug ?? null) === (active?.slug ?? null)
                return <button key={c.slug ?? 'all'} onClick={() => pick(c.slug)} aria-pressed={on}
                  className={cn('shrink-0 rounded-full border px-4 py-2 text-[13px] transition sm:text-sm', on ? 'border-ink bg-ink text-white' : 'border-black/15 hover:border-ink')}>{c.name}</button>
              })}
            </div>
          </div>
        )}

        <div className="container-x pt-6 sm:pt-10" aria-live="polite">
          {state === 'loading' || waiting ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-md bg-black/5" />)}</div>
          ) : state === 'error' ? <ErrorState message="Unable to load projects. Please try again." onRetry={() => void load(1, true)} />
          : !items.length ? <EmptyState title="No projects yet." hint={active ? 'Nothing is published in this category yet.' : 'Designs will appear here once published.'} />
          : (
            <>
              {uniform ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 2xl:grid-cols-4">{items.map((p, i) => <WorkCard key={p.id} p={p} uniform priority={i < 4} />)}</div>
              ) : (
                <div className="flex items-start gap-3 sm:gap-5">
                  {columns.map((col, c) => <div key={c} className="flex min-w-0 flex-1 flex-col gap-7 sm:gap-10">{col.map((p, i) => <WorkCard key={p.id} p={p} priority={i === 0 && c < 2} />)}</div>)}
                </div>
              )}
              {items.length < total && (
                <div className="mt-12 flex flex-col items-center gap-2 sm:mt-16">
                  <button className="btn btn-ghost !px-8 !py-3" disabled={more} onClick={() => void load(page + 1, false)}>{more && <Loader2 className="h-4 w-4 animate-spin" />}{more ? 'Loading…' : 'Load more'}</button>
                  <p className="text-xs text-black/45">Showing {items.length} of {total}</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
