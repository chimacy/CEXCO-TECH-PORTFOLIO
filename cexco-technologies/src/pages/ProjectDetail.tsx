import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { supabase } from '@/lib/supabase'
import { EmptyState, ErrorState, Img, Spinner } from '@/components/ui'
import { ProjectCard } from '@/components/ProjectCard'
import { ShareButtons } from '@/components/ui/Share'
import { RichText } from '@/components/ui/RichText'
import { formatPrice, whatsappLink } from '@/utils/format'
import type { PortfolioProject } from '@/types'

export default function ProjectDetail({ preview }: { preview?: boolean }) {
  const { slug = '' } = useParams()
  const [sp] = useSearchParams()
  const { settings } = useSettings()
  const [active, setActive] = useState(0)
  const { data: p, loading, error, reload } = useAsync<PortfolioProject | null>(async () => {
    if (preview) { // admin-only: RLS lets authenticated admins read drafts
      const res = await supabase.from('portfolio_projects').select('*, category:categories(id,name,slug), service:services(id,name,slug), images:portfolio_images(*)').eq('slug', slug).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      const d = res.data as PortfolioProject | null
      d?.images?.sort((a, b) => a.sort_order - b.sort_order)
      return d
    }
    return api.getProject(slug)
  }, [slug, preview])
  const related = useAsync(async () => (p ? api.getRelatedProjects(p) : []), [p?.id])

  useEffect(() => { if (p && !preview) api.trackEvent('project_view', p.id) }, [p?.id, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: p?.title, description: p?.short_description ?? p?.description?.slice(0, 160), image: p?.cover_image_url, type: 'article', path: `/portfolio/${slug}`, noindex: preview })

  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this project." onRetry={reload} /></div>
  if (!p) return <div className="container-x py-24"><EmptyState title="Project not found" action={<Link to="/portfolio" className="btn btn-primary">Back to portfolio</Link>} /></div>

  const gallery = [p.cover_image_url, ...(p.images ?? []).map((i) => i.image_url)].filter(Boolean) as string[]
  const wa = whatsappLink(settings?.whatsapp, `Hello, I'm interested in a design like "${p.title}".`)
  const url = `${window.location.origin}/portfolio/${p.slug}`
  const reqParams = new URLSearchParams({ project: p.title, ...(p.service_id ? { service: p.service_id } : {}) })

  return (
    <div className="container-x py-10 sm:py-14">
      {preview && <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">Preview — status: <b>{p.status}</b>. {sp.get('from') && <Link className="underline" to={sp.get('from')!}>Back to editor</Link>}</div>}
      <Link to="/portfolio" className="mb-6 inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Portfolio</Link>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-3xl bg-black/5"><Img src={gallery[active]} alt={p.title} seed={p.title} eager width={1400} sizes="(min-width:1024px) 66vw, 100vw" className="!h-auto max-h-[80vh] !object-contain" /></div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6" role="tablist" aria-label="Gallery">
              {gallery.map((g, i) => (
                <button key={g + i} role="tab" aria-selected={i === active} onClick={() => setActive(i)} className={`aspect-square overflow-hidden rounded-xl ring-2 ${i === active ? 'ring-ink' : 'ring-transparent'}`}>
                  <Img src={g} alt={`${p.title} — view ${i + 1}`} width={200} />
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            {p.category && <Link to={`/categories/${p.category.slug}`} className="text-xs font-semibold uppercase tracking-widest text-accent">{p.category.name}</Link>}
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{p.title}</h1>
            {(p.price != null || p.price_label) && <p className="mt-3 text-xl">{formatPrice(p.price, p.price_label, settings?.currency)}</p>}
            {p.short_description && <p className="mt-4 text-black/65">{p.short_description}</p>}
            <dl className="mt-6 divide-y divide-black/10 border-y border-black/10 text-sm">
              {p.service && <div className="flex justify-between py-3"><dt className="text-black/50">Service</dt><dd><Link to={`/services/${p.service.slug}`} className="hover:text-accent">{p.service.name}</Link></dd></div>}
              {p.client_name && <div className="flex justify-between py-3"><dt className="text-black/50">Client</dt><dd>{p.client_name}</dd></div>}
              {p.client_type && <div className="flex justify-between py-3"><dt className="text-black/50">Client type</dt><dd>{p.client_type}</dd></div>}
            </dl>
            <div className="mt-6 flex flex-col gap-3">
              <Link to={`/request?${reqParams}`} className="btn btn-primary !py-3">Request this service</Link>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-3"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>}
              <ShareButtons title={p.title} url={url} />
            </div>
          </div>
        </aside>
      </div>
      {p.description && <div className="mt-12 max-w-3xl">{/<[a-z][\s\S]*>/i.test(p.description) ? <RichText html={p.description} /> : <p className="whitespace-pre-line leading-relaxed text-black/70">{p.description}</p>}</div>}
      {!!related.data?.length && (
        <section className="mt-20"><h2 className="mb-6 font-display text-2xl font-bold">More like this</h2>
          <div className="grid gap-6 sm:grid-cols-3">{related.data.map((r) => <ProjectCard key={r.id} p={r} />)}</div></section>
      )}
    </div>
  )
}
