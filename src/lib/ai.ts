import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { getApiKey } from './aiKey'
import { WORKSHOP } from '../workshop'

// Chargé à la demande depuis la vue animateur : les participants ne téléchargent pas le SDK.
const MODEL = 'claude-opus-5-5'

function client() {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Ajoute d'abord une clé API Anthropic dans le panneau animateur.")
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

function refusalError(category: string | null | undefined) {
  return new Error(`L'IA a décliné la demande${category ? ` (${category})` : ''}. Réessaie ou fais le regroupement à la main.`)
}

const THEMES_SYSTEM = `Tu aides à animer un atelier collaboratif de la ${WORKSHOP.tribe} (OCTO Technology).
On te donne les post-its anonymes écrits en réponse à une question. Regroupe-les en thèmes :
- entre 3 et 7 thèmes selon la matière (2 ou 3 s'il y a moins de 8 post-its) ;
- un libellé court en français (2 à 6 mots), formulé comme une idée portée par le groupe, pas comme une catégorie générique (« Avoir un impact mesurable chez le client » plutôt que « Impact ») ;
- chaque post-it appartient à exactement un thème ;
- une idée vraiment singulière peut former son propre thème plutôt que d'être forcée ailleurs : les divergences comptent autant que les convergences.
Utilise les références des post-its (P1, P2…) telles quelles.`

const ThemesSchema = z.object({
  themes: z.array(z.object({ label: z.string(), postits: z.array(z.string()) })),
})

export async function proposeThemes(question: string, postits: { id: string; text: string }[]) {
  const refs = new Map(postits.map((p, i) => [`P${i + 1}`, p.id]))
  const list = postits.map((p, i) => `P${i + 1} : ${p.text.replace(/\s+/g, ' ').trim()}`).join('\n')

  const response = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(ThemesSchema) },
    system: THEMES_SYSTEM,
    messages: [{ role: 'user', content: `Question : ${question}\n\nPost-its :\n${list}` }],
  })
  if (response.stop_reason === 'refusal') throw refusalError(response.stop_details?.category)
  if (!response.parsed_output) throw new Error("Réponse de l'IA illisible, réessaie.")

  // Garde-fou : un post-it n'est rangé qu'une fois, et on ignore les références inventées.
  const seen = new Set<string>()
  return response.parsed_output.themes
    .map((theme) => ({
      label: theme.label.trim(),
      contributionIds: theme.postits
        .map((ref) => refs.get(ref.trim()))
        .filter((id): id is string => Boolean(id) && !seen.has(id!) && Boolean(seen.add(id!))),
    }))
    .filter((theme) => theme.label && theme.contributionIds.length)
}

const MANIFESTO_SYSTEM = `Tu accompagnes la ${WORKSHOP.tribe} d'OCTO Technology pendant un atelier sur sa raison d'être.
Tu reçois l'export de l'atelier : post-its anonymes regroupés en thèmes, votes pondérés, choix de territoires.
Rédige en français une proposition de manifeste provisoire, en Markdown, avec exactement ces sections :

## Notre Why
Trois formulations alternatives, une phrase chacune, de tons différents (sobre, inspirante, concrète).

## Notre ambition à trois ans
Trois à cinq lignes.

## Nos territoires
Les territoires prioritaires et pourquoi, en t'appuyant sur les choix et sur les missions rêvées.

## Nos convictions
Trois à cinq convictions, chacune en une phrase forte, en commençant par les plus soutenues par les votes.

## Nos premières actions
Les initiatives les plus soutenues, formulées comme des engagements.

## Ce qui fait débat
Les divergences et tensions : entre aspirations individuelles, convictions collectives et opportunités business, et les idées minoritaires mais fortes.

Règles : appuie-toi uniquement sur les contributions ; reprends les mots des participants quand ils sont justes ; évite le jargon et les formules creuses ; donne du poids aux votes sans gommer les désaccords ; reste concis, le texte sera projeté sur un écran. Pas de titre de niveau 1, pas de préambule : commence directement par « ## Notre Why ».`

export async function writeManifesto(workshopExport: string, onText: (text: string) => void) {
  const stream = client().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high' },
    system: MANIFESTO_SYSTEM,
    messages: [{ role: 'user', content: workshopExport }],
  })
  let streamed = ''
  stream.on('text', (delta) => {
    streamed += delta
    onText(streamed)
  })
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') throw refusalError(final.stop_details?.category)
  return final.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')
    .trim()
}
