import type { ChoiceStep, VoteStep } from '../workshop'
import type { ChoiceRow, Contribution, Theme, VoteRow } from '../types'

export function contributorsCount(stepId: string, contributions: Contribution[]) {
  return new Set(contributions.filter((c) => c.step_id === stepId).map((c) => c.participant_id)).size
}

export function choiceResults(step: ChoiceStep, choices: ChoiceRow[]) {
  const rows = choices.filter((c) => c.step_id === step.id && c.option_ids.length > 0)
  const items = step.options
    .map((option) => ({ option, count: rows.filter((r) => r.option_ids.includes(option.id)).length }))
    .sort((a, b) => b.count - a.count)
  return { respondents: rows.length, items }
}

export type VoteTarget = {
  id: string
  label: string
  stepId: string
  kind: 'theme' | 'postit'
  items: string[]
}

// On vote sur les thèmes des étapes sources, plus les post-its que l'animateur n'a pas classés.
export function voteTargets(step: VoteStep, contributions: Contribution[], themes: Theme[]): VoteTarget[] {
  const targets: VoteTarget[] = []
  for (const stepId of step.sources) {
    const stepThemes = themes.filter((t) => t.step_id === stepId)
    const themeIds = new Set(stepThemes.map((t) => t.id))
    for (const theme of stepThemes) {
      targets.push({
        id: theme.id,
        label: theme.label,
        stepId,
        kind: 'theme',
        items: contributions.filter((c) => c.theme_id === theme.id).map((c) => c.text),
      })
    }
    for (const c of contributions) {
      if (c.step_id === stepId && !(c.theme_id && themeIds.has(c.theme_id))) {
        targets.push({ id: c.id, label: c.text, stepId, kind: 'postit', items: [] })
      }
    }
  }
  return targets
}

export function voteResults(step: VoteStep, targets: VoteTarget[], votes: VoteRow[]) {
  const rows = votes.filter((v) => v.step_id === step.id)
  const items = targets
    .map((target) => ({
      target,
      points: rows.reduce((sum, r) => sum + (r.allocation[target.id] ?? 0), 0),
      voters: rows.filter((r) => (r.allocation[target.id] ?? 0) > 0).length,
    }))
    .sort((a, b) => b.points - a.points)
  const voters = rows.filter((r) => targets.some((t) => (r.allocation[t.id] ?? 0) > 0)).length
  return { voters, items }
}

export function spentPoints(allocation: Record<string, number>, targets: VoteTarget[]) {
  return targets.reduce((sum, t) => sum + (allocation[t.id] ?? 0), 0)
}
