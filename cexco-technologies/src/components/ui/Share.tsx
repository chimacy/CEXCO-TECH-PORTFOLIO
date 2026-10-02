import { useState } from 'react'
import { Check, Copy, ExternalLink, MessageCircle, Share2 } from 'lucide-react'
import { useToast } from '@/lib/toast'

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const enc = encodeURIComponent
  const items = [
    { name: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { name: 'Facebook', icon: ExternalLink, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: 'X', icon: ExternalLink, href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { name: 'LinkedIn', icon: ExternalLink, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success('Link copied.'); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Could not copy the link.') }
  }
  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Share2 className="h-4 w-4" /> Share</button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
          <button onClick={copy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-black/5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
          </button>
          {items.map(({ name, icon: I, href }) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-black/5"><I className="h-4 w-4" /> {name}</a>
          ))}
        </div>
      )}
    </div>
  )
}
