import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useSettings } from '@/lib/settings'
import { cn, whatsappLink } from '@/utils/format'
import { Spinner } from '@/components/ui'

export function Brand({ className }: { className?: string }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-2.5', className)} aria-label={settings?.brand_name ?? 'Home'}>
      {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-6 w-auto shrink-0 sm:h-7" />}
      <span className="truncate font-display text-[13px] font-semibold uppercase tracking-[.14em] sm:text-sm sm:tracking-[.18em]">{settings?.brand_name ?? ''}</span>
    </Link>
  )
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn('relative py-1 text-[12px] font-medium uppercase tracking-[.18em] transition hover:text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-accent after:transition-transform',
    isActive ? 'after:scale-x-100' : 'after:scale-x-0')

export default function PublicLayout() {
  const { settings, loading, error } = useSettings()
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
      return () => window.clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

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

  const wa = whatsappLink(settings?.whatsapp, settings?.default_contact_message ?? undefined)
  const social = Object.entries(settings?.social_links ?? {}).filter(([, v]) => v)
  const links: { label: string; href: string }[] = [
    ...(wa ? [{ label: 'WhatsApp', href: wa }] : []),
    ...social.map(([k, v]) => ({ label: k === 'x' ? 'X' : k.charAt(0).toUpperCase() + k.slice(1), href: v })),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-black/[.07] bg-white/90 backdrop-blur">
        <div className="container-x flex h-14 items-center justify-between gap-6 sm:h-16">
          <Brand />
          <nav aria-label="Main" className="flex shrink-0 items-center gap-6 sm:gap-9">
            <NavLink to="/work" className={linkCls}>Work</NavLink>
            <NavLink to="/about" className={linkCls}>About</NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {error && <div role="alert" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">Some site information could not be loaded.</div>}
        <div key={pathname} className="animate-fade"><Outlet /></div>
      </main>

      <footer id="contact" className="mt-28 scroll-mt-16 border-t border-black/10 sm:mt-40">
        <div className="container-x grid gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">Let's connect</p>
            {settings?.email
              ? <a href={`mailto:${settings.email}`} className="mt-5 block break-words font-display text-[clamp(1.5rem,6.4vw,2.25rem)] font-medium tracking-[-0.02em] transition hover:text-accent sm:text-[clamp(2rem,4.4vw,3.75rem)]">{settings.email}</a>
              : <p className="mt-5 font-display text-2xl font-medium tracking-tight sm:text-4xl">{settings?.brand_name}</p>}
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-black/50">{settings?.footer_text ?? 'Selected work and visual experiments.'}</p>
          </div>
          {links.length > 0 && (
            <ul className="lg:col-span-4 lg:col-start-9">
              {links.map((l) => (
                <li key={l.label} className="border-b border-black/10 first:border-t">
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between py-3.5 text-[12px] font-medium uppercase tracking-[.18em] transition hover:text-accent">
                    {l.label}<ArrowUpRight className="h-4 w-4 text-black/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-black/10">
          <div className="container-x flex flex-wrap items-center justify-between gap-2 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[11px] tracking-wide text-black/40">
            <span>{settings?.copyright_text ?? `© ${new Date().getFullYear()} ${settings?.brand_name ?? ''}`}</span>
            <span className="uppercase tracking-[.18em]">{settings?.brand_name}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
