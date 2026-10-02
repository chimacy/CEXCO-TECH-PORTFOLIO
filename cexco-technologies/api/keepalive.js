// Pings Supabase once a day (Vercel Cron, see vercel.json) so a Free-plan project is never paused for inactivity.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Supabase env vars are not set' })
  try {
    const r = await fetch(`${url}/rest/v1/site_settings?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() })
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e) })
  }
}
