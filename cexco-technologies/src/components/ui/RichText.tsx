import DOMPurify from 'dompurify'

/** Renders admin-authored HTML after sanitising it. */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'iframe'], FORBID_ATTR: ['style'] })
  return <div className={`prose-lite space-y-4 leading-relaxed text-black/75 [&_a]:text-accent [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: safe }} />
}
