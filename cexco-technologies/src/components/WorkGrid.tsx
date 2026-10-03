import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/components/ui'
import { transformUrl } from '@/utils/image'
import { projectYear, type Project } from '@/utils/project'
import { cn } from '@/utils/format'

export type Bp = 'sm' | 'md' | 'lg'
const calc = (): Bp => (window.innerWidth >= 1024 ? 'lg' : window.innerWidth >= 640 ? 'md' : 'sm')
export function useBreakpoint(): Bp {
  const [bp, setBp] = useState<Bp>(calc)
  useEffect(() => { const on = () => setBp(calc()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  return bp
}

/** One design card: every card uses the same shape (`ratio`), rounded corners, gentle reveal as it scrolls into view. */
export function WorkTile({ p, ratio, index, priority }: { p: Project; ratio: number; index?: number; priority?: boolean }) {
  const full = p.cover_image_url
  const [src, setSrc] = useState(full ? transformUrl(full, 700) : null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [seen, setSeen] = useState(!!priority)
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (seen) return
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  const meta = [p.category?.name, String(projectYear(p))].filter(Boolean).join('  ·  ')
  return (
    <Link ref={ref} to={`/work/${p.slug}`} aria-label={p.title}
      className={cn('group block transition duration-700 ease-out', seen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}>
      <div className="relative overflow-hidden rounded-[28px] bg-neutral-100" style={{ aspectRatio: String(ratio) }}>
        {src && !failed ? (
          <img
            src={src} alt={p.title} loading={priority ? 'eager' : 'lazy'} decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => { if (full && src !== full) setSrc(full); else setFailed(true) }}
            className={cn('absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]', loaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : <PlaceholderArt seed={p.title} />}
      </div>
      <div className="mt-3 flex items-start gap-2.5 px-1">
        {index !== undefined && <span className="mt-[3px] font-display text-[11px] tabular-nums text-accent">{String(index + 1).padStart(2, '0')}</span>}
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[13.5px] font-medium leading-snug tracking-tight sm:text-base">
            {p.title}
          </h3>
          <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-black/45 sm:text-[11px]">{meta}</p>
        </div>
      </div>
    </Link>
  )
}

/** The catalog: two designs per row on phones, three on tablets, four on desktops. Alternate columns sit lower for rhythm. */
export function CatalogGrid({ items, ratio }: { items: Project[]; ratio: number }) {
  const bp = useBreakpoint()
  const cols = bp === 'lg' ? 4 : bp === 'md' ? 3 : 2
  const columns = Array.from({ length: cols }, (_, c) => items.map((p, i) => ({ p, i })).filter(({ i }) => i % cols === c))
  return (
    <div className="flex items-start gap-3.5 sm:gap-5 lg:gap-7">
      {columns.map((col, c) => (
        <div key={c} className={cn('flex min-w-0 flex-1 flex-col gap-8 sm:gap-12', c % 2 === 1 && 'mt-10 sm:mt-16')}>
          {col.map(({ p, i }) => <WorkTile key={p.id} p={p} ratio={ratio} index={i} priority={i < 4} />)}
        </div>
      ))}
    </div>
  )
              }
