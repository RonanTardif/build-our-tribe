import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Version affichée dans l'app (commit) : permet de vérifier ce qui est réellement déployé.
function version() {
  if (process.env.CI_COMMIT_SHORT_SHA) return process.env.CI_COMMIT_SHORT_SHA
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// base relative : l'app fonctionne quel que soit le chemin de publication GitLab Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version()) },
  build: {
    // Les photos des balles sont intégrées au JS (data URI) : derrière l'authentification GitLab Pages,
    // une image chargée des minutes plus tard peut tomber sur une session expirée et rester blanche.
    // Garde-fou : au-delà de 200 Ko, une image reste un fichier séparé.
    assetsInlineLimit: (file, content) => (file.includes('/assets/faces/') ? content.length < 200_000 : undefined),
  },
})
