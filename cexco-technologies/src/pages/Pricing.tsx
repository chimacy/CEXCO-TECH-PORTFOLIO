import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { EmptyState, ErrorState, Spinner } from '@/components/ui'
import { formatPrice } from '@/utils/format'

export default function Pricing() {
  useSeo({ title: 'Pricing', description: 'Transparent starting prices for design services.' })
  const { settings } = useSettings()
  const { data, loading, error, reload } = useAsync(() => api.getPricing(), [])
  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">Pricing</h1>
      <p className="mt-3 max-w-xl text-black/60">Starting prices for our services. Final quotes depend on scope and timeline.</p>
      <div className="mt-10">
        {loading ? <Spinner label="Loading pricing…" /> : error ? <ErrorState message="Unable to load pricing. Please try again." onRetry={reload} /> :
          !data?.length ? <EmptyState title="No pricing published yet" hint="Contact us for a custom quote." action={<Link to="/request" className="btn btn-primary">Request a quote</Link>} /> :
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <div key={p.id} className={`card flex flex-col p-7 ${p.featured ? 'border-2 border-ink' : ''}`}>
                {p.featured && <span className="mb-3 w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">Popular</span>}
                <h2 className="font-display text-xl font-semibold">{p.title}</h2>
                {p.service && <p className="text-xs text-black/45">{p.service.name}</p>}
                <p className="mt-4 font-display text-4xl font-bold">{formatPrice(p.price, p.price_label, p.currency || settings?.currency)}</p>
                {p.description && <p className="mt-2 text-sm text-black/55">{p.description}</p>}
                <ul className="mt-5 flex-1 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{f}</li>)}</ul>
                <Link to={`/request${p.service_id ? `?service=${p.service_id}` : ''}`} className={`btn mt-6 ${p.featured ? 'btn-primary' : 'btn-ghost'}`}>Request this</Link>
              </div>
            ))}
          </div>}
      </div>
    </div>
  )
}
