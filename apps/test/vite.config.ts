import saterriConfig from '@learning/mdx/config'
import tailwindcss from '@tailwindcss/vite'
import { fileRoutes } from 'filesystem-routing/vite'
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
    fileRoutes({
      types: true,
      extensions: ['mdx', 'tsx'],
      toPath: (file) => {
        return file.replace(/index/, '').replace(/\/_layout/, '')
      },
    }) as any,
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
