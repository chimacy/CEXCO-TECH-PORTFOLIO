import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Img, Spinner } from '@/components/ui'
import { ProjectCard } from '@/components/ProjectCard'
import { formatPrice, whatsappLink } from '@/utils/format'
import { isSectionDisabled } from '@/utils/pages'
import type { HomepageSection } from '@/types'

const cfg = (s: HomepageSection) => ({
  limit: typeof s.config.limit === 'number' ? s.config.limit : 6,
  ids: Array.isArray(s.config.item_ids) ? (s.config.item_ids as string[]) : [],
  str: (k: string) => (typeof s.config[k] === 'string' && s.config[k] ? (s.config[k] as string) : null),
})

function Head({ s, center }: { s: HomepageSection; center?: boolean }) {
  return (
    <div className={`mb-10 flex flex-col gap-4 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className="max-w-2xl">
        {s.subtitle && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{s.subtitle}</p>}
        {s.title && <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{s.title}</h2>}
        {s.description && <p className="mt-3 text-black/60">{s.description}</p>}
      </div>
      {s.cta_text && s.cta_link && <Link to={s.cta_link} className="btn btn-ghost shrink-0">{s.cta_text} <ArrowRight className="h-4 w-4" /></Link>}
    </div>
  )
}

function Hero({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const feat = useAsync(async () => {
    const id = c.str('featured_project_id')
    if (!id || c.str('hero_image_url')) return null
    return (await api.getProjects({ ids: [id], pageSize: 1 })).data[0] ?? null
  }, [s.config])
  const img = c.str('hero_image_url') ?? feat.data?.cover_image_url ?? null
  return (
    <section className="container-x grid items-center gap-10 pb-10 pt-12 sm:pt-20 lg:grid-cols-12">
      <div className="animate-fadeUp lg:col-span-7">
        {c.str('badge') && <span className="inline-block rounded-full border border-black/15 px-3 py-1 text-xs font-medium uppercase tracking-wider">{c.str('badge')}</span>}
        <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-7xl">{s.title}</h1>
        {s.description && <p className="mt-6 max-w-xl text-lg text-black/60">{s.description}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          {s.cta_text && s.cta_link && <Link to={s.cta_link} className="btn btn-primary !px-6 !py-3">{s.cta_text}</Link>}
          {c.str('secondary_cta_text') && c.str('secondary_cta_link') && <Link to={c.str('secondary_cta_link')!} className="btn btn-ghost !px-6 !py-3">{c.str('secondary_cta_text')}</Link>}
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-black/5"><Img src={img} alt={feat.data?.title ?? ''} seed="hero" eager width={1000} sizes="(min-width:1024px) 40vw, 100vw" /></div>
      </div>
    </section>
  )
}

function FeaturedWork({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const { data, loading, error, reload } = useAsync(() => api.getProjects(c.ids.length ? { ids: c.ids, pageSize: c.limit } : { featured: true, pageSize: c.limit }), [s.config])
  return (
    <section className="container-x py-16">
      <Head s={s} />
      {loading ? <Spinner label="Loading projects…" /> : error ? <ErrorState message="Unable to load projects. Please try again." onRetry={reload} /> :
        !data?.data.length ? <EmptyState title="No featured projects yet" hint="Featured projects will appear here once published." /> :
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{data.data.map((p) => <ProjectCard key={p.id} p={p} />)}</div>}
    </section>
  )
}

function Services({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const { data, loading, error, reload } = useAsync(() => api.getServices({ limit: c.limit, ids: c.ids }), [s.config])
  const { settings } = useSettings()
  if (!loading && !error && !data?.length) return null
  return (
    <section className="bg-white py-16"><div className="container-x">
      <Head s={s} />
      {loading ? <Spinner /> : error ? <ErrorState message="Unable to load services." onRetry={reload} /> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((sv) => (
            <Link key={sv.id} to={`/services/${sv.slug}`} className="card group p-6 transition hover:border-ink">
              <h3 className="font-display text-xl font-semibold">{sv.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-black/55">{sv.short_description}</p>
              <p className="mt-5 flex items-center justify-between text-sm"><span className="font-medium">{formatPrice(sv.starting_price, sv.price_label, settings?.currency)}</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>}
    </div></section>
  )
}

function Categories({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const { data, loading, error } = useAsync(async () => { const all = await api.getCategories(); return (c.ids.length ? all.filter((x) => c.ids.includes(x.id)) : all).slice(0, c.limit) }, [s.config])
  if (loading || error || !data?.length) return null
  return (
    <section className="container-x py-16">
      <Head s={s} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.map((cat) => (
          <Link key={cat.id} to={`/categories/${cat.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
            <Img src={cat.image_url} alt="" seed={cat.name} className="transition duration-700 group-hover:scale-105" width={500} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 font-display text-sm font-semibold text-white sm:text-base">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function AboutPreview({ s }: { s: HomepageSection }) {
  const { settings } = useSettings()
  const stats = useAsync(api.getStats, [])
  const text = s.description ?? settings?.about_description
  return (
    <section className="container-x py-16"><div className="grid gap-10 lg:grid-cols-2">
      <div><Head s={{ ...s, description: null, cta_text: null }} />{text && <p className="max-w-xl text-lg text-black/65">{text}</p>}
        {s.cta_text && s.cta_link && <Link to={s.cta_link} className="btn btn-primary mt-6">{s.cta_text}</Link>}</div>
      <div className="grid grid-cols-3 gap-4 self-center">
        {stats.data?.map((st) => <div key={st.id} className="card p-5"><p className="font-display text-3xl font-bold sm:text-4xl">{st.value}</p><p className="mt-1 text-xs text-black/55 sm:text-sm">{st.label}</p></div>)}
      </div>
    </div></section>
  )
}

function Process({ s }: { s: HomepageSection }) {
  const { data, loading } = useAsync(api.getProcessSteps, [])
  if (loading || !data?.length) return null
  return (
    <section className="bg-ink py-16 text-white"><div className="container-x">
      <div className="mb-10 max-w-2xl">{s.subtitle && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{s.subtitle}</p>}<h2 className="font-display text-3xl font-bold sm:text-5xl">{s.title}</h2>{s.description && <p className="mt-3 text-white/60">{s.description}</p>}</div>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((st, i) => <li key={st.id} className="border-t border-white/20 pt-4"><p className="font-display text-sm text-accent">{st.step_number ?? String(i + 1).padStart(2, '0')}</p><h3 className="mt-2 font-display text-xl font-semibold">{st.title}</h3><p className="mt-2 text-sm text-white/60">{st.description}</p></li>)}
      </ol>
    </div></section>
  )
}

function Testimonials({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const { data, loading } = useAsync(async () => { const all = await api.getTestimonials(); return (c.ids.length ? all.filter((t) => c.ids.includes(t.id)) : all).slice(0, c.limit) }, [s.config])
  if (loading || !data?.length) return null
  return (
    <section className="container-x py-16"><Head s={s} />
      <div className="grid gap-4 md:grid-cols-3">
        {data.map((t) => (
          <figure key={t.id} className="card flex flex-col p-6">
            <blockquote className="flex-1 text-black/75">“{t.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3 text-sm">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/5"><Img src={t.photo_url} alt="" seed={t.client_name} width={100} /></span>
              <span><span className="block font-semibold">{t.client_name}</span><span className="text-black/50">{t.role_company}</span></span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function PricingPreview({ s }: { s: HomepageSection }) {
  const c = cfg(s)
  const { settings } = useSettings()
  const { data, loading } = useAsync(async () => { const all = await api.getPricing(); return (c.ids.length ? all.filter((t) => c.ids.includes(t.id)) : all.filter((p) => p.featured).concat(all.filter((p) => !p.featured))).slice(0, c.limit) }, [s.config])
  if (loading || !data?.length) return null
  return (
    <section className="bg-white py-16"><div className="container-x"><Head s={s} />
      <div className="grid gap-4 md:grid-cols-3">
        {data.map((p) => (
          <div key={p.id} className={`card p-6 ${p.featured ? 'border-ink' : ''}`}>
            <h3 className="font-display text-lg font-semibold">{p.title}</h3>
            <p className="mt-3 font-display text-3xl font-bold">{formatPrice(p.price, p.price_label, p.currency || settings?.currency)}</p>
            <p className="mt-2 text-sm text-black/55">{p.description}</p>
          </div>
        ))}
      </div>
    </div></section>
  )
}

function Cta({ s }: { s: HomepageSection }) {
  return (
    <section className="container-x py-16"><div className="rounded-3xl bg-accent px-6 py-14 text-center text-white sm:py-20">
      <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-5xl">{s.title}</h2>
      {s.description && <p className="mx-auto mt-4 max-w-xl text-white/85">{s.description}</p>}
      {s.cta_text && s.cta_link && <Link to={s.cta_link} className="btn mt-8 bg-white !px-7 !py-3 text-ink hover:bg-ink hover:text-white">{s.cta_text}</Link>}
    </div></section>
  )
}

function ContactStrip({ s }: { s: HomepageSection }) {
  const { settings } = useSettings()
  const wa = whatsappLink(settings?.whatsapp, settings?.default_contact_message ?? undefined)
  return (
    <section className="container-x py-16"><Head s={{ ...s, cta_text: null }} />
      <div className="flex flex-wrap gap-3">
        {settings?.email && <a className="btn btn-ghost" href={`mailto:${settings.email}`}>{settings.email}</a>}
        {settings?.phone && <a className="btn btn-ghost" href={`tel:${settings.phone}`}>{settings.phone}</a>}
        {wa && <a className="btn btn-accent" href={wa} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
        {s.cta_text && s.cta_link && <Link className="btn btn-primary" to={s.cta_link}>{s.cta_text}</Link>}
      </div>
    </section>
  )
}

const RENDERERS: Record<string, (p: { s: HomepageSection }) => JSX.Element | null> = {
  hero: Hero, featured_work: FeaturedWork, services: Services, categories: Categories, about: AboutPreview,
  process: Process, testimonials: Testimonials, pricing: PricingPreview, cta: Cta, contact: ContactStrip,
}

export default function Home() {
  useSeo({})
  const { settings } = useSettings()
  const { data, loading, error, reload } = useAsync(api.getSections, [])
  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load the page. Please try again." onRetry={reload} /></div>
  const visible = (data ?? []).filter((s) => s.is_visible && !isSectionDisabled(settings?.disabled_pages, s.key))
  if (!visible.length) return <div className="container-x py-20"><EmptyState title="Nothing to show yet" hint="Homepage sections can be configured in the admin panel." /></div>
  return <>{visible.map((s) => { const R = RENDERERS[s.key]; return R ? <R key={s.id} s={s} /> : null })}</>
}
