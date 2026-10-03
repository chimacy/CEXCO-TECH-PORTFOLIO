import { Link } from 'react-router-dom'
import { Eye, FolderTree, ImagePlus, Image as ImageIcon, Plus, Star } from 'lucide-react'
import { Badge, ErrorState, Img, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/utils/format'

const GB = 1073741824

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const count = (table: string, f?: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => unknown) => {
      const q = supabase.from(table).select('id', { count: 'exact', head: true })
      return f ? (f(q as never) as typeof q) : q
    }
    const eq = (col: string, v: string | boolean) => (q: unknown) => (q as { eq: (c: string, x: string | boolean) => unknown }).eq(col, v)
    const [all, published, featured, cats, recent, media] = await Promise.all([
      count('portfolio_projects'), count('portfolio_projects', eq('status', 'published')), count('portfolio_projects', eq('featured', true)), count('categories'),
      supabase.from('portfolio_projects').select('id,title,status,cover_image_url,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('media').select('size_bytes').limit(10000),
    ])
    for (const r of [all, published, featured, cats, recent, media]) if (r.error) throw new Error(r.error.message)
    const storage = (media.data ?? []).reduce((a, x) => a + (x.size_bytes ?? 0), 0) * 1.15 // allowance for the generated thumbnail + medium copies
    return { all: all.count ?? 0, published: published.count ?? 0, featured: featured.count ?? 0, cats: cats.count ?? 0, storage, recent: recent.data ?? [] }
  }, [])
  if (loading) return <Spinner label="Loading dashboard…" />
  if (error || !data) return <ErrorState message="Unable to load dashboard data." onRetry={reload} />

  const stats = [{ l: 'Total projects', v: data.all, i: ImageIcon }, { l: 'Published', v: data.published, i: Eye }, { l: 'Featured', v: data.featured, i: Star }, { l: 'Categories', v: data.cats, i: FolderTree }]
  const pct = Math.min(100, (data.storage / GB) * 100)
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/portfolio/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Add project</Link>
          <Link to="/admin/media" className="btn btn-ghost"><ImagePlus className="h-4 w-4" /> Media library</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => <div key={s.l} className="card p-4"><s.i className="h-4 w-4 text-black/40" aria-hidden /><p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.v}</p><p className="text-xs text-black/55">{s.l}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex justify-between"><h2 className="font-display font-semibold">Recent projects</h2><Link className="text-sm text-accent" to="/admin/portfolio">All</Link></div>
          {!data.recent.length ? <p className="py-6 text-center text-sm text-black/50">No projects yet.</p> : (
            <ul className="divide-y divide-black/5">{data.recent.map((r) => (
              <li key={r.id}><Link to={`/admin/portfolio/${r.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-accent">
                <span className="h-11 w-11 shrink-0 overflow-hidden bg-black/5"><Img src={r.cover_image_url} alt="" seed={r.title} width={100} /></span>
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                <span className="hidden text-xs text-black/45 sm:block">{formatDate(r.created_at)}</span><Badge value={r.status} />
              </Link></li>
            ))}</ul>)}
        </section>
        <section className="card h-fit p-5">
          <h2 className="mb-1 font-display font-semibold">File storage (approx.)</h2>
          <p className="mb-3 text-xs text-black/50">Supabase Free includes 1 GB.</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatBytes(data.storage)} <span className="text-sm font-normal text-black/50">of 1 GB</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used"><div className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>
        </section>
      </div>
    </div>
  )
                     }
