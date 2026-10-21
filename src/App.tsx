import { useEffect, useState } from 'react'
import { isConfigured } from './lib/supabase'
import { adoptQueryCode, parseRoute } from './lib/routes'
import { Facilitator } from './views/Facilitator'
import { Home } from './views/Home'
import { Participant } from './views/Participant'
import { Screen } from './views/Screen'

export function App() {
  const [route, setRoute] = useState(() => {
    adoptQueryCode()
    return parseRoute(window.location.hash)
  })

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  if (!isConfigured) {
    return (
      <div className="status">
        <h1>Configuration manquante</h1>
        <p>
          Renseigne <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_KEY</code> (voir le README), puis relance le build.
        </p>
      </div>
    )
  }

  switch (route.view) {
    case 'participant':
      return <Participant key={route.code} code={route.code} />
    case 'screen':
      return <Screen key={route.code} code={route.code} />
    case 'anim':
      return <Facilitator key={route.code} code={route.code} accessKey={route.key} />
    default:
      return <Home />
  }
}
