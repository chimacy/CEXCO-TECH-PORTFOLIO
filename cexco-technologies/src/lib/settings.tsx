import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSettings } from '@/services/api'
import type { SiteSettings } from '@/types'

interface Ctx { settings: SiteSettings | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const SettingsCtx = createContext<Ctx>({ settings: null, loading: true, error: null, refresh: async () => undefined })
export const useSettings = () => useContext(SettingsCtx)

/* ───────── Brand accent: taken from the logo, or from an optional admin override ───────── */
type RGB = [number, number, number]
const CACHE_KEY = 'cexco-accent-v1'

function applyAccent(rgb: RGB) {
  const s = document.documentElement.style
  s.setProperty('--accent', rgb.join(' '))
  s.setProperty('--accent-dark', rgb.map((v) => Math.round(v * 0.78)).join(' '))
}
const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
/** Darken until the colour reads clearly as text on white (contrast >= 4.5:1). */
function readable(rgb: RGB): RGB {
  let c = rgb
  for (let i = 0; i < 24 && 1.05 / (lum(c) + 0.05) < 4.5; i++) c = c.map((v) => Math.round(v * 0.93)) as RGB
  return c
}
function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Most prominent saturated colour in the logo (greens preferred). */
function colourFromLogo(url: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => resolve(null)
    img.onload = () => {
      try {
        const S = 64
        const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S
        const ctx = canvas.getContext('2d'); if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, S, S)
        const d = ctx.getImageData(0, 0, S, S).data
        const B = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue
          const r = d[i], g = d[i + 1], b = d[i + 2]
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const v = max / 255, s = max ? (max - min) / max : 0
          if (s < 0.35 || v < 0.2) continue
          let h = 0
          const dl = max - min
          if (max === r) h = ((g - b) / dl) % 6; else if (max === g) h = (b - r) / dl + 2; else h = (r - g) / dl + 4
          h = (h * 60 + 360) % 360
          const k = B[Math.floor(h / 20) % 18], w = s * v
          k.w += w; k.r += r * w; k.g += g * w; k.b += b * w
        }
        const top = B.reduce((a, b) => (b.w > a.w ? b : a), B[0])
        const green = B.slice(3, 9).reduce((a, b) => (b.w > a.w ? b : a), B[3]) // hues 60–180
        const pick = green.w > 0 && green.w >= top.w * 0.35 ? green : top
        if (pick.w <= 0) return resolve(null)
        resolve([Math.round(pick.r / pick.w), Math.round(pick.g / pick.w), Math.round(pick.b / pick.w)])
      } catch { resolve(null) } // e.g. image blocked from pixel access
    }
    img.src = url
  })
}

// Apply the last known accent immediately so there is no colour flash on repeat visits
try {
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) { const rgb = JSON.parse(cached) as RGB; if (Array.isArray(rgb) && rgb.length === 3) applyAccent(rgb) }
} catch { /* ignore */ }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setSettings(await getSettings()); setError(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load site settings.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!settings?.favicon_url) return
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = settings.favicon_url
  }, [settings?.favicon_url])

  const override = (settings as (SiteSettings & { accent_color?: string | null }) | null)?.accent_color ?? null
  const logo = settings?.logo_url ?? null
  useEffect(() => {
    if (!settings) return
    let live = true
    const set = (rgb: RGB) => { if (!live) return; const c = readable(rgb); applyAccent(c); try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* ignore */ } }
    const fromHex = override ? hexToRgb(override) : null
    if (fromHex) set(fromHex)
    else if (logo) void colourFromLogo(logo).then((rgb) => { if (rgb) set(rgb) })
    return () => { live = false }
  }, [settings, override, logo])

  const value = useMemo(() => ({ settings, loading, error, refresh }), [settings, loading, error, refresh])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}
