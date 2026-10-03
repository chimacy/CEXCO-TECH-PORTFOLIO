import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { ErrorState, Img, Spinner } from '@/components/ui'

export default function About() {
  const { settings } = useSettings()
  const { data: p, loading, error, reload } = useAsync(() => api.getPage('about'), [])
  useSeo({ title: p?.seo_title ?? 'About', description: p?.seo_description ?? p?.intro ?? settings?.about_description, path: '/about' })
  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this page." onRetry={reload} /></div>

  const intro = p?.intro ?? settings?.about_description
  const paragraphs = (p?.body ?? '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
  return (
    <div className="container-x pt-10 sm:pt-16 lg:pt-20">
      <p className="eyebrow">About</p>
      <h1 className="mt-4 max-w-5xl animate-fadeUp font-display text-[clamp(2rem,8.6vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[clamp(2.75rem,6vw,5.25rem)]">{p?.heading ?? settings?.brand_name}</h1>

      <div className="mt-12 grid gap-10 sm:mt-16 lg:mt-24 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          {intro && <p className="font-display text-xl font-medium leading-snug tracking-[-0.01em] sm:text-3xl">{intro}</p>}
          {paragraphs.length > 0 && <div className="mt-8 space-y-5 text-[15px] leading-[1.8] text-black/65 sm:text-base">{paragraphs.map((t, i) => <p key={i}>{t}</p>)}</div>}
          {!!p?.values_list?.length && (
            <ul className="mt-10 divide-y divide-black/10 border-y border-black/10">
              {p.values_list.map((v) => <li key={v} className="py-4 font-display text-lg tracking-tight sm:text-xl">{v}</li>)}
            </ul>
          )}
        </div>
        {p?.image_url && <div className="lg:col-span-4 lg:col-start-9"><div className="aspect-[4/5] overflow-hidden bg-neutral-100"><Img src={p.image_url} alt="" width={900} sizes="(min-width:1024px) 30vw, 100vw" /></div></div>}
      </div>
    </div>
  )
}
