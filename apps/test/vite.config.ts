import buildPlugin from '@learning/vite-plugin-build'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), buildPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
