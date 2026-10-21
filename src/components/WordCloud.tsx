import { wordFrequencies } from '../lib/words'

// Les mots les plus fréquents au centre, les autres alternés de part et d'autre.
export function WordCloud({ texts }: { texts: string[] }) {
  const words = wordFrequencies(texts)
  if (words.length < 3) return null

  const max = words[0].count
  const min = words[words.length - 1].count
  const arranged: typeof words = []
  words.forEach((w, i) => (i % 2 ? arranged.push(w) : arranged.unshift(w)))

  return (
    <div className="cloud" aria-label="Nuage de mots">
      {arranged.map(({ word, count }, i) => {
        const weight = max === min ? 0.5 : (count - min) / (max - min)
        return (
          <span
            key={word}
            className={`cloud__word cloud__word--${i % 3}`}
            style={{ fontSize: `${1 + weight * 2.6}em`, animationDelay: `${(i % 12) * 50}ms` }}
            title={`${count} post-it${count > 1 ? 's' : ''}`}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
