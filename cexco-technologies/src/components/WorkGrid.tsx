import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/components/ui'
import { transformUrl } from '@/utils/image'
import { projectRatio, projectYear, type Project } from '@/utils/project'
import { cn } from '@/utils/format'

export type Bp = 'sm' | 'md' | 'lg'
const calc = (): Bp => (window.innerWidth >= 1024 ? 'lg' : window.innerWidth >= 640 ? 'md' : 'sm')
export function useBreakpoint(): Bp {
  const [bp, setBp] = useState<Bp>(calc)
  useEffect(() => { const on = () => setBp(calc()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  return bp
}

/** One project: the artwork at its true proportions, then a small caption. */
export function WorkTile({ p, wide, priority }: { p: Project; wide?: boolean; priority?: boolean }) {
  const full = p.cover_image_url
  const [src, setSrc] = useState(full ? transformUrl(full, wide ? 1200 : 700) : null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ratio, setRatio] = useState(projectRatio(p))
  const meta = [p.category?.name, String(projectYear(p))].filter(Boolean).join('  ·  ')

  return (
    <Link to={`/work/${p.slug}`} className="group block" aria-label={p.title}>
      <div className="relative overflow-hidden bg-neutral-100" style={{ aspectRatio: String(ratio) }}>
        {src && !failed ? (
          <img
            src={src} alt={p.title} loading={priority ? 'eager' : 'lazy'} decoding="async"
            onLoad={(e) => {
              setLoaded(true)
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              if (w && h && Math.abs(w / h - ratio) / ratio > 0.03) setRatio(w / h)
            }}
            onError={() => { if (full && src !== full) setSrc(full); else setFailed(true) }}
            className={cn('absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.035]', loaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : <PlaceholderArt seed={p.title} />}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="relative inline-block font-display text-[15px] font-medium leading-snug tracking-tight sm:text-base">
            {p.title}
            <span aria-hidden className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-500 group-hover:scale-x-100" />
          </h3>
          <p className="mt-1 text-[11px] uppercase tracking-[.14em] text-black/45">{meta}</p>
        </div>
        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  )
}

/* ───────── Desktop: 12-column editorial rows built from each design's proportions ───────── */
interface Cell { p: Project; span: number; start?: number }
const want = (r: number) => (r >= 1.3 ? 7 : r <= 0.85 ? 4 : 5)

function fill(row: Cell[], index: number): Cell[] {
  if (row.length === 1) {
    const r = projectRatio(row[0].p)
    if (r >= 1.3) return [{ ...row[0], span: 12 }] // landscape work gets a full-width moment
    const span = r >= 0.95 ? 8 : 6
    return [{ ...row[0], span, start: index % 2 === 0 ? 1 : 13 - span }]
  }
  const out = row.map((c) => ({ ...c }))
  let left = 12 - out.reduce((a, c) => a + c.span, 0)
  const order = out.map((_, i) => i).sort((a, b) => out[b].span - out[a].span)
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length]].span++
  return out
}

export function packRows(items: Project[]): Cell[][] {
  const rows: Cell[][] = []
  let cur: Cell[] = []
  let sum = 0
  const flush = () => { if (cur.length) rows.push(fill(cur, rows.length)); cur = []; sum = 0 }
  for (const p of items) {
    const w = want(projectRatio(p))
    if (sum + w > 12) flush()
    cur.push({ p, span: w }); sum += w
    if (sum >= 12) flush()
  }
  flush()
  return rows
}

function LargeGrid({ items }: { items: Project[] }) {
  const rows = packRows(items)
  let n = 0
  return (
    <div className="space-y-24 xl:space-y-32">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-12 items-start gap-x-8 xl:gap-x-12">
          {row.map((c, ci) => {
            const i = n++
            return (
              <div key={c.p.id} style={{ gridColumn: c.start ? `${c.start} / span ${c.span}` : `span ${c.span} / span ${c.span}` }} className={cn(ci % 2 === 1 && 'mt-20 xl:mt-28')}>
                <WorkTile p={c.p} wide={c.span >= 5} priority={i < 2} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ───────── Tablet: two staggered columns ───────── */
function MediumGrid({ items }: { items: Project[] }) {
  return (
    <div className="flex items-start gap-6">
      {[0, 1].map((c) => (
        <div key={c} className={cn('flex flex-1 flex-col gap-14', c === 1 && 'mt-16')}>
          {items.filter((_, i) => i % 2 === c).map((p, i) => <WorkTile key={p.id} p={p} priority={i === 0} />)}
        </div>
      ))}
    </div>
  )
}

/* ───────── Phone: one column; landscape work runs full width, portrait work alternates sides ───────── */
function SmallGrid({ items }: { items: Project[] }) {
  return (
    <div className="flex flex-col gap-12">
      {items.map((p, i) => {
        const landscape = projectRatio(p) >= 1.2
        return (
          <div key={p.id} className={cn(!landscape && 'w-[88%]', !landscape && (i % 2 === 1 ? 'self-end' : 'self-start'))}>
            <WorkTile p={p} priority={i < 2} />
          </div>
        )
      })}
    </div>
  )
}

export function EditorialGrid({ items }: { items: Project[] }) {
  const bp = useBreakpoint()
  if (bp === 'lg') return <LargeGrid items={items} />
  if (bp === 'md') return <MediumGrid items={items} />
  return <SmallGrid items={items} />
}
