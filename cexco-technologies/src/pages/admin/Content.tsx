import { useAsync } from '@/hooks/useAsync'
import { listRows } from '@/services/admin'
import { Img, Spinner } from '@/components/ui'
import { ResourceManager } from '@/components/admin/ResourceManager'
import { useSettings } from '@/lib/settings'
import { formatPrice } from '@/utils/format'

const thumb = (url: unknown, name: unknown) => <span className="block h-10 w-10 overflow-hidden rounded-lg bg-black/5"><Img src={url as string | null} alt="" seed={String(name)} width={100} /></span>
const opts = (rows: { id: string }[] | null, label: string) => (rows ?? []).map((r) => ({ value: r.id, label: String((r as Record<string, unknown>)[label]) }))

export function CategoriesAdmin() {
  return <ResourceManager table="categories" singular="Category" plural="Categories" reorder duplicate searchKeys={['name', 'slug']}
    publishKey={{ key: 'is_published', kind: 'bool' }} defaults={{ is_published: true, sort_order: 0 }}
    columns={[{ label: 'Image', render: (r) => thumb(r.image_url, r.name) }, { label: 'Name', render: (r) => <span className="font-medium">{String(r.name)}</span> }, { label: 'Slug', render: (r) => <span className="text-black/50">{String(r.slug)}</span> }]}
    fields={[{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'slug', label: 'Slug', type: 'slug', from: 'name' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'image_url', label: 'Category image', type: 'image' }, { key: 'is_published', label: 'Published', type: 'switch' }]} />
}

export function ServicesAdmin() {
  const cats = useAsync(() => listRows('categories', { order: 'sort_order', asc: true }), [])
  const { settings } = useSettings()
  if (cats.loading) return <Spinner />
  return <ResourceManager table="services" singular="Service" plural="Services" reorder duplicate searchKeys={['name', 'slug', 'short_description']}
    publishKey={{ key: 'status', kind: 'status' }} defaults={{ status: 'draft', featured: false, sort_order: 0 }}
    columns={[{ label: 'Image', render: (r) => thumb(r.cover_image_url, r.name) }, { label: 'Name', render: (r) => <span className="font-medium">{String(r.name)}{r.is_sample ? <span className="ml-2 text-xs text-black/40">sample</span> : null}</span> },
      { label: 'Price', render: (r) => formatPrice(r.starting_price as number | null, r.price_label as string | null, settings?.currency) }, { label: 'Featured', render: (r) => (r.featured ? 'Yes' : '—') }]}
    fields={[{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'slug', label: 'Slug', type: 'slug', from: 'name' },
      { key: 'short_description', label: 'Short description', type: 'text', full: true }, { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'starting_price', label: 'Starting price', type: 'number', hint: 'Leave empty for "Contact for pricing".' }, { key: 'price_label', label: 'Price label', type: 'text', hint: 'e.g. Starting from' },
      { key: 'category_id', label: 'Category', type: 'select', options: opts(cats.data, 'name') }, { key: 'status', label: 'Status', type: 'select', empty: 'Draft', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }] },
      { key: 'cover_image_url', label: 'Cover image', type: 'image' }, { key: 'featured', label: 'Featured', type: 'switch' }]} />
}

export function PricingAdmin() {
  const svcs = useAsync(() => listRows('services', { order: 'sort_order', asc: true }), [])
  const { settings } = useSettings()
  if (svcs.loading) return <Spinner />
  const name = (id: unknown) => svcs.data?.find((s) => s.id === id)?.name as string | undefined
  return <ResourceManager table="pricing_items" singular="Pricing item" plural="Pricing" reorder duplicate searchKeys={['title', 'description']}
    publishKey={{ key: 'is_published', kind: 'bool' }} defaults={{ is_published: true, featured: false, currency: settings?.currency ?? '₦', features: [] }}
    columns={[{ label: 'Title', render: (r) => <span className="font-medium">{String(r.title)}</span> }, { label: 'Service', render: (r) => name(r.service_id) ?? '—' },
      { label: 'Price', render: (r) => formatPrice(r.price as number | null, r.price_label as string | null, String(r.currency)) }, { label: 'Featured', render: (r) => (r.featured ? 'Yes' : '—') }]}
    fields={[{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'service_id', label: 'Service', type: 'select', options: opts(svcs.data, 'name') },
      { key: 'description', label: 'Description', type: 'textarea' }, { key: 'price', label: 'Price', type: 'number', hint: 'Leave empty for "Contact for pricing".' },
      { key: 'currency', label: 'Currency', type: 'text' }, { key: 'price_label', label: 'Price label', type: 'text', hint: 'e.g. Starting from' },
      { key: 'features', label: 'Features', type: 'lines' }, { key: 'featured', label: 'Featured', type: 'switch' }, { key: 'is_published', label: 'Published', type: 'switch' }]} />
}

export function TestimonialsAdmin() {
  const projects = useAsync(() => listRows('portfolio_projects', { order: 'title', asc: true }), [])
  if (projects.loading) return <Spinner />
  return <ResourceManager table="testimonials" singular="Testimonial" plural="Testimonials" reorder searchKeys={['client_name', 'quote', 'role_company']}
    publishKey={{ key: 'is_published', kind: 'bool' }} defaults={{ is_published: true, featured: false }}
    columns={[{ label: 'Photo', render: (r) => thumb(r.photo_url, r.client_name) }, { label: 'Client', render: (r) => <span className="font-medium">{String(r.client_name)}<span className="block text-xs font-normal text-black/45">{String(r.role_company ?? '')}</span></span> }, { label: 'Quote', render: (r) => <span className="line-clamp-2 max-w-xs text-black/60">{String(r.quote)}</span> }]}
    fields={[{ key: 'client_name', label: 'Client name', type: 'text', required: true }, { key: 'role_company', label: 'Role / company', type: 'text' },
      { key: 'quote', label: 'Testimonial', type: 'textarea', required: true }, { key: 'project_id', label: 'Project', type: 'select', options: opts(projects.data, 'title') },
      { key: 'photo_url', label: 'Photo', type: 'image' }, { key: 'featured', label: 'Featured', type: 'switch' }, { key: 'is_published', label: 'Published', type: 'switch' }]} />
}

export function ExtrasAdmin() {
  return (
    <div className="space-y-14">
      <ResourceManager table="stats" singular="Statistic" plural="Statistics" reorder searchKeys={['value', 'label']} publishKey={{ key: 'is_published', kind: 'bool' }} order={{ col: 'sort_order', asc: true }}
        defaults={{ is_published: true }} columns={[{ label: 'Value', render: (r) => <b>{String(r.value)}</b> }, { label: 'Label', render: (r) => String(r.label) }]}
        fields={[{ key: 'value', label: 'Value', type: 'text', required: true, hint: 'e.g. 100+' }, { key: 'label', label: 'Label', type: 'text', required: true }, { key: 'is_published', label: 'Published', type: 'switch' }]} />
      <ResourceManager table="process_steps" singular="Process step" plural="Process steps" reorder searchKeys={['title', 'description']} publishKey={{ key: 'is_published', kind: 'bool' }}
        defaults={{ is_published: true }} columns={[{ label: 'No.', render: (r) => String(r.step_number ?? '') }, { label: 'Title', render: (r) => <span className="font-medium">{String(r.title)}</span> }]}
        fields={[{ key: 'step_number', label: 'Step number', type: 'text', hint: 'e.g. 01' }, { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'is_published', label: 'Published', type: 'switch' }]} />
    </div>
  )
}
