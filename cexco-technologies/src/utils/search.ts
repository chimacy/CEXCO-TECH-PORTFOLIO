import type { Project } from '@/utils/project'

// Words that carry no meaning in a request like "I want to see some church flyer designs"
const STOP = new Set(['a', 'an', 'the', 'for', 'of', 'to', 'me', 'i', 'my', 'we', 'want', 'need', 'see', 'show', 'some', 'any', 'kind', 'kinds', 'type', 'types', 'design', 'designs', 'designed', 'please', 'looking', 'look', 'like', 'with', 'and', 'in', 'on', 'about', 'that', 'this', 'something', 'related', 'relating', 'work', 'works', 'project', 'projects', 'is', 'are', 'it', 'be', 'can', 'you'])

// Words that mean (almost) the same thing in design, so "poster" also finds flyers and "church" finds ministry work
const GROUPS = [
  ['flyer', 'flier', 'poster', 'handbill', 'leaflet'],
  ['logo', 'emblem', 'mark', 'monogram', 'wordmark', 'brand', 'branding', 'identity', 'rebrand'],
  ['social', 'instagram', 'facebook', 'whatsapp', 'status', 'story', 'stories', 'tiktok', 'twitter', 'post', 'carousel', 'media'],
  ['church', 'religious', 'ministry', 'worship', 'gospel', 'crusade', 'revival', 'prayer', 'christian', 'fellowship', 'sunday', 'thanksgiving', 'praise'],
  ['event', 'concert', 'party', 'show', 'festival', 'night', 'live', 'conference', 'seminar', 'summit'],
  ['wedding', 'marriage', 'bridal', 'engagement', 'invitation', 'invite', 'anniversary'],
  ['political', 'politics', 'campaign', 'election', 'leadership', 'candidate', 'rally', 'aspirant', 'vote'],
  ['academic', 'school', 'university', 'graduation', 'convocation', 'student', 'faculty', 'department', 'education', 'alumni'],
  ['business', 'corporate', 'company', 'brochure', 'letterhead', 'stationery', 'profile', 'catalogue', 'catalog', 'menu'],
  ['product', 'advert', 'advertisement', 'promo', 'promotion', 'sale', 'launch', 'ad'],
  ['birthday', 'bday', 'celebration', 'party'],
  ['christmas', 'xmas', 'carol', 'festive', 'easter', 'holiday'],
  ['banner', 'billboard', 'signage'],
]
const SYN = new Map<string, Set<string>>()
for (const g of GROUPS) for (const w of g) { const s = SYN.get(w) ?? new Set<string>(); g.forEach((x) => x !== w && s.add(x)); SYN.set(w, s) }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ')
const words = (s: string | null | undefined) => (s ? norm(s).split(/\s+/).filter(Boolean) : [])
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)

/** Edit distance, stopping early once it exceeds `max` */
function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/** 1 = same word, lower = looser match (starts with / contains / small typo), 0 = no match */
function similarity(q: string, f: string): number {
  if (q === f || singular(q) === singular(f)) return 1
  if (q.length >= 3 && f.startsWith(q)) return 0.8
  if (q.length >= 4 && f.includes(q)) return 0.6
  const max = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0
  return max && lev(q, f, max) <= max ? 0.5 : 0
}

interface Field { w: number; words: string[] }
const fieldsOf = (p: Project): Field[] => [
  { w: 5, words: words(p.title) },
  { w: 4, words: (p.cats ?? []).flatMap((c) => words(c.name)) },
  { w: 3, words: [String(p.year ?? '')].filter(Boolean) },
  { w: 2, words: words(p.short_description) },
  { w: 2, words: [...words(p.client_name), ...words(p.client_type)] },
]

/** Rank projects for a free-typed request. Understands synonyms, plurals and small typos. */
export function rankProjects(items: Project[], query: string): Project[] {
  let tokens = words(query).filter((t) => !STOP.has(t))
  if (!tokens.length) tokens = words(query)
  if (!tokens.length) return []
  const alts = tokens.map((t) => [{ t, k: 1 }, ...[...(SYN.get(t) ?? SYN.get(singular(t)) ?? [])].map((s) => ({ t: s, k: 0.6 }))])

  const scored: { p: Project; s: number }[] = []
  for (const p of items) {
    const fields = fieldsOf(p)
    let total = 0, hit = 0
    for (const options of alts) {
      let best = 0
      for (const o of options) for (const f of fields) for (const w of f.words) { const sim = similarity(o.t, w); if (sim) best = Math.max(best, sim * o.k * f.w) }
      if (best) { total += best; hit++ }
    }
    if (!hit) continue
    scored.push({ p, s: hit === tokens.length ? total * 1.3 : total })
  }
  return scored.sort((a, b) => b.s - a.s || Number(a.p.sort_order) - Number(b.p.sort_order)).map((x) => x.p)
   }
