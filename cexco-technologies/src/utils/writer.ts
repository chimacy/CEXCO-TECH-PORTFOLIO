// Built-in smart writer: reads the project title and drafts a short description, a description and suitable categories.
// Name your titles the way you would say them, with the design type last: "Pastor John Birthday Flyer", "FreshCo Logo",
// "Senator Obi Campaign Banner". The type decides how it is described (a banner is printed, a social post is not).
// It runs in the browser (no account, no cost) and everything it writes can be edited before publishing.
import { synonymsOf } from '@/utils/search'

interface TypeDef { words: string[]; noun: string; aim: string; medium: string; tail: string }
const TYPES: TypeDef[] = [
  { words: ['flyer', 'flyers', 'flier', 'handbill', 'leaflet'], noun: 'flyer', aim: 'get the key details across at a glance',
    medium: 'It is made as a flyer, so it works as a printed handout as well as a share on WhatsApp and social media.', tail: ', ready to print or share' },
  { words: ['banner', 'banners', 'billboard', 'signage', 'backdrop'], noun: 'banner', aim: 'catch attention from a distance',
    medium: 'It is built as a large-format banner, so the text stays readable from far away and the artwork holds up when printed at size.', tail: ', made for large-format print' },
  { words: ['poster', 'posters'], noun: 'poster', aim: 'carry one strong message with plenty of visual impact',
    medium: 'It is composed as a poster for display, with a clear focal point that reads quickly from across a room.', tail: ', made for display' },
  { words: ['post', 'posts', 'story', 'stories', 'instagram', 'facebook', 'whatsapp', 'status', 'carousel', 'tiktok', 'social', 'media', 'dp', 'thumbnail'], noun: 'social media post', aim: 'stand out in a busy feed and stop the scroll',
    medium: 'It is sized for social feeds, stories and mobile screens, with bold type that stays legible on a small display.', tail: ', made for feeds and stories' },
  { words: ['logo', 'logos', 'emblem', 'monogram', 'wordmark'], noun: 'logo', aim: 'give the brand a distinctive, memorable mark',
    medium: 'The mark is kept simple so it stays clear at small sizes and works on light and dark backgrounds, on screen and in print.', tail: ', clear at any size' },
  { words: ['brand', 'branding', 'identity', 'rebrand'], noun: 'brand identity', aim: 'give the brand one consistent, recognisable look',
    medium: 'Logo, colour and typography are developed together as one system, so every touchpoint feels like the same brand.', tail: ', one look across every touchpoint' },
  { words: ['invitation', 'invitations', 'invite', 'invites'], noun: 'invitation', aim: 'set the tone for the occasion before guests arrive',
    medium: 'It is designed as an invitation that reads well in print and when sent digitally.', tail: ', ready to print or send' },
  { words: ['card', 'cards', 'letterhead', 'stationery'], noun: 'business stationery design', aim: 'present the business professionally at first contact',
    medium: 'It is laid out for print, with clear hierarchy so names and contact details are easy to find.', tail: ', ready for print' },
  { words: ['brochure', 'brochures', 'profile', 'catalogue', 'catalog', 'lookbook', 'menu'], noun: 'brochure', aim: 'organise information clearly and make it pleasant to read',
    medium: 'Pages are structured for easy scanning and prepared for print or digital sharing.', tail: ', made for print and sharing' },
  { words: ['advert', 'adverts', 'ad', 'ads', 'advertisement', 'promo', 'promotion', 'sale', 'discount'], noun: 'advert', aim: 'promote the offer and prompt people to get in touch',
    medium: 'It is designed to work across print and digital placements, with a headline and call to action that stand out.', tail: ', made to get responses' },
]

interface Occasion { words: string[]; tone: string; aim: string; focus: string }
const OCCASIONS: Occasion[] = [
  { words: ['birthday', 'bday', 'celebrant'], tone: 'joyful and celebratory', aim: 'celebrate the person of the day and mark the milestone', focus: 'The layout puts the celebrant’s name front and centre, with cheerful colours that feel like a party' },
  { words: ['month', 'newmonth'], tone: 'fresh and uplifting', aim: 'welcome the new month with an encouraging message', focus: 'A bold month name and a short, uplifting message give it the feel of a warm greeting' },
  { words: ['wedding', 'bridal', 'engagement', 'marriage', 'anniversary'], tone: 'elegant and romantic', aim: 'present the occasion with grace and warmth', focus: 'Refined typography and soft detailing keep the names and the date at the heart of the design' },
  { words: ['church', 'crusade', 'revival', 'worship', 'gospel', 'prayer', 'ministry', 'praise', 'thanksgiving', 'sunday', 'fellowship', 'christmas', 'carol', 'easter', 'service'], tone: 'uplifting and reverent', aim: 'invite people to the programme and make it feel welcoming', focus: 'Date, time and venue are easy to find, and the look stays warm and respectful' },
  { words: ['campaign', 'election', 'rally', 'vote', 'candidate', 'political', 'aspirant', 'senator', 'governor', 'councillor', 'chairman', 'party'], tone: 'bold and authoritative', aim: 'put the candidate and the message in front of the public', focus: 'High-contrast colours and strong type keep the name, the position and the slogan impossible to miss' },
  { words: ['business', 'company', 'corporate', 'enterprise', 'ventures', 'limited', 'ltd', 'services', 'consulting'], tone: 'professional and trustworthy', aim: 'present the business with credibility', focus: 'A clean layout organises what the business offers and how to reach it' },
  { words: ['sale', 'promo', 'promotion', 'discount', 'offer', 'launch', 'product', 'grand', 'opening'], tone: 'persuasive and eye-catching', aim: 'promote the offer and drive enquiries', focus: 'A strong headline, a clear offer and an obvious call to action lead the eye' },
  { words: ['graduation', 'convocation', 'matriculation', 'school', 'university', 'academic', 'department', 'faculty', 'alumni', 'student', 'students', 'congratulations'], tone: 'polished and academic', aim: 'recognise the achievement and present it with pride', focus: 'Balanced composition and dignified typography keep the focus on the achievement' },
  { words: ['conference', 'seminar', 'summit', 'workshop', 'symposium', 'convention', 'webinar', 'training'], tone: 'professional and credible', aim: 'communicate the programme clearly and encourage registrations', focus: 'Speakers, topics and event details are organised so they are easy to scan' },
  { words: ['concert', 'night', 'festival', 'show', 'live', 'dj', 'music', 'club', 'event', 'party'], tone: 'energetic and vibrant', aim: 'build excitement and get people to show up', focus: 'Vibrant colour and dynamic type create energy while keeping the details readable' },
  { words: ['restaurant', 'food', 'cafe', 'bakery', 'catering', 'kitchen', 'drinks'], tone: 'appetising and inviting', aim: 'make people want to try what is on offer', focus: 'Warm colours and a tidy layout keep the offer clear and appetising' },
  { words: ['fashion', 'boutique', 'beauty', 'salon', 'spa', 'style', 'makeup'], tone: 'stylish and refined', aim: 'show off the brand’s style and attract clients', focus: 'Considered spacing and elegant type give it a polished, fashionable feel' },
  { words: ['funeral', 'obituary', 'burial', 'tribute', 'memorial', 'rip', 'condolence'], tone: 'respectful and dignified', aim: 'honour a life with care and respect', focus: 'Subdued colours and graceful typography keep the tone dignified' },
  { words: ['property', 'estate', 'house', 'apartment', 'homes', 'land'], tone: 'clean and trustworthy', aim: 'present the property clearly and build confidence', focus: 'Key details and contacts are laid out cleanly so buyers find what they need quickly' },
  { words: ['tech', 'technology', 'software', 'app', 'digital', 'startup'], tone: 'modern and sleek', aim: 'communicate the product in a clear, contemporary way', focus: 'Crisp type and a restrained palette give it a modern, confident look' },
]
const GENERIC_CAT_WORDS = new Set(['design', 'designs', 'graphic', 'graphics', 'and', 'the', 'for', 'other', 'custom'])

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
const wordsOf = (s: string) => norm(s).split(/\s+/).filter(Boolean)
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number, offset = 0): T => arr[(seed + offset) % arr.length]
const an = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a')
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase())
const titleCase = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/\b([a-z])/g, (m) => m.toUpperCase())

export interface Written { short: string; description: string; primary?: string; secondary?: string }

export function writeFor(title: string, categories: { id: string; name: string }[]): Written {
  const ws = wordsOf(title)
  const seed = hash(title.toLowerCase())

  // The design type is usually the last word(s) of the title ("… Birthday Flyer"); fall back to anywhere in the title
  const tail = ws.slice(-3)
  const type = [...tail].reverse().map((w) => TYPES.find((t) => t.words.includes(w))).find(Boolean) ?? TYPES.find((t) => t.words.some((w) => ws.includes(w)))
  const typeWords = new Set(type?.words ?? [])
  const subjectWords = title.trim().split(/\s+/).filter((w) => !typeWords.has(w.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const subject = titleCase((subjectWords.length ? subjectWords : title.trim().split(/\s+/)).join(' '))
  const subjectKeys = wordsOf(subject)

  const occ = OCCASIONS.find((o) => o.words.some((w) => subjectKeys.includes(w))) ?? OCCASIONS.find((o) => o.words.some((w) => ws.includes(w)))
  const tone = occ?.tone ?? pick(['clean and confident', 'bold and modern', 'polished and professional'], seed)
  const noun = type?.noun ?? 'design'
  const aim = occ?.aim ?? type?.aim ?? pick(['communicate the message clearly and leave a lasting impression', 'turn the idea into something people notice and remember'], seed)

  const short = cap(pick([
    `${an(tone)} ${tone} ${noun} for ${subject}${type?.tail ?? ''}.`,
    `${subject}: ${an(tone)} ${tone} ${noun}${type?.tail ?? ''}.`,
    `${an(tone)} ${tone} ${noun} created for ${subject}${type?.tail ?? ''}.`,
  ], seed))

  const intro = pick([
    `This ${tone} ${noun} for ${subject} was created to ${aim}.`,
    `${subject}: ${an(tone)} ${tone} ${noun} designed to ${aim}.`,
    `Designed to ${aim}, this ${noun} for ${subject} keeps the look ${tone}.`,
  ], seed, 1)
  const focus = occ?.focus ?? pick([
    'Strong typography, a considered colour palette and balanced spacing keep the message clear and easy to read',
    'A focused layout and a clear type hierarchy guide the eye from the headline to the details',
    'Careful use of colour, scale and whitespace gives the design impact while keeping every detail legible',
  ], seed, 2)
  const medium = type?.medium ?? 'It is prepared to look good on screen and to hold up in print.'
  const description = `${intro}\n\n${focus}. ${medium}`

  // Category choice: every word of a category's name that appears in the title (or means the same thing) adds to its score
  const scored = categories.map((c) => {
    let score = 0
    for (const t of wordsOf(c.name).filter((w) => w.length >= 3 && !GENERIC_CAT_WORDS.has(w))) {
      const base = singular(t)
      if (ws.some((w) => singular(w) === base)) score += 3
      else if (synonymsOf(base).some((s) => ws.includes(s) || ws.includes(singular(s)))) score += 2
      else if (type && type.words.some((w) => singular(w) === base)) score += 2
    }
    return { id: c.id, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)

  return { short, description, primary: scored[0]?.id, secondary: scored[1] && scored[1].score >= 2 ? scored[1].id : undefined }
            }
