import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relative : l'app fonctionne quel que soit le chemin de publication GitLab Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
