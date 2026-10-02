import { Link } from 'react-router-dom'
import { Briefcase, CheckCircle2, Clock, FolderTree, Image as ImageIcon, Inbox, Plus, Quote, Users, Eye } from 'lucide-react'
import { Badge, ErrorState, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/utils/format'

const count = async (table: string, f?: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => unknown) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (f) q = f(q as never) as typeof q
  const { count: c, error } = await q; if (error) throw new Error(error.message); return c ?? 0
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [mediaSizes, reqSizes, designs, published, cats, services, requests, pending, completed, clients, testimonials, recentReq, recentDes, top, ev] = await Promise.all([
      supabase.from('media').select('size_bytes').limit(10000), supabase.from('request_files').select('size_bytes').limit(10000),
      count('portfolio_projects'), count('portfolio_projects', (q) => (q as unknown as { eq: (a: string, b: string) => unknown }).eq('status', 'published')),
      count('categories'), count('services'), count('design_requests'),
      count('design_requests', (q) => (q as unknown as { in: (a: string, b: string[]) => unknown }).in('status', ['new', 'reviewing'])),
      count('design_requests', (q) => (q as unknown as { eq: (a: string, b: string) => unknown }).eq('status', 'completed')),
      count('clients'), count('testimonials'),
      supabase.from('design_requests').select('id,reference_no,full_name,project_title,status,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('portfolio_projects').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('portfolio_projects').select('id,title,view_count').order('view_count', { ascending: false }).limit(5),
      supabase.from('analytics_events').select('event_type').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()).limit(5000),
    ])
    const events: Record<string, number> = {}; (ev.data ?? []).forEach((e) => { events[e.event_type] = (events[e.event_type] ?? 0) + 1 })
    const sum = (r: { data: { size_bytes: number | null }[] | null }) => (r.data ?? []).reduce((a, x) => a + (x.size_bytes ?? 0), 0)
    const storage = sum(mediaSizes) * 1.08 + sum(reqSizes) // ~8% allowance for generated thumbnails
    return { storage, designs, published, cats, services, requests, pending, completed, clients, testimonials, recentReq: recentReq.data ?? [], recentDes: recentDes.data ?? [], top: top.data ?? [], events }
  }, [])
  if (loading) return <Spinner label="Loading dashboard…" />
  if (error || !data) return <ErrorState message="Unable to load dashboard data." onRetry={reload} />
  const stats = [
    { l: 'Total designs', v: data.designs, i: ImageIcon }, { l: 'Published', v: data.published, i: Eye }, { l: 'Categories', v: data.cats, i: FolderTree }, { l: 'Services', v: data.services, i: Briefcase },
    { l: 'Requests', v: data.requests, i: Inbox }, { l: 'Pending requests', v: data.pending, i: Clock }, { l: 'Completed', v: data.completed, i: CheckCircle2 }, { l: 'Clients', v: data.clients, i: Users }, { l: 'Testimonials', v: data.testimonials, i: Quote },
  ]
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <div className="flex flex-wrap gap-2"><Link to="/admin/portfolio/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Add design</Link><Link to="/admin/services?new=1" className="btn btn-ghost">Add service</Link><Link to="/admin/requests" className="btn btn-ghost">View requests</Link></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{stats.map((s) => <div key={s.l} className="card p-4"><s.i className="h-4 w-4 text-black/40" aria-hidden /><p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.v}</p><p className="text-xs text-black/55">{s.l}</p></div>)}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><div className="mb-3 flex justify-between"><h2 className="font-display font-semibold">Recent requests</h2><Link className="text-sm text-accent" to="/admin/requests">All</Link></div>
          {!data.recentReq.length ? <p className="py-6 text-center text-sm text-black/50">No requests yet.</p> : <ul className="divide-y divide-black/5">{data.recentReq.map((r) => <li key={r.id}><Link to={`/admin/requests/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"><span className="min-w-0"><span className="block truncate font-medium">{r.project_title}</span><span className="text-xs text-black/45">{r.full_name} · {r.reference_no}</span></span><Badge value={r.status} /></Link></li>)}</ul>}</section>
        <section className="card p-5"><div className="mb-3 flex justify-between"><h2 className="font-display font-semibold">Recent designs</h2><Link className="text-sm text-accent" to="/admin/portfolio">All</Link></div>
          {!data.recentDes.length ? <p className="py-6 text-center text-sm text-black/50">No designs yet.</p> : <ul className="divide-y divide-black/5">{data.recentDes.map((r) => <li key={r.id}><Link to={`/admin/portfolio/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"><span className="truncate font-medium">{r.title}</span><span className="flex items-center gap-2"><span className="text-xs text-black/45">{formatDate(r.created_at)}</span><Badge value={r.status} /></span></Link></li>)}</ul>}</section>
        <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Most viewed projects</h2>
          {!data.top.some((t) => t.view_count > 0) ? <p className="py-6 text-center text-sm text-black/50">No views recorded yet.</p> : <ul className="space-y-2 text-sm">{data.top.filter((t) => t.view_count > 0).map((t) => <li key={t.id} className="flex justify-between"><span className="truncate">{t.title}</span><span className="tabular-nums text-black/55">{t.view_count}</span></li>)}</ul>}</section>
        <section className="card p-5"><h2 className="mb-1 font-display font-semibold">File storage (approx.)</h2>
          <p className="mb-3 text-xs text-black/50">Supabase Free includes 1 GB of file storage.</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatBytes(data.storage)} <span className="text-sm font-normal text-black/50">of 1 GB</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={Math.round(Math.min(100, (data.storage / 1073741824) * 100))} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used"><div className={`h-full ${data.storage > 0.8 * 1073741824 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${Math.min(100, (data.storage / 1073741824) * 100)}%` }} /></div></section>
        <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Last 30 days</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">{[['portfolio_view', 'Portfolio views'], ['project_view', 'Project views'], ['service_view', 'Service views'], ['request_submitted', 'Requests submitted']].map(([k, l]) => <div key={k}><dt className="text-black/50">{l}</dt><dd className="font-display text-2xl font-bold tabular-nums">{data.events[k] ?? 0}</dd></div>)}</dl></section>
      </div>
    </div>
  )
}
