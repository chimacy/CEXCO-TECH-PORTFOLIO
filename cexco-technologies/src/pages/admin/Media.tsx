import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { ClipboardPaste, Copy, Loader2, Search, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog, EmptyState, ErrorState, Img, Spinner } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { deleteMedia, listRows, uploadMedia } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg, formatBytes, formatDate } from '@/utils/format'
import type { MediaItem } from '@/types'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

export default function MediaLibrary() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => listRows('media') as unknown as Promise<MediaItem[]>, [])
  const [q, setQ] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [del, setDel] = useState<MediaItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const busy = progress !== null
  const rows = (data ?? []).filter((m) => !q.trim() || m.file_name.toLowerCase().includes(q.trim().toLowerCase()))

  const uploadFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) { toast.error('No image found to upload.'); return }
    setProgress({ done: 0, total: images.length })
    let ok = 0
    for (const [i, f] of images.entries()) {
      try { await uploadMedia(f); ok++ } catch (e) { toast.error(errMsg(e)) }
      setProgress({ done: i + 1, total: images.length })
    }
    if (ok) toast.success(`${ok} image${ok > 1 ? 's' : ''} uploaded.`)
    setProgress(null)
    reload()
  }, [toast, reload])

  // Always call the latest uploader from the long-lived paste listener
  const uploadRef = useRef(uploadFiles)
  uploadRef.current = uploadFiles
  const busyRef = useRef(busy)
  busyRef.current = busy

  // Paste an image (Ctrl+V / Cmd+V) anywhere on this page to upload it
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const files = items.filter((it) => it.kind === 'file' && it.type.startsWith('image/')).map((it) => it.getAsFile()).filter((f): f is File => !!f)
      if (!files.length) return // plain text paste (e.g. into the search box) is left alone
      e.preventDefault()
      if (busyRef.current) { toast.error('Please wait for the current upload to finish.'); return }
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
      const named = files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pasted-${stamp}${files.length > 1 ? `-${i + 1}` : ''}.${EXT[f.type] ?? 'png'}`, { type: f.type })))
      void uploadRef.current(named)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [toast])

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (busy) return
    void uploadFiles(Array.from(e.dataTransfer.files))
  }

  const copy = async (u: string) => { try { await navigator.clipboard.writeText(u); toast.success('URL copied.') } catch { toast.error('Could not copy the URL.') } }
  const remove = async () => { if (!del) return; setDeleting(true); try { await deleteMedia(del); toast.success('File deleted.'); setDel(null); reload() } catch (e) { toast.error(errMsg(e)) } finally { setDeleting(false) } }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">Media Library</h1>
        <button className="btn btn-primary" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload images</button>
        <input ref={ref} type="file" multiple accept="image/*" className="sr-only" onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} /></div>

      <div onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        className={`mb-5 flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${dragging ? 'border-accent bg-accent/5' : 'border-black/15 bg-white'}`}>
        {busy ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin" /> Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…</p>
        ) : (
          <>
            <ClipboardPaste className="mb-2 h-6 w-6 text-black/40" aria-hidden />
            <p className="text-sm font-medium">Copy a design, then press <kbd className="rounded border border-black/20 bg-black/5 px-1.5 py-0.5 text-xs">Ctrl</kbd> + <kbd className="rounded border border-black/20 bg-black/5 px-1.5 py-0.5 text-xs">V</kbd> on this page</p>
            <p className="mt-1 text-xs text-black/50">Mac: ⌘ + V. You can also drag and drop images here, or use the Upload button.</p>
          </>
        )}
      </div>

      <div className="relative mb-5"><Search className="absolute left-3.5 top-3 h-4 w-4 text-black/40" aria-hidden /><input className="input !pl-10" aria-label="Search files" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading ? <Spinner label="Loading media…" /> : error ? <ErrorState message="Unable to load media." onRetry={reload} /> : !rows.length ? <EmptyState title="No files found." hint="Paste, drop or upload images to use them across the site." /> :
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{rows.map((m) => (
          <div key={m.id} className="card overflow-hidden"><div className="aspect-square bg-black/5"><Img src={m.url} alt={m.file_name} width={400} /></div>
            <div className="p-3 text-xs"><p className="truncate font-medium" title={m.file_name}>{m.file_name}</p><p className="text-black/45">{m.mime_type?.replace('image/', '').toUpperCase()} · {formatBytes(m.size_bytes)} · {formatDate(m.created_at)}</p>
              <div className="mt-2 flex gap-2"><button className="btn btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => void copy(m.url)}><Copy className="h-3.5 w-3.5" /> Copy URL</button><button className="btn btn-ghost !px-2.5 !py-1 text-red-600" aria-label={`Delete ${m.file_name}`} onClick={() => setDel(m)}><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>))}</div>}
      <ConfirmDialog open={!!del} title="Delete this file?" message="This action cannot be undone. Pages using this image will show a placeholder." busy={deleting} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  )
}
