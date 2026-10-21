import { useSession } from '../lib/useSession'
import { participantUrl } from '../lib/routes'
import { Stage } from '../components/Stage'
import { Status } from '../components/Status'
import { Brand } from '../components/OctoMark'

export function Screen({ code }: { code: string }) {
  const { state } = useSession(code)
  if (state.status !== 'ready') return <Status state={state} code={code} />

  return (
    <div className="screen theme-dark">
      <Stage data={state.data} />
      {state.data.session.step_index >= 0 && (
        <footer className="screen__footer">
          <Brand size={20} />
          <span>
            {participantUrl(code).replace(/^https?:\/\//, '')} · code <strong>{code}</strong>
          </span>
        </footer>
      )}
    </div>
  )
}
