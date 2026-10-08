import { getSections } from '@/services/api'
import { load, useCached } from '@/lib/cache'
import type { HomepageSection } from '@/types'

export const loadSections = () => load<HomepageSection[]>('sections', getSections)

/** null while loading (first visit only), then the visible sections. Instant when already loaded. */
export function useSections(): HomepageSection[] | null {
  const { data, error } = useCached<HomepageSection[]>('sections', getSections)
  return data ?? (error ? [] : null)
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
