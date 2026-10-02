export type ContentStatus = 'draft' | 'published' | 'archived'
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN'
export type RequestStatus = 'new' | 'reviewing' | 'quoted' | 'approved' | 'in_progress' | 'revision' | 'completed' | 'cancelled'
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface SiteSettings {
  id: 1
  brand_name: string
  logo_url: string | null
  favicon_url: string | null
  tagline: string | null
  short_description: string | null
  about_description: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  business_hours: string | null
  social_links: Record<string, string>
  currency: string
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  footer_text: string | null
  copyright_text: string | null
  maintenance_mode: boolean
  default_layout: 'masonry' | 'grid'
  items_per_page: number
  default_contact_message: string | null
}

  disabled_pages: string[]

export interface Category {
  id: string; name: string; slug: string; description: string | null; image_url: string | null
  is_published: boolean; sort_order: number; created_at: string; updated_at: string
}
export interface Service {
  id: string; name: string; slug: string; short_description: string | null; description: string | null
  starting_price: number | null; price_label: string | null; cover_image_url: string | null
  category_id: string | null; featured: boolean; status: ContentStatus; sort_order: number; is_sample: boolean
  created_at: string; updated_at: string
}
export interface PricingItem {
  id: string; service_id: string | null; title: string; description: string | null
  price: number | null; currency: string; price_label: string | null; features: string[]
  featured: boolean; is_published: boolean; sort_order: number; created_at: string; updated_at: string
}
export interface PortfolioImage { id: string; project_id: string; image_url: string; alt_text: string | null; sort_order: number }
export interface PortfolioProject {
  id: string; title: string; slug: string; short_description: string | null; description: string | null
  category_id: string | null; service_id: string | null; client_name: string | null; client_type: string | null
  price: number | null; price_label: string | null; cover_image_url: string | null
  featured: boolean; status: ContentStatus; sort_order: number; view_count: number; is_sample: boolean
  created_at: string; updated_at: string
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null
  service?: Pick<Service, 'id' | 'name' | 'slug'> | null
  images?: PortfolioImage[]
}
export interface Testimonial {
  id: string; client_name: string; role_company: string | null; photo_url: string | null; quote: string
  project_id: string | null; is_published: boolean; featured: boolean; sort_order: number; is_sample: boolean
}
export interface HomepageSection {
  id: string; key: string; title: string | null; subtitle: string | null; description: string | null
  cta_text: string | null; cta_link: string | null; is_visible: boolean; sort_order: number
  config: Record<string, unknown>
}
export interface PageContent {
  id: string; slug: string; title: string; heading: string | null; intro: string | null; body: string | null
  mission: string | null; vision: string | null; values_list: string[]; image_url: string | null
  seo_title: string | null; seo_description: string | null
}
export interface Stat { id: string; value: string; label: string; sort_order: number; is_published: boolean }
export interface ProcessStep { id: string; step_number: string | null; title: string; description: string | null; sort_order: number; is_published: boolean }
export interface Client {
  id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null; company: string | null
  notes: string | null; request_count: number; completed_count: number; last_request_at: string | null; created_at: string
}
export interface DesignRequest {
  id: string; reference_no: string; client_id: string | null; full_name: string; email: string
  whatsapp: string | null; phone: string | null; company: string | null
  service_id: string | null; category_id: string | null; project_title: string; description: string
  preferred_size: string | null; deadline: string | null; budget: string | null
  reference_links: string | null; additional_notes: string | null
  status: RequestStatus; priority: RequestPriority; quoted_price: number | null; final_price: number | null
  client_note: string | null; archived: boolean; created_at: string; updated_at: string
  service?: Pick<Service, 'id' | 'name'> | null
}
export interface RequestFile { id: string; request_id: string; storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string }
export interface RequestNote { id: string; request_id: string; author_email: string | null; note: string; created_at: string }
export interface ContactMessage { id: string; name: string; email: string; phone: string | null; subject: string | null; message: string; is_read: boolean; created_at: string }
export interface MediaItem { id: string; bucket: string; storage_path: string; url: string; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string }
