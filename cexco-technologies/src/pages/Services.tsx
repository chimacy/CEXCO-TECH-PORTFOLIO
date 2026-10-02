import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Img, Spinner } from '@/components/ui'
import { ProjectCard } from '@/components/ProjectCard'
import { RichText } from '@/components/ui/RichText'
import { formatPrice } from '@/utils/format'
import { isPageDisabled } from '@/utils/pages'

export function ServicesList() {
  useSeo({ title: 'Services', description: 'Design services offered.' })
  const { settings } = useSettings()
  const { data, loading, error, reload } = useAsync(() => api.getServices(), [])
  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">Services</h1>
      <div className="mt-10">
        {loading ? <Spinner label="Loading services…" /> : error ? <ErrorState message="Unable to load services. Please try again." onRetry={reload} /> :
          !data?.length ? <EmptyState title="No services yet" hint="Services will appear here once published." /> :
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <Link key={s.id} to={`/services/${s.slug}`} className="card group overflow-hidden transition hover:border-ink">
                <div className="aspect-[16/10] bg-black/5"><Img src={s.cover_image_url} alt="" seed={s.name} className="transition duration-700 group-hover:scale-105" /></div>
                <div className="p-5"><h2 className="font-display text-xl font-semibold">{s.name}</h2><p className="mt-1 line-clamp-2 text-sm text-black/55">{s.short_description}</p>
                  <p className="mt-4 text-sm font-medium">{formatPrice(s.starting_price, s.price_label, settings?.currency)}</p></div>
              </Link>
            ))}
          </div>}
      </div>
    </div>
  )
}

export function ServiceDetail() {
  const { slug = '' } = useParams()
  const { settings } = useSettings()
  const { data: s, loading, error, reload } = useAsync(() => api.getService(slug), [slug])
  const work = useAsync(async () => (s ? (await api.getProjects({ serviceId: s.id, pageSize: 6 })).data : []), [s?.id])
  const pricing = useAsync(async () => (s ? api.getPricing({ serviceId: s.id }) : []), [s?.id])
  useEffect(() => { if (s) api.trackEvent('service_view', s.id) }, [s?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: s?.name, description: s?.short_description, image: s?.cover_image_url })
  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this service." onRetry={reload} /></div>
  if (!s) return <div className="container-x py-24"><EmptyState title="Service not found" action={<Link to="/services" className="btn btn-primary">All services</Link>} /></div>
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Service</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-6xl">{s.name}</h1>
          <p className="mt-4 text-xl">{formatPrice(s.starting_price, s.price_label, settings?.currency)}</p>
          {s.short_description && <p className="mt-4 max-w-lg text-black/65">{s.short_description}</p>}
          <Link to={`/request?service=${s.id}`} className="btn btn-primary mt-8 !px-6 !py-3">Request {s.name}</Link></div>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-black/5"><Img src={s.cover_image_url} alt={s.name} seed={s.name} eager width={1200} /></div>
      </div>
      {s.description && <div className="mt-12 max-w-3xl">{/<[a-z][\s\S]*>/i.test(s.description) ? <RichText html={s.description} /> : <p className="whitespace-pre-line leading-relaxed text-black/70">{s.description}</p>}</div>}
     {!isPageDisabled(settings?.disabled_pages, 'pricing') && !!pricing.data?.length && <section className="mt-16"> {!!pricing.data?.length && <section className="mt-16"><h2 className="mb-5 font-display text-2xl font-bold">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">{pricing.data.map((p) => <div key={p.id} className="card p-6"><h3 className="font-semibold">{p.title}</h3><p className="mt-2 font-display text-2xl font-bold">{formatPrice(p.price, p.price_label, p.currency)}</p>
          <ul className="mt-3 space-y-1 text-sm text-black/60">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul></div>)}</div></section>}
      {!!work.data?.length && <section className="mt-16"><h2 className="mb-6 font-display text-2xl font-bold">Related work</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{work.data.map((p) => <ProjectCard key={p.id} p={p} />)}</div></section>}
    </div>
  )
}
