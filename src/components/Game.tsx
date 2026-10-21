import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from 'react'
import { savePlayer } from '../lib/api'
import { playerId, playerName, setPlayerName } from '../lib/storage'
import type { Player, SessionData } from '../types'

// Jeu des balles : des têtes de la tribu rebondissent à l'écran, on clique pour gagner des jetons.
// Toute image déposée dans src/assets/faces devient une balle.
const FACES = Object.values(
  import.meta.glob('../assets/faces/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }),
) as string[]

const RUSH_MS = 10_000
const RUSH_BALLS = 18
const SURPRISE_VALUE = 3
const RUSH_VALUE = 1

type Ball = {
  id: number
  face: string
  size: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  gravity: number
  born: number
  ttl: number
  value: number
  caught: boolean
}

type Floater = { id: number; x: number; y: number; text: string }

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
let nextId = 1

// Balle surprise : surgit dans la moitié haute, saute puis rebondit avec la gravité.
function surpriseBall(): Ball {
  const size = rand(76, 96)
  return {
    id: nextId++,
    face: pick(FACES),
    size,
    x: rand(0, window.innerWidth - size),
    y: rand(window.innerHeight * 0.1, window.innerHeight * 0.5),
    vx: rand(180, 340) * (Math.random() < 0.5 ? -1 : 1),
    vy: -rand(350, 750),
    angle: 0,
    spin: rand(-180, 180),
    gravity: 1500,
    born: performance.now(),
    ttl: rand(8000, 11000),
    value: SURPRISE_VALUE,
    caught: false,
  }
}

// Balle de rush : pas de gravité, très rapide, part dans une direction au hasard.
function rushBall(face: string, ttl: number): Ball {
  const size = rand(64, 84)
  const speed = rand(450, 700)
  const direction = rand(0, Math.PI * 2)
  return {
    id: nextId++,
    face,
    size,
    x: rand(0, window.innerWidth - size),
    y: rand(0, window.innerHeight - size),
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    angle: 0,
    spin: rand(-540, 540),
    gravity: 0,
    born: performance.now(),
    ttl,
    value: RUSH_VALUE,
    caught: false,
  }
}

type LayerProps = {
  rushAt?: string | null
  surprise: boolean
  interactive: boolean
  onCatch?: (value: number) => void
}

export function BallLayer({ rushAt, surprise, interactive, onCatch }: LayerProps) {
  const balls = useRef<Ball[]>([])
  const elements = useRef(new Map<number, HTMLElement>())
  const timers = useRef<number[]>([])
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [rushEnd, setRushEnd] = useState<number | null>(null)

  const later = useCallback((fn: () => void, delay: number) => {
    timers.current.push(window.setTimeout(fn, delay))
  }, [])
  const add = useCallback((ball: Ball) => {
    balls.current.push(ball)
    rerender()
  }, [])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // Boucle d'animation : positions écrites directement dans le DOM, React ne re-rend qu'aux ajouts/suppressions.
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    // Même horloge que `born` (performance.now) : l'horodatage fourni par rAF peut en différer.
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = window.innerWidth
      const h = window.innerHeight
      let expired = false
      for (const b of balls.current) {
        const el = elements.current.get(b.id)
        const age = now - b.born
        if (age > b.ttl && !b.caught) {
          expired = true
          continue
        }
        if (b.caught) continue
        if (age > b.ttl - 500) el?.classList.add('ball--leaving')
        b.vy += b.gravity * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.angle += b.spin * dt
        if (b.x < 0) (b.x = 0), (b.vx = Math.abs(b.vx))
        else if (b.x > w - b.size) (b.x = w - b.size), (b.vx = -Math.abs(b.vx))
        if (b.y < 0) (b.y = 0), (b.vy = Math.abs(b.vy))
        else if (b.y > h - b.size) (b.y = h - b.size), (b.vy = -Math.abs(b.vy)), (b.spin = b.vx * 0.8)
        if (el) el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.angle}deg)`
      }
      if (expired) {
        balls.current = balls.current.filter((b) => b.caught || now - b.born <= b.ttl)
        rerender()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Balles surprises : de temps en temps, une à trois têtes surgissent (chaque écran tire au sort).
  useEffect(() => {
    if (!surprise || !FACES.length) return
    let timer = 0
    const schedule = (first: boolean) => {
      timer = window.setTimeout(
        () => {
          if (document.visibilityState === 'visible') {
            const r = Math.random()
            const count = r < 0.7 ? 1 : r < 0.95 ? 2 : 3
            for (let i = 0; i < count; i++) later(() => add(surpriseBall()), i * 400)
          }
          schedule(false)
        },
        first ? rand(30_000, 120_000) : rand(60_000, 240_000),
      )
    }
    schedule(true)
    return () => window.clearTimeout(timer)
  }, [surprise, add, later])

  // Rush « on demand ». Le rush déjà présent à l'ouverture de la page n'est rejoué que s'il est en
  // cours ; un rush reçu ensuite en direct dure 10 s pleines, quelle que soit l'horloge du poste.
  const [initialRush] = useState(rushAt)
  useEffect(() => {
    if (!rushAt || !FACES.length) return
    const age = Date.now() - Date.parse(rushAt)
    let duration = RUSH_MS
    if (rushAt === initialRush) {
      if (age < 0 || age >= RUSH_MS) return
      duration = RUSH_MS - age
    } else if (age > 60_000) return

    const local: number[] = []
    setRushEnd(Date.now() + duration)
    local.push(window.setTimeout(() => setRushEnd(null), duration))
    for (let i = 0; i < RUSH_BALLS; i++) {
      const delay = i * 70
      local.push(window.setTimeout(() => add(rushBall(FACES[i % FACES.length], duration - delay)), delay))
    }
    return () => {
      local.forEach((t) => window.clearTimeout(t))
      setRushEnd(null)
    }
  }, [rushAt, initialRush, add])

  const catchBall = (ball: Ball) => {
    if (ball.caught || !interactive) return
    ball.caught = true
    elements.current.get(ball.id)?.classList.add('ball--caught')
    onCatch?.(ball.value)
    const floater = { id: ball.id, x: ball.x + ball.size / 2, y: ball.y, text: `+${ball.value}` }
    setFloaters((fs) => [...fs, floater])
    later(() => {
      balls.current = balls.current.filter((b) => b !== ball)
      setFloaters((fs) => fs.filter((f) => f.id !== floater.id))
      rerender()
    }, 700)
  }

  return (
    <div className={`balls ${interactive ? '' : 'balls--passive'}`}>
      {rushEnd && <RushBanner end={rushEnd} />}
      {balls.current.map((b) => (
        <button
          key={b.id}
          ref={(el) => {
            if (el) elements.current.set(b.id, el)
            else elements.current.delete(b.id)
          }}
          className="ball"
          style={{ width: b.size, height: b.size, transform: `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.angle}deg)` }}
          onPointerDown={() => catchBall(b)}
          tabIndex={-1}
          aria-label="Attrape-moi !"
        >
          <img src={b.face} alt="" draggable={false} />
        </button>
      ))}
      {floaters.map((f) => (
        <span key={f.id} className="floater" style={{ left: f.x, top: f.y }}>
          {f.text}
        </span>
      ))}
    </div>
  )
}

function RushBanner({ end }: { end: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(interval)
  }, [])
  return <div className="rush-banner">🚀 RUSH · {Math.max(0, Math.ceil((end - now) / 1000))} s</div>
}

// Côté participant : balles cliquables, compteur de jetons, prénom pour le classement.
export function PlayerHud({ data }: { data: SessionData }) {
  const { session } = data
  const game = session.game ?? {}
  const pid = useMemo(() => playerId(), [])
  const me = data.players.find((p) => p.player_id === pid)
  const [tokens, setTokens] = useState(me?.tokens ?? 0)
  const [name, setName] = useState(me?.name ?? playerName())
  const [asking, setAsking] = useState(false)
  const [boardClosed, setBoardClosed] = useState(false)
  const tokensRef = useRef(tokens)
  const nameRef = useRef(name)
  const saveTimer = useRef<number | undefined>(undefined)

  const flush = useCallback(() => {
    saveTimer.current = undefined
    savePlayer(session.id, pid, nameRef.current.trim() || null, tokensRef.current).catch(() => {})
  }, [session.id, pid])

  // Remise à zéro par l'animateur.
  const lastReset = useRef(game.resetAt)
  useEffect(() => {
    if (game.resetAt === lastReset.current) return
    lastReset.current = game.resetAt
    tokensRef.current = 0
    setTokens(0)
  }, [game.resetAt])

  useEffect(() => setBoardClosed(false), [game.board])
  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const onCatch = (value: number) => {
    tokensRef.current += value
    setTokens(tokensRef.current)
    // Regroupe les écritures pendant un rush.
    saveTimer.current ??= window.setTimeout(flush, 1200)
    if (!nameRef.current.trim()) setAsking(true)
  }

  const submitName = (e: FormEvent) => {
    e.preventDefault()
    nameRef.current = name.trim()
    setPlayerName(nameRef.current)
    setAsking(false)
    window.clearTimeout(saveTimer.current)
    flush()
  }

  return (
    <>
      <BallLayer rushAt={game.rushAt} surprise={game.balls !== false} interactive onCatch={onCatch} />
      {(tokens > 0 || asking) && (
        <div className="hud">
          {asking ? (
            <form className="hud__ask" onSubmit={submitName}>
              <strong>Bien joué ! 🎯</strong>
              <span>Ton prénom pour le classement (une bière est en jeu) :</span>
              <div className="panel__row">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Prénom" autoFocus />
                <button className="btn btn--primary btn--small">OK</button>
              </div>
            </form>
          ) : (
            <button className="hud__tokens" onClick={() => setAsking(true)} title="Changer de prénom">
              🪙 {tokens} jeton{tokens > 1 ? 's' : ''}
              {name && <span className="muted"> · {name}</span>}
            </button>
          )}
        </div>
      )}
      {game.board && !boardClosed && <Leaderboard players={data.players} highlight={pid} onClose={() => setBoardClosed(true)} />}
    </>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ players, highlight, onClose }: { players: Player[]; highlight?: string; onClose?: () => void }) {
  const ranked = players.filter((p) => p.tokens > 0).sort((a, b) => b.tokens - a.tokens)
  const top = ranked.slice(0, 10)
  const tie = ranked.length > 1 && ranked[0].tokens === ranked[1].tokens
  return (
    <div className="board-overlay" onClick={onClose}>
      <div className="board theme-dark" onClick={(e) => e.stopPropagation()}>
        <h2>🍺 Le classement des jetons</h2>
        {top.length === 0 ? (
          <p className="muted">Personne n'a encore attrapé de balle… Ouvrez l'œil.</p>
        ) : (
          <>
            <p className="board__winner">
              {tie ? (
                <>Égalité en tête : un rush pour départager ?</>
              ) : (
                <>
                  La bière est pour <strong>{top[0].name || 'Anonyme'}</strong> !
                </>
              )}
            </p>
            <ol className="board__list">
              {top.map((p, i) => (
                <li key={p.player_id} className={p.player_id === highlight ? 'board__me' : ''}>
                  <span className="board__rank">{MEDALS[i] ?? i + 1}</span>
                  <span className="board__name">{p.name || 'Anonyme'}</span>
                  <span className="board__tokens">{p.tokens} 🪙</span>
                </li>
              ))}
            </ol>
          </>
        )}
        {onClose && (
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </div>
  )
}
