import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, MessageCircle, X } from 'lucide-react'
import { useSettings } from '@/lib/settings'
import { cn, whatsappLink } from '@/utils/format'
import { Spinner } from '@/components/ui'

const NAV = [
  { to: '/portfolio', label: 'Portfolio' }, { to: '/services', label: 'Services' }, { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' }, { to: '/contact', label: 'Contact' },
]

export function Brand({ light }: { light?: boolean }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-display text-lg font-bold tracking-tight', light && 'text-white')}>
      {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-8 w-auto" />}
      <span>{settings?.brand_name ?? ''}</span>
    </Link>
  )
}

export default function PublicLayout() {
  const { settings, loading, error } = useSettings()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  if (loading) return <Spinner label="Loading…" className="min-h-screen" />
  if (settings?.maintenance_mode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-4xl font-bold">{settings.brand_name}</h1>
        <p className="mt-3 max-w-md text-black/60">We are making some improvements and will be back shortly.</p>
        <Link to="/admin" className="mt-8 text-xs text-black/30 hover:text-black/60">Admin</Link>
      </main>
    )
  }
  const wa = whatsappLink(settings?.whatsapp, settings?.default_contact_message ?? undefined)
  const socials = Object.entries(settings?.social_links ?? {}).filter(([, v]) => v)

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Brand />
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('transition hover:text-accent', isActive && 'font-semibold')}>{n.label}</NavLink>
            ))}
            <Link to="/request" className="btn btn-primary">Start a project</Link>
          </nav>
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper px-6 py-5 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between"><Brand /><button onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-6 w-6" /></button></div>
          <nav className="mt-10 flex flex-col gap-5 font-display text-3xl font-semibold">
            {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
          </nav>
          <Link to="/request" className="btn btn-accent mt-auto !py-4 text-base">Start a project</Link>
        </div>
      )}

      <main id="main" className="flex-1">
        {error && <div role="alert" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">Some site information could not be loaded.</div>}
        <Outlet />
      </main>

      <footer className="mt-24 bg-ink text-white">
        <div className="container-x grid gap-10 py-14 md:grid-cols-3">
          <div>
            <Brand light />
            <p className="mt-4 max-w-xs text-sm text-white/60">{settings?.footer_text ?? settings?.short_description}</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm text-white/70">
            {[...NAV, { to: '/request', label: 'Request a design' }, { to: '/privacy', label: 'Privacy' }, { to: '/terms', label: 'Terms' }].map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-white">{n.label}</Link>
            ))}
          </nav>
          <div className="space-y-2 text-sm text-white/70">
            {settings?.email && <a className="block hover:text-white" href={`mailto:${settings.email}`}>{settings.email}</a>}
            {settings?.phone && <a className="block hover:text-white" href={`tel:${settings.phone}`}>{settings.phone}</a>}
            {settings?.address && <p>{settings.address}</p>}
            {socials.length > 0 && (
              <p className="flex flex-wrap gap-x-4 pt-2">
                {socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white">{k}</a>)}
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">{settings?.copyright_text}</div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105">
          <MessageCircle className="h-5 w-5" /><span className="hidden sm:inline">Chat on WhatsApp</span>
        </a>
      )}
    </div>
  )
}
