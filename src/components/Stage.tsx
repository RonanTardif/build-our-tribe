import { PART_LABELS, STEPS, WORKSHOP, type Step } from '../workshop'
import { choiceResults, contributorsCount, voteResults, voteTargets } from '../lib/results'
import type { SessionData } from '../types'
import { Bars } from './Bars'
import { JoinInfo } from './JoinInfo'
import { Markdown } from './Markdown'
import { PostitWall, type ThemeEditor } from './PostitWall'
import { Timer } from './Timer'

// Ce qui est projeté : utilisé par l'écran de projection et par la vue animateur.

type Props = {
  data: SessionData
  grouping?: ThemeEditor
  manifestoDraft?: string | null
}

export function Stage({ data, grouping, manifestoDraft }: Props) {
  const { session } = data
  const step = STEPS[session.step_index]

  if (!step) {
    return (
      <div className="stage stage--lobby">
        <p className="eyebrow">{WORKSHOP.tribe}</p>
        <h1 className="lobby__title">{WORKSHOP.name}</h1>
        <JoinInfo code={session.code} size={260} />
        <p className="lobby__count">
          {data.participants.length} {data.participants.length > 1 ? 'personnes connectées' : 'personne connectée'}
        </p>
      </div>
    )
  }

  return (
    <div className="stage">
      <StepHeader step={step} index={session.step_index} timerEnd={session.timer_end} />
      <StageBody step={step} data={data} grouping={grouping} manifestoDraft={manifestoDraft} />
    </div>
  )
}

export function StepHeader({ step, index, timerEnd, hint }: { step: Step; index: number; timerEnd: string | null; hint?: boolean }) {
  return (
    <header className="step-head">
      <div className="step-head__meta">
        <span className="pill">{PART_LABELS[step.part]}</span>
        <span>
          Étape {index + 1} / {STEPS.length} · {step.title}
        </span>
        <Timer end={timerEnd} />
      </div>
      <h1 className="step-head__question">{step.question}</h1>
      {hint && step.hint && <p className="step-head__hint">{step.hint}</p>}
    </header>
  )
}

function StageBody({ step, data, grouping, manifestoDraft }: { step: Step } & Props) {
  const { session, contributions, themes, choices, votes, participants } = data
  const revealed = session.phase === 'revealed'
  const people = participants.length

  switch (step.kind) {
    case 'postit': {
      const stepContribs = contributions.filter((c) => c.step_id === step.id)
      if (!revealed) {
        return (
          <HiddenWall
            count={stepContribs.length}
            caption={`${stepContribs.length} post-its · ${contributorsCount(step.id, contributions)} / ${people} participants ont contribué`}
          />
        )
      }
      return <PostitWall contributions={stepContribs} themes={themes.filter((t) => t.step_id === step.id)} editor={grouping} />
    }

    case 'choice': {
      const { respondents, items } = choiceResults(step, choices)
      if (!revealed) {
        return (
          <div className="waiting">
            <p className="waiting__count">
              {respondents} / {people} ont répondu
            </p>
            <ul className="chips">
              {step.options.map((o) => (
                <li key={o.id}>{o.label}</li>
              ))}
            </ul>
          </div>
        )
      }
      return (
        <Bars
          items={items.map(({ option, count }) => ({ key: option.id, label: option.label, value: count, caption: option.description }))}
          unit={(n) => `${n} ${n > 1 ? 'votes' : 'vote'}`}
        />
      )
    }

    case 'vote': {
      const targets = voteTargets(step, contributions, themes)
      const { voters, items } = voteResults(step, targets, votes)
      if (!revealed) {
        return (
          <div className="waiting">
            <p className="waiting__count">
              {voters} / {people} ont voté · {step.points} points chacun
            </p>
            <ul className="chips">
              {targets.map((t) => (
                <li key={t.id}>{t.label}</li>
              ))}
            </ul>
          </div>
        )
      }
      return (
        <Bars
          items={items.map(({ target, points, voters: n }) => ({
            key: target.id,
            label: target.label,
            value: points,
            caption: `${n} ${n > 1 ? 'votants' : 'votant'}${target.kind === 'theme' ? ` · ${target.items.length} post-its` : ''}`,
            details: target.items,
          }))}
          unit={(n) => `${n} pts`}
        />
      )
    }

    case 'manifesto': {
      const text = manifestoDraft ?? session.manifesto
      return text ? (
        <div className="manifesto">
          <Markdown text={text} />
        </div>
      ) : (
        <p className="empty">La synthèse sera générée à partir de toutes vos contributions.</p>
      )
    }
  }
}

function HiddenWall({ count, caption }: { count: number; caption: string }) {
  return (
    <div className="hidden-wall">
      <div className="hidden-wall__cards" aria-hidden>
        {Array.from({ length: Math.min(count, 80) }, (_, i) => (
          <span key={i} className="card-back" style={{ rotate: `${((i * 37) % 9) - 4}deg` }} />
        ))}
      </div>
      <p className="waiting__count">{caption}</p>
      <p className="muted">Les réponses restent cachées jusqu'à la révélation.</p>
    </div>
  )
}
