import { useState, type FormEvent } from 'react'
import { WORKSHOP } from '../workshop'
import { createSession } from '../lib/api'
import { animHash, navigate } from '../lib/routes'
import { hostedSessions, rememberHosted } from '../lib/storage'

export function Home() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hosted = hostedSessions()

  const join = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim().toUpperCase()
    if (value) navigate(`#/s/${value}`)
  }

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const session = await createSession(WORKSHOP.name)
      rememberHosted({ code: session.code, key: session.facilitator_key, createdAt: session.created_at })
      navigate(animHash(session.code, session.facilitator_key))
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="home">
      <p className="eyebrow">{WORKSHOP.tribe}</p>
      <h1 className="home__title">{WORKSHOP.name}</h1>
      <p className="home__lead">Un atelier pour faire émerger ensemble le Why de la tribu, nos envies et nos premières actions.</p>

      <div className="home__cards">
        <form className="card" onSubmit={join}>
          <h2>Rejoindre un atelier</h2>
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={8}
            autoFocus
          />
          <button className="btn btn--primary btn--block" disabled={!code.trim()}>Rejoindre</button>
        </form>

        <div className="card">
          <h2>Animer</h2>
          <p className="muted">Crée une session et projette le QR code pour que chacun la rejoigne.</p>
          <button className="btn btn--block" onClick={create} disabled={busy}>
            {busy ? 'Création…' : 'Créer une session'}
          </button>
          {error && <p className="error">{error}</p>}
          {hosted.length > 0 && (
            <ul className="hosted">
              {hosted.map((s) => (
                <li key={s.code}>
                  <a href={animHash(s.code, s.key)}>{s.code}</a>
                  <span className="muted">{new Date(s.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
