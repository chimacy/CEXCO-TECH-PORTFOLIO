// Generates public/sitemap.xml from published portfolio projects.

import fs from 'node:fs'
import path from 'node:path'

const SITE_URL = (
  process.env.SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://cexcotechfolio.vercel.app'
).replace(/\/+$/, '')

const base = SITE_URL.startsWith('http')
  ? SITE_URL
  : `https://${SITE_URL}`

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const urls = [
  { loc: `${base}/` },
  { loc: `${base}/work` },
  { loc: `${base}/about` },
]

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const response = await fetch(
      `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/portfolio_projects?select=slug,updated_at&status=eq.published`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!response.ok) {
      throw new Error(`Supabase returned HTTP ${response.status}`)
    }

    const projects = await response.json()

    for (const project of projects) {
      if (!project.slug) continue

      const entry = {
        loc: `${base}/work/${encodeURIComponent(project.slug)}`,
      }

      if (
        project.updated_at &&
        !Number.isNaN(Date.parse(project.updated_at))
      ) {
        entry.lastmod = new Date(project.updated_at)
          .toISOString()
          .slice(0, 10)
      }

      urls.push(entry)
    }

    console.log(`sitemap: loaded ${projects.length} published projects`)
  } catch (error) {
    console.error(
      'sitemap: could not load projects from Supabase:',
      error.message
    )
    console.warn('sitemap: generating core pages only')
  }
} else {
  console.warn(
    'sitemap: Supabase environment variables are missing, generating core pages only'
  )
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>
`

const outputDir = path.resolve('public')
const outputFile = path.join(outputDir, 'sitemap.xml')

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(outputFile, xml, 'utf8')

console.log(`sitemap: successfully wrote ${urls.length} URLs to ${outputFile}`)
