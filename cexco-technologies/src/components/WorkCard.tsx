import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/components/ui'
import { transformUrl } from '@/utils/image'
import { cn } from '@/utils/format'
import type { PortfolioProject } from '@/types'

interface Props { p: PortfolioProject; uniform?: boolean; priority?: boolean }

/** Gallery card: shows the whole design (no cropping) in masonry mode, or a fixed 4:5 frame in grid mode. */
export function WorkCard({ p, uniform, priority }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [src, setSrc] = useState<string | null>(p.cover_image_url ? transformUrl(p.cover_image_url, 700) : null)
  const showImg = src && !failed

  return (
    <Link to={`/portfolio/${p.slug}`} className="group block" aria-label={p.title}>
      <div className={cn('relative overflow-hidden rounded-md bg-[#e8e5de]', (uniform || !loaded) && 'aspect-[4/5]')}>
        {showImg ? (
          <img
            src={src} alt={p.title} loading={priority ? 'eager' : 'lazy'} decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => { if (p.cover_image_url && src !== p.cover_image_url) setSrc(p.cover_image_url); else setFailed(true) }}
            className={cn('w-full transition duration-700 ease-out group-hover:scale-[1.03]', uniform ? 'h-full object-cover' : 'h-auto', loaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : <PlaceholderArt seed={p.title} />}
      </div>
      <div className="mt-2.5 sm:mt-3">
        <h3 className="font-display text-[15px] font-medium leading-snug transition group-hover:text-accent sm:text-lg">{p.title}</h3>
        {p.category && <p className="mt-0.5 text-[10.5px] uppercase tracking-[.16em] text-black/45 sm:text-[11px]">{p.category.name}</p>}
      </div>
    </Link>
  )
                 }
