import { useEffect, useState } from 'react'
import { getSections } from '@/services/api'
import type { HomepageSection } from '@/types'

// Homepage sections are fetched once per visit and shared (design card shape, WhatsApp button text, etc.)
let cache: Promise<HomepageSection[]> | null = null

/** null while loading, then the visible sections */
export function useSections(): HomepageSection[] | null {
  const [data, setData] = useState<HomepageSection[] | null>(null)
  useEffect(() => {
    let live = true
    if (!cache) cache = getSections().catch((e: unknown) => { cache = null; throw e })
    cache.then((d) => { if (live) setData(d) }).catch(() => { if (live) setData([]) })
    return () => { live = false }
  }, [])
  return data
}

/** "4/5", "4:5", "1080x1350" or a plain number -> width / height */
export function parseRatio(v: unknown, fallback = 0.8): number {
  if (typeof v !== 'string') return fallback
  const m = /^\s*(\d+(?:\.\d+)?)\s*[/:x×]\s*(\d+(?:\.\d+)?)\s*$/i.exec(v)
  const r = m ? Number(m[1]) / Number(m[2]) : Number(v)
  return r > 0.2 && r < 5 ? r : fallback
}

/** The one shape every design card uses (set in Admin → Homepage). */
export function useTileRatio(): number {
  const s = useSections()
  return parseRatio(s?.find((x) => x.key === 'featured_work')?.config?.tile_ratio)
  }
