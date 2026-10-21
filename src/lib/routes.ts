// Routage par hash (#/s/CODE…) : aucun souci de rechargement sur GitLab Pages.

const base = () => `${window.location.origin}${window.location.pathname}`

// Lien partagé (QR code) en ?s=CODE plutôt qu'en #/s/CODE : si GitLab Pages demande de se connecter,
// la redirection d'authentification conserve la query string mais pas forcément le fragment.
export const participantUrl = (code: string) => `${base()}?s=${code}`
export const screenUrl = (code: string) => `${base()}#/s/${code}/ecran`
export const animHash = (code: string, key: string) => `#/s/${code}/anim/${key}`

export function navigate(hash: string) {
  window.location.hash = hash
}

export type Route =
  | { view: 'home' }
  | { view: 'participant'; code: string }
  | { view: 'screen'; code: string }
  | { view: 'anim'; code: string; key: string }

// Convertit un lien ?s=CODE en route #/s/CODE, une seule fois au chargement.
export function adoptQueryCode() {
  const code = new URLSearchParams(window.location.search).get('s')
  if (!code) return
  const hash = window.location.hash.replace(/^#\/?/, '') ? window.location.hash : `#/s/${code.toUpperCase()}`
  window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
}

export function parseRoute(hash: string): Route {
  const [root, code, view, key] = hash.replace(/^#\/?/, '').split('/')
  if (root !== 's' || !code) return { view: 'home' }
  const upper = code.toUpperCase()
  if (view === 'ecran') return { view: 'screen', code: upper }
  if (view === 'anim') return { view: 'anim', code: upper, key: key ?? '' }
  return { view: 'participant', code: upper }
}
