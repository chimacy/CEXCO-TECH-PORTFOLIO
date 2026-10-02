import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, Pagination, Spinner, Switch } from '@/components/ui'
import { ImageField } from './MediaPicker'
import { useAsync } from '@/hooks/useAsync'
import { deleteRow, listRows, saveRow, type Row } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg, slugify } from '@/utils/format'

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date'; required?: boolean; hint?: string; full?: boolean }
  | { key: string; label: string; type: 'slug'; from: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; empty?: string; required?: boolean }
  | { key: string; label: string; type: 'switch' }
  | { key: string; label: string; type: 'image' }
  | { key: string; label: string; type: 'lines'; hint?: string }

export interface Column { label: string; render: (r: Row) => ReactNode }
interface Props {
  table: string; singular: string; plural: string
  fields: FieldDef[]; columns: Column[]
  defaults: Record<string, unknown>
  /** Boolean column used for publish/unpublish, or the 'status' text column */
  publishKey?: { key: string; kind: 'bool' | 'status' }
  reorder?: boolean; duplicate?: boolean
  searchKeys: string[]
  extraFilter?: { label: string; key: string; options: { value: string; label: string }[] }
  order?: { col: string; asc: boolean }
}
const PAGE = 15

export function ResourceManager(p: Props) {
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const { data, loading, error, reload } = useAsync(() => listRows(p.table, { order: p.order?.col ?? (p.reorder ? 'sort_order' : 'created_at'), asc: p.order?.asc ?? !!p.reorder }), [p.table])
  const [q, setQ] = useState(''); const [filter, setFilter] = useState(''); const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [del, setDel] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (sp.get('new') === '1') { setEditing('new'); const n = new URLSearchParams(sp); n.delete('new'); setSp(n, { replace: true }) } }, [sp, setSp])

  const rows = useMemo(() => (data ?? []).filter((r) => {
    if (filter && String(r[p.extraFilter!.key]) !== filter) return false
    const s = q.trim().toLowerCase()
    return !s || p.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(s))
  }), [data, q, filter, p.searchKeys, p.extraFilter])
  const paged = rows.slice((page - 1) * PAGE, page * PAGE)

  const isPublished = (r: Row) => (p.publishKey!.kind === 'bool' ? Boolean(r[p.publishKey!.key]) : r[p.publishKey!.key] === 'published')
  const togglePublish = async (r: Row) => {
    const k = p.publishKey!; const next = k.kind === 'bool' ? !r[k.key] : r[k.key] === 'published' ? 'draft' : 'published'
    try { await saveRow(p.table, { [k.key]: next }, r.id); toast.success(`${p.singular} ${isPublished(r) ? 'unpublished' : 'published'}.`); reload() } catch (e) { toast.error(errMsg(e)) }
  }
  const move = async (r: Row, dir: -1 | 1) => {
    const list = data ?? []; const i = list.findIndex((x) => x.id === r.id); const o = list[i + dir]
    if (!o) return
    try {
      const a = Number(r.sort_order ?? 0); const b = Number(o.sort_order ?? 0)
      await Promise.all([saveRow(p.table, { sort_order: a === b ? b + dir : b }, r.id), saveRow(p.table, { sort_order: a }, o.id)])
      reload()
    } catch (e) { toast.error(errMsg(e)) }
  }
  const dup = async (r: Row) => {
    const copy: Record<string, unknown> = { ...r }
    for (const k of ['id', 'created_at', 'updated_at']) delete copy[k]
    for (const f of p.fields) if (f.type === 'slug') copy[f.key] = `${r[f.key]}-copy-${Math.random().toString(36).slice(2, 6)}`
    if (p.publishKey) copy[p.publishKey.key] = p.publishKey.kind === 'bool' ? false : 'draft'
    const nameKey = p.fields.find((f) => f.type === 'text')?.key; if (nameKey) copy[nameKey] = `${r[nameKey]} (copy)`
    try { await saveRow(p.table, copy); toast.success(`${p.singular} duplicated.`); reload() } catch (e) { toast.error(errMsg(e)) }
  }
  const remove = async () => {
    if (!del) return; setBusy(true)
    try { await deleteRow(p.table, del.id); toast.success(`${p.singular} deleted.`); setDel(null); reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{p.plural}</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add {p.singular.toLowerCase()}</button>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label={`Search ${p.plural}`} placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        {p.extraFilter && <select className="input sm:w-48" aria-label={p.extraFilter.label} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1) }}><option value="">{p.extraFilter.label}</option>{p.extraFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
      </div>

      {loading ? <Spinner label={`Loading ${p.plural.toLowerCase()}…`} /> : error ? <ErrorState message={`Unable to load ${p.plural.toLowerCase()}.`} onRetry={reload} /> :
        !rows.length ? <EmptyState title={`No ${p.plural.toLowerCase()} found.`} hint={q || filter ? 'Try clearing your search.' : `Add your first ${p.singular.toLowerCase()}.`} /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50"><tr>{p.columns.map((c) => <th key={c.label} className="px-4 py-3 font-semibold">{c.label}</th>)}{p.publishKey && <th className="px-4 py-3">Status</th>}<th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-black/5">
                {paged.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[.02]">
                    {p.columns.map((c) => <td key={c.label} className="px-4 py-3">{c.render(r)}</td>)}
                    {p.publishKey && <td className="px-4 py-3"><Badge value={isPublished(r) ? 'published' : String(r[p.publishKey.key] === 'archived' ? 'archived' : 'draft')} /></td>}
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      {p.reorder && <><button className="rounded-lg p-2 hover:bg-black/5" aria-label="Move up" onClick={() => void move(r, -1)}><ArrowUp className="h-4 w-4" /></button><button className="rounded-lg p-2 hover:bg-black/5" aria-label="Move down" onClick={() => void move(r, 1)}><ArrowDown className="h-4 w-4" /></button></>}
                      {p.publishKey && <button className="rounded-lg p-2 hover:bg-black/5" aria-label={isPublished(r) ? 'Unpublish' : 'Publish'} title={isPublished(r) ? 'Unpublish' : 'Publish'} onClick={() => void togglePublish(r)}>{isPublished(r) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
                      {p.duplicate && <button className="rounded-lg p-2 hover:bg-black/5" aria-label="Duplicate" onClick={() => void dup(r)}><Copy className="h-4 w-4" /></button>}
                      <button className="rounded-lg p-2 hover:bg-black/5" aria-label="Edit" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></button>
                      <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />

      {editing && <EditModal key={editing === 'new' ? 'new' : editing.id} p={p} row={editing === 'new' ? null : editing} nextOrder={(data?.length ?? 0) + 1} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <ConfirmDialog open={!!del} title={`Delete this ${p.singular.toLowerCase()}?`} message="This action cannot be undone." busy={busy} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  )
}

function EditModal({ p, row, nextOrder, onClose, onSaved }: { p: Props; row: Row | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [v, setV] = useState<Record<string, unknown>>(() => ({ ...p.defaults, ...(p.reorder && !row ? { sort_order: nextOrder } : {}), ...(row ?? {}) }))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!!row)
  const set = (k: string, val: unknown) => setV((x) => ({ ...x, [k]: val }))

  const save = async () => {
    const e: Record<string, string> = {}
    for (const f of p.fields) if ('required' in f && f.required && (v[f.key] == null || String(v[f.key]).trim() === '')) e[f.key] = 'This field is required.'
    for (const f of p.fields) if (f.type === 'slug' && !String(v[f.key] ?? '').trim()) e[f.key] = 'Slug is required.'
    setErrs(e); if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of p.fields) {
        let x = v[f.key]
        if (f.type === 'number') x = x === '' || x == null ? null : Number(x)
        if (f.type === 'lines') x = Array.isArray(x) ? x : []
        if ((f.type === 'text' || f.type === 'textarea' || f.type === 'date' || f.type === 'select') && x === '') x = null
        payload[f.key] = x
      }
      if (p.reorder) payload.sort_order = Number(v.sort_order ?? 0)
      await saveRow(p.table, payload, row?.id)
      toast.success(`${p.singular} ${row ? 'updated' : 'created'}.`); onSaved()
    } catch (x) { const m = errMsg(x); toast.error(/duplicate|unique/i.test(m) ? 'That slug is already in use.' : m) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={row ? `Edit ${p.singular.toLowerCase()}` : `Add ${p.singular.toLowerCase()}`} wide
      footer={<><button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {p.fields.map((f) => {
          const err = errs[f.key]
          switch (f.type) {
            case 'text': case 'number': case 'date':
              return <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}><Field label={f.label} required={f.required} error={err} hint={f.hint}>
                <input className="input" type={f.type} step={f.type === 'number' ? 'any' : undefined} value={String(v[f.key] ?? '')}
                  onChange={(e) => { set(f.key, e.target.value); const sf = p.fields.find((x) => x.type === 'slug' && x.from === f.key); if (sf && !slugTouched) set(sf.key, slugify(e.target.value)) }} /></Field></div>
            case 'slug':
              return <Field key={f.key} label={f.label} required error={err} hint="Used in the public URL."><input className="input" value={String(v[f.key] ?? '')} onChange={(e) => { setSlugTouched(true); set(f.key, slugify(e.target.value)) }} /></Field>
            case 'textarea':
              return <div key={f.key} className="sm:col-span-2"><Field label={f.label} required={f.required} error={err} hint={f.hint}><textarea rows={4} className="input" value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} /></Field></div>
            case 'select':
              return <Field key={f.key} label={f.label} required={f.required} error={err}><select className="input" value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}><option value="">{f.empty ?? 'None'}</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
            case 'switch':
              return <div key={f.key} className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3"><span className="text-sm font-medium">{f.label}</span><Switch label={f.label} checked={Boolean(v[f.key])} onChange={(x) => set(f.key, x)} /></div>
            case 'image':
              return <div key={f.key} className="sm:col-span-2"><ImageField label={f.label} value={(v[f.key] as string | null) ?? null} onChange={(x) => set(f.key, x)} /></div>
            case 'lines':
              return <div key={f.key} className="sm:col-span-2"><Field label={f.label} hint={f.hint ?? 'One per line.'}><textarea rows={4} className="input" value={Array.isArray(v[f.key]) ? (v[f.key] as string[]).join('\n') : ''} onChange={(e) => set(f.key, e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} /></Field></div>
          }
        })}
        {p.reorder && <Field label="Sort order" hint="Lower numbers appear first."><input type="number" className="input" value={String(v.sort_order ?? 0)} onChange={(e) => set('sort_order', e.target.value)} /></Field>}
      </div>
    </Modal>
  )
}
