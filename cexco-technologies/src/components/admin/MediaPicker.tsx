import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { Img, Modal } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { listRows, uploadMedia } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'
import type { MediaItem } from '@/types'

export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const { data, loading, reload } = useAsync(() => listRows('media') as unknown as Promise<MediaItem[]>, [open])
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    try { const m = await uploadMedia(list[0]); toast.success('Image uploaded.'); onPick(m.url); onClose() } catch (e) { toast.error(errMsg(e)); reload() } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Choose an image" wide>
      <button className="btn btn-primary mb-4" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload new</button>
      <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files)} />
      {loading ? <p className="py-8 text-center text-sm text-black/50">Loading images…</p> : !data?.length ? <p className="py-8 text-center text-sm text-black/50">No images yet. Upload one above.</p> :
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {data.map((m) => <button key={m.id} onClick={() => { onPick(m.url); onClose() }} className="aspect-square overflow-hidden rounded-xl bg-black/5 ring-ink hover:ring-2"><Img src={m.url} alt={m.file_name} width={300} /></button>)}
        </div>}
    </Modal>
  )
}

export function ImageField({ value, onChange, label = 'Image' }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const [pick, setPick] = useState(false)
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5">{value ? <Img src={value} alt="" width={200} /> : <div className="flex h-full items-center justify-center text-black/25"><ImagePlus className="h-6 w-6" /></div>}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setPick(true)}>{value ? 'Change' : 'Choose / upload'}</button>
          {value && <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} aria-label={`Remove ${label}`}><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
      <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(u) => onChange(u)} />
    </div>
  )
}
