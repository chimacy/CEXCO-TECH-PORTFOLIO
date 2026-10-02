import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, Download, FileText, Loader2, MessageCircle, Search } from 'lucide-react'
import { Badge, EmptyState, ErrorState, Field, Pagination, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { listRows, saveRow, signedRequestFileUrl, type Row } from '@/services/admin'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'
import { errMsg, formatBytes, formatDate, whatsappLink } from '@/utils/format'
import type { DesignRequest, RequestFile, RequestNote } from '@/types'

const STATUSES = ['new', 'reviewing', 'quoted', 'approved', 'in_progress', 'revision', 'completed', 'cancelled'] as const
const label = (s: string) => s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
const PAGE = 15

export function RequestsList() {
  const { data, loading, error, reload } = useAsync(() => listRows('design_requests'), [])
  const svcs = useAsync(() => listRows('services'), [])
  const [tab, setTab] = useState(''); const [q, setQ] = useState(''); const [pri, setPri] = useState(''); const [archived, setArchived] = useState(false); const [page, setPage] = useState(1)
  const base = useMemo(() => (data ?? []).filter((r) => Boolean(r.archived) === archived), [data, archived])
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, base.filter((r) => r.status === s).length])), [base])
  const rows = useMemo(() => base.filter((r) => (!tab || r.status === tab) && (!pri || r.priority === pri) && (!q.trim() || [r.reference_no, r.full_name, r.email, r.project_title, r.company].some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase())))), [base, tab, pri, q])
  const paged = rows.slice((page - 1) * PAGE, page * PAGE)
  const svcName = (id: unknown) => svcs.data?.find((s) => s.id === id)?.name as string | undefined
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Requests</h1>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Request status">
        {[['', 'All', base.length] as const, ...STATUSES.map((s) => [s, label(s), counts[s]] as const)].map(([v, l, n]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => { setTab(v); setPage(1) }} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${tab === v ? 'border-ink bg-ink text-white' : 'border-black/15 bg-white'}`}>{l} <span className="opacity-60">{n}</span></button>))}
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search requests" placeholder="Search reference, client, project…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        <select className="input sm:w-40" aria-label="Priority" value={pri} onChange={(e) => { setPri(e.target.value); setPage(1) }}><option value="">All priorities</option>{['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{label(p)}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); setPage(1) }} /> Archived</label>
      </div>
      {loading ? <Spinner label="Loading requests…" /> : error ? <ErrorState message="Unable to load requests." onRetry={reload} /> : !rows.length ? <EmptyState title="No requests found." hint="New design requests from /request will appear here." /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50"><tr>{['Reference', 'Client', 'Service', 'Status', 'Priority', 'Deadline', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-black/5">{paged.map((r) => (
            <tr key={r.id} className="hover:bg-black/[.02]">
              <td className="px-4 py-3 font-mono text-xs">{String(r.reference_no)}</td>
              <td className="px-4 py-3"><span className="font-medium">{String(r.full_name)}</span><span className="block text-xs text-black/45">{String(r.project_title)}</span></td>
              <td className="px-4 py-3 text-black/60">{svcName(r.service_id) ?? '—'}</td>
              <td className="px-4 py-3"><Badge value={String(r.status)} /></td><td className="px-4 py-3"><Badge value={String(r.priority)} /></td>
              <td className="px-4 py-3">{r.deadline ? formatDate(String(r.deadline)) : '—'}</td><td className="px-4 py-3 text-black/55">{formatDate(String(r.created_at))}</td>
              <td className="px-4 py-3 text-right"><Link className="btn btn-ghost !px-3 !py-1.5" to={`/admin/requests/${r.id}`}>Open</Link></td></tr>))}</tbody></table></div>)}
      <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
    </div>
  )
}

export function RequestDetail() {
  const { id = '' } = useParams(); const nav = useNavigate(); const toast = useToast(); const { session } = useAuth()
  const req = useAsync(async () => {
    const { data, error } = await supabase.from('design_requests').select('*, service:services(id,name)').eq('id', id).single()
    if (error) throw new Error(error.message); return data as DesignRequest
  }, [id])
  const files = useAsync(async () => { const { data, error } = await supabase.from('request_files').select('*').eq('request_id', id).order('created_at'); if (error) throw new Error(error.message); return data as RequestFile[] }, [id])
  const notes = useAsync(async () => { const { data, error } = await supabase.from('request_notes').select('*').eq('request_id', id).order('created_at', { ascending: false }); if (error) throw new Error(error.message); return data as RequestNote[] }, [id])
  const svcs = useAsync(() => listRows('services', { order: 'name', asc: true }), [])
  const [edit, setEdit] = useState<Partial<Record<string, string>>>({}); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [noting, setNoting] = useState(false)
  const r = req.data
  const val = (k: keyof DesignRequest) => (edit[k] ?? (r?.[k] == null ? '' : String(r[k]))) as string
  const set = (k: string, v: string) => setEdit((e) => ({ ...e, [k]: v }))

  const save = async (extra: Record<string, unknown> = {}, msg = 'Request updated.') => {
    if (!r || busy) return; setBusy(true)
    try {
      const payload: Record<string, unknown> = { ...extra }
      for (const [k, v] of Object.entries(edit)) payload[k] = ['quoted_price', 'final_price'].includes(k) ? (v === '' || v == null ? null : Number(v)) : v === '' ? null : v
      if (edit.status) { payload.status = edit.status }
      await saveRow('design_requests', payload, r.id); setEdit({}); toast.success(msg); req.reload()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const addNote = async () => {
    if (!note.trim() || noting) return; setNoting(true)
    try { const { error } = await supabase.from('request_notes').insert({ request_id: id, note: note.trim(), author_id: session?.user.id, author_email: session?.user.email }); if (error) throw error; setNote(''); toast.success('Note added.'); notes.reload() } catch (e) { toast.error(errMsg(e)) } finally { setNoting(false) }
  }
  const openFile = async (f: RequestFile) => { try { window.open(await signedRequestFileUrl(f.storage_path), '_blank', 'noopener') } catch (e) { toast.error(errMsg(e)) } }

  if (req.loading) return <Spinner />
  if (req.error || !r) return <ErrorState message="Unable to load this request." onRetry={req.reload} />
  const wa = whatsappLink(r.whatsapp ?? r.phone, `Hello ${r.full_name}, regarding your request ${r.reference_no}…`)
  const dirty = Object.keys(edit).length > 0
  return (
    <div>
      <button className="mb-4 inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-ink" onClick={() => nav('/admin/requests')}><ArrowLeft className="h-4 w-4" /> Requests</button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm text-black/50">{r.reference_no}</p><h1 className="font-display text-2xl font-bold sm:text-3xl">{r.project_title}</h1><p className="mt-1 text-sm text-black/50">Received {formatDate(r.created_at)}</p></div>
        <div className="flex gap-2"><Badge value={r.status} /><Badge value={r.priority} /></div></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Client</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Name', r.full_name], ['Email', r.email], ['WhatsApp', r.whatsapp], ['Phone', r.phone], ['Company', r.company]].map(([k, v]) => <div key={k}><dt className="text-black/45">{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
            <div className="mt-4 flex flex-wrap gap-2"><a className="btn btn-ghost" href={`mailto:${r.email}`}>Email client</a>{wa && <a className="btn btn-accent" target="_blank" rel="noopener noreferrer" href={wa}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}</div></section>
          <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Brief</h2>
            <p className="whitespace-pre-line text-sm text-black/75">{r.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['Preferred size', r.preferred_size], ['Budget', r.budget], ['Reference links', r.reference_links], ['Additional notes', r.additional_notes]].map(([k, v]) => <div key={k}><dt className="text-black/45">{k}</dt><dd className="whitespace-pre-line break-words">{v || '—'}</dd></div>)}</dl></section>
          <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Files</h2>
            {files.loading ? <Spinner /> : !files.data?.length ? <p className="text-sm text-black/50">No files uploaded.</p> : <ul className="divide-y divide-black/5">{files.data.map((f) => <li key={f.id} className="flex items-center gap-3 py-2 text-sm"><FileText className="h-4 w-4 text-black/40" /><span className="min-w-0 flex-1 truncate">{f.file_name}</span><span className="text-xs text-black/45">{formatBytes(f.size_bytes)}</span><button className="btn btn-ghost !px-3 !py-1.5" onClick={() => void openFile(f)}><Download className="h-4 w-4" /> Open</button></li>)}</ul>}</section>
          <section className="card p-5"><h2 className="mb-3 font-display font-semibold">Internal notes</h2>
            <div className="flex gap-2"><textarea rows={2} className="input" placeholder="Only visible to admins…" value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn btn-primary self-start" onClick={() => void addNote()} disabled={noting || !note.trim()}>{noting && <Loader2 className="h-4 w-4 animate-spin" />}Add</button></div>
            <ul className="mt-4 space-y-3">{notes.data?.map((n) => <li key={n.id} className="rounded-xl bg-black/[.03] p-3 text-sm"><p className="whitespace-pre-line">{n.note}</p><p className="mt-1 text-xs text-black/40">{n.author_email} · {formatDate(n.created_at)}</p></li>)}{notes.data && !notes.data.length && <li className="text-sm text-black/50">No notes yet.</li>}</ul></section>
        </div>
        <aside className="card h-fit space-y-4 p-5">
          <Field label="Status"><select className="input" value={val('status')} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={val('priority')} onChange={(e) => set('priority', e.target.value)}>{['low', 'normal', 'high', 'urgent'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
          <Field label="Assigned service"><select className="input" value={val('service_id')} onChange={(e) => set('service_id', e.target.value)}><option value="">None</option>{svcs.data?.map((s) => <option key={s.id} value={s.id}>{String(s.name)}</option>)}</select></Field>
          <Field label="Deadline"><input type="date" className="input" value={val('deadline')} onChange={(e) => set('deadline', e.target.value)} /></Field>
          <Field label="Quoted price"><input type="number" step="any" className="input" value={val('quoted_price')} onChange={(e) => set('quoted_price', e.target.value)} /></Field>
          <Field label="Final price"><input type="number" step="any" className="input" value={val('final_price')} onChange={(e) => set('final_price', e.target.value)} /></Field>
          <Field label="Client-facing note" hint="Shown to the client when you share an update."><textarea rows={3} className="input" value={val('client_note')} onChange={(e) => set('client_note', e.target.value)} /></Field>
          <button className="btn btn-primary w-full" disabled={!dirty || busy} onClick={() => void save({}, edit.status ? 'Request status updated.' : 'Request updated.')}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save changes</button>
          <button className="btn btn-ghost w-full" disabled={busy} onClick={() => void save({ archived: !r.archived }, r.archived ? 'Request restored.' : 'Request archived.')}><Archive className="h-4 w-4" /> {r.archived ? 'Unarchive' : 'Archive'}</button>
        </aside>
      </div>
    </div>
  )
}

export function ClientsAdmin() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('clients', { order: 'last_request_at', asc: false }), [])
  const [q, setQ] = useState(''); const [open, setOpen] = useState<Row | null>(null); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false)
  const rows = (data ?? []).filter((c) => !q.trim() || [c.name, c.email, c.company, c.phone].some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase())))
  const saveNotes = async () => { if (!open) return; setBusy(true); try { await saveRow('clients', { notes: notes || null }, open.id); toast.success('Client updated.'); setOpen(null); reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) } }
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Clients</h1>
      <div className="relative mb-4"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search clients" placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading ? <Spinner label="Loading clients…" /> : error ? <ErrorState message="Unable to load clients." onRetry={reload} /> : !rows.length ? <EmptyState title="No clients yet." hint="Clients are created automatically when someone submits a request." /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50"><tr>{['Name', 'Contact', 'Company', 'Requests', 'Completed', 'Joined', 'Last request', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-black/5">{rows.map((c) => <tr key={c.id}><td className="px-4 py-3 font-medium">{String(c.name)}</td><td className="px-4 py-3 text-black/60">{String(c.email ?? '')}<span className="block text-xs">{String(c.whatsapp ?? c.phone ?? '')}</span></td><td className="px-4 py-3">{String(c.company ?? '—')}</td><td className="px-4 py-3">{String(c.request_count)}</td><td className="px-4 py-3">{String(c.completed_count)}</td><td className="px-4 py-3">{formatDate(String(c.created_at))}</td><td className="px-4 py-3">{formatDate(c.last_request_at as string | null)}</td>
            <td className="px-4 py-3 text-right"><button className="btn btn-ghost !px-3 !py-1.5" onClick={() => { setOpen(c); setNotes(String(c.notes ?? '')) }}>Notes</button></td></tr>)}</tbody></table></div>)}
      {open && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(null)} /><div role="dialog" aria-modal="true" aria-label="Client notes" className="relative w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"><h2 className="font-display text-lg font-semibold">{String(open.name)}</h2><Field label="Notes"><textarea rows={5} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><div className="mt-4 flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button><button className="btn btn-primary" onClick={() => void saveNotes()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></div></div></div>}
    </div>
  )
}

export function MessagesAdmin() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('contact_messages'), [])
  const [open, setOpen] = useState<string | null>(null)
  const toggleRead = async (m: Row) => { try { await saveRow('contact_messages', { is_read: !m.is_read }, m.id); reload() } catch (e) { toast.error(errMsg(e)) } }
  return (
    <div><h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Messages</h1>
      {loading ? <Spinner label="Loading messages…" /> : error ? <ErrorState message="Unable to load messages." onRetry={reload} /> : !data?.length ? <EmptyState title="No messages yet." hint="Contact form submissions will appear here." /> :
        <ul className="space-y-3">{data.map((m) => (
          <li key={m.id} className={`card p-4 ${m.is_read ? '' : 'border-ink'}`}>
            <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => { setOpen(open === m.id ? null : m.id); if (!m.is_read) void toggleRead(m) }} aria-expanded={open === m.id}>
              <span><span className="font-medium">{String(m.name)}</span> <span className="text-sm text-black/50">· {String(m.subject ?? 'No subject')}</span>{!m.is_read && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">NEW</span>}</span><span className="shrink-0 text-xs text-black/45">{formatDate(String(m.created_at))}</span></button>
            {open === m.id && <div className="mt-3 border-t border-black/10 pt-3 text-sm"><p className="whitespace-pre-line">{String(m.message)}</p><p className="mt-3 text-black/50">{String(m.email)} {m.phone ? `· ${String(m.phone)}` : ''}</p><div className="mt-3 flex gap-2"><a className="btn btn-ghost !py-1.5" href={`mailto:${String(m.email)}`}>Reply</a><button className="btn btn-ghost !py-1.5" onClick={() => void toggleRead(m)}>Mark {m.is_read ? 'unread' : 'read'}</button></div></div>}
          </li>))}</ul>}
    </div>
  )
}
