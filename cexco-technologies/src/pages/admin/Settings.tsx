import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState, Field, Spinner, Switch } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useSettings } from '@/lib/settings'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/utils/format'
import type { SiteSettings } from '@/types'

const SOCIALS = ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'behance']

export default function SettingsPage() {
  const { settings, loading, error, refresh } = useSettings(); const toast = useToast()
  const [f, setF] = useState<SiteSettings | null>(null); const [busy, setBusy] = useState(false)
  useEffect(() => { if (settings) setF(settings) }, [settings])
  if (loading) return <Spinner />
  if (error || !f) return <ErrorState message="Unable to load settings. Have the seed migrations been run?" onRetry={() => void refresh()} />
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setF({ ...f, [k]: v })
  const text = (k: keyof SiteSettings, label: string, props: { area?: boolean; hint?: string; type?: string } = {}) => (
    <Field label={label} hint={props.hint}>{props.area ? <textarea rows={3} className="input" value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} /> : <input type={props.type ?? 'text'} className="input" value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} />}</Field>)
  const save = async () => {
    if (!f.brand_name.trim()) { toast.error('Brand name is required.'); return }
    setBusy(true)
    try {
      const { id: _id, ...rest } = f; void _id
      const payload = { ...rest, items_per_page: Math.min(60, Math.max(3, Number(f.items_per_page) || 12)) }
      const { error: e } = await supabase.from('site_settings').upsert({ id: 1, ...payload }); if (e) throw e
      await refresh(); toast.success('Settings saved.')
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1><button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save settings</button></div>
      <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="font-display font-semibold sm:col-span-2">Brand</h2>
        <Field label="Brand name" required><input className="input" value={f.brand_name} onChange={(e) => set('brand_name', e.target.value)} /></Field>{text('tagline', 'Tagline')}
        <ImageField label="Logo" value={f.logo_url} onChange={(v) => set('logo_url', v)} /><ImageField label="Favicon" value={f.favicon_url} onChange={(v) => set('favicon_url', v)} />
        <div className="sm:col-span-2">{text('short_description', 'Short description', { area: true })}</div><div className="sm:col-span-2">{text('about_description', 'About description', { area: true })}</div></section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="font-display font-semibold sm:col-span-2">Contact</h2>{text('email', 'Primary email', { type: 'email' })}{text('phone', 'Phone number')}{text('whatsapp', 'WhatsApp number', { hint: 'International format, e.g. +2348012345678' })}{text('business_hours', 'Business hours')}<div className="sm:col-span-2">{text('address', 'Address', { area: true })}</div>
        <div className="sm:col-span-2"><span className="label">Social links</span><div className="grid gap-3 sm:grid-cols-2">{SOCIALS.map((s) => <input key={s} aria-label={`${s} URL`} className="input" placeholder={`${s} URL`} value={f.social_links?.[s] ?? ''} onChange={(e) => set('social_links', { ...f.social_links, [s]: e.target.value })} />)}</div></div></section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="font-display font-semibold sm:col-span-2">Footer & SEO</h2>{text('footer_text', 'Footer text')}{text('copyright_text', 'Copyright text')}{text('seo_title', 'Default SEO title')}{text('seo_description', 'Default SEO description', { area: true })}
        <ImageField label="Default share image (Open Graph)" value={f.og_image_url} onChange={(v) => set('og_image_url', v)} /></section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2"><h2 className="font-display font-semibold sm:col-span-2">Site behaviour</h2>
        <Field label="Currency symbol"><input className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
        <Field label="Items per page"><input type="number" min={3} max={60} className="input" value={f.items_per_page} onChange={(e) => set('items_per_page', Number(e.target.value))} /></Field>
        <Field label="Default portfolio layout"><select className="input" value={f.default_layout} onChange={(e) => set('default_layout', e.target.value as 'masonry' | 'grid')}><option value="masonry">Masonry</option><option value="grid">Grid</option></select></Field>
        <div className="sm:col-span-2">{text('default_contact_message', 'Default contact / WhatsApp message', { area: true })}</div>
        <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 sm:col-span-2"><div><p className="text-sm font-medium">Maintenance mode</p><p className="text-xs text-black/50">Hides the public site. /admin stays accessible.</p></div><Switch label="Maintenance mode" checked={f.maintenance_mode} onChange={(v) => set('maintenance_mode', v)} /></div></section>
    </div>
  )
}
