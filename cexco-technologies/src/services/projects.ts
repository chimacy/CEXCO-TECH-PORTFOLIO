import { supabase } from '@/lib/supabase'
import { load } from '@/lib/cache'
import { getCategories } from '@/services/api'
import type { PortfolioImage } from '@/types'
import type { Cat, Project } from '@/utils/project'

type Row = Record<string, unknown>

// Only the columns the grids need (no long descriptions). Falls back automatically if a migration has not been run yet.
const FULL = 'id,slug,title,cover_image_url,cover_ratio,year,featured,sort_order,created_at,status,category_id,secondary_category_id'
const BASE = 'id,slug,title,cover_image_url,featured,sort_order,created_at,status,category_id'
const SEARCH_EXTRA = ',short_description,client_name,client_type'

export const catsAll = () => load<Cat[]>('cats-all', async () => (await getCategories()).map(({ id, name, slug }) => ({ id, name, slug })))

function withCats(row: Row, cats: Cat[]): Project {
  const find = (id: unknown) => cats.find((c) => c.id === id)
  const a = find(row.category_id)
  const b = find(row.secondary_category_id)
  return { ...(row as unknown as Project), category: a ?? null, cats: [a, b].filter((c): c is Cat => !!c) }
}

type Run = (cols: string, multi: boolean) => PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>
async function select(run: Run, extra = ''): Promise<{ rows: Row[]; count: number }> {
  let r = await run(FULL + extra, true)
  if (r.error && /column|schema|does not exist/i.test(r.error.message)) r = await run(BASE + extra, false)
  if (r.error) throw new Error(r.error.message)
  return { rows: (r.data ?? []) as Row[], count: r.count ?? 0 }
}

export async function listProjects(o: { page: number; pageSize: number; categoryId?: string; featured?: boolean }): Promise<{ data: Project[]; count: number }> {
  const cats = await catsAll()
  const from = (o.page - 1) * o.pageSize
  const { rows, count } = await select((cols, multi) => {
    let b = supabase.from('portfolio_projects').select(cols, { count: 'exact' }).eq('status', 'published')
    if (o.featured) b = b.eq('featured', true)
    if (o.categoryId) b = multi ? b.or(`category_id.eq.${o.categoryId},secondary_category_id.eq.${o.categoryId}`) : b.eq('category_id', o.categoryId)
    return b.order('sort_order').order('created_at', { ascending: false }).range(from, from + o.pageSize - 1)
  })
  return { data: rows.map((r) => withCats(r, cats)), count }
}

export const loadFeatured = () => load<Project[]>('featured', async () => (await listProjects({ page: 1, pageSize: 12, featured: true })).data)

export const firstPageKey = (categoryId: string | undefined, pageSize: number) => `page1:${categoryId ?? 'all'}:${pageSize}`
export const loadFirstPage = (categoryId: string | undefined, pageSize: number) =>
  load(firstPageKey(categoryId, pageSize), () => listProjects({ page: 1, pageSize, categoryId }))

/** Categories that actually have published projects (counting both the main and second category). */
export const usedCategories = () => load<Cat[]>('cats-used', async () => {
  const run = (cols: string) => supabase.from('portfolio_projects').select(cols).eq('status', 'published').limit(2000)
  const [cats, first] = await Promise.all([catsAll(), run('category_id,secondary_category_id')])
  const r = first.error ? await run('category_id') : first
  const used = new Set<unknown>()
  for (const row of (r.data ?? []) as unknown as Row[]) { used.add(row.category_id); used.add(row.secondary_category_id) }
  return cats.filter((c) => used.has(c.id))
})

/** Light index of every published project, used by the search box (searched locally, so results appear instantly). */
export const searchIndex = () => load<Project[]>('search-index', async () => {
  const cats = await catsAll()
  const { rows } = await select((cols) => supabase.from('portfolio_projects').select(cols).eq('status', 'published').order('sort_order').order('created_at', { ascending: false }).limit(1000), SEARCH_EXTRA)
  return rows.map((r) => withCats(r, cats))
})

export async function getProjectDetail(slug: string, preview = false): Promise<Project | null> {
  const cats = await catsAll()
  let q = supabase.from('portfolio_projects').select('*, images:portfolio_images(*)').eq('slug', slug)
  if (!preview) q = q.eq('status', 'published')
  const res = await q.maybeSingle()
  if (res.error) throw new Error(res.error.message)
  if (!res.data) return null
  const row = res.data as Row
  const images = ((row.images ?? []) as PortfolioImage[]).slice().sort((a, b) => a.sort_order - b.sort_order)
  return { ...withCats(row, cats), images }
                                                                                             }
