// Generates public/sitemap.xml from published projects. Skips quietly if env vars are missing.
import fs from 'node:fs'
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY, site = (process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/\/$/, '')
if (!url || !key || !site) { console.log('sitemap: skipped (set SITE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)'); process.exit(0) }
const base = site.startsWith('http') ? site : `https://${site}`
const r = await fetch(`${url}/rest/v1/portfolio_projects?select=slug,updated_at&status=eq.published`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
const projects = r.ok ? await r.json() : []
const urls = [{ loc: `${base}/` }, { loc: `${base}/work` }, { loc: `${base}/about` }, ...projects.map((p) => ({ loc: `${base}/work/${p.slug}`, lastmod: p.updated_at }))]
fs.writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`)
console.log(`sitemap: wrote ${urls.length} urls`)
