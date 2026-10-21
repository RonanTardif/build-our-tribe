import { read, remove, write } from './storage'

// La clé est saisie par l'animateur et reste dans son navigateur (localStorage).
// Elle n'est jamais envoyée à Supabase ni incluse dans le build.
const KEY_STORAGE = 'bot:anthropic-key'

export const getApiKey = () => read(KEY_STORAGE) ?? ''
export const setApiKey = (key: string) => (key.trim() ? write(KEY_STORAGE, key.trim()) : remove(KEY_STORAGE))
