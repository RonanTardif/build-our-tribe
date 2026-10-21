// Sigle OCTO (repris de octo.com/assets/logo.svg) : l'anneau prend la couleur du texte,
// les deux points restent turquoise, pour fonctionner sur fond clair comme sur fond bleu nuit.

export function OctoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="octo-mark" width={size} height={(size * 40) / 41} viewBox="0 0 41 40" aria-hidden>
      <path
        d="M39.96 1.05a3.55 3.55 0 0 1-.02 5.02 3.57 3.57 0 0 1-5.04-.02 3.55 3.55 0 0 1 .02-5.02 3.57 3.57 0 0 1 5.04.02Z"
        fill="#00D2DD"
      />
      <path
        d="M27.1 13.71a3.55 3.55 0 0 1-.01 5.02 3.57 3.57 0 0 1-5.05-.01 3.55 3.55 0 0 1 .02-5.02 3.57 3.57 0 0 1 5.04.02Z"
        fill="#00D2DD"
      />
      <path
        d="M19.65.8C8.82.8 0 9.6 0 20.4 0 31.2 8.81 40 19.65 40c10.85 0 19.66-8.8 19.66-19.6C39.3 9.6 30.49.8 19.65.8Zm0 30.95c-6.28 0-11.38-5.1-11.38-11.36 0-6.25 5.1-11.35 11.38-11.35 6.28 0 11.39 5.1 11.39 11.35 0 6.26-5.1 11.36-11.39 11.36Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Brand({ size = 26 }: { size?: number }) {
  return (
    <span className="brand">
      <OctoMark size={size} />
      <span>Build Our Tribe</span>
    </span>
  )
}
