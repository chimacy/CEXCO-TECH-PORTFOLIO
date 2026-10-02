import { useEffect } from 'react'
import { useSettings } from '@/lib/settings'

interface Seo { title?: string | null; description?: string | null; image?: string | null; path?: string; type?: 'website' | 'article'; noindex?: boolean }

function setMeta(attr: 'name' | 'property', key: string, content: string | null | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

export function useSeo({ title, description, image, path, type = 'website', noindex }: Seo) {
  const { settings } = useSettings()
  useEffect(() => {
    const brand = settings?.brand_name ?? ''
    const fullTitle = title ? (brand ? `${title} | ${brand}` : title) : settings?.seo_title ?? brand
    const desc = description ?? settings?.seo_description ?? settings?.short_description ?? ''
    const img = image ?? settings?.og_image_url ?? settings?.logo_url ?? null
    const url = `${window.location.origin}${path ?? window.location.pathname}`
    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : null)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:site_name', brand)
    setMeta('property', 'og:image', img)
    setMeta('name', 'twitter:card', img ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', img)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = url
  }, [title, description, image, path, type, noindex, settings])
}
