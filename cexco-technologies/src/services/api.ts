import { supabase } from '@/lib/supabase'
import type {
  Category, HomepageSection, PageContent, PortfolioProject, PricingItem, ProcessStep, Service, SiteSettings, Stat, Testimonial,
} from '@/types'

const PROJECT_SELECT = '*, category:categories(id,name,slug), service:services(id,name,slug)'

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
const clean = (q: string) => q.replace(/[,()%*\\]/g, ' ').trim()

export async function getSettings(): Promise<SiteSettings | null> {
  const res = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
  return must<SiteSettings | null>(res)
}
export async function getSections(): Promise<HomepageSection[]> {
  return must(await supabase.from('homepage_sections').select('*').order('sort_order'))
}
export async function getCategories(): Promise<Category[]> {
  return must(await supabase.from('categories').select('*').eq('is_published', true).order('sort_order'))
}
export async function getCategory(slug: string): Promise<Category | null> {
  return must(await supabase.from('categories').select('*').eq('slug', slug).eq('is_published', true).maybeSingle())
}
export async function getServices(opts: { featured?: boolean; limit?: number; ids?: string[] } = {}): Promise<Service[]> {
  let q = supabase.from('services').select('*').eq('status', 'published').order('sort_order')
  if (opts.featured) q = q.eq('featured', true)
  if (opts.ids?.length) q = q.in('id', opts.ids)
  if (opts.limit) q = q.limit(opts.limit)
  return must(await q)
}
export async function getService(slug: string): Promise<Service | null> {
  return must(await supabase.from('services').select('*').eq('slug', slug).eq('status', 'published').maybeSingle())
}

export interface ProjectQuery { page?: number; pageSize?: number; q?: string; categoryId?: string; serviceId?: string; featured?: boolean; ids?: string[] }

export async function getProjects(o: ProjectQuery = {}): Promise<{ data: PortfolioProject[]; count: number }> {
  const pageSize = o.pageSize ?? 12
  const from = ((o.page ?? 1) - 1) * pageSize
  let q = supabase.from('portfolio_projects').select(PROJECT_SELECT, { count: 'exact' }).eq('status', 'published')
  if (o.categoryId) q = q.eq('category_id', o.categoryId)
  if (o.serviceId) q = q.eq('service_id', o.serviceId)
  if (o.featured) q = q.eq('featured', true)
  if (o.ids?.length) q = q.in('id', o.ids)
  const term = o.q ? clean(o.q) : ''
  if (term) {
    const [cats, svcs] = await Promise.all([
      supabase.from('categories').select('id').ilike('name', `%${term}%`),
      supabase.from('services').select('id').ilike('name', `%${term}%`),
    ])
    const parts = ['title', 'short_description', 'description', 'client_name'].map((c) => `${c}.ilike.%${term}%`)
    const catIds = (cats.data ?? []).map((c) => c.id as string)
    const svcIds = (svcs.data ?? []).map((s) => s.id as string)
    if (catIds.length) parts.push(`category_id.in.(${catIds.join(',')})`)
    if (svcIds.length) parts.push(`service_id.in.(${svcIds.join(',')})`)
    q = q.or(parts.join(','))
  }
  const res = await q.order('sort_order').order('created_at', { ascending: false }).range(from, from + pageSize - 1)
  if (res.error) throw new Error(res.error.message)
  return { data: (res.data ?? []) as PortfolioProject[], count: res.count ?? 0 }
}

export async function getProject(slug: string): Promise<PortfolioProject | null> {
  const res = await supabase.from('portfolio_projects').select(`${PROJECT_SELECT}, images:portfolio_images(*)`).eq('slug', slug).eq('status', 'published').maybeSingle()
  const p = must<PortfolioProject | null>(res)
  if (p?.images) p.images.sort((a, b) => a.sort_order - b.sort_order)
  return p
}
export async function getRelatedProjects(p: PortfolioProject, limit = 3): Promise<PortfolioProject[]> {
  if (!p.category_id) return []
  const res = await supabase.from('portfolio_projects').select(PROJECT_SELECT).eq('status', 'published').eq('category_id', p.category_id).neq('id', p.id).limit(limit)
  return must(res)
}
export async function getPricing(opts: { limit?: number; serviceId?: string } = {}): Promise<(PricingItem & { service?: { name: string; slug: string } | null })[]> {
  let q = supabase.from('pricing_items').select('*, service:services(name,slug)').eq('is_published', true).order('sort_order')
  if (opts.serviceId) q = q.eq('service_id', opts.serviceId)
  if (opts.limit) q = q.limit(opts.limit)
  return must(await q)
}
export async function getTestimonials(limit?: number): Promise<Testimonial[]> {
  let q = supabase.from('testimonials').select('*').eq('is_published', true).order('featured', { ascending: false }).order('sort_order')
  if (limit) q = q.limit(limit)
  return must(await q)
}
export async function getPage(slug: string): Promise<PageContent | null> {
  return must(await supabase.from('pages').select('*').eq('slug', slug).maybeSingle())
}
export async function getStats(): Promise<Stat[]> {
  return must(await supabase.from('stats').select('*').eq('is_published', true).order('sort_order'))
}
export async function getProcessSteps(): Promise<ProcessStep[]> {
  return must(await supabase.from('process_steps').select('*').eq('is_published', true).order('sort_order'))
}

export function trackEvent(type: 'portfolio_view' | 'project_view' | 'service_view' | 'category_view', entityId?: string) {
  void supabase.rpc('track_event', { p_type: type, p_entity: entityId ?? null }).then(() => undefined, () => undefined)
}

export async function submitContact(payload: Record<string, string>): Promise<void> {
  const { error } = await supabase.rpc('submit_contact_message', { p: payload })
  if (error) throw new Error(error.message)
}

export const REQUEST_LIMITS = {
  maxFiles: 10,
  maxBytes: 15 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'],
}

export async function submitRequest(payload: Record<string, string | null>): Promise<{ id: string; reference_no: string; upload_token: string }> {
  const { data, error } = await supabase.rpc('submit_design_request', { p: payload })
  if (error) throw new Error(error.message)
  return data as { id: string; reference_no: string; upload_token: string }
}

/** Upload one reference file with real progress using XHR against the Storage REST API. */
export function uploadRequestFile(requestId: string, token: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
  const path = `${requestId}/${crypto.randomUUID()}-${safe}`
  const base = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/storage/v1/object/request-files/${path}`)
    xhr.setRequestHeader('apikey', key)
    xhr.setRequestHeader('Authorization', `Bearer ${key}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}`))
    xhr.onload = async () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`Could not upload ${file.name}`))
      const { error } = await supabase.rpc('add_request_file', { p_request: requestId, p_token: token, p_path: path, p_name: file.name, p_mime: file.type, p_size: file.size })
      if (error) reject(new Error(error.message)); else { onProgress(100); resolve() }
    }
    xhr.send(file)
  })
}
