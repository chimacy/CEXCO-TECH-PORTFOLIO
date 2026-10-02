import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react'
import { cn } from '@/utils/format'
import { srcSet, transformUrl } from '@/utils/image'

export function Spinner({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-16 text-sm text-black/50', className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center">
      <Inbox className="mb-3 h-8 w-8 text-black/30" aria-hidden />
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-black/55">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-red-500" aria-hidden />
      <p className="font-medium text-red-700">{message}</p>
      {onRetry && <button className="btn btn-ghost mt-4" onClick={onRetry}>Try again</button>}
    </div>
  )
}

/** Deterministic neutral artwork used when an item has no image yet. */
export function PlaceholderArt({ seed, className }: { seed: string; className?: string }) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return (
    <div aria-hidden className={cn('flex h-full w-full items-end p-4', className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 18% 90%), hsl(${(hue + 40) % 360} 22% 78%))` }}>
      <span className="font-display text-4xl font-bold leading-none text-black/10">{seed.replace(/^Sample — /, '').slice(0, 2).toUpperCase()}</span>
    </div>
  )
}

interface ImgProps { src: string | null | undefined; alt: string; seed?: string; className?: string; width?: number; sizes?: string; eager?: boolean }
export function Img({ src, alt, seed, className, width = 800, sizes = '(min-width:1024px) 33vw, 100vw', eager }: ImgProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (!src || failed) return <PlaceholderArt seed={seed ?? alt} className={className} />
  return (
    <img
      src={transformUrl(src, width)} srcSet={srcSet(src)} sizes={srcSet(src) ? sizes : undefined} alt={alt}
      loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)}
      onError={(e) => { if (e.currentTarget.src !== src) e.currentTarget.src = src; else setFailed(true) }}
      className={cn('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
    />
  )
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cn('relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-full p-1.5 hover:bg-black/5"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</button>
      </>}>
      <p className="text-sm text-black/70">{message}</p>
    </Modal>
  )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-sm">
      <button className="btn btn-ghost !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
      <span className="tabular-nums text-black/60">Page {page} of {pages}</span>
      <button className="btn btn-ghost !px-3" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
    </nav>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-ink' : 'bg-black/20')}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

export function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="ml-0.5 text-accent" aria-hidden>*</span>}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-black/45">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800', draft: 'bg-amber-100 text-amber-800', archived: 'bg-black/10 text-black/60',
  new: 'bg-blue-100 text-blue-800', reviewing: 'bg-violet-100 text-violet-800', quoted: 'bg-amber-100 text-amber-800',
  approved: 'bg-teal-100 text-teal-800', in_progress: 'bg-indigo-100 text-indigo-800', revision: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-100 text-red-700',
  low: 'bg-black/5 text-black/60', normal: 'bg-black/5 text-black/70', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-700',
}
export function Badge({ value }: { value: string }) {
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[value] ?? 'bg-black/5')}>{value.replace('_', ' ')}</span>
}
