import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Img } from '@/components/ui'
import { formatPrice } from '@/utils/format'
import { useSettings } from '@/lib/settings'
import type { PortfolioProject } from '@/types'

export function ProjectCard({ p, tall }: { p: PortfolioProject; tall?: boolean }) {
  const { settings } = useSettings()
  return (
    <Link to={`/portfolio/${p.slug}`} className="group block">
      <div className={`relative overflow-hidden rounded-2xl bg-black/5 ${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
        <Img src={p.cover_image_url} alt={p.title} seed={p.title} className="transition duration-700 group-hover:scale-105" />
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white opacity-0 shadow transition group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
        {p.featured && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Featured</span>}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold group-hover:text-accent">{p.title}</h3>
          <p className="truncate text-sm text-black/50">{p.category?.name ?? p.service?.name ?? ' '}</p>
        </div>
        {(p.price != null || p.price_label) && <span className="shrink-0 text-sm text-black/60">{formatPrice(p.price, p.price_label, settings?.currency)}</span>}
      </div>
    </Link>
  )
}
