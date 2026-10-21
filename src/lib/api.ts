import { supabase } from './supabase'
import { uuid } from './storage'
import type { Phase, Session, Theme } from '../types'

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomCode(length = 5) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function createSession(title: string): Promise<Session> {
  const facilitator_key = uuid().replace(/-/g, '').slice(0, 16)
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ code: randomCode(), title, facilitator_key })
      .select()
      .single()
    if (!error) return data as Session
    if (error.code !== '23505') fail(error)
  }
  throw new Error('Impossible de générer un code de session unique, réessaie.')
}

export async function joinSession(sessionId: string, participantId: string) {
  const { error } = await supabase
    .from('participants')
    .upsert({ session_id: sessionId, participant_id: participantId }, { onConflict: 'session_id,participant_id', ignoreDuplicates: true })
  fail(error)
}

export async function setReady(sessionId: string, participantId: string, stepId: string | null) {
  const { error } = await supabase
    .from('participants')
    .upsert({ session_id: sessionId, participant_id: participantId, ready_step: stepId }, { onConflict: 'session_id,participant_id' })
  fail(error)
}

async function updateSession(sessionId: string, patch: Partial<Session>) {
  const { error } = await supabase.from('sessions').update(patch).eq('id', sessionId)
  fail(error)
}

export function goToStep(sessionId: string, stepIndex: number, minutes: number | null) {
  const timer_end = minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null
  return updateSession(sessionId, { step_index: stepIndex, phase: 'open', timer_end })
}

export const setPhase = (sessionId: string, phase: Phase) => updateSession(sessionId, { phase })
export const setTimer = (sessionId: string, timer_end: string | null) => updateSession(sessionId, { timer_end })
export const setManifesto = (sessionId: string, manifesto: string) => updateSession(sessionId, { manifesto })

export async function addContribution(sessionId: string, stepId: string, participantId: string, text: string) {
  const { error } = await supabase
    .from('contributions')
    .insert({ session_id: sessionId, step_id: stepId, participant_id: participantId, text })
  fail(error)
}

export async function updateContribution(id: string, text: string) {
  const { error } = await supabase.from('contributions').update({ text }).eq('id', id)
  fail(error)
}

export async function deleteContribution(id: string) {
  const { error } = await supabase.from('contributions').delete().eq('id', id)
  fail(error)
}

export async function createTheme(sessionId: string, stepId: string, label: string): Promise<Theme> {
  const { data, error } = await supabase
    .from('themes')
    .insert({ session_id: sessionId, step_id: stepId, label })
    .select()
    .single()
  fail(error)
  return data as Theme
}

export async function renameTheme(id: string, label: string) {
  const { error } = await supabase.from('themes').update({ label }).eq('id', id)
  fail(error)
}

// Les post-its du thème repassent en « non classés » (FK on delete set null).
export async function deleteTheme(id: string) {
  const { error } = await supabase.from('themes').delete().eq('id', id)
  fail(error)
}

export async function assignTheme(contributionIds: string[], themeId: string | null) {
  if (!contributionIds.length) return
  const { error } = await supabase.from('contributions').update({ theme_id: themeId }).in('id', contributionIds)
  fail(error)
}

export async function replaceThemes(sessionId: string, stepId: string, themes: { label: string; contributionIds: string[] }[]) {
  const { error } = await supabase.from('themes').delete().eq('session_id', sessionId).eq('step_id', stepId)
  fail(error)
  for (const theme of themes) {
    const created = await createTheme(sessionId, stepId, theme.label)
    await assignTheme(theme.contributionIds, created.id)
  }
}

export async function saveChoice(sessionId: string, stepId: string, participantId: string, optionIds: string[]) {
  const { error } = await supabase
    .from('choices')
    .upsert({ session_id: sessionId, step_id: stepId, participant_id: participantId, option_ids: optionIds, updated_at: new Date().toISOString() })
  fail(error)
}

export async function saveVote(sessionId: string, stepId: string, participantId: string, allocation: Record<string, number>) {
  const { error } = await supabase
    .from('votes')
    .upsert({ session_id: sessionId, step_id: stepId, participant_id: participantId, allocation, updated_at: new Date().toISOString() })
  fail(error)
}
