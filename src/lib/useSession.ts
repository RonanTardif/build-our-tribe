import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { uuid } from './storage'
import type { ChoiceRow, Contribution, Participant, Session, SessionData, Theme, VoteRow } from '../types'

export type SessionState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SessionData }

const TABLES = ['sessions', 'participants', 'contributions', 'themes', 'choices', 'votes'] as const

async function fetchSession(code: string): Promise<SessionData | null> {
  const { data: session, error } = await supabase.from('sessions').select('*').eq('code', code).maybeSingle()
  if (error) throw new Error(error.message)
  if (!session) return null

  const id = (session as Session).id
  const [participants, contributions, themes, choices, votes] = await Promise.all([
    supabase.from('participants').select('participant_id, ready_step').eq('session_id', id),
    supabase.from('contributions').select('*').eq('session_id', id).order('created_at'),
    supabase.from('themes').select('*').eq('session_id', id).order('created_at'),
    supabase.from('choices').select('*').eq('session_id', id),
    supabase.from('votes').select('*').eq('session_id', id),
  ])
  for (const result of [participants, contributions, themes, choices, votes]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    session: session as Session,
    participants: (participants.data ?? []) as Participant[],
    contributions: (contributions.data ?? []) as Contribution[],
    themes: (themes.data ?? []) as Theme[],
    choices: (choices.data ?? []) as ChoiceRow[],
    votes: (votes.data ?? []) as VoteRow[],
  }
}

// Recharge tout l'état de la session à chaque événement temps réel : les volumes d'un atelier
// sont minuscules, et c'est bien plus robuste que de patcher l'état ligne par ligne.
// Si le websocket ne passe pas (proxy, wifi capricieux), on bascule sur du polling toutes les 3 s.
export function useSession(code: string) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const reload = useRef<() => void>(() => {})

  useEffect(() => {
    let cancelled = false
    let inFlight = false
    let queued = false
    let debounce: number | undefined
    let subscribed = false
    let ticks = 0

    const load = async () => {
      if (inFlight) {
        queued = true
        return
      }
      inFlight = true
      try {
        const data = await fetchSession(code)
        if (!cancelled) setState(data ? { status: 'ready', data } : { status: 'missing' })
      } catch (e) {
        if (!cancelled) {
          setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', message: (e as Error).message }))
        }
      } finally {
        inFlight = false
        if (queued && !cancelled) {
          queued = false
          void load()
        }
      }
    }
    const schedule = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(load, 120)
    }
    reload.current = () => void load()

    let channel = supabase.channel(`session-${code}-${uuid()}`)
    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule)
    }
    // « SUBSCRIBED » arrive avant que l'écoute Postgres soit active : on recharge aussi quand
    // le serveur confirme l'abonnement, pour ne rien rater entre les deux.
    channel = channel.on('system', {}, schedule)
    channel.subscribe((status) => {
      subscribed = status === 'SUBSCRIBED'
      if (subscribed) schedule()
    })

    void load()
    const poll = window.setInterval(() => {
      ticks++
      if (!subscribed || ticks % 10 === 0) void load()
    }, 3000)

    return () => {
      cancelled = true
      window.clearTimeout(debounce)
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [code])

  const refresh = useCallback(() => reload.current(), [])
  return { state, refresh }
}
