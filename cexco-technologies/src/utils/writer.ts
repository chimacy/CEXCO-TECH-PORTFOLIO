// Built-in "smart writer": reads the project title and drafts a short description, a description and suitable categories.
// It runs entirely in the browser (no account, no cost). Everything it writes can be edited before publishing.

const TYPES = [
  { words: ['flyer', 'flier', 'handbill', 'leaflet'], noun: 'flyer', purpose: ['grab attention and put the key details in front of people at a glance', 'promote the occasion clearly and invite people to attend'] },
  { words: ['poster', 'banner', 'billboard'], noun: 'poster', purpose: ['stop people in their tracks and communicate the message from a distance', 'carry one strong message with plenty of visual impact'] },
  { words: ['logo', 'emblem', 'monogram', 'wordmark'], noun: 'logo design', purpose: ['capture the character of the brand in a simple, memorable mark', 'give the brand a distinctive identity that is easy to recognise'] },
  { words: ['brand', 'branding', 'identity', 'rebrand'], noun: 'brand identity', purpose: ['give the brand a consistent and recognisable visual voice', 'bring logo, colour and typography together as one coherent system'] },
  { words: ['social', 'instagram', 'post', 'story', 'stories', 'carousel', 'tiktok', 'facebook', 'status'], noun: 'social media design', purpose: ['stand out in a busy feed and make people stop scrolling', 'keep the message clear and shareable on social platforms'] },
  { words: ['invitation', 'invite', 'wedding', 'save'], noun: 'invitation design', purpose: ['set the tone for the occasion before guests even arrive', 'present the details beautifully and make guests feel welcome'] },
  { words: ['card', 'letterhead', 'brochure', 'profile', 'stationery', 'menu', 'catalogue', 'catalog', 'lookbook'], noun: 'business collateral design', purpose: ['present the business professionally and build trust at first glance', 'organise information clearly while staying true to the brand'] },
  { words: ['advert', 'advertisement', 'promo', 'promotion', 'sale', 'product', 'launch'], noun: 'promotional design', purpose: ['showcase the offer and persuade people to take action', 'make the product or offer the star of the design'] },
]
const TONES = [
  { words: ['christmas', 'xmas', 'carol', 'easter', 'festive', 'holiday'], tone: 'festive and warm' },
  { words: ['wedding', 'bridal', 'engagement', 'marriage'], tone: 'elegant and romantic' },
  { words: ['birthday', 'bday', 'anniversary', 'celebration'], tone: 'joyful and celebratory' },
  { words: ['church', 'crusade', 'revival', 'worship', 'gospel', 'prayer', 'ministry', 'praise', 'thanksgiving', 'sunday', 'fellowship'], tone: 'uplifting and reverent' },
  { words: ['conference', 'seminar', 'summit', 'workshop', 'symposium', 'convention', 'webinar'], tone: 'professional and credible' },
  { words: ['graduation', 'convocation', 'matriculation', 'school', 'university', 'academic', 'department', 'faculty', 'alumni', 'student'], tone: 'polished and academic' },
  { words: ['campaign', 'election', 'rally', 'vote', 'candidate', 'political', 'aspirant', 'leadership'], tone: 'bold and authoritative' },
  { words: ['concert', 'party', 'night', 'festival', 'show', 'live', 'dj', 'music', 'club'], tone: 'energetic and vibrant' },
  { words: ['restaurant', 'food', 'cafe', 'bakery', 'catering', 'menu', 'kitchen'], tone: 'appetising and inviting' },
  { words: ['fashion', 'boutique', 'beauty', 'salon', 'spa', 'style'], tone: 'stylish and refined' },
  { words: ['tech', 'technology', 'software', 'app', 'digital', 'startup'], tone: 'modern and sleek' },
  { words: ['funeral', 'obituary', 'burial', 'tribute', 'memorial', 'rip'], tone: 'respectful and dignified' },
  { words: ['property', 'estate', 'house', 'apartment', 'homes'], tone: 'clean and trustworthy' },
]
// Which kind of category each keyword points to
const CATEGORY_HINTS: { match: RegExp; words: string[] }[] = [
  { match: /flyer|flier/, words: ['flyer', 'flier', 'handbill', 'leaflet', 'poster'] },
  { match: /logo/, words: ['logo', 'emblem', 'monogram', 'wordmark'] },
  { match: /brand|identity/, words: ['brand', 'branding', 'identity', 'rebrand', 'logo'] },
  { match: /social/, words: ['social', 'instagram', 'post', 'story', 'stories', 'carousel', 'tiktok', 'facebook', 'status'] },
  { match: /event/, words: ['event', 'concert', 'party', 'wedding', 'invitation', 'invite', 'festival', 'night', 'show', 'banner', 'birthday', 'conference', 'seminar'] },
  { match: /business/, words: ['business', 'corporate', 'company', 'brochure', 'letterhead', 'card', 'profile', 'stationery', 'menu', 'catalogue'] },
  { match: /politic|leader/, words: ['political', 'campaign', 'election', 'rally', 'candidate', 'aspirant', 'leadership', 'vote'] },
  { match: /academ/, words: ['academic', 'school', 'university', 'convocation', 'graduation', 'faculty', 'department', 'alumni', 'matriculation', 'student', 'conference', 'seminar'] },
  { match: /product|advert/, words: ['product', 'advert', 'advertisement', 'promo', 'promotion', 'sale', 'launch'] },
  { match: /church|religio/, words: ['church', 'crusade', 'revival', 'worship', 'gospel', 'prayer', 'ministry', 'praise', 'thanksgiving', 'christmas', 'carol', 'easter', 'sunday', 'fellowship', 'religious'] },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
const wordsOf = (s: string) => norm(s).split(/\s+/).filter(Boolean)
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number, offset = 0): T => arr[(seed + offset) % arr.length]
const an = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a')
const titleCase = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/\b([a-z])/g, (m) => m.toUpperCase())

export interface Written { short: string; description: string; primary?: string; secondary?: string }

export function writeFor(title: string, categories: { id: string; name: string }[]): Written {
  const ws = wordsOf(title)
  const seed = hash(title.toLowerCase())
  const type = TYPES.find((t) => t.words.some((w) => ws.includes(w)))
  // Leave the design-type word out of the subject ("Christmas Night Flyer" -> a flyer for "Christmas Night")
  const core = title.split(/\s+/).filter((w) => !(type?.words ?? []).includes(w.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const subject = titleCase((core.length ? core : title.split(/\s+/)).join(' '))
  const tone = TONES.find((t) => t.words.some((w) => ws.includes(w)))?.tone ?? pick(['clean and confident', 'bold and modern', 'polished and professional'], seed)
  const noun = type?.noun ?? 'design'
  const purpose = type ? pick(type.purpose, seed) : pick(['communicate the message clearly and leave a lasting impression', 'turn the idea into something people notice and remember'], seed)

  const short = pick([
    `${an(tone)} ${tone} ${noun} for ${subject}.`,
    `${subject}: ${an(tone)} ${tone} ${noun} built to be noticed.`,
    `${an(tone)} ${tone} ${noun} created for ${subject}.`,
  ], seed).replace(/^./, (c) => c.toUpperCase())

  const style = pick([
    'Strong typography, a considered colour palette and balanced spacing keep the message clear and easy to read.',
    'A focused layout, deliberate colour choices and clear type hierarchy guide the eye from the headline to the details.',
    'Careful use of colour, scale and whitespace gives the design impact while keeping every detail legible.',
  ], seed, 1)
  const description = `${subject} is ${an(tone)} ${tone} ${noun} created to ${purpose}.\n\n${style} The result is a design that looks professional on screen and holds up in print.`

  // Category choice: score every category by how many of the title's words point to it
  const scored = categories.map((c) => {
    const name = c.name.toLowerCase()
    const hint = CATEGORY_HINTS.find((h) => h.match.test(name))
    let score = 0
    if (hint) for (const w of ws) if (hint.words.includes(w)) score += 2
    for (const w of wordsOf(name)) if (w.length > 3 && ws.includes(w)) score += 1
    if (type && hint?.words.some((w) => type.words.includes(w))) score += 1
    return { id: c.id, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)

  return { short, description, primary: scored[0]?.id, secondary: scored[1] && scored[1].score >= 2 ? scored[1].id : undefined }
    }
