import { useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { Img } from '@/components/ui'
import { WorkArchive } from '@/components/WorkArchive'
import { WorkTile, useBreakpoint } from '@/components/WorkGrid'
import { cn } from '@/utils/format'
import { projectRatio, type Project } from '@/utils/project'
import type { HomepageSection } from '@/types'

const cfg = (s: HomepageSection | undefined, k: string) => (typeof s?.config?.[k] === 'string' && s.config[k] ? (s.config[k] as string) : null)

function Hero({ hero, loading, target }: { hero?: HomepageSection; loading: boolean; target: string }) {
  const { settings } = useSettings()
  const image = cfg(hero, 'hero_image_url')
  const title = hero?.title ?? settings?.tagline ?? settings?.brand_name ?? ''
  if (loading) return <section className="container-x pt-10 sm:pt-16"><div className="h-24 w-4/5 animate-pulse bg-neutral-100 sm:h-40" /></section>

  return (
    <section className="container-x pt-8 sm:pt-14 lg:pt-16">
      <div className="flex items-center gap-4 animate-fade">
        <p className="eyebrow flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-ink">{settings?.brand_name}</span>
          <span aria-hidden className="text-black/25">/</span>
          <span>{cfg(hero, 'badge') ?? 'Creative Design Portfolio'}</span>
        </p>
        <span aria-hidden className="hidden h-px flex-1 bg-black/10 sm:block" />
        <span className="eyebrow hidden sm:block">{new Date().getFullYear()}</span>
      </div>

      <h1 className="mt-8 animate-fadeUp whitespace-pre-line font-display text-[clamp(2.1rem,9.4vw,3.5rem)] font-medium uppercase leading-[.95] tracking-[-0.035em] sm:mt-12 sm:text-[clamp(3rem,7.2vw,6.5rem)]">{title}</h1>

      <div className="mt-10 grid gap-10 sm:mt-14 lg:mt-20 lg:grid-cols-12 lg:gap-x-12">
        <div className={cn('lg:self-end', image ? 'lg:col-span-4' : 'lg:col-span-6')}>
          {hero?.description && <p className="max-w-md text-[15px] leading-relaxed text-black/60 sm:text-base">{hero.description}</p>}
          <a href={target} className="group mt-8 inline-flex items-center gap-3 text-[12px] font-medium uppercase tracking-[.18em]">
            <span className="border-b border-ink pb-1 transition group-hover:border-accent group-hover:text-accent">{hero?.cta_text || 'Explore work'}</span>
            <ArrowDown className="h-4 w-4 transition group-hover:translate-y-1 group-hover:text-accent" />
          </a>
        </div>
        {image && (
          <figure className="order-first -mx-[var(--gutter)] lg:order-none lg:col-span-8 lg:mx-0 lg:-mr-[var(--gutter)]">
            <div className="aspect-[5/4] overflow-hidden bg-neutral-100 sm:aspect-[16/10]"><Img src={image} alt="" eager width={1600} sizes="(min-width:1024px) 66vw, 100vw" /></div>
          </figure>
        )}
      </div>
    </section>
  )
}

/** Horizontal, swipeable strip of the projects marked "Featured" in the admin. */
function SelectedWork({ items }: { items: Project[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const bp = useBreakpoint()
  const go = (d: 1 | -1) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  const width = (r: number): CSSProperties =>
    bp === 'lg' ? { width: `min(70vw, calc(62vh * ${r}))` } : bp === 'md' ? { width: `min(46vw, calc(56vh * ${r}))` } : { width: `min(${r >= 1.2 ? 84 : 78}vw, calc(60vh * ${r}))` }

  return (
    <section id="selected" className="mt-20 scroll-mt-20 sm:mt-28 lg:mt-36">
      <div className="container-x">
        <div className="mb-8 flex items-end justify-between gap-6 sm:mb-12">
          <div>
            <p className="eyebrow">(01)</p>
            <h2 className="mt-3 font-display text-2xl font-medium uppercase tracking-[-0.02em] sm:text-4xl">Selected work</h2>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button onClick={() => go(-1)} aria-label="Scroll left" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 transition hover:border-accent hover:text-accent"><ArrowLeft className="h-4 w-4" /></button>
            <button onClick={() => go(1)} aria-label="Scroll right" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 transition hover:border-accent hover:text-accent"><ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div ref={ref} className="-mr-[var(--gutter)] flex snap-x snap-mandatory items-start gap-5 overflow-x-auto pr-[var(--gutter)] sm:gap-8">
          {items.map((p, i) => <div key={p.id} className="shrink-0 snap-start" style={width(projectRatio(p))}><WorkTile p={p} wide priority={i < 2} /></div>)}
        </div>
      </div>
    </section>
  )
}

function AboutIntro() {
  const { settings } = useSettings()
  const about = useAsync(() => api.getPage('about'), [])
  const text = about.data?.intro ?? settings?.about_description
  if (!text) return null
  const tags = about.data?.values_list ?? []
  return (
    <section className="container-x mt-28 border-t border-black/10 pt-10 sm:mt-40 sm:pt-14">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-12">
        <p className="eyebrow lg:col-span-3">(03) About</p>
        <div className="lg:col-span-8 lg:col-start-5">
          <p className="font-display text-[1.6rem] font-medium leading-[1.2] tracking-[-0.02em] sm:text-4xl lg:text-[2.6rem]">{text}</p>
          {tags.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-2 text-[12px] uppercase tracking-[.16em] text-black/50">
              {tags.map((t, i) => <li key={t}>{i > 0 && <span aria-hidden className="mr-3 text-accent">/</span>}{t}</li>)}
            </ul>
          )}
          <Link to="/about" className="group mt-10 inline-flex items-center gap-3 border-b border-ink pb-1 text-[12px] font-medium uppercase tracking-[.18em] transition hover:border-accent hover:text-accent">
            More about <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useSeo({})
  const sections = useAsync(api.getSections, [])
  const featured = useAsync(async () => (await api.getProjects({ featured: true, pageSize: 8 })).data as Project[], [])
  const hero = sections.data?.find((s) => s.key === 'hero')
  const hasFeatured = !!featured.data?.length

  return (
    <>
      <Hero hero={hero} loading={sections.loading} target={hasFeatured ? '#selected' : '#work'} />
      {hasFeatured && <SelectedWork items={featured.data!} />}
      <section id="work" className="container-x mt-24 scroll-mt-20 sm:mt-32 lg:mt-40">
        <div className="mb-8 sm:mb-12">
          <p className="eyebrow">{hasFeatured ? '(02)' : '(01)'}</p>
          <h2 className="mt-3 font-display text-2xl font-medium uppercase tracking-[-0.02em] sm:text-4xl">Work</h2>
        </div>
        <WorkArchive limit={9} />
      </section>
      <AboutIntro />
    </>
  )
                                                    }
