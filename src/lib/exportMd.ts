import { WORKSHOP, sessionSteps } from '../workshop'
import { choiceResults, voteResults, voteTargets } from './results'
import type { SessionData } from '../types'

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

export function sessionMarkdown(data: SessionData, { includeManifesto = true } = {}): string {
  const { session, contributions, themes, choices, votes, participants } = data
  const date = new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `${WORKSHOP.tribe} · session ${session.code} · ${date} · ${participants.length} participants`,
    '',
  ]

  let part = ''
  for (const step of sessionSteps(session)) {
    if (step.kind === 'info' || (step.kind === 'manifesto' && !includeManifesto)) continue
    if (step.part !== part) {
      part = step.part
      if (part) lines.push(`## ${part}`, '')
    }
    lines.push(`### ${step.title}`, '', `> ${step.question}`, '')

    switch (step.kind) {
      case 'postit': {
        const stepContribs = contributions.filter((c) => c.step_id === step.id)
        const stepThemes = themes.filter((t) => t.step_id === step.id)
        if (!stepContribs.length) {
          lines.push('_Aucune contribution._', '')
          break
        }
        for (const theme of stepThemes) {
          const items = stepContribs.filter((c) => c.theme_id === theme.id)
          lines.push(`**${theme.label}** (${items.length})`, '', ...items.map((c) => `- ${oneLine(c.text)}`), '')
        }
        const loose = stepContribs.filter((c) => !stepThemes.some((t) => t.id === c.theme_id))
        if (loose.length) {
          if (stepThemes.length) lines.push('**Non classés**', '')
          lines.push(...loose.map((c) => `- ${oneLine(c.text)}`), '')
        }
        break
      }
      case 'choice': {
        const { respondents, items } = choiceResults(step, choices, contributions)
        lines.push(
          `${respondents} répondants`,
          '',
          ...items.map(({ option, count }) => `- ${oneLine(option.label)}${option.custom ? ' (proposé en séance)' : ''} : ${count}`),
          '',
        )
        break
      }
      case 'vote': {
        const targets = voteTargets(step, contributions, themes)
        const { voters, items } = voteResults(step, targets, votes)
        lines.push(`${voters} votants, ${step.points} points chacun`, '')
        items.forEach(({ target, points, voters: n }, i) => {
          lines.push(`${i + 1}. ${oneLine(target.label)} : ${points} pts (${n} votants)`)
          for (const item of target.items) lines.push(`   - ${oneLine(item)}`)
        })
        lines.push('')
        break
      }
      case 'manifesto':
        lines.push(session.manifesto?.trim() || '_Pas encore rédigé._', '')
        break
    }
  }
  return lines.join('\n')
}

export function downloadMarkdown(data: SessionData) {
  const blob = new Blob([sessionMarkdown(data)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `build-our-tribe-${data.session.code}.md`
  a.click()
  URL.revokeObjectURL(url)
}
