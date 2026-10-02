import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileText, Loader2, MessageCircle, Paperclip, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useSettings } from '@/lib/settings'
import * as api from '@/services/api'
import { Field } from '@/components/ui'
import { errMsg, formatBytes, whatsappLink } from '@/utils/format'

type Form = Record<'full_name' | 'email' | 'whatsapp' | 'phone' | 'company' | 'service_id' | 'category_id' | 'project_title' | 'description' | 'preferred_size' | 'deadline' | 'budget' | 'reference_links' | 'additional_notes', string>

export default function Request() {
  useSeo({ title: 'Request a design', description: 'Tell us about your project and upload references.' })
  const { settings } = useSettings()
  const [sp] = useSearchParams()
  const services = useAsync(() => api.getServices(), [])
  const cats = useAsync(api.getCategories, [])
  const [f, setF] = useState<Form>({ full_name: '', email: '', whatsapp: '', phone: '', company: '', service_id: sp.get('service') ?? '', category_id: '', project_title: sp.get('project') ? `Similar to: ${sp.get('project')}` : '', description: '', preferred_size: '', deadline: '', budget: '', reference_links: '', additional_notes: '' })
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<number[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'files', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState<{ ref: string; failed: string[] } | null>(null)
  const lock = useRef(false)
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next = [...files]; let err = ''
    for (const file of Array.from(list)) {
      if (!api.REQUEST_LIMITS.types.includes(file.type)) err = `${file.name}: only JPG, PNG, WEBP, PDF or SVG files are allowed.`
      else if (file.size > api.REQUEST_LIMITS.maxBytes) err = `${file.name} is larger than ${formatBytes(api.REQUEST_LIMITS.maxBytes)}.`
      else if (next.length >= api.REQUEST_LIMITS.maxFiles) err = `You can upload up to ${api.REQUEST_LIMITS.maxFiles} files.`
      else next.push(file)
    }
    setFiles(next); setErrors((p) => ({ ...p, files: err || undefined }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!f.full_name.trim()) e.full_name = 'Please enter your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Please enter a valid email address.'
    if (!f.whatsapp.trim() && !f.phone.trim()) e.whatsapp = 'Provide a WhatsApp or phone number.'
    if (!f.project_title.trim()) e.project_title = 'Give your project a title.'
    if (f.description.trim().length < 20) e.description = 'Please describe your project (at least 20 characters).'
    setErrors(e); return Object.keys(e).length === 0
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (lock.current || !validate()) return
    lock.current = true; setSubmitting(true); setFormError(null); setProgress(files.map(() => 0))
    try {
      const res = await api.submitRequest({ ...f, full_name: f.full_name.trim(), email: f.email.trim() })
      const failed: string[] = []
      await Promise.all(files.map((file, i) => api.uploadRequestFile(res.id, res.upload_token, file, (pct) => setProgress((p) => p.map((v, j) => (j === i ? pct : v)))).catch(() => { failed.push(file.name) })))
      setDone({ ref: res.reference_no, failed })
      window.scrollTo(0, 0)
    } catch (e) { setFormError(errMsg(e)) }
    finally { setSubmitting(false); lock.current = false }
  }

  if (done) {
    const wa = whatsappLink(settings?.whatsapp, `Hello, I just submitted a design request. Reference: ${done.ref}`)
    return (
      <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
        <h1 className="mt-5 font-display text-4xl font-bold">Your request has been received.</h1>
        <p className="mt-3 text-black/60">Your reference number</p>
        <p className="mt-1 rounded-xl bg-black/5 px-5 py-3 font-mono text-xl font-semibold" data-testid="ref">{done.ref}</p>
        <p className="mt-4 max-w-md text-sm text-black/55">Keep this number for follow-ups. We will review your request and get back to you by email or WhatsApp.</p>
        {done.failed.length > 0 && <p role="alert" className="mt-4 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">These files could not be uploaded: {done.failed.join(', ')}. Please send them to us via WhatsApp or email quoting your reference.</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {wa && <a className="btn btn-accent" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Contact on WhatsApp</a>}
          <Link to="/" className="btn btn-ghost">Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">Request a design</h1>
      <p className="mt-3 text-black/60">Fields marked <span className="text-accent">*</span> are required.</p>
      <form onSubmit={submit} noValidate className="mt-10 space-y-8">
        <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 font-display text-lg font-semibold">About you</legend>
          <Field label="Full name" required error={errors.full_name}><input className="input" value={f.full_name} onChange={set('full_name')} autoComplete="name" /></Field>
          <Field label="Email" required error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="WhatsApp number" error={errors.whatsapp} hint="WhatsApp or phone is required."><input type="tel" className="input" value={f.whatsapp} onChange={set('whatsapp')} placeholder="+234…" /></Field>
          <Field label="Phone number"><input type="tel" className="input" value={f.phone} onChange={set('phone')} /></Field>
          <div className="sm:col-span-2"><Field label="Company / organization"><input className="input" value={f.company} onChange={set('company')} /></Field></div>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 font-display text-lg font-semibold">Your project</legend>
          <Field label="Service"><select className="input" value={f.service_id} onChange={set('service_id')}><option value="">Select a service</option>{services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Category"><select className="input" value={f.category_id} onChange={set('category_id')}><option value="">Select a category</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Project title" required error={errors.project_title}><input className="input" value={f.project_title} onChange={set('project_title')} /></Field></div>
          <div className="sm:col-span-2"><Field label="Design description" required error={errors.description}><textarea rows={5} className="input" value={f.description} onChange={set('description')} placeholder="What do you need? Include text, colours, mood, audience…" maxLength={5000} /></Field></div>
          <Field label="Preferred size"><input className="input" value={f.preferred_size} onChange={set('preferred_size')} placeholder="e.g. A4, 1080×1080" /></Field>
          <Field label="Deadline"><input type="date" className="input" value={f.deadline} onChange={set('deadline')} min={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Budget"><input className="input" value={f.budget} onChange={set('budget')} placeholder="e.g. ₦20,000" /></Field>
          <Field label="Reference links"><input className="input" value={f.reference_links} onChange={set('reference_links')} placeholder="Links to inspiration" /></Field>
          <div className="sm:col-span-2"><Field label="Additional notes"><textarea rows={3} className="input" value={f.additional_notes} onChange={set('additional_notes')} /></Field></div>
        </fieldset>
        <fieldset><legend className="mb-3 font-display text-lg font-semibold">Reference files</legend>
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-black/20 px-4 py-8 text-center text-sm hover:border-ink">
            <Paperclip className="mb-2 h-5 w-5" aria-hidden /><span className="font-medium">Choose files</span>
            <span className="text-black/50">JPG, PNG, WEBP, PDF, SVG · up to {formatBytes(api.REQUEST_LIMITS.maxBytes)} each · max {api.REQUEST_LIMITS.maxFiles} files</span>
            <input type="file" multiple className="sr-only" accept=".jpg,.jpeg,.png,.webp,.pdf,.svg" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} disabled={submitting} />
          </label>
          {errors.files && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errors.files}</p>}
          <ul className="mt-3 space-y-2">
            {files.map((file, i) => (
              <li key={file.name + i} className="card flex items-center gap-3 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-black/40" aria-hidden />
                <span className="min-w-0 flex-1"><span className="block truncate">{file.name}</span>
                  {submitting && <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={progress[i] ?? 0} aria-valuemin={0} aria-valuemax={100}><span className="block h-full bg-accent transition-all" style={{ width: `${progress[i] ?? 0}%` }} /></span>}</span>
                <span className="text-xs text-black/45">{formatBytes(file.size)}</span>
                {!submitting && <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        </fieldset>
        {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary w-full !py-3.5 text-base sm:w-auto">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? 'Submitting…' : 'Submit request'}</button>
      </form>
    </div>
  )
}
