import saterriConfig from '@learning/mdx/config'
import tailwindcss from '@tailwindcss/vite'
import { routePathFromFile } from 'filesystem-routing'
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
      // ssr: {},
      serverFunctions: {
        filter: {
          include: [
            'src/**/*.ts',
            'src/**/*.tsx',
            '../../packages/**/*.ts',
            '../../packages/**/*.tsx',
          ],
          exclude: ['**/node_modules/**'],
        },
      },
    }),
    fileRoutes({
      types: true,
      extensions: ['mdx', 'tsx'],
      toPath: (file) => routePathFromFile(file).replace(/\/_layout$/, ''),
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
