// Works on the Supabase FREE plan: no server-side transformations are needed.
// Every uploaded image is stored twice by the browser: a full-size WebP (max 2200px) and a small thumbnail
// at "<path>.thumb.webp". Grids use the thumbnail; detail pages use the full image.
// Optional: on Pro, set VITE_IMAGE_TRANSFORMS=true to use Supabase's resizer instead.
const TRANSFORMS = import.meta.env.VITE_IMAGE_TRANSFORMS === 'true'
const PUBLIC_MARK = '/storage/v1/object/public/media/'
export const THUMB_SUFFIX = '.thumb.webp'
export const THUMB_MAX_WIDTH = 700

export function transformUrl(url: string, width: number, quality = 75): string {
  if (!url.includes(PUBLIC_MARK)) return url
  if (TRANSFORMS) return `${url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=${width}&quality=${quality}&resize=contain`
  // Use the pre-generated thumbnail for small renders; <Img> falls back to the original if one doesn't exist.
  return width <= THUMB_MAX_WIDTH && !url.endsWith(THUMB_SUFFIX) ? `${url}${THUMB_SUFFIX}` : url
}

export function srcSet(url: string, widths = [400, 800, 1200]): string | undefined {
  if (!TRANSFORMS || !url.includes(PUBLIC_MARK)) return undefined
  return widths.map((w) => `${transformUrl(url, w)} ${w}w`).join(', ')
}

const RASTER = /^image\/(jpeg|png|webp)$/

/** Resize + re-encode a raster image to WebP in the browser. Returns null if it can't (or shouldn't) be converted. */
export async function toWebp(file: File, maxSide: number, quality: number): Promise<File | null> {
  if (!RASTER.test(file.type)) return null
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale)); canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : null
  } catch { return null }
}

/** Full-size version: max 2200px, kept only if it is actually smaller than the original. */
export async function compressImage(file: File, maxSide = 2200, quality = 0.86): Promise<File> {
  const out = await toWebp(file, maxSide, quality)
  return out && out.size < file.size ? out : file
}

export const makeThumbnail = (file: File) => toWebp(file, 640, 0.78)
