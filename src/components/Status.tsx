import type { SessionState } from '../lib/useSession'

export function Status({ state, code }: { state: Exclude<SessionState, { status: 'ready' }>; code: string }) {
  return (
    <div className="status">
      {state.status === 'loading' && <p>Connexion à la session {code}…</p>}
      {state.status === 'missing' && (
        <>
          <h1>Session introuvable</h1>
          <p>Aucune session ne correspond au code « {code} ».</p>
          <a className="btn" href="#/">Retour à l'accueil</a>
        </>
      )}
      {state.status === 'error' && (
        <>
          <h1>Impossible de joindre la session</h1>
          <p className="error">{state.message}</p>
          <button className="btn" onClick={() => window.location.reload()}>Réessayer</button>
        </>
      )}
    </div>
  )
}
