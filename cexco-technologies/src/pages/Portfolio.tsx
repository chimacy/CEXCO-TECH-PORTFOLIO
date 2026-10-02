import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAsync, useDebounced } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Pagination, Spinner } from '@/components/ui'
import { ProjectCard } from '@/components/ProjectCard'
import { useState } from 'react'

export default function Portfolio({ byCategory }: { byCategory?: boolean }) {
  const { slug } = useParams()
  const { settings } = useSettings()
  const [sp, setSp] = useSearchParams()
  const [text, setText] = useState(sp.get('q') ?? '')
  const q = useDebounced(text)
  const page = Number(sp.get('page') ?? 1) || 1
  const service = sp.get('service') ?? ''
  const featured = sp.get('featured') === '1'
  const layout = settings?.default_layout ?? 'masonry'
  const pageSize = settings?.items_per_page ?? 12

  const cats = useAsync(api.getCategories, [])
  const svcs = useAsync(() => api.getServices(), [])
  const catFromRoute = byCategory ? cats.data?.find((c) => c.slug === slug) : undefined
  const categoryId = byCategory ? catFromRoute?.id : sp.get('category') ?? ''

  const update = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); n.delete('page'); setSp(n, { replace: true }) }
  const currentQ = sp.get('q') ?? ''
  useEffect(() => { if (q !== currentQ) update('q', q) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.trackEvent(byCategory ? 'category_view' : 'portfolio_view', catFromRoute?.id) }, [byCategory, catFromRoute?.id])

  const waiting = byCategory && cats.loading
  const { data, loading, error, reload } = useAsync(async () => {
    if (waiting) return null
    return api.getProjects({ page, pageSize, q, categoryId: categoryId || undefined, serviceId: service || undefined, featured })
  }, [page, pageSize, q, categoryId, service, featured, waiting])

  const title = catFromRoute?.name ?? 'Portfolio'
  useSeo({ title, description: catFromRoute?.description ?? 'Browse our design portfolio.' })
  if (byCategory && !cats.loading && !catFromRoute) return <div className="container-x py-24"><EmptyState title="Category not found" hint="This category may have been removed or unpublished." /></div>

  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1>
      {catFromRoute?.description && <p className="mt-3 max-w-xl text-black/60">{catFromRoute.description}</p>}

      <div className="mt-8 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden />
          <input type="search" aria-label="Search projects" className="input !pl-10" placeholder="Search by title, client, category, service…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {!byCategory && (
          <select aria-label="Filter by category" className="input md:w-52" value={sp.get('category') ?? ''} onChange={(e) => update('category', e.target.value)}>
            <option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select aria-label="Filter by service" className="input md:w-52" value={service} onChange={(e) => update('service', e.target.value)}>
          <option value="">All services</option>{svcs.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(e) => update('featured', e.target.checked ? '1' : '')} className="h-4 w-4 accent-ink" /> Featured only</label>
      </div>

      <div className="mt-10" aria-live="polite">
        {loading || waiting ? <Spinner label="Loading projects…" /> : error ? <ErrorState message="Unable to load projects. Please try again." onRetry={reload} /> :
          !data?.data.length ? <EmptyState title="No projects found." hint={q || service || featured ? 'Try a different search or clear your filters.' : 'Projects will appear here once published.'} /> : (
            <>
              <p className="mb-5 text-sm text-black/50">{data.count} project{data.count === 1 ? '' : 's'}</p>
              {layout === 'masonry'
                ? <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-8 [&>*]:break-inside-avoid">{data.data.map((p, i) => <ProjectCard key={p.id} p={p} tall={i % 3 === 0} />)}</div>
                : <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{data.data.map((p) => <ProjectCard key={p.id} p={p} />)}</div>}
              <Pagination page={page} pageSize={pageSize} total={data.count} onPage={(n) => { const x = new URLSearchParams(sp); x.set('page', String(n)); setSp(x); window.scrollTo(0, 0) }} />
            </>
          )}
      </div>
    </div>
  )
}
