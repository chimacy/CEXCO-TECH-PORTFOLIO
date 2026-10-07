import { useEffect, useRef, useState } from 'react'
import { Crop, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Img, Modal } from '@/components/ui'
import { MediaPicker } from '@/components/admin/MediaPicker'
import { uploadMedia } from '@/services/admin'
import { useToast } from '@/lib/toast'
import { errMsg } from '@/utils/format'

const ASPECT = 16 / 10 // the frame the hero image is shown in on the website

/** Drag to position, slider to zoom: choose exactly which part of a design fills the hero frame. */
function CropModal({ src, busy, onCancel, onDone }: { src: string; busy: boolean; onCancel: () => void; onDone: (file: File) => void }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [W, setW] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const H = W / ASPECT

  useEffect(() => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => setImg(im)
    im.onerror = () => setErr('Could not load this image for cropping.')
    im.src = src
  }, [src])
  useEffect(() => {
    const measure = () => { if (frameRef.current) setW(frameRef.current.clientWidth) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [img])

  const base = img && W ? Math.max(W / img.naturalWidth, H / img.naturalHeight) : 1
  const s = base * zoom
  const dw = img ? img.naturalWidth * s : 0
  const dh = img ? img.naturalHeight * s : 0
  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, -(dw - W) / 2), (dw - W) / 2),
    y: Math.min(Math.max(y, -(dh - H) / 2), (dh - H) / 2),
  })
  const o = clamp(off.x, off.y)

  const apply = () => {
    if (!img || !W) return
    try {
      const srcW = W / s, srcH = H / s
      const srcX = (dw / 2 - W / 2 - o.x) / s
      const srcY = (dh / 2 - H / 2 - o.y) / s
      const outW = Math.min(1600, Math.round(srcW))
      const outH = Math.round(outW / ASPECT)
      const c = document.createElement('canvas'); c.width = outW; c.height = outH
      const ctx = c.getContext('2d'); if (!ctx) throw new Error('Cropping is not supported in this browser.')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
      c.toBlob((blob) => {
        if (!blob) { setErr('Could not create the cropped image.'); return }
        onDone(new File([blob], `hero-${Date.now()}.webp`, { type: 'image/webp' }))
      }, 'image/webp', 0.92)
    } catch (e) {
      setErr(/tainted|security/i.test(errMsg(e)) ? 'The browser blocked this image from being cropped. Upload the file again from your device and crop that copy.' : errMsg(e))
    }
  }

  return (
    <Modal open onClose={busy ? () => undefined : onCancel} title="Crop hero image"
      footer={<>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={apply} disabled={busy || !img}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Apply crop</button>
      </>}>
      {err && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <p className="mb-3 text-sm text-black/60">Drag the image to choose the area you want to show. Use the slider to zoom. The frame is the exact shape used on the website.</p>
      <div ref={frameRef} className="relative mx-auto w-full max-w-[560px] touch-none overflow-hidden rounded-[20px] bg-black/10" style={{ aspectRatio: String(ASPECT), cursor: 'grab' }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, ox: o.x, oy: o.y } }}
        onPointerMove={(e) => { if (drag.current) setOff(clamp(drag.current.ox + e.clientX - drag.current.px, drag.current.oy + e.clientY - drag.current.py)) }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        {img && W > 0 && (
          <img src={src} alt="" draggable={false} className="pointer-events-none absolute select-none"
            style={{ left: (W - dw) / 2 + o.x, top: (H - dh) / 2 + o.y, width: dw, height: dh, maxWidth: 'none', maxHeight: 'none' }} />
        )}
        {!img && !err && <div className="flex h-full items-center justify-center text-sm text-black/50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>}
      </div>
      <div className="mx-auto mt-4 flex max-w-[560px] items-center gap-3">
        <span className="text-xs text-black/50">Zoom</span>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" aria-label="Zoom" />
      </div>
    </Modal>
  )
}

/** Hero image picker: choose or upload a design, then crop the part you want shown. */
export function HeroImageField({ value, source, onChange }: { value: string | null; source: string | null; onChange: (url: string | null, source: string | null) => void }) {
  const toast = useToast()
  const [pick, setPick] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const finish = async (file: File) => {
    setBusy(true)
    try {
      const m = await uploadMedia(file, 'hero')
      onChange(m.url, cropSrc)
      setCropSrc(null)
      toast.success('Hero image cropped. Press Save to publish it.')
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <span className="label">Opening image (optional)</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="aspect-[16/10] w-44 shrink-0 overflow-hidden rounded-xl bg-black/5">
          {value ? <Img src={value} alt="" width={400} /> : <div className="flex h-full items-center justify-center text-black/25"><ImagePlus className="h-6 w-6" /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setPick(true)}>{value ? 'Choose another' : 'Choose / upload'}</button>
          {value && source && <button type="button" className="btn btn-ghost" onClick={() => setCropSrc(source)}><Crop className="h-4 w-4" /> Adjust crop</button>}
          {value && <button type="button" className="btn btn-ghost" aria-label="Remove hero image" onClick={() => onChange(null, null)}><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
      <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(u) => { setPick(false); setCropSrc(u) }} />
      {cropSrc && <CropModal src={cropSrc} busy={busy} onCancel={() => setCropSrc(null)} onDone={(f) => void finish(f)} />}
    </div>
  )
}
