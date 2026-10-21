// localStorage peut être indisponible (navigation privée stricte) : on ne plante jamais dessus.

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

// crypto.randomUUID n'existe qu'en contexte sécurisé (https / localhost) : fallback pour les tests en LAN.
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let memoryParticipantId: string | null = null

export function participantId(): string {
  const stored = read('bot:participant-id')
  if (stored) return stored
  memoryParticipantId ??= uuid()
  write('bot:participant-id', memoryParticipantId)
  return memoryParticipantId
}

export type HostedSession = { code: string; key: string; createdAt: string }

export function hostedSessions(): HostedSession[] {
  try {
    return JSON.parse(read('bot:hosted') ?? '[]') as HostedSession[]
  } catch {
    return []
  }
}

export function rememberHosted(session: HostedSession) {
  const others = hostedSessions().filter((s) => s.code !== session.code)
  write('bot:hosted', JSON.stringify([session, ...others].slice(0, 10)))
}
