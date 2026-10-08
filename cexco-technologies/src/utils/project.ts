import type { PortfolioProject } from '@/types'

export type Cat = { id: string; name: string; slug: string }

/** Project row including columns added by migrations 005/006 (optional so the app still works before they are run). */
export type Project = PortfolioProject & { year?: number | null; cover_ratio?: number | null; secondary_category_id?: string | null; cats?: Cat[] }

export const projectYear = (p: Project): number => p.year ?? new Date(p.created_at).getFullYear()

/** width / height of the cover; 4:5 portrait until it has been measured */
export const projectRatio = (p: Project): number => {
  const r = Number(p.cover_ratio)
  return r > 0.2 && r < 5 ? r : 0.8
                            }
