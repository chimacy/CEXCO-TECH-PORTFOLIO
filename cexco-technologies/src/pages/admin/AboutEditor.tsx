import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ErrorState, Field, Spinner } from '@/components/ui'
import { ImageField } from '@/components/admin/MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { listRows } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

interface Form { heading: string; intro: string; body: string; values: string; image_url: string | null }

export default function AboutEditor() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(async () => ( await listRows('pages', { order: 'slug', asc: true }))
  const [f, setF] = useState<Form>({ heading: '', intro: '', body: '', values: '', image_url: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    setF({
      heading: String(data.heading ?? ''), intro: String(data.intro ?? ''),
      body: String(data.body ?? '').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, ''), // older content may contain simple HTML
      values: Array.isArray(data.values_list) ? (data.values_list as string[]).join('\n') : '',
      image_url: typeof data.image_url === 'string' ? data.image_url : null,
    })
  }, [data])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { error: e } = await supabase.from('pages').upsert({
        slug: 'about', title: 'About', heading: f.heading || null, intro: f.intro || null, body: f.body || null,
        values_list: f.values.split('\n').map((s) => s.trim()).filter(Boolean), image_url: f.image_url,
      }, { onConflict: 'slug' })
      if (e) throw e
      toast.success('About page saved.'); reload()
    } catch (x) { toast.error(errMsg(x)) } finally { setBusy(false) }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorState message="Unable to load the About page." onRetry={reload} />
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">About</h1>
        <div className="flex gap-2">
          <a href="/about" target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink className="h-4 w-4" /> View page</a>
          <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
        </div>
      </div>
      <section className="card grid gap-4 p-5">
        <Field label="Page heading"><input className="input" value={f.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
        <Field label="Short statement" hint="Shown large on the About page and on the home page."><textarea rows={4} className="input" value={f.intro} onChange={(e) => set('intro', e.target.value)} /></Field>
        <Field label="More detail (optional)" hint="Separate paragraphs with a blank line."><textarea rows={6} className="input" value={f.body} onChange={(e) => set('body', e.target.value)} /></Field>
        <Field label="Focus areas (optional)" hint="One per line, e.g. Design, Branding, Visual Communication."><textarea rows={4} className="input" value={f.values} onChange={(e) => set('values', e.target.value)} /></Field>
        <ImageField label="Image (optional)" value={f.image_url} onChange={(v) => set('image_url', v)} />
      </section>
    </div>
  )
}
