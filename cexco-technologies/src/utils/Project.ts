import type { PortfolioProject } from '@/types'

/** Project row including the columns added by migration 005 (optional so the app still works before it is run). */
export type Project = PortfolioProject & { year?: number | null; cover_ratio?: number | null }

export const projectYear = (p: Project): number => p.year ?? new Date(p.created_at).getFullYear()

/** width / height of the cover; 4:5 portrait until it has been measured */
export const projectRatio = (p: Project): number => {
  const r = Number(p.cover_ratio)
  return r > 0.2 && r < 5 ? r : 0.8
  }
