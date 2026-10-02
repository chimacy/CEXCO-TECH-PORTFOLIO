import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { ErrorState, Img, Spinner } from '@/components/ui'
import { RichText } from '@/components/ui/RichText'

export default function About() {
  const { settings } = useSettings()
  const page = useAsync(() => api.getPage('about'), [])
  const stats = useAsync(api.getStats, [])
  const steps = useAsync(api.getProcessSteps, [])
  useSeo({ title: page.data?.seo_title ?? 'About', description: page.data?.seo_description ?? page.data?.intro })
  if (page.loading) return <Spinner className="min-h-[60vh]" />
  if (page.error) return <div className="container-x py-20"><ErrorState message="Unable to load this page." onRetry={page.reload} /></div>
  const p = page.data
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{p?.heading ?? `About ${settings?.brand_name ?? ''}`}</h1>
          {p?.intro && <p className="mt-5 text-xl text-black/65">{p.intro}</p>}</div>
        {p?.image_url && <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-black/5"><Img src={p.image_url} alt="" seed="about" eager width={1200} /></div>}
      </div>
      {!!stats.data?.length && <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3">{stats.data.map((s) => <div key={s.id} className="card p-6"><p className="font-display text-4xl font-bold">{s.value}</p><p className="mt-1 text-sm text-black/55">{s.label}</p></div>)}</div>}
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <div>{(p?.body || settings?.about_description) && <RichText html={p?.body ?? `<p>${settings?.about_description ?? ''}</p>`} />}</div>
        <div className="space-y-8">
          {p?.mission && <div><h2 className="font-display text-xl font-semibold">Mission</h2><p className="mt-2 text-black/65">{p.mission}</p></div>}
          {p?.vision && <div><h2 className="font-display text-xl font-semibold">Vision</h2><p className="mt-2 text-black/65">{p.vision}</p></div>}
          {!!p?.values_list?.length && <div><h2 className="font-display text-xl font-semibold">Values</h2><ul className="mt-3 flex flex-wrap gap-2">{p.values_list.map((v) => <li key={v} className="rounded-full border border-black/15 px-3.5 py-1.5 text-sm">{v}</li>)}</ul></div>}
        </div>
      </div>
      {!!steps.data?.length && <section className="mt-16"><h2 className="mb-6 font-display text-3xl font-bold">How we work</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{steps.data.map((s, i) => <li key={s.id} className="border-t border-black/15 pt-4"><p className="font-display text-sm text-accent">{s.step_number ?? String(i + 1).padStart(2, '0')}</p><h3 className="mt-1 font-semibold">{s.title}</h3><p className="mt-1 text-sm text-black/55">{s.description}</p></li>)}</ol></section>}
    </div>
  )
}
