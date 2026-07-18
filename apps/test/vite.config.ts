import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import satteri from 'vite-plugin-satteri'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    satteri({ features: { math: true }, mdx: { jsxImportSource: '@learning/mdx' } }),
    solidPlugin(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
