import { useEffect, useState } from 'react'
import { PART_LABELS, STEPS, WORKSHOP } from '../workshop'
import {
  assignTheme,
  createTheme,
  deleteTheme,
  goToStep,
  renameTheme,
  replaceThemes,
  setManifesto,
  setPhase,
  setTimer,
} from '../lib/api'
import { getApiKey, setApiKey } from '../lib/aiKey'
import { downloadMarkdown, sessionMarkdown } from '../lib/exportMd'
import { participantUrl, screenUrl } from '../lib/routes'
import { readyCount } from '../lib/results'
import { useSession } from '../lib/useSession'
import type { SessionData } from '../types'
import type { ThemeEditor } from '../components/PostitWall'
import { JoinInfo } from '../components/JoinInfo'
import { Stage } from '../components/Stage'
import { Status } from '../components/Status'
import { Brand } from '../components/OctoMark'

export function Facilitator({ code, accessKey }: { code: string; accessKey: string }) {
  const { state, refresh } = useSession(code)
  const [presenting, setPresenting] = useState(false)

  if (state.status !== 'ready') return <Status state={state} code={code} />
  if (state.data.session.facilitator_key !== accessKey) {
    return (
      <div className="status">
        <h1>Lien animateur invalide</h1>
        <p>Ce lien ne permet pas d'animer la session {code}.</p>
        <a className="btn" href={`#/s/${code}`}>Rejoindre comme participant</a>
      </div>
    )
  }
  return <Console data={state.data} refresh={refresh} presenting={presenting} setPresenting={setPresenting} />
}

type ConsoleProps = {
  data: SessionData
  refresh: () => void
  presenting: boolean
  setPresenting: (value: boolean) => void
}

function Console({ data, refresh, presenting, setPresenting }: ConsoleProps) {
  const { session } = data
  const step = STEPS[session.step_index]
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null)
  const [newTheme, setNewTheme] = useState('')
  const [manifestoDraft, setManifestoDraft] = useState<string | null>(null)
  const [editingManifesto, setEditingManifesto] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
      refresh()
    }
  }

  const go = (index: number) => {
    setActiveThemeId(null)
    void run('step', () => goToStep(session.id, index, STEPS[index]?.minutes ?? null))
  }

  const togglePhase = () => void run('phase', () => setPhase(session.id, session.phase === 'open' ? 'revealed' : 'open'))

  // Raccourcis : flèches et PageUp/PageDown (les clickers de présentation envoient ces touches).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          if (session.step_index < STEPS.length - 1) go(session.step_index + 1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          if (session.step_index >= 0) go(session.step_index - 1)
          break
        case 'r':
        case 'R':
          if (step && step.kind !== 'manifesto') togglePhase()
          break
        case 'p':
        case 'P':
          setPresenting(!presenting)
          break
        case 'q':
        case 'Q':
          setShowQr((v) => !v)
          break
        case 'Escape':
          setShowQr(false)
          setPresenting(false)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const addMinutes = (minutes: number) => {
    const from = Math.max(Date.now(), session.timer_end ? new Date(session.timer_end).getTime() : 0)
    void run('timer', () => setTimer(session.id, new Date(from + minutes * 60_000).toISOString()))
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(participantUrl(session.code))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const stepContribs = step ? data.contributions.filter((c) => c.step_id === step.id) : []
  const stepThemes = step ? data.themes.filter((t) => t.step_id === step.id) : []

  const grouping: ThemeEditor | undefined =
    step?.kind === 'postit' && session.phase === 'revealed'
      ? {
          activeThemeId,
          onSelectTheme: setActiveThemeId,
          onPostitClick: (c) => {
            if (!activeThemeId) {
              setError("Sélectionne d'abord un thème en cliquant sur son titre.")
              return
            }
            void run('assign', () => assignTheme([c.id], c.theme_id === activeThemeId ? null : activeThemeId))
          },
          onRename: (theme) => {
            const label = window.prompt('Nouveau nom du thème', theme.label)?.trim()
            if (label) void run('rename', () => renameTheme(theme.id, label))
          },
          onDelete: (theme) => {
            if (window.confirm(`Supprimer « ${theme.label} » ? Ses post-its redeviennent non classés.`)) {
              void run('delete', () => deleteTheme(theme.id))
            }
          },
        }
      : undefined

  const addTheme = () => {
    const label = newTheme.trim()
    if (!label || !step) return
    setNewTheme('')
    void run('theme', async () => setActiveThemeId((await createTheme(session.id, step.id, label)).id))
  }

  const aiThemes = () => {
    if (!step) return
    if (stepThemes.length && !window.confirm("Remplacer les thèmes existants par la proposition de l'IA ?")) return
    void run('ai-themes', async () => {
      if (!stepContribs.length) throw new Error('Aucun post-it à regrouper.')
      const { proposeThemes } = await import('../lib/ai')
      const themes = await proposeThemes(step.question, stepContribs.map((c) => ({ id: c.id, text: c.text })))
      await replaceThemes(session.id, step.id, themes)
      setActiveThemeId(null)
    })
  }

  // Le texte est sauvegardé pendant la génération pour que l'écran de projection et les
  // participants le voient s'écrire ; la file garantit que la version finale passe en dernier.
  const aiManifesto = () => {
    if (session.manifesto && !window.confirm('Remplacer la synthèse actuelle ?')) return
    void run('ai-manifesto', async () => {
      let queue = Promise.resolve()
      const save = (text: string) => {
        queue = queue.then(() => setManifesto(session.id, text)).catch(() => {})
      }
      let lastSave = 0
      try {
        const { writeManifesto } = await import('../lib/ai')
        const text = await writeManifesto(sessionMarkdown(data, { includeManifesto: false }), (partial) => {
          setManifestoDraft(partial)
          if (Date.now() - lastSave > 2000) {
            lastSave = Date.now()
            save(partial)
          }
        })
        save(text)
        await queue
      } finally {
        setManifestoDraft(null)
      }
    })
  }

  return (
    <div className={`anim ${presenting ? 'anim--presenting' : ''}`}>
      {!presenting && (
        <aside className="panel">
          <section className="panel__section">
            <Brand />
            <p className="eyebrow">Animation · {WORKSHOP.tribe}</p>
            <div className="panel__code">{session.code}</div>
            <p className="muted">{data.participants.length} Octos connectés</p>
            <div className="panel__row">
              <button className="btn btn--small" onClick={copyLink}>{copied ? 'Lien copié ✓' : 'Copier le lien participant'}</button>
              <a className="btn btn--small" href={screenUrl(session.code)} target="_blank" rel="noreferrer">Écran de projection ↗</a>
              <button className="btn btn--small" onClick={() => setPresenting(true)}>Mode présentation</button>
              <button className="btn btn--small" onClick={() => setShowQr(true)}>QR code</button>
            </div>
            <p className="shortcuts">
              <kbd>←</kbd> <kbd>→</kbd> étapes · <kbd>R</kbd> révéler · <kbd>P</kbd> présentation · <kbd>Q</kbd> QR code
            </p>
          </section>

          <section className="panel__section">
            <h2>Déroulé</h2>
            <ol className="steps">
              <li>
                <button className={`steps__item ${session.step_index < 0 ? 'steps__item--current' : ''}`} onClick={() => go(-1)}>
                  Accueil · QR code
                </button>
              </li>
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  {(i === 0 || STEPS[i - 1].part !== s.part) && <div className="steps__part">{PART_LABELS[s.part]}</div>}
                  <button className={`steps__item ${i === session.step_index ? 'steps__item--current' : ''}`} onClick={() => go(i)}>
                    <span>{s.title}</span>
                    <span className="muted">{s.minutes}′</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="panel__row">
              <button className="btn" disabled={session.step_index < 0} onClick={() => go(session.step_index - 1)}>← Précédent</button>
              <button className="btn btn--primary" disabled={session.step_index >= STEPS.length - 1} onClick={() => go(session.step_index + 1)}>
                {session.step_index < 0 ? "Démarrer l'atelier →" : 'Suivant →'}
              </button>
            </div>
          </section>

          {step && (
            <section className="panel__section">
              <h2>Étape en cours</h2>
              {step.kind !== 'manifesto' && session.phase === 'open' && (
                <p className="muted">
                  <strong>{readyCount(step.id, data.participants)}</strong> / {data.participants.length} ont fini
                </p>
              )}
              {step.kind !== 'manifesto' && (
                <button className="btn btn--primary btn--block" onClick={togglePhase} title="R">
                  {session.phase === 'open'
                    ? step.kind === 'postit'
                      ? 'Révéler les post-its'
                      : 'Révéler les résultats'
                    : step.kind === 'postit'
                      ? "Revenir à l'écriture"
                      : 'Rouvrir le vote'}
                </button>
              )}
              <div className="panel__row">
                <span className="muted">Chrono</span>
                <button className="btn btn--small" onClick={() => addMinutes(1)}>+1 min</button>
                <button className="btn btn--small" onClick={() => go(session.step_index)} title="Relance l'étape (repasse en écriture)">
                  Relancer {step.minutes}′
                </button>
                <button className="btn btn--small" onClick={() => void run('timer', () => setTimer(session.id, null))}>Stop</button>
              </div>

              {grouping && (
                <div className="panel__block">
                  <h3>Regrouper en thèmes</h3>
                  <p className="muted">Clique sur un thème pour le sélectionner, puis sur les post-its à y ranger (re-clic pour retirer).</p>
                  <div className="panel__row">
                    <input
                      value={newTheme}
                      onChange={(e) => setNewTheme(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTheme()}
                      placeholder="Nouveau thème…"
                    />
                    <button className="btn btn--small" onClick={addTheme} disabled={!newTheme.trim()}>Créer</button>
                  </div>
                  <button className="btn btn--block" onClick={aiThemes} disabled={busy === 'ai-themes'}>
                    {busy === 'ai-themes' ? 'Regroupement en cours…' : "✨ Proposer des thèmes avec l'IA"}
                  </button>
                </div>
              )}

              {step.kind === 'manifesto' && (
                <div className="panel__block">
                  <button className="btn btn--primary btn--block" onClick={aiManifesto} disabled={busy === 'ai-manifesto'}>
                    {busy === 'ai-manifesto' ? 'Rédaction en cours…' : "✨ Générer la synthèse avec l'IA"}
                  </button>
                  {editingManifesto === null ? (
                    <button className="btn btn--block" onClick={() => setEditingManifesto(session.manifesto ?? '')}>Modifier le texte</button>
                  ) : (
                    <>
                      <textarea className="manifesto-editor" value={editingManifesto} onChange={(e) => setEditingManifesto(e.target.value)} rows={14} />
                      <div className="panel__row">
                        <button
                          className="btn btn--small btn--primary"
                          onClick={() => void run('manifesto', () => setManifesto(session.id, editingManifesto)).then(() => setEditingManifesto(null))}
                        >
                          Enregistrer
                        </button>
                        <button className="btn btn--small" onClick={() => setEditingManifesto(null)}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {error && <p className="error">{error}</p>}
            </section>
          )}

          <section className="panel__section">
            <h2>Restitution</h2>
            <div className="panel__row">
              <button className="btn btn--small" onClick={() => downloadMarkdown(data)}>Télécharger (.md)</button>
              <button className="btn btn--small" onClick={() => void navigator.clipboard.writeText(sessionMarkdown(data))}>Copier le Markdown</button>
            </div>
          </section>

          <ApiKeySettings />
        </aside>
      )}

      <main className="anim__stage theme-dark">
        <Stage data={data} grouping={grouping} manifestoDraft={manifestoDraft} />
        {showQr && (
          <div className="qr-overlay" onClick={() => setShowQr(false)}>
            <JoinInfo code={session.code} size={340} />
          </div>
        )}
        {presenting && (
          <button className="present-exit" onClick={() => setPresenting(false)} title="Échap">
            Afficher le panneau
          </button>
        )}
      </main>
    </div>
  )
}

function ApiKeySettings() {
  const [key, setKey] = useState(getApiKey)
  const [saved, setSaved] = useState(Boolean(getApiKey()))
  return (
    <details className="panel__section" open={!saved}>
      <summary>Clé API Anthropic {saved ? '✓' : '(requise pour l’IA)'}</summary>
      <p className="muted">Stockée uniquement dans ce navigateur, jamais envoyée à la base de l'atelier.</p>
      <div className="panel__row">
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
        <button
          className="btn btn--small"
          onClick={() => {
            setApiKey(key)
            setSaved(Boolean(key.trim()))
          }}
        >
          Enregistrer
        </button>
      </div>
    </details>
  )
}
