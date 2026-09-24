import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Os modos têm os mesmos nomes dos ramos: dev, test e prod (ramo main).
// Cada um carrega o seu ficheiro .env.<modo> quando se trabalha localmente;
// no Netlify os valores vêm das variáveis de ambiente do site.
const AMBIENTES = { dev: 'dev', test: 'test', prod: 'prod' }

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: true,
    // Nao abre o browser sozinho: com "netlify dev" quem abre a janela certa
    // (o porto 8888, que ja traz as funcoes) e o proprio Netlify.
    open: false
  },

  define: {
    // A etiqueta do ambiente vem do modo com que se construiu, e nao de uma
    // variavel a parte. Assim nao ha nada para definir em cada contexto do
    // Netlify, nem risco de o rotulo dizer uma coisa e o build ser outra.
    'import.meta.env.VITE_AMBIENTE': JSON.stringify(AMBIENTES[mode] || mode)
  },

  build: {
    outDir: 'dist',
    sourcemap: mode !== 'prod',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          charts: ['recharts']
        }
      }
    }
  }
}))
