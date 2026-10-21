import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { STEPS, WORKSHOP, type ChoiceStep, type PostitStep, type Step, type VoteStep } from '../workshop'
import { addContribution, deleteContribution, joinSession, saveChoice, saveVote, updateContribution } from '../lib/api'
import { choiceResults, spentPoints, voteResults, voteTargets } from '../lib/results'
import { participantId } from '../lib/storage'
import { useSession } from '../lib/useSession'
import type { Contribution, SessionData } from '../types'
import { Bars } from '../components/Bars'
import { Markdown } from '../components/Markdown'
import { PostitWall } from '../components/PostitWall'
import { StepHeader } from '../components/Stage'
import { Status } from '../components/Status'
import { Brand } from '../components/OctoMark'

type StepProps<S extends Step> = { step: S; data: SessionData; pid: string; refresh: () => void }

export function Participant({ code }: { code: string }) {
  const { state, refresh } = useSession(code)
  const pid = useMemo(() => participantId(), [])
  const sessionId = state.status === 'ready' ? state.data.session.id : null

  useEffect(() => {
    if (sessionId) joinSession(sessionId, pid).catch(() => {})
  }, [sessionId, pid])

  if (state.status !== 'ready') return <Status state={state} code={code} />
  const { data } = state
  const step = STEPS[data.session.step_index]

  return (
    <div className="participant">
      <header className="topbar">
        <Brand size={24} />
        <span className="topbar__code">{code}</span>
      </header>
      <main className="participant__main">
        {step ? (
          <>
            <StepHeader step={step} index={data.session.step_index} timerEnd={data.session.timer_end} hint />
            <ParticipantStep key={step.id} step={step} data={data} pid={pid} refresh={refresh} />
          </>
        ) : (
          <div className="welcome">
            <p className="eyebrow">{WORKSHOP.tribe}</p>
            <h1>Salut 👋</h1>
            <p>Installe-toi, on démarre dans un instant. Cette page suit l'animateur : pas besoin de rafraîchir.</p>
            <p className="muted">Tout est anonyme. Écris ce que tu penses vraiment, pas ce qui ferait bien en comité.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ParticipantStep(props: StepProps<Step>) {
  const { step } = props
  switch (step.kind) {
    case 'postit':
      return <PostitView {...props} step={step} />
    case 'choice':
      return <ChoiceView {...props} step={step} />
    case 'vote':
      return <VoteView {...props} step={step} />
    case 'manifesto':
      return props.data.session.manifesto ? (
        <div className="manifesto">
          <Markdown text={props.data.session.manifesto} />
        </div>
      ) : (
        <p className="notice">L'animateur fait chauffer la synthèse…</p>
      )
  }
}

function PostitView({ step, data, pid, refresh }: StepProps<PostitStep>) {
  const all = data.contributions.filter((c) => c.step_id === step.id)
  const mine = all.filter((c) => c.participant_id === pid)

  if (data.session.phase === 'revealed') {
    return (
      <>
        <p className="notice">Les post-its sont retournés. À vous la parole.</p>
        <PostitWall contributions={all} themes={data.themes.filter((t) => t.step_id === step.id)} />
      </>
    )
  }

  return (
    <>
      <PostitForm
        onSubmit={async (text) => {
          await addContribution(data.session.id, step.id, pid, text)
          refresh()
        }}
      />
      <p className="muted">
        {all.length} post-its sur le mur · face cachée jusqu'à la révélation.
      </p>
      {mine.length > 0 && (
        <div className="my-postits">
          {mine.map((c) => (
            <MyPostit key={c.id} contribution={c} refresh={refresh} />
          ))}
        </div>
      )}
    </>
  )
}

function PostitForm({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(value)
      setText('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <form className="postit-form" onSubmit={submit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Une idée par post-it… (Entrée pour coller, Maj+Entrée pour aller à la ligne)"
        maxLength={500}
        rows={3}
        autoFocus
      />
      <button className="btn btn--primary" disabled={busy || !text.trim()}>
        Coller le post-it
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function MyPostit({ contribution, refresh }: { contribution: Contribution; refresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(contribution.text)

  const save = async () => {
    const value = text.trim()
    if (value && value !== contribution.text) await updateContribution(contribution.id, value)
    setEditing(false)
    refresh()
  }
  const remove = async () => {
    await deleteContribution(contribution.id)
    refresh()
  }

  if (editing) {
    return (
      <div className="postit postit--mine postit--editing">
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} autoFocus />
        <div className="postit__actions">
          <button className="btn btn--small btn--primary" onClick={save}>Enregistrer</button>
          <button className="btn btn--small" onClick={() => (setText(contribution.text), setEditing(false))}>Annuler</button>
        </div>
      </div>
    )
  }
  return (
    <div className="postit postit--mine">
      <span>{contribution.text}</span>
      <span className="postit__actions">
        <button title="Modifier" onClick={() => setEditing(true)}>✎</button>
        <button title="Supprimer" onClick={remove}>×</button>
      </span>
    </div>
  )
}

function ChoiceView({ step, data, pid }: StepProps<ChoiceStep>) {
  const saved = data.choices.find((c) => c.step_id === step.id && c.participant_id === pid)
  const [selected, setSelected] = useState<string[]>(saved?.option_ids ?? [])
  const [error, setError] = useState<string | null>(null)

  if (data.session.phase === 'revealed') {
    const { items } = choiceResults(step, data.choices)
    return (
      <Bars
        items={items.map(({ option, count }) => ({
          key: option.id,
          label: `${option.label}${selected.includes(option.id) ? ' ✓' : ''}`,
          value: count,
          caption: option.description,
        }))}
        unit={(n) => `${n} ${n > 1 ? 'votes' : 'vote'}`}
      />
    )
  }

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    if (next.length > step.max) return
    setSelected(next)
    setError(null)
    saveChoice(data.session.id, step.id, pid, next).catch((e: Error) => setError(e.message))
  }

  return (
    <>
      <div className="options">
        {step.options.map((option) => {
          const on = selected.includes(option.id)
          const blocked = !on && selected.length >= step.max
          return (
            <button key={option.id} className={`option ${on ? 'option--on' : ''}`} disabled={blocked} onClick={() => toggle(option.id)}>
              <span className="option__label">{option.label}</span>
              {option.description && <span className="option__description">{option.description}</span>}
            </button>
          )
        })}
      </div>
      <p className="muted">
        {selected.length} / {step.max} choix · enregistré au fil de l'eau
      </p>
      {error && <p className="error">{error}</p>}
    </>
  )
}

function VoteView({ step, data, pid }: StepProps<VoteStep>) {
  const targets = voteTargets(step, data.contributions, data.themes)
  const saved = data.votes.find((v) => v.step_id === step.id && v.participant_id === pid)
  const [allocation, setAllocation] = useState<Record<string, number>>(saved?.allocation ?? {})
  const [error, setError] = useState<string | null>(null)
  const left = step.points - spentPoints(allocation, targets)

  if (data.session.phase === 'revealed') {
    const { items } = voteResults(step, targets, data.votes)
    return (
      <Bars
        items={items.map(({ target, points }) => ({ key: target.id, label: target.label, value: points, details: target.items }))}
        unit={(n) => `${n} pts`}
      />
    )
  }

  if (!targets.length) return <p className="notice">Rien à voter pour l'instant : l'animateur range les post-its.</p>

  const change = (id: string, delta: number) => {
    if (delta > 0 && left <= 0) return
    const next = { ...allocation, [id]: Math.max(0, (allocation[id] ?? 0) + delta) }
    setAllocation(next)
    setError(null)
    saveVote(data.session.id, step.id, pid, next).catch((e: Error) => setError(e.message))
  }

  return (
    <>
      <p className={`points-left ${left === 0 ? 'points-left--done' : ''}`}>
        {left > 0 ? `Il te reste ${left} point${left > 1 ? 's' : ''}` : 'Tous tes points sont posés ✓'}
      </p>
      <ul className="vote-list">
        {targets.map((target) => {
          const points = allocation[target.id] ?? 0
          return (
            <li key={target.id} className={`vote-item ${points ? 'vote-item--on' : ''}`}>
              <div className="vote-item__text">
                <strong>{target.label}</strong>
                {target.items.length > 0 && (
                  <ul>
                    {target.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="stepper">
                <button onClick={() => change(target.id, -1)} disabled={!points} aria-label="Retirer un point">−</button>
                <span className="stepper__value">{points}</span>
                <button onClick={() => change(target.id, 1)} disabled={left <= 0} aria-label="Ajouter un point">+</button>
              </div>
            </li>
          )
        })}
      </ul>
      {error && <p className="error">{error}</p>}
    </>
  )
}
