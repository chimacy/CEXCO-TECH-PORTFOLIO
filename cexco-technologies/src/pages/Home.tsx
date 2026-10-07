import { useRef, type CSSProperties } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import { parseRatio, useSections } from '@/lib/sections'
import * as api from '@/services/api'
import { Img } from '@/components/ui'
import { WorkArchive } from '@/components/WorkArchive'
import { WorkTile, useBreakpoint } from '@/components/WorkGrid'
import { cn } from '@/utils/format'
import type { Project } from '@/utils/project'
import type { HomepageSection } from '@/types'

const cfg = (s: HomepageSection | undefined, k: string) => (typeof s?.config?.[k] === 'string' && s.config[k] ? (s.config[k] as string) : null)

function Hero({ hero, loading, target }: { hero?: HomepageSection; loading: boolean; target: string }) {
  const { settings } = useSettings()
  const image = cfg(hero, 'hero_image_url')
  const title = hero?.title ?? settings?.tagline ?? settings?.brand_name ?? ''
  if (loading) return <section className="container-x pt-10 sm:pt-14"><div className="h-24 w-4/5 animate-pulse bg-neutral-100 sm:h-40" /></section>

  return (
    <section className="container-x pt-8 sm:pt-12 lg:pt-14">
      <div className={cn('grid items-center gap-8 sm:gap-10 lg:gap-14', image && 'lg:grid-cols-12')}>
        <div className={cn(image ? 'lg:col-span-6' : 'max-w-5xl')}>
          <h1 className="animate-fadeUp whitespace-pre-line font-display text-[clamp(2.1rem,9.4vw,3.5rem)] font-medium uppercase leading-[.95] tracking-[-0.035em] sm:text-[clamp(2.75rem,6.4vw,4.5rem)] lg:text-[clamp(2.6rem,4.4vw,4.75rem)]">{title}</h1>
          {hero?.description && <p className="mt-6 max-w-md text-[15px] leading-relaxed text-black/60 sm:text-base">{hero.description}</p>}
          <a href={target} className="group mt-7 inline-flex items-center gap-3 text-[12px] font-medium uppercase tracking-[.18em]">
            <span className="border-b border-ink pb-1 transition group-hover:border-accent group-hover:text-accent">{hero?.cta_text || 'Explore work'}</span>
            <ArrowDown className="h-4 w-4 transition group-hover:translate-y-1 group-hover:text-accent" />
          </a>
        </div>
        {image && (
          <figure className="order-first lg:order-none lg:col-span-6">
            <div className="aspect-[16/10] overflow-hidden rounded-[28px] bg-neutral-100"><Img src={image} alt="" eager width={1600} sizes="(min-width:1024px) 50vw, 100vw" /></div>
          </figure>
        )}
      </div>
    </section>
  )
}

/** Compact, swipeable strip of the projects marked "Featured": small cards so several fit on screen before you scroll. */
function SelectedWork({ items, ratio }: { items: Project[]; ratio: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const bp = useBreakpoint()
  const go = (d: 1 | -1) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.75, behavior: 'smooth' })
  const width: CSSProperties = { width: bp === 'lg' ? 'clamp(190px, 16vw, 250px)' : bp === 'md' ? 'clamp(150px, 24vw, 200px)' : '40vw' }

  return (
    <section id="selected" className="mt-16 scroll-mt-20 sm:mt-24 lg:mt-24">
      <div className="container-x">
        <div className="mb-7 flex items-end justify-between gap-6 sm:mb-10">
          <h2 className="font-display text-2xl font-medium uppercase tracking-[-0.02em] sm:text-4xl">Selected work</h2>
          <div className="hidden items-center gap-2 sm:flex">
            <button onClick={() => go(-1)} aria-label="Scroll left" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 transition hover:border-accent hover:text-accent"><ArrowLeft className="h-4 w-4" /></button>
            <button onClick={() => go(1)} aria-label="Scroll right" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 transition hover:border-accent hover:text-accent"><ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div ref={ref} className="-mr-[var(--gutter)] flex snap-x snap-mandatory items-start gap-3.5 overflow-x-auto pr-[var(--gutter)] sm:gap-5">
          {items.map((p, i) => <div key={p.id} className="shrink-0 snap-start" style={width}><WorkTile p={p} ratio={ratio} priority={i < 4} /></div>)}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useSeo({})
  const sections = useSections()
  const featured = useAsync(async () => (await api.getProjects({ featured: true, pageSize: 12 })).data as Project[], [])
  const hero = sections?.find((s) => s.key === 'hero')
  const ratio = parseRatio(sections?.find((s) => s.key === 'featured_work')?.config?.tile_ratio)
  const hasFeatured = !!featured.data?.length

  return (
    <>
      <Hero hero={hero} loading={sections === null} target={hasFeatured ? '#selected' : '#work'} />
      {hasFeatured && <SelectedWork items={featured.data!} ratio={ratio} />}
      <section id="work" className="container-x mt-16 scroll-mt-20 sm:mt-24 lg:mt-24">
        <div className="mb-8 sm:mb-12">
          <h2 className="font-display text-2xl font-medium uppercase tracking-[-0.02em] sm:text-4xl">Work</h2>
        </div>
        <WorkArchive />
      </section>
    </>
  )
}
