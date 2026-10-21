export type Phase = 'open' | 'revealed'

export type Session = {
  id: string
  code: string
  title: string
  facilitator_key: string
  step_index: number
  phase: Phase
  timer_end: string | null
  manifesto: string | null
  created_at: string
}

export type Participant = {
  participant_id: string
  ready_step: string | null
}

export type Contribution = {
  id: string
  session_id: string
  step_id: string
  participant_id: string
  text: string
  theme_id: string | null
  created_at: string
}

export type Theme = {
  id: string
  session_id: string
  step_id: string
  label: string
  created_at: string
}

export type ChoiceRow = {
  session_id: string
  step_id: string
  participant_id: string
  option_ids: string[]
}

export type VoteRow = {
  session_id: string
  step_id: string
  participant_id: string
  allocation: Record<string, number>
}

export type SessionData = {
  session: Session
  participants: Participant[]
  contributions: Contribution[]
  themes: Theme[]
  choices: ChoiceRow[]
  votes: VoteRow[]
}
