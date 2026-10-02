export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export function formatPrice(price: number | null | undefined, label?: string | null, currency = '₦'): string {
  if (price == null) return label?.trim() || 'Contact for pricing'
  const amount = `${currency}${Number(price).toLocaleString('en-NG')}`
  return label?.trim() ? `${label.trim()} ${amount}` : amount
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function formatBytes(n: number | null | undefined): string {
  if (!n) return '—'
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = n
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`
}

export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  const digits = (number ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong.'
}
