// Turns any uploaded design into a standard 1200x630 JPEG (small file, works on every platform) for link previews.
import sharp from 'sharp'

export default async function handler(req, res) {
  try {
    const src = typeof req.query.src === 'string' ? req.query.src : ''
    const fit = req.query.fit === 'contain' ? 'contain' : 'cover'
    const u = new URL(src)
    const allowed = new URL(process.env.VITE_SUPABASE_URL).host
    // Only images from your own storage can be converted (prevents misuse of this endpoint)
    if (u.host !== allowed || !u.pathname.startsWith('/storage/v1/object/public/')) { res.status(400).send('Unsupported image source'); return }
    const r = await fetch(u)
    if (!r.ok) { res.status(404).send('Image not found'); return }
    const input = Buffer.from(await r.arrayBuffer())
    const out = await sharp(input)
      .rotate()
      .resize(1200, 630, { fit, position: fit === 'cover' ? sharp.strategy.attention : 'centre', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer()
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable')
    res.status(200).send(out)
  } catch {
    res.status(500).send('Could not create preview image')
  }
  }
