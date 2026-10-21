import { useState } from 'react'
import { KIND_LABELS, blankStep, newId, type ChoiceStep, type Step, type StepKind } from '../workshop'

// Éditeur du déroulé : tout est modifiable, y compris en pleine séance.
// On travaille sur un brouillon local, enregistré d'un bloc pour ne pas diffuser d'état intermédiaire.

type Props = {
  steps: Step[]
  currentId: string | null
  onSave: (steps: Step[]) => Promise<void>
  onClose: () => void
}

const ADDABLE: StepKind[] = ['postit', 'choice', 'vote', 'info', 'manifesto']

export function StepsEditor({ steps, currentId, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Step[]>(() => structuredClone(steps))
  const [openId, setOpenId] = useState<string | null>(currentId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(steps)
  const parts = [...new Set(draft.map((s) => s.part).filter(Boolean))]

  const update = (id: string, patch: Partial<Step>) => setDraft((d) => d.map((s) => (s.id === id ? ({ ...s, ...patch } as Step) : s)))

  const move = (index: number, delta: number) =>
    setDraft((d) => {
      const next = [...d]
      const [step] = next.splice(index, 1)
      next.splice(index + delta, 0, step)
      return next
    })

  const remove = (step: Step) => {
    if (!window.confirm(`Supprimer l'étape « ${step.title} » ? Ses contributions ne seront plus affichées.`)) return
    setDraft((d) =>
      d
        .filter((s) => s.id !== step.id)
        .map((s) => (s.kind === 'vote' ? { ...s, sources: s.sources.filter((id) => id !== step.id) } : s)),
    )
  }

  const add = (kind: StepKind) => {
    const anchor = draft.findIndex((s) => s.id === openId)
    const at = anchor >= 0 ? anchor + 1 : draft.length
    const step = blankStep(kind, draft[at - 1]?.part ?? '')
    setDraft((d) => [...d.slice(0, at), step, ...d.slice(at)])
    setOpenId(step.id)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft.map((s) => ({ ...s, title: s.title.trim() || 'Sans titre' })))
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="editor theme-light">
      <header className="editor__head">
        <div>
          <h2>Déroulé de l'atelier</h2>
          <p className="muted">Tout est modifiable, même en pleine séance : l'enregistrement s'applique instantanément chez tout le monde.</p>
        </div>
        <div className="panel__row">
          <button className="btn" onClick={onClose}>
            {dirty ? 'Annuler' : 'Fermer'}
          </button>
          <button className="btn btn--primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      <datalist id="parts">
        {parts.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <ol className="editor__list">
        {draft.map((step, i) => (
          <li key={step.id} className={`editor__step ${openId === step.id ? 'editor__step--open' : ''}`}>
            <div className="editor__row">
              <span className={`editor__kind editor__kind--${step.kind}`}>{KIND_LABELS[step.kind]}</span>
              <input className="editor__title" value={step.title} onChange={(e) => update(step.id, { title: e.target.value })} />
              {step.id === currentId && <span className="pill">En cours</span>}
              <div className="editor__tools">
                <button title="Monter" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button title="Descendre" disabled={i === draft.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button title="Détails" onClick={() => setOpenId(openId === step.id ? null : step.id)}>{openId === step.id ? '▴' : '▾'}</button>
                <button title="Supprimer" onClick={() => remove(step)}>×</button>
              </div>
            </div>
            {openId === step.id && <StepFields step={step} steps={draft} onChange={(patch) => update(step.id, patch)} />}
          </li>
        ))}
      </ol>

      <div className="editor__add">
        <span className="muted">Ajouter {openId ? 'après l’étape ouverte' : 'à la fin'} :</span>
        {ADDABLE.map((kind) => (
          <button key={kind} className="btn btn--small" onClick={() => add(kind)}>
            + {KIND_LABELS[kind]}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepFields({ step, steps, onChange }: { step: Step; steps: Step[]; onChange: (patch: Partial<Step>) => void }) {
  return (
    <div className="editor__fields">
      <label>
        {step.kind === 'info' ? 'Message principal' : 'Question'}
        <textarea rows={2} value={step.question} onChange={(e) => onChange({ question: e.target.value })} />
      </label>
      <label>
        {step.kind === 'info' ? 'Texte (Markdown)' : 'Consigne'}
        <textarea rows={step.kind === 'info' ? 4 : 1} value={step.hint ?? ''} onChange={(e) => onChange({ hint: e.target.value })} />
      </label>
      <div className="editor__inline">
        <label>
          Partie
          <input list="parts" value={step.part} onChange={(e) => onChange({ part: e.target.value })} />
        </label>
        <label>
          Durée (min, 0 = sans chrono)
          <input type="number" min={0} value={step.minutes} onChange={(e) => onChange({ minutes: Math.max(0, Number(e.target.value)) })} />
        </label>
        {step.kind === 'choice' && (
          <label>
            Choix max par personne
            <input type="number" min={1} value={step.max} onChange={(e) => onChange({ max: Math.max(1, Number(e.target.value)) } as Partial<Step>)} />
          </label>
        )}
        {step.kind === 'vote' && (
          <label>
            Points par personne
            <input type="number" min={1} value={step.points} onChange={(e) => onChange({ points: Math.max(1, Number(e.target.value)) } as Partial<Step>)} />
          </label>
        )}
      </div>

      {step.kind === 'postit' && (
        <label className="check">
          <input type="checkbox" checked={Boolean(step.cloud)} onChange={(e) => onChange({ cloud: e.target.checked } as Partial<Step>)} />
          Nuage de mots à la révélation
        </label>
      )}

      {step.kind === 'choice' && <OptionsFields step={step} onChange={onChange} />}

      {step.kind === 'vote' && (
        <fieldset className="editor__sources">
          <legend>On vote sur les thèmes et post-its de :</legend>
          {steps
            .filter((s) => s.kind === 'postit')
            .map((s) => (
              <label key={s.id} className="check">
                <input
                  type="checkbox"
                  checked={step.sources.includes(s.id)}
                  onChange={(e) =>
                    onChange({
                      sources: e.target.checked ? [...step.sources, s.id] : step.sources.filter((id) => id !== s.id),
                    } as Partial<Step>)
                  }
                />
                {s.title}
              </label>
            ))}
        </fieldset>
      )}
    </div>
  )
}

function OptionsFields({ step, onChange }: { step: ChoiceStep; onChange: (patch: Partial<Step>) => void }) {
  const setOptions = (options: ChoiceStep['options']) => onChange({ options } as Partial<Step>)
  return (
    <div className="editor__options">
      <label className="check">
        <input type="checkbox" checked={Boolean(step.allowCustom)} onChange={(e) => onChange({ allowCustom: e.target.checked } as Partial<Step>)} />
        Les participants peuvent proposer leurs propres options
      </label>
      {step.options.map((option, i) => (
        <div key={option.id} className="editor__option">
          <input
            value={option.label}
            placeholder="Libellé"
            onChange={(e) => setOptions(step.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))}
          />
          <input
            value={option.description ?? ''}
            placeholder="Description (facultatif)"
            onChange={(e) => setOptions(step.options.map((o, j) => (j === i ? { ...o, description: e.target.value } : o)))}
          />
          <button className="btn btn--small" title="Retirer" onClick={() => setOptions(step.options.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button className="btn btn--small" onClick={() => setOptions([...step.options, { id: newId('o'), label: '' }])}>
        + Option
      </button>
    </div>
  )
}
