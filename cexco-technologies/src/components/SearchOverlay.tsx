import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useCached } from '@/lib/cache'
import { useTileRatio } from '@/lib/sections'
import { catsAll, searchIndex } from '@/services/projects'
import { rankProjects } from '@/utils/search'
import { WorkTile } from '@/components/WorkGrid'

const IDEAS = ['Flyer', 'Logo', 'Church', 'Wedding', 'Birthday', 'Social media', 'Business card']

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const idx = useCached('search-index', searchIndex)
  const cats = useCached('cats-all', catsAll)
  const ratio = useTileRatio()
  const inputRef = useRef<HTMLInputElement>(null)
  const { pathname, search } = useLocation()
  const startedAt = useRef(pathname + search)

  useEffect(() => { if (pathname + search !== startedAt.current) onClose() }, [pathname, search, onClose]) // close when a result is opened
  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const results = useMemo(() => (idx.data && q.trim() ? rankProjects(idx.data, q).slice(0, 24) : []), [idx.data, q])
  const ideas = [...(cats.data ?? []).map((c) => c.name).slice(0, 8), ...IDEAS].filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i).slice(0, 10)
  const searching = q.trim().length > 0

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-white" role="dialog" aria-modal="true" aria-label="Search designs">
      <div className="container-x pb-16 pt-5 sm:pt-8">
        <div className="flex items-center gap-4 border-b border-ink pb-3">
          <Search className="h-5 w-5 shrink-0 text-black/40" aria-hidden />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off" autoCorrect="off" spellCheck={false}
            placeholder="Search designs… e.g. church flyer, wedding, logo" aria-label="Search designs"
            className="min-w-0 flex-1 bg-transparent font-display text-xl font-medium tracking-tight outline-none placeholder:text-black/30 sm:text-3xl" />
          <button onClick={onClose} aria-label="Close search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 transition hover:border-accent hover:text-accent"><X className="h-4 w-4" /></button>
        </div>

        {!searching && (
          <div className="mt-8">
            <p className="eyebrow">Try searching for</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {ideas.map((t) => <button key={t} onClick={() => setQ(t)} className="rounded-full border border-black/15 px-4 py-2 text-[13px] transition hover:border-accent hover:text-accent">{t}</button>)}
            </div>
          </div>
        )}

        {searching && (
          <div className="mt-8" aria-live="polite">
            {!idx.data && !idx.error && <p className="text-sm text-black/50">Searching…</p>}
            {idx.error && <p className="text-sm text-red-600">Search is unavailable right now. Please try again.</p>}
            {idx.data && (results.length > 0 ? (
              <>
                <p className="mb-6 text-sm text-black/50">{results.length} design{results.length === 1 ? '' : 's'} found</p>
                <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4">
                  {results.map((p) => <WorkTile key={p.id} p={p} ratio={ratio} priority />)}
                </div>
              </>
            ) : (
              <div>
                <p className="font-display text-xl font-medium">No designs match “{q.trim()}”.</p>
                <p className="mt-2 text-sm text-black/55">Try a simpler word, or browse by category:</p>
                <div className="mt-4 flex flex-wrap gap-2.5">{ideas.map((t) => <button key={t} onClick={() => setQ(t)} className="rounded-full border border-black/15 px-4 py-2 text-[13px] transition hover:border-accent hover:text-accent">{t}</button>)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
    }
