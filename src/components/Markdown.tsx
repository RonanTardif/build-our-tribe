import type { ReactNode } from 'react'

// Rendu Markdown minimal (titres, listes, gras, italique, citations) sans HTML brut :
// le texte vient de l'IA, elle-même nourrie par les post-its, donc on ne l'injecte jamais tel quel.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const pending = { paragraph: [] as string[], list: null as { ordered: boolean; items: string[] } | null }

  const flushParagraph = () => {
    if (pending.paragraph.length) blocks.push(<p key={blocks.length}>{inline(pending.paragraph.join(' '))}</p>)
    pending.paragraph = []
  }
  const flushList = () => {
    const list = pending.list
    if (list) {
      const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>)
      blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>)
    }
    pending.list = null
  }

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd()
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const quote = line.match(/^>\s?(.*)$/)

    if (heading) {
      flushParagraph()
      flushList()
      const content = inline(heading[2])
      blocks.push(heading[1].length <= 2 ? <h2 key={blocks.length}>{content}</h2> : <h3 key={blocks.length}>{content}</h3>)
    } else if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered)
      if (!pending.list || pending.list.ordered !== ordered) {
        flushList()
        pending.list = { ordered, items: [] }
      }
      pending.list.items.push((bullet ?? numbered)![1])
    } else if (quote) {
      flushParagraph()
      flushList()
      blocks.push(<blockquote key={blocks.length}>{inline(quote[1])}</blockquote>)
    } else if (!line.trim()) {
      flushParagraph()
      flushList()
    } else {
      flushList()
      pending.paragraph.push(line.trim())
    }
  }
  flushParagraph()
  flushList()

  return <div className="md">{blocks}</div>
}
