import { useEffect, useState } from 'react'

export function Timer({ end }: { end: string | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!end) return
    const interval = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(interval)
  }, [end])

  if (!end) return null
  const left = Math.max(0, Math.round((new Date(end).getTime() - now) / 1000))
  const state = left === 0 ? 'timer--done' : left <= 60 ? 'timer--soon' : ''
  const label = left === 0 ? 'Temps écoulé' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return <span className={`timer ${state}`}>{label}</span>
}
