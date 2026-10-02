import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '@/lib/settings'
import { cn, whatsappLink } from '@/utils/format'
import { Spinner } from '@/components/ui'

export function Brand({ className }: { className?: string }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-6 w-auto shrink-0 sm:h-7" />}
      <span className="truncate font-display text-[13px] font-semibold uppercase tracking-[.12em] sm:text-[15px] sm:tracking-[.16em]">{settings?.brand_name ?? ''}</span>
    </Link>
  )
}

export default function PublicLayout() {
  const { settings, loading, error } = useSettings()
  const { pathname, hash } = useLocation()

  // Scroll to top on page change, or to the #section when the link has one
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
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-4xl font-medium">{settings.brand_name}</h1>
        <p className="mt-3 max-w-md text-black/60">We are making some improvements and will be back shortly.</p>
        <Link to="/admin" className="mt-8 text-xs text-black/30 hover:text-black/60">Admin</Link>
      </main>
    )
  }

  const wa = whatsappLink(settings?.whatsapp, settings?.default_contact_message ?? undefined)
  const socials = Object.entries(settings?.social_links ?? {}).filter(([, v]) => v)
  const contacts: { label: string; href: string; text: string }[] = [
    ...(settings?.email ? [{ label: 'Email', href: `mailto:${settings.email}`, text: settings.email }] : []),
    ...(wa ? [{ label: 'WhatsApp', href: wa, text: settings?.whatsapp ?? 'Message' }] : []),
    ...(settings?.phone ? [{ label: 'Phone', href: `tel:${settings.phone}`, text: settings.phone }] : []),
  ]
  const hasContact = contacts.length > 0 || socials.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/90 backdrop-blur">
        <div className="container-x flex h-14 items-center justify-between gap-4 sm:h-16">
          <Brand />
          <nav aria-label="Main" className="flex shrink-0 items-center gap-5 text-[13px] sm:gap-8 sm:text-sm">
            <Link to="/#work" className="transition hover:text-accent">Work</Link>
            {hasContact && <a href="#contact" className="transition hover:text-accent">Contact</a>}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {error && <div role="alert" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">Some site information could not be loaded.</div>}
        <Outlet />
      </main>

      <footer id="contact" className="mt-20 scroll-mt-16 border-t border-black/10 sm:mt-28">
        <div className="container-x grid gap-10 py-12 sm:py-16 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="font-display text-2xl font-medium leading-tight tracking-[-0.01em] sm:text-3xl">{settings?.brand_name}</p>
            {(settings?.footer_text ?? settings?.short_description) && <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/55">{settings?.footer_text ?? settings?.short_description}</p>}
          </div>
          {hasContact && (
            <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-8 gap-y-3 text-sm">
              {contacts.map((c) => (
                <div key={c.label} className="contents">
                  <dt className="text-[11px] uppercase tracking-[.18em] text-black/45">{c.label}</dt>
                  <dd className="min-w-0 break-words"><a href={c.href} target={c.label === 'WhatsApp' ? '_blank' : undefined} rel="noopener noreferrer" className="transition hover:text-accent">{c.text}</a></dd>
                </div>
              ))}
              {socials.length > 0 && (
                <div className="contents">
                  <dt className="text-[11px] uppercase tracking-[.18em] text-black/45">Follow</dt>
                  <dd className="flex flex-wrap gap-x-4 gap-y-1">{socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="capitalize transition hover:text-accent">{k}</a>)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <div className="border-t border-black/10">
          <p className="container-x py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-[11px] tracking-wide text-black/40">{settings?.copyright_text}</p>
        </div>
      </footer>
    </div>
  )
}
