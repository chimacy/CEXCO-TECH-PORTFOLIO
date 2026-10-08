import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { peek, put, useCached } from '@/lib/cache'
import { useSettings } from '@/lib/settings'
import { useTileRatio } from '@/lib/sections'
import { firstPageKey, listProjects, loadFirstPage, usedCategories } from '@/services/projects'
import { EmptyState, ErrorState } from '@/components/ui'
import { CatalogGrid } from '@/components/WorkGrid'
import { cn } from '@/utils/format'
import type { Project } from '@/utils/project'

interface View { items: Project[]; total: number; page: number }

/** Category filter + catalog grid with "Load more". Remembers what was loaded, so coming back from a project is instant. */
export function WorkArchive() {
  const { settings } = useSettings()
  const ratio = useTileRatio()
  const [sp, setSp] = useSearchParams()
  const cats = useCached('cats-used', usedCategories)

  const slug = sp.get('category')
  const active = cats.data?.find((c) => c.slug === slug)
  const waiting = !!slug && !cats.data && !cats.error
  const pageSize = settings?.items_per_page ?? 12
  const viewKey = `view:${firstPageKey(active?.id, pageSize)}`

  const [view, setView] = useState<View | undefined>(() => peek<View>(viewKey))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => (peek<View>(viewKey) ? 'ready' : 'loading'))
  const [more, setMore] = useState(false)

  useEffect(() => {
    if (waiting) return
    const cached = peek<View>(viewKey)
    if (cached) { setView(cached); setStatus('ready'); return }
    let live = true
    setStatus('loading')
    loadFirstPage(active?.id, pageSize)
      .then((r) => { if (!live) return; const v = { items: r.data, total: r.count, page: 1 }; put(viewKey, v); setView(v); setStatus('ready') })
      .catch(() => { if (live) setStatus('error') })
    return () => { live = false }
  }, [viewKey, waiting, active?.id, pageSize])

  const loadMore = useCallback(async () => {
    if (!view || more) return
    setMore(true)
    try {
      const r = await listProjects({ page: view.page + 1, pageSize, categoryId: active?.id })
      const v = { items: [...view.items, ...r.data], total: r.count, page: view.page + 1 }
      put(viewKey, v); setView(v)
    } finally { setMore(false) }
  }, [view, more, pageSize, active?.id, viewKey])

  const pick = (c: string | null) => { const n = new URLSearchParams(sp); if (c) n.set('category', c); else n.delete('category'); setSp(n, { replace: true, preventScrollReset: true }) }
  const tabs = [{ slug: null as string | null, name: 'All' }, ...(cats.data ?? [])]
  const items = view?.items ?? []

  return (
    <div>
      {!!cats.data?.length && (
        <nav aria-label="Filter by category" className="-mx-[var(--gutter)] overflow-x-auto overflow-y-hidden border-b border-black/10 px-[var(--gutter)]">
          <ul className="flex min-w-max items-center gap-7 sm:gap-10">
            {tabs.map((c) => {
              const on = (c.slug ?? null) === (active?.slug ?? null)
              return (
                <li key={c.slug ?? 'all'}>
                  <button onClick={() => pick(c.slug)} aria-pressed={on}
                    className={cn('relative -mb-px whitespace-nowrap pb-4 pt-1 text-[12px] font-medium uppercase tracking-[.16em] transition-colors sm:text-[13px]', on ? 'text-ink' : 'text-black/40 hover:text-ink')}>
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
        {status === 'loading' || waiting ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="animate-pulse rounded-[28px] bg-neutral-100" style={{ aspectRatio: String(ratio) }} />)}</div>
        ) : status === 'error' ? <ErrorState message="Unable to load projects. Please try again." onRetry={() => { setStatus('loading'); loadFirstPage(active?.id, pageSize).then((r) => { const v = { items: r.data, total: r.count, page: 1 }; put(viewKey, v); setView(v); setStatus('ready') }).catch(() => setStatus('error')) }} />
        : !items.length ? <EmptyState title="No projects yet." hint={active ? 'Nothing is published in this category yet.' : 'Projects will appear here once published.'} />
        : (
          <div key={active?.slug ?? 'all'}>
            <CatalogGrid items={items} ratio={ratio} />
            {view && items.length < view.total && (
              <div className="mt-16 flex flex-col items-center gap-3 sm:mt-24">
                <button className="inline-flex items-center gap-3 border-b border-ink pb-1 text-[12px] font-medium uppercase tracking-[.18em] transition-colors hover:border-accent hover:text-accent disabled:opacity-50" disabled={more} onClick={() => void loadMore()}>
                  {more && <Loader2 className="h-4 w-4 animate-spin" />}{more ? 'Loading' : 'Load more'}
                </button>
                <p className="text-xs text-black/40">{items.length} of {view.total}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
                         }
