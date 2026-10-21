// Déroulé par défaut, copié dans chaque nouvelle session. L'animateur le modifie ensuite en direct
// (éditeur du déroulé) : ce fichier n'est qu'un point de départ.

import { uuid } from './lib/storage'

export type Option = { id: string; label: string; description?: string }

type StepBase = {
  id: string
  part: string
  title: string
  question: string
  hint?: string
  minutes: number
}

// cloud : affiche un nuage de mots au-dessus du mur à la révélation.
export type PostitStep = StepBase & { kind: 'postit'; cloud?: boolean }
// allowCustom : les participants peuvent proposer leurs propres options.
export type ChoiceStep = StepBase & { kind: 'choice'; options: Option[]; max: number; allowCustom?: boolean }
export type VoteStep = StepBase & { kind: 'vote'; sources: string[]; points: number }
// Slide libre : pause, consigne, transition…
export type InfoStep = StepBase & { kind: 'info' }
export type ManifestoStep = StepBase & { kind: 'manifesto' }
export type Step = PostitStep | ChoiceStep | VoteStep | InfoStep | ManifestoStep
export type StepKind = Step['kind']

export const KIND_LABELS: Record<StepKind, string> = {
  postit: 'Post-its',
  choice: 'Choix',
  vote: 'Vote à points',
  info: 'Message',
  manifesto: 'Synthèse IA',
}

export const WORKSHOP = {
  name: 'Build Our Tribe',
  tribe: 'Tribu Data & AI — Retail & Luxe',
}

const EXPLORER = '1 · Explorer'
const DECIDER = '2 · Décider'

export const DEFAULT_STEPS: Step[] = [
  {
    id: 'anime',
    kind: 'postit',
    part: EXPLORER,
    title: 'Ce qui nous anime',
    question: "Qu'est-ce qui te donne vraiment envie de te lever le matin dans ton métier ?",
    hint: 'Un sujet, une techno, un moment de mission, une rencontre… Une idée par post-it.',
    minutes: 10,
    cloud: true,
  },
  {
    id: 'why',
    kind: 'postit',
    part: EXPLORER,
    title: 'Pourquoi sommes-nous ensemble ?',
    question: 'Quelle valeur voulons-nous apporter à nos clients, à OCTO et entre nous ?',
    hint: "Imagine que la tribu disparaisse demain : qu'est-ce qui manquerait ?",
    minutes: 15,
  },
  {
    id: 'devenir',
    kind: 'postit',
    part: EXPLORER,
    title: 'Qui voulons-nous devenir ?',
    question: "Dans trois ans, qu'aimerais-tu qu'on dise de la tribu, chez nos clients et chez OCTO ?",
    hint: 'Une expertise, une réputation, une façon de travailler…',
    minutes: 10,
  },
  {
    id: 'convictions',
    kind: 'vote',
    part: DECIDER,
    title: 'Nos convictions fortes',
    question: "Qu'est-ce qui doit absolument faire partie de notre Why ?",
    hint: 'Tu as 5 points : répartis-les comme tu veux, y compris plusieurs sur le même sujet.',
    minutes: 15,
    sources: ['anime', 'why', 'devenir'],
    points: 5,
  },
  {
    id: 'territoires',
    kind: 'choice',
    part: DECIDER,
    title: 'Nos territoires',
    question: 'Sur quels sujets voulons-nous être reconnus dans trois ans ?',
    hint: "Choisis jusqu'à trois territoires. Il en manque un ? Propose-le, tout le monde pourra le choisir.",
    minutes: 5,
    max: 3,
    allowCustom: true,
    options: [
      { id: 'ai-commerce', label: 'AI-Native Commerce', description: 'Search, shopping agents, conversational commerce' },
      { id: 'decisioning', label: 'Customer Decisioning & Clienteling', description: 'Personnalisation, recommandation, fidélisation' },
      { id: 'merch', label: 'AI-Augmented Merchandising', description: 'Forecast, pricing, assortiment, copilotes métiers' },
      { id: 'platforms', label: 'AI Engineering & Platforms', description: 'ML platforms, MLOps, LLMOps, architecture' },
      { id: 'agentic', label: 'Agentic AI', description: 'Agents métier, automatisation, orchestration' },
    ],
  },
  {
    id: 'reve',
    kind: 'postit',
    part: DECIDER,
    title: 'La mission rêvée',
    question: 'Quelle mission concrète rêverais-tu de réaliser, même si nous ne savons pas encore la vendre ?',
    hint: 'Client, problème, techno, impact : le plus concret possible.',
    minutes: 10,
  },
  {
    id: 'actions',
    kind: 'postit',
    part: DECIDER,
    title: "Passer à l'action",
    question: 'Quelle initiative concrète pourrions-nous lancer dans les trois prochains mois ?',
    hint: 'Un talk, un PoC, une offre, un rituel, un partenariat…',
    minutes: 10,
  },
  {
    id: 'actions-vote',
    kind: 'vote',
    part: DECIDER,
    title: 'Nos premières actions',
    question: 'Quelles initiatives lançons-nous en premier ?',
    hint: 'Tu as 3 points à répartir.',
    minutes: 5,
    sources: ['actions'],
    points: 3,
  },
  {
    id: 'manifeste',
    kind: 'manifesto',
    part: DECIDER,
    title: 'Notre Why provisoire',
    question: 'Voici ce qui émerge de nos contributions. On le challenge ensemble.',
    minutes: 10,
  },
]

export function sessionSteps(session: { steps: Step[] | null }): Step[] {
  return session.steps?.length ? session.steps : DEFAULT_STEPS
}

export const newId = (prefix: string) => `${prefix}-${uuid().slice(0, 8)}`

export function blankStep(kind: StepKind, part: string): Step {
  const base = { id: newId('s'), part, minutes: 10 }
  switch (kind) {
    case 'postit':
      return { ...base, kind, title: 'Nouvelles idées', question: 'Ta question ici ?', hint: 'Une idée par post-it.' }
    case 'choice':
      return { ...base, kind, title: 'Nouveau choix', question: 'Que choisis-tu ?', max: 3, allowCustom: true, options: [] }
    case 'vote':
      return { ...base, kind, title: 'Nouveau vote', question: 'Sur quoi mettons-nous la priorité ?', points: 5, sources: [] }
    case 'info':
      return { ...base, kind, title: 'Message', question: 'Pause café ☕', hint: 'On reprend dans 10 minutes.', minutes: 0 }
    case 'manifesto':
      return { ...base, kind, title: 'Synthèse', question: 'Voici ce qui émerge de nos contributions.' }
  }
}
