import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// A placeholder URL keeps the module importable when env vars are missing; the app shows a setup screen instead of making requests.
export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
