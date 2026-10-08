import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useSettings } from '@/lib/settings'
import { cn } from '@/utils/format'
import { Spinner } from '@/components/ui'
import { BackToTop } from '@/components/BackToTop'
import { WhatsAppCta } from '@/components/WhatsAppCta'

const SearchOverlay = lazy(() => import('@/components/SearchOverlay'))

export function Brand({ className }: { className?: string }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-2.5', className)} aria-label={settings?.brand_name ?? 'Home'}>
      {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-6 w-auto shrink-0 sm:h-7" />}
      <span className="truncate font-display text-[13px] font-semibold uppercase tracking-[.14em] sm:text-sm sm:tracking-[.18em]">{settings?.brand_name ?? ''}</span>
    </Link>
  )
}

// Where the visitor was on each page, so "Back" returns to the exact spot instead of the top
const savedScroll = new Map<string, number>()
function restoreScroll(y: number) {
  let tries = 0
  const step = () => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
    if (Math.abs(window.scrollY - y) > 2 && tries++ < 40) requestAnimationFrame(step)
  }
  step()
}

export default function PublicLayout() {
  const { settings, loading, error } = useSettings()
  const { pathname, search, hash } = useLocation()
  const navType = useNavigationType()
  const [searching, setSearching] = useState(false)
  const closeSearch = useCallback(() => setSearching(false), [])
  const keyRef = useRef('')
  keyRef.current = pathname + search

  useEffect(() => { window.history.scrollRestoration = 'manual' }, [])

  // Remember the scroll position at the moment a link is clicked
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href]')) savedScroll.set(keyRef.current, window.scrollY)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
      return () => window.clearTimeout(t)
    }
    if (navType === 'POP') restoreScroll(savedScroll.get(pathname + search) ?? 0)
    else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash]) // eslint-disable-line react-hooks/exhaustive-deps

  // Design protection: no right-click / long-press menu, no dragging images out, no save or print shortcuts
  useEffect(() => {
    const inSite = (t: EventTarget | null) => t instanceof Element && !!t.closest('.public-site')
    const block = (e: Event) => { if (inSite(e.target)) e.preventDefault() }
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    document.addEventListener('contextmenu', block)
    document.addEventListener('dragstart', block)
    window.addEventListener('keydown', keys)
    return () => { document.removeEventListener('contextmenu', block); document.removeEventListener('dragstart', block); window.removeEventListener('keydown', keys) }
  }, [])

  if (loading) return <Spinner label="Loading…" className="min-h-screen" />
  if (settings?.maintenance_mode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-7 text-center">
        <h1 className="font-display text-4xl font-medium uppercase tracking-tight">{settings.brand_name}</h1>
        <p className="mt-3 max-w-md text-black/60">We are making some improvements and will be back shortly.</p>
        <Link to="/admin" className="mt-8 text-xs text-black/30 hover:text-black/60">Admin</Link>
      </main>
    )
  }

  return (
    <div className="public-site flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-black/[.07] bg-white">
        <div className="container-x flex h-14 items-center justify-between gap-4 sm:h-16">
          <Brand />
          <button onClick={() => setSearching(true)} aria-label="Search designs"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 transition-colors hover:border-accent hover:text-accent">
            <Search className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <main id="main" className="flex-1">
        {error && <div role="alert" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">Some site information could not be loaded.</div>}
        <div key={pathname}><Outlet /></div>
      </main>

      <WhatsAppCta />

      <footer className="mt-16 border-t border-black/10 sm:mt-24">
        <p className="container-x py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[11px] tracking-wide text-black/40">
          {settings?.copyright_text ?? `© ${new Date().getFullYear()} ${settings?.brand_name ?? ''}`}
        </p>
      </footer>

      <BackToTop />
      {searching && <Suspense fallback={null}><SearchOverlay onClose={closeSearch} /></Suspense>}
    </div>
  )
  }
