// Link previews (WhatsApp, Facebook, X, Telegram, LinkedIn, Google…).
// These crawlers do not run JavaScript, so vercel.json sends only THEM to this function, which returns the normal page
// with the right title, description and image in <head>. Normal visitors still get the fast static site.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t }

export default async function handler(req, res) {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const origin = `https://${host}`
  const path = typeof req.query.path === 'string' && req.query.path.startsWith('/') ? req.query.path : '/'

  const get = async (q) => {
    if (!base || !key) return []
    try {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      return r.ok ? await r.json() : []
    } catch { return [] }
  }

  const [s] = await get('site_settings?select=brand_name,tagline,short_description,seo_title,seo_description,og_image_url,logo_url&id=eq.1&limit=1')
  const brand = s?.brand_name || 'Portfolio'
  let title = s?.seo_title || brand
  let desc = s?.seo_description || s?.short_description || s?.tagline || ''
  let image = s?.og_image_url || s?.logo_url || ''
  let fit = 'cover'
  let url = `${origin}${path === '/' ? '/' : path}`
  let type = 'website'

  const m = /^\/(?:work|portfolio)\/([^/?#]+)/.exec(path)
  if (m) {
    const slug = encodeURIComponent(decodeURIComponent(m[1]))
    const [p] = await get(`portfolio_projects?select=title,short_description,description,cover_image_url&slug=eq.${slug}&status=eq.published&limit=1`)
    if (p) {
      title = `${p.title} | ${brand}`
      desc = p.short_description || clip(p.description, 160) || desc
      image = p.cover_image_url || image
      fit = 'contain' // show the whole design, not a cropped slice of it
      url = `${origin}/work/${m[1]}`
      type = 'article'
    }
  }
  desc = clip(desc, 200)
  const ogImage = image ? `${origin}/api/og-image?src=${encodeURIComponent(image)}&fit=${fit}` : ''

  const tags = [
    `<title>${esc(title)}</title>`,
    desc && `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${esc(brand)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    desc && `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    ogImage && `<meta property="og:image" content="${esc(ogImage)}" />`,
    ogImage && '<meta property="og:image:type" content="image/jpeg" />',
    ogImage && '<meta property="og:image:width" content="1200" />',
    ogImage && '<meta property="og:image:height" content="630" />',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    desc && `<meta name="twitter:description" content="${esc(desc)}" />`,
    ogImage && `<meta name="twitter:image" content="${esc(ogImage)}" />`,
  ].filter(Boolean).join('\n    ')

  let html = ''
  try { const r = await fetch(`${origin}/index.html`); if (r.ok) html = await r.text() } catch { /* fall back below */ }
  if (html.includes('</head>')) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+name="description"[^>]*>/i, '').replace('</head>', `    ${tags}\n  </head>`)
  } else {
    html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />\n    ${tags}\n  </head><body></body></html>`
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(html)
                          }
