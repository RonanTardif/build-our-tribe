import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

export const isConfigured = Boolean(url && key)

// Le client reste créé sans config pour que l'app affiche l'écran d'aide au lieu de planter.
export const supabase = createClient(url || 'https://not-configured.supabase.co', key || 'not-configured')
