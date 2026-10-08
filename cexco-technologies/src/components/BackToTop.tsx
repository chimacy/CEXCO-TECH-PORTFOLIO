import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/utils/format'

const R = 22
const C = 2 * Math.PI * R

/** Floating button (bottom right) with a progress ring that fills as you scroll down the page. */
export function BackToTop() {
  const [show, setShow] = useState(false)
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, y / max) : 0
      ring.current?.setAttribute('stroke-dashoffset', String(C * (1 - p)))
      setShow(y > 500)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', on, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [])

  return (
    <button type="button" aria-label="Back to top" tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        'group fixed z-50 flex h-[54px] w-[54px] items-center justify-center rounded-full border border-black/10 bg-white text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,.25)] transition duration-300 hover:bg-ink hover:text-white',
        'bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] sm:bottom-8 sm:right-8',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 54 54" aria-hidden>
        <circle cx="27" cy="27" r={R} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="2" />
        <circle ref={ring} cx="27" cy="27" r={R} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} style={{ stroke: 'rgb(var(--accent))' }} />
      </svg>
      <ArrowUp className="relative h-5 w-5 transition duration-300 group-hover:-translate-y-0.5" />
    </button>
  )
        }
