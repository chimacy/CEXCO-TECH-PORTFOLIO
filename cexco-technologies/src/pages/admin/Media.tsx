import { useRef, useState } from 'react'
import { Copy, Loader2, Search, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog, EmptyState, ErrorState, Img, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { deleteMedia, listRows, uploadMedia } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg, formatBytes, formatDate } from '@/utils/format'
import type { MediaItem } from '@/types'

export default function MediaLibrary() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('media') as unknown as Promise<MediaItem[]>, [])
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [del, setDel] = useState<MediaItem | null>(null); const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const rows = (data ?? []).filter((m) => !q.trim() || m.file_name.toLowerCase().includes(q.trim().toLowerCase()))
  const upload = async (list: FileList | null) => {
    if (!list?.length) return; setBusy(true); let ok = 0
    for (const f of Array.from(list)) { try { await uploadMedia(f); ok++ } catch (e) { toast.error(errMsg(e)) } }
    if (ok) toast.success(`${ok} file${ok > 1 ? 's' : ''} uploaded.`); setBusy(false); if (ref.current) ref.current.value = ''; reload()
  }
  const copy = async (u: string) => { try { await navigator.clipboard.writeText(u); toast.success('URL copied.') } catch { toast.error('Could not copy the URL.') } }
  const remove = async () => { if (!del) return; setDeleting(true); try { await deleteMedia(del); toast.success('File deleted.'); setDel(null); reload() } catch (e) { toast.error(errMsg(e)) } finally { setDeleting(false) } }
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">Media Library</h1>
        <button className="btn btn-primary" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload images</button>
        <input ref={ref} type="file" multiple accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files)} /></div>
      <div className="relative mb-5"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search files" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading ? <Spinner label="Loading media…" /> : error ? <ErrorState message="Unable to load media." onRetry={reload} /> : !rows.length ? <EmptyState title="No files found." hint="Upload images to use them across the site." /> :
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{rows.map((m) => (
          <div key={m.id} className="card overflow-hidden"><div className="aspect-square bg-black/5"><Img src={m.url} alt={m.file_name} width={400} /></div>
            <div className="p-3 text-xs"><p className="truncate font-medium" title={m.file_name}>{m.file_name}</p><p className="text-black/45">{m.mime_type?.replace('image/', '').toUpperCase()} · {formatBytes(m.size_bytes)} · {formatDate(m.created_at)}</p>
              <div className="mt-2 flex gap-2"><button className="btn btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => void copy(m.url)}><Copy className="h-3.5 w-3.5" /> Copy URL</button><button className="btn btn-ghost !px-2.5 !py-1 text-red-600" aria-label={`Delete ${m.file_name}`} onClick={() => setDel(m)}><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>))}</div>}
      <ConfirmDialog open={!!del} title="Delete this file?" message="This action cannot be undone. Pages using this image will show a placeholder." busy={deleting} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  )
}
