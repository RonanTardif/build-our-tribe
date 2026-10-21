// Contenu de l'atelier : modifie librement les questions, durées et options ici.
// L'`id` de chaque étape sert de clé en base : ne le change pas une fois l'atelier lancé.

export type Option = { id: string; label: string; description?: string }

type StepBase = {
  id: string
  part: 'Explorer' | 'Décider'
  title: string
  question: string
  hint?: string
  minutes: number
}

// cloud : affiche un nuage de mots au-dessus du mur à la révélation.
export type PostitStep = StepBase & { kind: 'postit'; cloud?: boolean }
export type ChoiceStep = StepBase & { kind: 'choice'; options: Option[]; max: number }
export type VoteStep = StepBase & { kind: 'vote'; sources: string[]; points: number }
export type ManifestoStep = StepBase & { kind: 'manifesto' }
export type Step = PostitStep | ChoiceStep | VoteStep | ManifestoStep

export const WORKSHOP = {
  name: 'Build Our Tribe',
  tribe: 'Tribu Data & AI — Retail & Luxe',
}

export const STEPS: Step[] = [
  {
    id: 'anime',
    kind: 'postit',
    part: 'Explorer',
    title: 'Ce qui nous anime',
    question: "Qu'est-ce qui te donne vraiment envie de te lever le matin dans ton métier ?",
    hint: 'Un sujet, une techno, un moment de mission, une rencontre… Une idée par post-it.',
    minutes: 10,
    cloud: true,
  },
  {
    id: 'why',
    kind: 'postit',
    part: 'Explorer',
    title: 'Pourquoi sommes-nous ensemble ?',
    question: 'Quelle valeur voulons-nous apporter à nos clients, à OCTO et entre nous ?',
    hint: "Imagine que la tribu disparaisse demain : qu'est-ce qui manquerait ?",
    minutes: 15,
  },
  {
    id: 'devenir',
    kind: 'postit',
    part: 'Explorer',
    title: 'Qui voulons-nous devenir ?',
    question: "Dans trois ans, qu'aimerais-tu qu'on dise de la tribu, chez nos clients et chez OCTO ?",
    hint: 'Une expertise, une réputation, une façon de travailler…',
    minutes: 10,
  },
  {
    id: 'convictions',
    kind: 'vote',
    part: 'Décider',
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
    part: 'Décider',
    title: 'Nos territoires',
    question: 'Sur quels sujets voulons-nous être reconnus dans trois ans ?',
    hint: "Choisis jusqu'à trois territoires qui te donnent le plus envie de construire l'avenir de la tribu.",
    minutes: 5,
    max: 3,
    options: [
      { id: 'ai-commerce', label: 'AI-Native Commerce', description: 'Search, shopping agents, conversational commerce' },
      { id: 'decisioning', label: 'Customer Decisioning & Clienteling', description: 'Personnalisation, recommandation, fidélisation' },
      { id: 'merch', label: 'AI-Augmented Merchandising', description: 'Forecast, pricing, assortiment, copilotes métiers' },
      { id: 'platforms', label: 'AI Engineering & Platforms', description: 'ML platforms, MLOps, LLMOps, architecture' },
      { id: 'agentic', label: 'Agentic AI', description: 'Agents métier, automatisation, orchestration' },
      { id: 'autre', label: 'Autres territoires', description: 'Des expertises encore non identifiées' },
    ],
  },
  {
    id: 'reve',
    kind: 'postit',
    part: 'Décider',
    title: 'La mission rêvée',
    question: 'Quelle mission concrète rêverais-tu de réaliser, même si nous ne savons pas encore la vendre ?',
    hint: 'Client, problème, techno, impact : le plus concret possible.',
    minutes: 10,
  },
  {
    id: 'actions',
    kind: 'postit',
    part: 'Décider',
    title: "Passer à l'action",
    question: 'Quelle initiative concrète pourrions-nous lancer dans les trois prochains mois ?',
    hint: 'Un talk, un PoC, une offre, un rituel, un partenariat…',
    minutes: 10,
  },
  {
    id: 'actions-vote',
    kind: 'vote',
    part: 'Décider',
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
    part: 'Décider',
    title: 'Notre Why provisoire',
    question: 'Voici ce qui émerge de nos contributions. On le challenge ensemble.',
    minutes: 10,
  },
]

export const PART_LABELS: Record<Step['part'], string> = {
  Explorer: '1 · Explorer',
  Décider: '2 · Décider',
}

export const stepById = (id: string) => STEPS.find((s) => s.id === id)
