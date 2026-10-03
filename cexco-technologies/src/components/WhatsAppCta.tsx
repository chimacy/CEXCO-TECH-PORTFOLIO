import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '@/lib/settings'
import { useSections } from '@/lib/sections'
import { whatsappLink } from '@/utils/format'

/** Closing call-to-action shown at the end of every page. Number comes from Settings; text and message from Admin → Homepage. */
export function WhatsAppCta() {
  const { settings } = useSettings()
  const sections = useSections()
  const { pathname } = useLocation()
  const row = sections?.find((s) => s.key === 'cta')
  if (!sections || !row) return null // hidden (or not set up yet)

  const custom = row.config?.wa === true
  const heading = (custom && row.title) || 'Like what you see?'
  const text = custom ? row.description : "Let's talk about your next design."
  const label = (custom && row.cta_text) || 'Chat on WhatsApp'
  const raw = (typeof row.config?.whatsapp_message === 'string' && row.config.whatsapp_message) || settings?.default_contact_message || 'Hello, I saw your portfolio and I would like to discuss a design.'
  const href = whatsappLink(settings?.whatsapp, raw.replace(/\{link\}/g, `${window.location.origin}${pathname}`))
  if (!href) return null

  return (
    <section aria-label="Contact on WhatsApp" className="container-x mt-24 sm:mt-36">
      <div className="grid items-end gap-8 border-t border-black/10 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">Say hello</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,8vw,3rem)] font-medium uppercase leading-[1] tracking-[-0.03em] sm:text-[clamp(2.75rem,6vw,5.5rem)]">{heading}</h2>
          {text && <p className="mt-5 max-w-md text-[15px] leading-relaxed text-black/60 sm:text-base">{text}</p>}
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-accent px-8 py-4 text-[12px] font-medium uppercase tracking-[.18em] text-white transition hover:bg-accent-dark sm:w-auto sm:py-5">
            <MessageCircle className="h-4 w-4" aria-hidden />{label}
            <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
    }
