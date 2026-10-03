import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import * as api from '@/services/api'
import { EmptyState, ErrorState } from '@/components/ui'
import { CatalogGrid } from '@/components/WorkGrid'
import { useTileRatio } from '@/lib/sections'
import { cn } from '@/utils/format'
import type { Project } from '@/utils/project'
import type { Category } from '@/types'

/** Category filter + catalog grid. `limit` shows just the first projects (used on the home page). */
export function WorkArchive({ limit }: { limit?: number }) {
  const { settings } = useSettings()
  const ratio = useTileRatio()
  const [sp, setSp] = useSearchParams()
  const cats = useAsync<Category[]>(async () => {
    const [all, used] = await Promise.all([api.getCategories(), supabase.from('portfolio_projects').select('category_id').eq('status', 'published').limit(2000)])
    const ids = new Set((used.data ?? []).map((r) => r.category_id as string | null))
    return all.filter((c) => ids.has(c.id))
  }, [])

  const slug = sp.get('category')
  const active = cats.data?.find((c) => c.slug === slug)
  const waiting = !!slug && cats.loading
  const pageSize = limit ?? settings?.items_per_page ?? 12

  const [items, setItems] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [more, setMore] = useState(false)
  const reqId = useRef(0)

  const load = useCallback(async (p: number, reset: boolean) => {
    const id = ++reqId.current
    if (reset) setState('loading'); else setMore(true)
    try {
      const res = await api.getProjects({ page: p, pageSize, categoryId: active?.id })
      if (id !== reqId.current) return
      const rows = res.data as Project[]
      setItems((prev) => (reset ? rows : [...prev, ...rows])); setTotal(res.count); setPage(p); setState('ready')
    } catch { if (id === reqId.current) setState('error') } finally { if (id === reqId.current) setMore(false) }
  }, [pageSize, active?.id])

  useEffect(() => { if (!waiting) void load(1, true) }, [load, waiting])

  const pick = (c: string | null) => { const n = new URLSearchParams(sp); if (c) n.set('category', c); else n.delete('category'); setSp(n, { replace: true, preventScrollReset: true }) }
  const tabs = [{ slug: null as string | null, name: 'All' }, ...(cats.data ?? [])]

  return (
    <div>
      {!!cats.data?.length && (
        <nav aria-label="Filter by category" className="-mx-[var(--gutter)] overflow-x-auto border-b border-black/10 px-[var(--gutter)]">
          <ul className="flex min-w-max items-center gap-7 sm:gap-10">
            {tabs.map((c) => {
              const on = (c.slug ?? null) === (active?.slug ?? null)
              return (
                <li key={c.slug ?? 'all'}>
                  <button onClick={() => pick(c.slug)} aria-pressed={on}
                    className={cn('relative -mb-px whitespace-nowrap pb-4 pt-1 text-[12px] font-medium uppercase tracking-[.16em] transition sm:text-[13px]', on ? 'text-ink' : 'text-black/40 hover:text-ink')}>
                    {c.name}
                    <span aria-hidden className={cn('absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent transition-transform duration-300', on ? 'scale-x-100' : 'scale-x-0')} />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <div className="pt-10 sm:pt-14 lg:pt-20" aria-live="polite">
        {state === 'loading' || waiting ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="animate-pulse rounded-[28px] bg-neutral-100" style={{ aspectRatio: String(ratio) }} />)}</div>
        ) : state === 'error' ? <ErrorState message="Unable to load projects. Please try again." onRetry={() => void load(1, true)} />
        : !items.length ? <EmptyState title="No projects yet." hint={active ? 'Nothing is published in this category yet.' : 'Projects will appear here once published.'} />
        : (
          <div key={active?.slug ?? 'all'} className="animate-fade">
            <CatalogGrid items={items} ratio={ratio} />
            {limit ? (
              total > items.length && (
                <div className="mt-16 flex justify-center sm:mt-24">
                  <Link to={`/work${slug ? `?category=${slug}` : ''}`} className="group inline-flex items-center gap-3 border-b border-ink pb-1 text-[12px] font-medium uppercase tracking-[.18em] transition hover:border-accent hover:text-accent">
                    View all work <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                </div>
              )
            ) : items.length < total && (
              <div className="mt-16 flex flex-col items-center gap-3 sm:mt-24">
                <button className="inline-flex items-center gap-3 border-b border-ink pb-1 text-[12px] font-medium uppercase tracking-[.18em] transition hover:border-accent hover:text-accent disabled:opacity-50" disabled={more} onClick={() => void load(page + 1, false)}>
                  {more && <Loader2 className="h-4 w-4 animate-spin" />}{more ? 'Loading' : 'Load more'}
                </button>
                <p className="text-xs text-black/40">{items.length} of {total}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
  }
