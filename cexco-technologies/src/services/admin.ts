import { supabase } from '@/lib/supabase'
import { compressImage, makeMedium, makeThumbnail, MEDIUM_SUFFIX, THUMB_SUFFIX } from '@/utils/image'
import type { MediaItem } from '@/types'

export type Row = Record<string, unknown> & { id: string }

export async function listRows(table: string, opts: { order?: string; asc?: boolean } = {}): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(opts.order ?? 'created_at', { ascending: opts.asc ?? false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}
export async function saveRow(table: string, values: Record<string, unknown>, id?: string): Promise<Row> {
  const q = id ? supabase.from(table).update(values).eq('id', id) : supabase.from(table).insert(values)
  const { data, error } = await q.select().single()
  if (error) throw new Error(error.message)
  return data as Row
}
export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}
export async function countRows(table: string, filter?: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => unknown): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q as never) as typeof q
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const MEDIA_MAX = 10 * 1024 * 1024

export async function uploadMedia(original: File, folder = 'uploads'): Promise<MediaItem> {
  if (!MEDIA_TYPES.includes(original.type)) throw new Error(`${original.name}: only JPG, PNG, WEBP, GIF or AVIF images are allowed.`)
  const file = await compressImage(original)
  if (file.size > MEDIA_MAX) throw new Error(`${original.name} is larger than 10 MB.`)
  const d = new Date()
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
  const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (up.error) throw new Error(up.error.message)
  // Smaller variants are best-effort: if they fail, grids simply fall back to the full image.
  const [thumb, medium] = await Promise.all([makeThumbnail(file), makeMedium(file)])
  if (thumb) await supabase.storage.from('media').upload(`${path}${THUMB_SUFFIX}`, thumb, { contentType: 'image/webp', cacheControl: '31536000' })
  if (medium) await supabase.storage.from('media').upload(`${path}${MEDIUM_SUFFIX}`, medium, { contentType: 'image/webp', cacheControl: '31536000' })
  const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  const { data: u } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('media').insert({
    storage_path: path, url, file_name: original.name, mime_type: file.type, size_bytes: file.size, uploaded_by: u.user?.id ?? null,
  }).select().single()
  if (error) { await supabase.storage.from('media').remove([path, `${path}${THUMB_SUFFIX}`, `${path}${MEDIUM_SUFFIX}`]); throw new Error(error.message) }
  return data as MediaItem
}

export async function deleteMedia(item: MediaItem): Promise<void> {
  const { error: sErr } = await supabase.storage.from(item.bucket).remove([item.storage_path, `${item.storage_path}${THUMB_SUFFIX}`, `${item.storage_path}${MEDIUM_SUFFIX}`])
  if (sErr) throw new Error(sErr.message)
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  if (error) throw new Error(error.message)
}

export async function signedRequestFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('request-files').createSignedUrl(path, 600)
  if (error || !data) throw new Error(error?.message ?? 'Could not create link')
  return data.signedUrl
                                                         }
