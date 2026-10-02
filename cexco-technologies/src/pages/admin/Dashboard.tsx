import { Link } from 'react-router-dom'
import { Eye, FileEdit, FolderTree, ImagePlus, Image as ImageIcon, Plus, TrendingUp } from 'lucide-react'
import { Badge, ErrorState, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/utils/format'

const GB = 1073741824

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const head = (table: string, status?: string) => {
      const q = supabase.from(table).select('id', { count: 'exact', head: true })
      return status ? q.eq('status', status) : q
    }
    const [all, published, drafts, cats, recent, top, media] = await Promise.all([
      head('portfolio_projects'), head('portfolio_projects', 'published'), head('portfolio_projects', 'draft'), head('categories'),
      supabase.from('portfolio_projects').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('portfolio_projects').select('id,title,view_count').order('view_count', { ascending: false }).limit(6),
      supabase.from('media').select('size_bytes').limit(10000),
    ])
    for (const r of [all, published, drafts, cats, recent, top, media]) if (r.error) throw new Error(r.error.message)
    const views = await supabase.from('portfolio_projects').select('view_count').limit(5000)
    const totalViews = (views.data ?? []).reduce((a, x) => a + (x.view_count ?? 0), 0)
    const storage = (media.data ?? []).reduce((a, x) => a + (x.size_bytes ?? 0), 0) * 1.08 // ~8% allowance for thumbnails
    return { all: all.count ?? 0, published: published.count ?? 0, drafts: drafts.count ?? 0, cats: cats.count ?? 0, totalViews, storage, recent: recent.data ?? [], top: (top.data ?? []).filter((t) => t.view_count > 0) }
  }, [])
  if (loading) return <Spinner label="Loading dashboard…" />
  if (error || !data) return <ErrorState message="Unable to load dashboard data." onRetry={reload} />

  const stats = [
    { l: 'Total designs', v: data.all, i: ImageIcon }, { l: 'Published', v: data.published, i: Eye }, { l: 'Drafts', v: data.drafts, i: FileEdit },
    { l: 'Categories', v: data.cats, i: FolderTree }, { l: 'Project views', v: data.totalViews, i: TrendingUp },
  ]
  const pct = Math.min(100, (data.storage / GB) * 100)
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/portfolio/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Add design</Link>
          <Link to="/admin/media" className="btn btn-ghost"><ImagePlus className="h-4 w-4" /> Media library</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => <div key={s.l} className="card p-4"><s.i className="h-4 w-4 text-black/40" aria-hidden /><p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.v}</p><p className="text-xs text-black/55">{s.l}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex justify-between"><h2 className="font-display font-semibold">Recent designs</h2><Link className="text-sm text-accent" to="/admin/portfolio">All</Link></div>
          {!data.recent.length ? <p className="py-6 text-center text-sm text-black/50">No designs yet.</p> : (
            <ul className="divide-y divide-black/5">{data.recent.map((r) => (
              <li key={r.id}><Link to={`/admin/portfolio/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"><span className="truncate font-medium">{r.title}</span><span className="flex shrink-0 items-center gap-2"><span className="text-xs text-black/45">{formatDate(r.created_at)}</span><Badge value={r.status} /></span></Link></li>
            ))}</ul>)}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-display font-semibold">Most viewed</h2>
          {!data.top.length ? <p className="py-6 text-center text-sm text-black/50">No views recorded yet.</p> : (
            <ul className="space-y-2 text-sm">{data.top.map((t) => <li key={t.id} className="flex justify-between gap-3"><span className="truncate">{t.title}</span><span className="tabular-nums text-black/55">{t.view_count}</span></li>)}</ul>)}
        </section>
        <section className="card p-5">
          <h2 className="mb-1 font-display font-semibold">File storage (approx.)</h2>
          <p className="mb-3 text-xs text-black/50">Supabase Free includes 1 GB of file storage.</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatBytes(data.storage)} <span className="text-sm font-normal text-black/50">of 1 GB</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used"><div className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>
        </section>
      </div>
    </div>
  )
        }
