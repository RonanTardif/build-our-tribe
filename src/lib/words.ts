// Fréquence des mots des post-its, pour le nuage de l'icebreaker.

const STOPWORDS = new Set(
  `le la les un une des du de d l à au aux et ou en dans sur pour par avec sans ce cet cette ces qui que quoi dont où ne pas plus
  moins très tout tous toute toutes son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos je tu il elle on nous vous ils
  elles me te se y a est sont être avoir fait faire comme mais donc car si quand aussi bien entre chez vers c qu s n j m t lui eux
  ça cela celui celle ceux même autre autres peu beaucoup trop été ai as avons avez ont suis es sommes êtes etc vraiment chaque
  quel quelle quels quelles là ici puis encore déjà souvent toujours jamais avoir peut veux voir the and of to in for is on with`.split(/\s+/),
)

export function wordFrequencies(texts: string[], limit = 40) {
  const counts = new Map<string, number>()
  for (const text of texts) {
    // Un mot compte une fois par post-it : on mesure combien de personnes l'évoquent.
    const words = new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}-]+/u)
        .map((w) => w.replace(/^-+|-+$/g, ''))
        .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    )
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}
