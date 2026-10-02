import { useState, type FormEvent } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { Field } from '@/components/ui'
import { RichText } from '@/components/ui/RichText'
import { errMsg, whatsappLink } from '@/utils/format'

export default function Contact() {
  const { settings } = useSettings()
  const page = useAsync(() => api.getPage('contact'), [])
  useSeo({ title: page.data?.seo_title ?? 'Contact', description: page.data?.seo_description ?? page.data?.intro })
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: '', message: settings?.default_contact_message ?? '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))
  const wa = whatsappLink(settings?.whatsapp, settings?.default_contact_message ?? undefined)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return
    const v: Record<string, string> = {}
    if (!f.name.trim()) v.name = 'Please enter your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) v.email = 'Please enter a valid email.'
    if (f.message.trim().length < 5) v.message = 'Please write a message.'
    setErr(v); if (Object.keys(v).length) return
    setBusy(true); setStatus(null)
    try { await api.submitContact(f); setStatus({ ok: true, msg: 'Message sent. We will get back to you soon.' }); setF({ name: '', email: '', phone: '', subject: '', message: '' }) }
    catch (x) { setStatus({ ok: false, msg: errMsg(x) }) } finally { setBusy(false) }
  }
  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{page.data?.heading ?? 'Contact us'}</h1>
      {page.data?.intro && <p className="mt-3 max-w-xl text-black/60">{page.data.intro}</p>}
      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="space-y-5 text-sm lg:col-span-2">
          {settings?.email && <p><span className="label">Email</span><a className="hover:text-accent" href={`mailto:${settings.email}`}>{settings.email}</a></p>}
          {settings?.phone && <p><span className="label">Phone</span><a className="hover:text-accent" href={`tel:${settings.phone}`}>{settings.phone}</a></p>}
          {settings?.address && <p><span className="label">Address</span>{settings.address}</p>}
          {settings?.business_hours && <p><span className="label">Business hours</span>{settings.business_hours}</p>}
          {Object.entries(settings?.social_links ?? {}).filter(([, v]) => v).length > 0 && <p><span className="label">Social</span><span className="flex flex-wrap gap-x-4">{Object.entries(settings?.social_links ?? {}).filter(([, v]) => v).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-accent">{k}</a>)}</span></p>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-accent"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>}
          <RichText html={page.data?.body} />
        </div>
        <form onSubmit={submit} noValidate className="card space-y-4 p-6 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={err.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
            <Field label="Email" required error={err.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Phone"><input type="tel" className="input" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Subject"><input className="input" value={f.subject} onChange={set('subject')} /></Field>
          </div>
          <Field label="Message" required error={err.message}><textarea rows={6} className="input" value={f.message} onChange={set('message')} maxLength={5000} /></Field>
          {status && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${status.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{status.msg}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </div>
  )
}
