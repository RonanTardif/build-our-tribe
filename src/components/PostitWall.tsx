import type { CSSProperties } from 'react'
import type { Contribution, Theme } from '../types'

export type ThemeEditor = {
  activeThemeId: string | null
  onSelectTheme: (themeId: string | null) => void
  onPostitClick: (contribution: Contribution) => void
  onRename: (theme: Theme) => void
  onDelete: (theme: Theme) => void
  onEditPostit: (contribution: Contribution) => void
  onDeletePostit: (contribution: Contribution) => void
}

const COLORS = ['#ffe58a', '#b9f0d8', '#c9dcff', '#ffd0e0', '#e4d4ff', '#ffd8b0', '#d6f5a8', '#c5f1f5']

type Props = {
  contributions: Contribution[]
  themes: Theme[]
  editor?: ThemeEditor
  // Côté participant : met en évidence ses propres post-its (seule la personne concernée les voit).
  selfId?: string
}

export function PostitWall({ contributions, themes, editor, selfId }: Props) {
  const themeIds = new Set(themes.map((t) => t.id))
  const loose = contributions.filter((c) => !c.theme_id || !themeIds.has(c.theme_id))

  if (!contributions.length && !themes.length) return <p className="empty">Aucun post-it pour cette étape.</p>

  const order = new Map(contributions.map((c, i) => [c.id, i]))
  const postit = (c: Contribution) => (
    <div
      key={c.id}
      className={`postit ${editor ? 'postit--editable' : ''} ${c.participant_id === selfId ? 'postit--self' : ''}`}
      style={{ '--i': order.get(c.id) } as CSSProperties}
      onClick={editor ? () => editor.onPostitClick(c) : undefined}
    >
      {c.text}
      {editor && (
        <span className="postit__tools">
          <button title="Modifier" onClick={(e) => (e.stopPropagation(), editor.onEditPostit(c))}>✎</button>
          <button title="Supprimer" onClick={(e) => (e.stopPropagation(), editor.onDeletePostit(c))}>×</button>
        </span>
      )}
    </div>
  )

  return (
    <div className="wall">
      {themes.map((theme, i) => {
        const items = contributions.filter((c) => c.theme_id === theme.id)
        const active = editor?.activeThemeId === theme.id
        return (
          <section
            key={theme.id}
            className={`group ${active ? 'group--active' : ''}`}
            style={{ '--postit': COLORS[i % COLORS.length] } as CSSProperties}
          >
            <header
              className={`group__head ${editor ? 'group__head--editable' : ''}`}
              onClick={editor ? () => editor.onSelectTheme(active ? null : theme.id) : undefined}
            >
              <h3>{theme.label}</h3>
              <span className="group__count">{items.length}</span>
              {editor && (
                <span className="group__tools">
                  <button title="Renommer" onClick={(e) => (e.stopPropagation(), editor.onRename(theme))}>✎</button>
                  <button title="Supprimer" onClick={(e) => (e.stopPropagation(), editor.onDelete(theme))}>×</button>
                </span>
              )}
            </header>
            <div className="group__items">{items.map(postit)}</div>
          </section>
        )
      })}
      {loose.length > 0 && (
        <section className="group group--loose">
          {themes.length > 0 && (
            <header className="group__head">
              <h3>Non classés</h3>
              <span className="group__count">{loose.length}</span>
            </header>
          )}
          <div className="group__items">{loose.map(postit)}</div>
        </section>
      )}
    </div>
  )
}
