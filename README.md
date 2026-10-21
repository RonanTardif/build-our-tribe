# Build Our Tribe

Mini-app d'atelier collaboratif pour faire émerger le Why de la tribu Data & AI — Retail & Luxe :
chacun contribue anonymement depuis son PC, l'animateur pilote les étapes et projette les résultats.

- **Participants** : ouvrent le lien ou scannent le QR code, sans compte. Post-its anonymes, choix, votes à points.
- **Animateur** : crée la session, avance dans le déroulé, révèle les réponses, regroupe les post-its en thèmes
  (à la main ou avec l'IA), génère la synthèse et exporte le tout en Markdown.
- **Écran de projection** : vue lecture seule à afficher sur le vidéoprojecteur (ou « Mode présentation » de la vue animateur).

## Déroulé (90 min)

| Partie | Étape | Type | Durée |
|---|---|---|---|
| Explorer | Ce qui nous anime | post-its | 10′ |
| Explorer | Pourquoi sommes-nous ensemble ? | post-its | 15′ |
| Explorer | Qui voulons-nous devenir ? | post-its | 10′ |
| Décider | Nos convictions fortes | vote 5 points sur les thèmes des 3 étapes précédentes | 15′ |
| Décider | Nos territoires | choix (3 max parmi 6) | 5′ |
| Décider | La mission rêvée | post-its | 10′ |
| Décider | Passer à l'action | post-its | 10′ |
| Décider | Nos premières actions | vote 3 points | 5′ |
| Décider | Notre Why provisoire | synthèse IA projetée | 10′ |

Ce déroulé n'est qu'un point de départ ([`src/workshop.ts`](src/workshop.ts)) : il est copié dans chaque session,
puis l'animateur le modifie librement avec **✎ Modifier** (même en pleine séance) : questions, consignes, durées, parties,
ordre des étapes, options, points de vote, ajout ou suppression d'étapes. Types d'étapes : post-its, choix, vote à points,
message (slide libre : pause, consigne…) et synthèse IA.

Pas de cases imposées : sur une étape de choix, les participants peuvent proposer leurs propres options (territoires…),
aussitôt choisissables par tous ; l'animateur peut ajouter des post-its (idées dites à l'oral), corriger ou supprimer
n'importe quel post-it, et retirer une proposition hors sujet.

## Animer

1. Accueil → **Créer une session** : tu arrives sur la vue animateur (garde ce lien, il contient ta clé d'animation).
2. Projette l'**accueil** (QR code + code) pendant que tout le monde se connecte.
3. Pour chaque étape post-its : laisse écrire (les réponses restent cachées), puis **Révéler les post-its**.
   Crée des thèmes et clique sur les post-its pour les ranger, ou **✨ Proposer des thèmes avec l'IA** puis corrige.
   Les thèmes servent de cibles aux votes suivants (les post-its non classés restent votables tels quels).
4. Votes et choix : **Révéler les résultats** quand tout le monde a voté.
5. Dernière étape : **✨ Générer la synthèse**, elle s'écrit en direct sur l'écran et chez les participants. Corrige-la avec **Modifier le texte**.
6. **Télécharger (.md)** pour garder la restitution complète.

L'IA (Claude) a besoin d'une clé API Anthropic saisie dans le panneau animateur : elle reste dans le navigateur de l'animateur.

## Stack

- Vite + React + TypeScript, build statique servi par **GitLab Pages** (`.gitlab-ci.yml`).
- **Supabase** (Postgres + Realtime) pour l'état partagé ; repli automatique en polling si le websocket ne passe pas.
- **Claude** (`claude-opus-5-5`) appelé directement depuis le navigateur de l'animateur, chargé à la demande.

## Installer

```bash
npm install
cp .env.example .env.local   # URL + publishable key Supabase
npm run dev
```

Base de données : exécute [`supabase/schema.sql`](supabase/schema.sql) une fois dans le SQL Editor du projet Supabase
(sur une base existante, applique plutôt les fichiers de [`supabase/migrations/`](supabase/migrations/)).

Déploiement : chaque push sur `main` publie sur GitLab Pages. Les variables `VITE_SUPABASE_*` viennent de
`.env.production` (ou des variables CI/CD du projet, prioritaires). Pour que les participants accèdent à la page
sans être membres du projet : *Settings → General → Visibility → Pages : Everyone*.

## Sécurité, en connaissance de cause

C'est un outil d'atelier interne sans authentification :

- la clé Supabase servie au navigateur est publique et les policies RLS sont ouvertes : quiconque connaît l'URL peut lire et écrire les sessions. N'y mets rien de confidentiel ;
- l'anonymat est « de bonne foi » : un identifiant aléatoire par navigateur, sans nom, mais lisible par quelqu'un qui inspecterait les requêtes ;
- la clé API Anthropic ne quitte jamais le navigateur de l'animateur.
