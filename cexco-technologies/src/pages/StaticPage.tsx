import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Spinner } from '@/components/ui'
import { RichText } from '@/components/ui/RichText'

export default function StaticPage({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useAsync(() => api.getPage(slug), [slug])
  useSeo({ title: data?.seo_title ?? data?.title, description: data?.seo_description ?? data?.intro })
  if (loading) return <Spinner className="min-h-[60vh]" />
  if (error) return <div className="container-x py-20"><ErrorState message="Unable to load this page." onRetry={reload} /></div>
  if (!data) return <div className="container-x py-20"><EmptyState title="Page not available" /></div>
  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{data.heading ?? data.title}</h1>
      {data.intro && <p className="mt-4 text-lg text-black/65">{data.intro}</p>}
      <div className="mt-8"><RichText html={data.body} /></div>
    </div>
  )
}
