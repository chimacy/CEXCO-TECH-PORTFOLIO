import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { Bold, Heading2, Italic, Link2, List, ListOrdered } from 'lucide-react'

const clean = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'iframe', 'script'], FORBID_ATTR: ['style'] })

/** Small contentEditable editor. Output is sanitised with DOMPurify before it is handed back. */
export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== clean(value)) ref.current.innerHTML = clean(value) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (c: string, arg?: string) => { ref.current?.focus(); document.execCommand(c, false, arg); emit() }
  const emit = () => onChange(clean(ref.current?.innerHTML ?? ''))
  const btn = (label: string, Icon: typeof Bold, run: () => void) => <button type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={run} className="rounded-lg p-2 hover:bg-black/5"><Icon className="h-4 w-4" /></button>
  return (
    <div className="rounded-xl border border-black/15 bg-white focus-within:border-ink">
      <div className="flex gap-1 border-b border-black/10 p-1.5">
        {btn('Bold', Bold, () => cmd('bold'))}{btn('Italic', Italic, () => cmd('italic'))}{btn('Heading', Heading2, () => cmd('formatBlock', 'h2'))}
        {btn('Bulleted list', List, () => cmd('insertUnorderedList'))}{btn('Numbered list', ListOrdered, () => cmd('insertOrderedList'))}
        {btn('Link', Link2, () => { const u = window.prompt('Link URL (https://…)'); if (u && /^(https?:|mailto:)/i.test(u)) cmd('createLink', u) })}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Rich text content" onInput={emit} onBlur={emit}
        className="prose-lite min-h-[180px] space-y-3 p-3.5 text-sm outline-none [&_a]:text-accent [&_a]:underline [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" />
    </div>
  )
}
