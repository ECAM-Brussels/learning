import saterriConfig from '@learning/mdx/config'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import satteri from 'vite-plugin-satteri'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    satteri(saterriConfig),
    solidPlugin({
      compiler: 'babel',
      extensions: ['.mdx'],
    }),
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
